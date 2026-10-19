import { ALERT_SYSTEM_PROMPT, buildAlertUserPrompt } from './promptTemplates.js';


const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_MODEL = 'gpt-4o-mini';

const silentLogger = { info() {}, warn() {}, error() {}, debug() {} };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));


const isReasoningModel = (model) => /^(gpt-5|o\d)/i.test(model);


/**
 * Generates human-readable alert text with the OpenAI Chat Completions API (plain HTTPS, no SDK).
 * It NEVER throws: on any failure it returns a deterministic template message so an
 * anomaly is never lost just because OpenAI was slow, down, out of quota, or not configured.
 */


export class AIAlertGenerator {
    /**
     * @param {{llm:{provider:string,apiKey:string,model:string,timeoutMs:number,retries:number}, logger?:object, fetchImpl?:Function}} deps
     */
    constructor({ llm, logger = silentLogger, fetchImpl = globalThis.fetch }) {
        this.llm = llm;
        this.logger = logger;
        this.fetch = fetchImpl;

        if (llm.provider && !['none', 'openai'].includes(llm.provider)) {
            this.logger.warn(`LLM_PROVIDER "${llm.provider}" is not supported. Use "openai" or "none"; using template alerts.`);
        }
    }

    get enabled() {
        return this.llm.provider === 'openai' && Boolean(this.llm.apiKey);
    }

    get model() {
        return this.llm.model || DEFAULT_MODEL;
    }

    /** @returns {Promise<{message:string, source:'llm'|'fallback'}>} */
    async generate(record, detection) {
        if (!this.enabled) {
            return { message: this.buildFallback(record, detection), source: 'fallback' };
        }
        try {
            const text = await this._withRetry(() => this._callOpenAI(buildAlertUserPrompt(record, detection)));
            const clean = this._sanitize(text);
            if (!clean) throw new Error('OpenAI returned empty text');
            return { message: clean, source: 'llm' };
        } 
        catch (err) {
            this.logger.warn('OpenAI alert generation failed, using fallback template', {
                api: record.api_name,
                error: err.message,
            });
            return { message: this.buildFallback(record, detection), source: 'fallback' };
        }
    }

    buildFallback(record, detection) {
        const { api_name: api, status_code: status, response_time_ms: ms, records_returned: records } = record;
        const types = detection.anomalyTypes;
        const parts = [];

        if (types.includes('SERVER_ERROR')) parts.push(`failed with status ${status}`);
        else if (types.includes('CLIENT_ERROR')) parts.push(`returned client error ${status}`);
        if (types.includes('HIGH_RESPONSE_TIME')) parts.push(`responded slowly (${ms}ms)`);
        if (types.includes('ZERO_RECORDS')) parts.push('returned 0 records');
        if (types.includes('MISSING_RECORDS')) parts.push('did not report a record count');
        if (types.includes('INVALID_DATA')) parts.push(`reported an invalid record count (${records})`);

        let hint = 'Please investigate.';
        if (types.includes('SERVER_ERROR') && types.includes('ZERO_RECORDS')) hint = 'Possible outage or data issue.';
        else if (types.includes('SERVER_ERROR')) hint = 'Possible upstream outage.';
        else if (types.includes('HIGH_RESPONSE_TIME')) hint = 'Possible performance degradation or overload.';
        else if (types.includes('ZERO_RECORDS') || types.includes('MISSING_RECORDS')) hint = 'Possible data issue.';

        const joined = parts.length <= 1 ? parts[0] : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
        return `${api} ${joined}. ${hint}`;
    }

    _sanitize(text) {
        if (typeof text !== 'string') return '';
        return text.replace(/[*_`#]/g, '').replace(/\s+/g, ' ').trim().slice(0, 500);
    }

    async _withRetry(fn) {
        const attempts = Math.max(1, (this.llm.retries ?? 2) + 1);
        let lastErr;
        for (let i = 0; i < attempts; i++) {
            try {
                return await fn();
            } catch (err) {
                lastErr = err;
                if (err.retryable === false || i === attempts - 1) break;
                await sleep(300 * 2 ** i);
            }
        }
        throw lastErr;
    }

    /** Request body differs between classic chat models and reasoning models. */
    _buildRequestBody(userPrompt) {
        const body = {
            model: this.model,
            messages: [
                { role: 'system', content: ALERT_SYSTEM_PROMPT },
                { role: 'user', content: userPrompt },
            ],
        };

        if (isReasoningModel(this.model)) {
           
            body.max_completion_tokens = 1000;
        } else {
            body.max_completion_tokens = 150;
            body.temperature = 0.2;
        }
        return body;
    }

    async _callOpenAI(userPrompt) {
        const res = await this.fetch(OPENAI_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${String(this.llm.apiKey).trim()}`,
            },
            body: JSON.stringify(this._buildRequestBody(userPrompt)),
            signal: AbortSignal.timeout(this.llm.timeoutMs ?? 8000),
        });

        if (!res.ok) throw await this._toError(res);

        const data = await res.json();
        const choice = data?.choices?.[0];
        if (!choice?.message?.content && choice?.finish_reason === 'length') {
            throw new Error('OpenAI hit the token limit before writing any text');
        }
        return choice?.message?.content;
    }

    
    async _toError(res) {
        let detail = {};
        try {
            detail = (await res.json())?.error ?? {};
        } catch {
            
        }
        const err = new Error(`OpenAI HTTP ${res.status}${detail.message ? `: ${detail.message}` : ''}`);

        const outOfQuota = detail.code === 'insufficient_quota';
        err.retryable = !outOfQuota && (res.status === 429 || res.status >= 500);
        return err;
    }

}