// middleware/apiMonitor.js   (CommonJS version: for projects WITHOUT "type": "module", i.e. using require())
//
// Measures every API call of YOUR system and reports it to the
// Intelligent API Monitoring & Alert System (POST /monitor).
// Needs Node 18+ (built-in fetch). No extra packages.

const MONITOR_URL = process.env.API_MONITOR_URL || 'http://localhost:5000/monitor';
const MONITOR_KEY = process.env.API_MONITOR_KEY || '';          // only if the monitor has MONITOR_API_KEY set
const ENABLED = process.env.API_MONITOR_ENABLED !== 'false';     // set to false to switch it off
const SKIP_PATHS = (process.env.API_MONITOR_SKIP || '/health,/favicon.ico')
    .split(',').map((p) => p.trim()).filter(Boolean);

let warned = false;

const LIST_KEYS = ['data', 'items', 'results', 'records', 'rows', 'posts', 'list'];

function findList(obj) {
    for (const key of LIST_KEYS) if (Array.isArray(obj[key])) return obj[key];
    return null;
}

/** How many records did this response contain? */
function countRecords(body) {
    if (body === undefined || body === null) return 0;
    if (Array.isArray(body)) return body.length;
    if (typeof body === 'object') {
        const list = findList(body)
            // also look one level deeper, e.g. { success: true, data: { posts: [...] } }
            ?? (body.data && typeof body.data === 'object' ? findList(body.data) : null);
        if (list) return list.length;
    }
    return 1; // a single object (e.g. GET /users/5)
}

function apiMonitor(req, res, next) {
    if (!ENABLED || SKIP_PATHS.some((p) => req.path.startsWith(p))) return next();

    const start = process.hrtime.bigint();
    let records = 0;

    // Wrap res.json so we can count the records that were returned.
    const originalJson = res.json.bind(res);
    res.json = (body) => {
        records = countRecords(body);
        return originalJson(body);
    };

    res.on('finish', () => {
        const ms = Math.round(Number(process.hrtime.bigint() - start) / 1e6);
        // Use the route pattern (/users/:id), not the real URL, so /users/1 and /users/2 are ONE api.
        // Requests that match no route (404s) are grouped under one name.
        const apiName = req.route
            ? `${req.method} ${req.baseUrl || ''}${req.route.path}`
            : `${req.method} (unmatched route)`;

        const headers = { 'Content-Type': 'application/json' };
        if (MONITOR_KEY) headers['x-monitor-key'] = MONITOR_KEY;

        fetch(MONITOR_URL, {
            method: 'POST',
            headers,
            body: JSON.stringify([{
                api_name: apiName,
                response_time_ms: ms,
                status_code: res.statusCode,
                records_returned: records,
            }]),
            signal: AbortSignal.timeout(3000),
        }).then((r) => {
            // The monitor answered but refused (e.g. 401 wrong/missing key, 400 bad data): say so once.
            if (!r.ok && !warned) {
                warned = true;
                console.warn(`[apiMonitor] monitor answered HTTP ${r.status} - check API_MONITOR_KEY / MONITOR_API_KEY`);
            }
        }).catch((err) => {
            // The monitor being down must NEVER break your own API.
            if (!warned) {
                warned = true;
                console.warn(`[apiMonitor] cannot reach ${MONITOR_URL}: ${err.message}`);
            }
        });
    });

    next();
}

module.exports = { apiMonitor };
