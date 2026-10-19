import test from 'node:test';
import assert from 'node:assert/strict';
import { AIAlertGenerator } from '../src/services/alerts/ai/aiAlertGenerator.js';
import { detectAnomalies } from '../src/services/alerts/detection/anomalyDetector.js';

const record = { api_name: 'AppointmentAPI', response_time_ms: 5500, status_code: 500, records_returned: 0 };
const detection = detectAnomalies(record, { warnResponseMs: 2000, criticalResponseMs: 5000 });
const llm = (extra = {}) => ({ provider: 'openai', apiKey: 'sk-test', model: '', timeoutMs: 500, retries: 1, ...extra });
const okResponse = (text) => ({ ok: true, json: async () => ({ choices: [{ message: { content: text }, finish_reason: 'stop' }] }) });
const errResponse = (status, error = {}) => ({ ok: false, status, json: async () => ({ error }) });

test('provider none or missing key => template fallback', async () => {
    for (const cfg of [llm({ provider: 'none' }), llm({ apiKey: '' })]) {
        const r = await new AIAlertGenerator({ llm: cfg }).generate(record, detection);
        assert.equal(r.source, 'fallback');
        assert.match(r.message, /^AppointmentAPI failed with status 500/);
        assert.match(r.message, /0 records/);
    }
});

test('OpenAI success => source llm, markdown stripped', async () => {
    const fetchImpl = async () => okResponse('**AppointmentAPI** is down. Check upstream.');
    const r = await new AIAlertGenerator({ llm: llm(), fetchImpl }).generate(record, detection);
    assert.deepEqual(r, { message: 'AppointmentAPI is down. Check upstream.', source: 'llm' });
});

test('classic model sends temperature and a small max_completion_tokens', async () => {
    let sent;
    const fetchImpl = async (url, opts) => { sent = { url, opts, body: JSON.parse(opts.body) }; return okResponse('ok'); };
    await new AIAlertGenerator({ llm: llm({ model: 'gpt-4o-mini' }), fetchImpl }).generate(record, detection);
    assert.equal(sent.url, 'https://api.openai.com/v1/chat/completions');
    assert.equal(sent.opts.headers.Authorization, 'Bearer sk-test');
    assert.equal(sent.body.temperature, 0.2);
    assert.equal(sent.body.max_completion_tokens, 150);
    assert.equal('max_tokens' in sent.body, false);
});

test('reasoning models (gpt-5 / o-series) omit temperature and get a bigger limit', async () => {
    for (const model of ['gpt-5-mini', 'o4-mini']) {
        let body;
        const fetchImpl = async (u, opts) => { body = JSON.parse(opts.body); return okResponse('ok'); };
        await new AIAlertGenerator({ llm: llm({ model }), fetchImpl }).generate(record, detection);
        assert.equal('temperature' in body, false, model);
        assert.equal(body.max_completion_tokens, 1000, model);
    }
});

test('HTTP 500 is retried then falls back (never throws)', async () => {
    let calls = 0;
    const fetchImpl = async () => { calls++; return errResponse(500); };
    const r = await new AIAlertGenerator({ llm: llm(), fetchImpl }).generate(record, detection);
    assert.equal(calls, 2);
    assert.equal(r.source, 'fallback');
});

test('401 invalid key is not retried and the OpenAI message reaches the log', async () => {
    let calls = 0;
    const logs = [];
    const fetchImpl = async () => { calls++; return errResponse(401, { message: 'Incorrect API key provided' }); };
    const logger = { warn: (m, meta) => logs.push(meta), info() {}, error() {}, debug() {} };
    const r = await new AIAlertGenerator({ llm: llm(), logger, fetchImpl }).generate(record, detection);
    assert.equal(calls, 1);
    assert.equal(r.source, 'fallback');
    assert.match(logs[0].error, /401: Incorrect API key provided/);
});

test('429 insufficient_quota is not retried, plain 429 rate limit is', async () => {
    let quotaCalls = 0, rateCalls = 0;
    await new AIAlertGenerator({ llm: llm(), fetchImpl: async () => { quotaCalls++; return errResponse(429, { code: 'insufficient_quota' }); } }).generate(record, detection);
    await new AIAlertGenerator({ llm: llm(), fetchImpl: async () => { rateCalls++; return errResponse(429, { code: 'rate_limit_exceeded' }); } }).generate(record, detection);
    assert.equal(quotaCalls, 1);
    assert.equal(rateCalls, 2);
});

test('empty answer cut off by the token limit falls back', async () => {
    const fetchImpl = async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: '' }, finish_reason: 'length' }] }) });
    const r = await new AIAlertGenerator({ llm: llm({ retries: 0 }), fetchImpl }).generate(record, detection);
    assert.equal(r.source, 'fallback');
});
