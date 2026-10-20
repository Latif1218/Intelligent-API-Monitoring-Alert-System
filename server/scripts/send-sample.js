// Usage: npm run send:sample [path/to/file.json]
// Posts a JSON array of API responses to POST /api/monitor and prints the result.
import { readFileSync } from 'node:fs';

const file = process.argv[2] || new URL('../sample-data/api-responses.json', import.meta.url);
const base = process.env.API_URL || 'http://localhost:5000';
const headers = { 'Content-Type': 'application/json' };
if (process.env.MONITOR_API_KEY) headers['x-monitor-key'] = process.env.MONITOR_API_KEY;

const res = await fetch(`${base}/api/monitor`, { method: 'POST', headers, body: readFileSync(file, 'utf8') });
const body = await res.json();
console.log(`HTTP ${res.status}`);
console.log(JSON.stringify(body.data?.summary ?? body, null, 2));
for (const r of body.data?.results ?? []) {
    console.log(`- [${r.status}] ${r.api_name ?? '?'}${r.message ? ' -> ' + r.message : ''}${r.issues ? ' -> ' + r.issues.join('; ') : ''}`);
}
