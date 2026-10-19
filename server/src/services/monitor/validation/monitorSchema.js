
const toNumber = (v) => (typeof v === 'string' && v.trim() !== '' ? Number(v) : v);

export function validateRecord(raw) {
    const issues = [];
    if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
        return { valid: false, issues: ['Record must be a JSON object'] };
    }

    const apiName = typeof raw.api_name === 'string' ? raw.api_name.trim() : '';
    if (!apiName) issues.push('api_name is required (non-empty string)');

    const ms = toNumber(raw.response_time_ms);
    if (typeof ms !== 'number' || !Number.isFinite(ms) || ms < 0) {
        issues.push('response_time_ms is required (number >= 0)');
    }

    const status = toNumber(raw.status_code);
    if (!Number.isInteger(status) || status < 100 || status > 599) {
        issues.push('status_code is required (integer 100-599)');
    }

    
    let records = null;
    if (raw.records_returned !== undefined && raw.records_returned !== null) {
        records = toNumber(raw.records_returned);
        if (typeof records !== 'number' || Number.isNaN(records)) {
            issues.push('records_returned must be a number when provided');
        }
    }

    if (issues.length > 0) return { valid: false, issues };
    return {
        valid: true,
        value: {
            api_name: apiName,
            response_time_ms: ms,
            status_code: status,
            records_returned: records,
        },
    };
}
