import test from 'node:test';
import assert from 'node:assert/strict';
import { MonitorService } from '../src/services/monitor/service/monitorService.js';

const thresholds = { warnResponseMs: 2000, criticalResponseMs: 5000 };
const fakeAlertService = (fail = []) => ({
    raiseAlert: async (record, detection) => {
        if (fail.includes(record.api_name)) throw new Error('db down');
        return { alert: { _id: 'id-' + record.api_name, message: 'msg', messageSource: 'fallback' }, deduplicated: false };
    },
});

test('mixed batch: healthy, anomaly, invalid are classified', async () => {
    const svc = new MonitorService({ alertService: fakeAlertService(), thresholds });
    const { summary, results } = await svc.processBatch([
        { api_name: 'A', response_time_ms: 100, status_code: 200, records_returned: 5 },
        { api_name: 'B', response_time_ms: 5500, status_code: 500, records_returned: 0 },
        { api_name: 'C', response_time_ms: 'abc', status_code: 200, records_returned: 1 },
        { api_name: 'D', response_time_ms: '300', status_code: '200' }, // numeric strings ok, missing records => anomaly
    ]);
    assert.equal(summary.received, 4);
    assert.equal(summary.healthy, 1);
    assert.equal(summary.anomalies, 2);
    assert.equal(summary.invalid, 1);
    assert.equal(results[3].anomalyTypes[0], 'MISSING_RECORDS');
});

test('one failing alert does not break the rest of the batch', async () => {
    const svc = new MonitorService({ alertService: fakeAlertService(['B']), thresholds });
    const { summary } = await svc.processBatch([
        { api_name: 'B', response_time_ms: 6000, status_code: 500, records_returned: 0 },
        { api_name: 'E', response_time_ms: 6000, status_code: 500, records_returned: 0 },
    ]);
    assert.equal(summary.errors, 1);
    assert.equal(summary.anomalies, 1);
});

test('empty body and oversized batch are rejected with proper status codes', async () => {
    const svc = new MonitorService({ alertService: fakeAlertService(), thresholds, maxBatchSize: 2 });
    await assert.rejects(() => svc.processBatch([]), (e) => e.statusCode === 400);
    await assert.rejects(() => svc.processBatch([{}, {}, {}]), (e) => e.statusCode === 413);
});
