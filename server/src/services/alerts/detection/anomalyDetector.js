/**
 * Rule-based anomaly detection. Pure functions only: no DB, no network, no LLM.
 * detection separate from AI means alerts still work if the LLM is down.
 */


export const DEFAULT_THRESHOLDS = {
    warnResponseMs: 2000,
    criticalResponseMs: 5000,
};

const SEVERITY_RANK = { warning: 1, critical: 2 };

/**
 * @param {{api_name:string,response_time_ms:number,status_code:number,records_returned?:number|null}} record
 * @param {{warnResponseMs:number,criticalResponseMs:number}} thresholds
 * @returns {null | {severity:'warning'|'critical', anomalyTypes:string[], reasons:string[]}}
 */

export function detectAnomalies(record, thresholds = DEFAULT_THRESHOLDS) {
    const types = [];
    const reasons = [];
    let severity = 'warning';
    const raise = (level) => {
        if (SEVERITY_RANK[level] > SEVERITY_RANK[severity]) severity = level;
    };
    const { response_time_ms: ms, status_code: status, records_returned: records } = record;

    // 1. Failed requests
    if (status >= 500) {
        types.push('SERVER_ERROR');
        reasons.push(`Server error: HTTP ${status}`);
        raise('critical');
    } else if (status >= 400) {
        types.push('CLIENT_ERROR');
        reasons.push(`Client/request error: HTTP ${status}`);
    }

    // 2. Slow responses
    if (ms >= thresholds.criticalResponseMs) {
        types.push('HIGH_RESPONSE_TIME');
        reasons.push(`Response time ${ms}ms is above the critical threshold of ${thresholds.criticalResponseMs}ms`);
        raise('critical');
    } else if (ms >= thresholds.warnResponseMs) {
        types.push('HIGH_RESPONSE_TIME');
        reasons.push(`Response time ${ms}ms is above the warning threshold of ${thresholds.warnResponseMs}ms`);
    }

    // 3. Data validation: missing / zero / invalid record counts
    if (records === null || records === undefined) {
        types.push('MISSING_RECORDS');
        reasons.push('records_returned is missing from the response');
    } else if (records < 0 || !Number.isFinite(records)) {
        types.push('INVALID_DATA');
        reasons.push(`records_returned has an invalid value (${records})`);
    } else if (records === 0) {
        types.push('ZERO_RECORDS');
        reasons.push('API returned 0 records');
    }

    if (types.length === 0) return null;
    return { severity, anomalyTypes: types, reasons };
}


export function buildFingerprint(apiName, anomalyTypes) {
    return `${apiName}::${[...anomalyTypes].sort().join('+')}`;
}