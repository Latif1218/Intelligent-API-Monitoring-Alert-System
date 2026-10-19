export const ALERT_SYSTEM_PROMPT = `You are an operations assistant for a healthcare company that depends on external APIs for patient and operational data.
Write ONE short alert (maximum 2 sentences, plain text, no markdown, no emojis) for the on-call team.
Rules:
- Start with the API name.
- State the facts you are given (status code, response time, records returned). Never invent numbers or causes that are not implied by the facts.
- End with a cautious likely cause and, if helpful, a next step (for example "Possible outage or data issue." or "Check upstream database load.").
- Never mention patient names or personal data.`;

export function buildAlertUserPrompt(record, detection) {
    const records = record.records_returned ?? 'missing';
    return [
        `API: ${record.api_name}`,
        `HTTP status: ${record.status_code}`,
        `Response time: ${record.response_time_ms} ms`,
        `Records returned: ${records}`,
        `Severity: ${detection.severity}`,
        `Detected issues: ${detection.reasons.join('; ')}`,
        '',
        'Write the alert now.',
    ].join('\n');
}
