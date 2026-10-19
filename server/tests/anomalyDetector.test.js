import test from 'node:test';
import assert from 'node:assert/strict';
import { detectAnomalies, buildFingerprint } from '../src/services/alerts/detection/anomalyDetector.js';

const T = { warnResponseMs: 2000, criticalResponseMs: 5000 };
const rec = (o) => ({ api_name: 'X', response_time_ms: 100, status_code: 200, records_returned: 10, ...o });

test('healthy response => no anomaly', () => {
    assert.equal(detectAnomalies(rec({}), T), null);
});

test('task example: 500 + 5500ms + 0 records => critical with 3 anomaly types', () => {
    const d = detectAnomalies(rec({ response_time_ms: 5500, status_code: 500, records_returned: 0 }), T);
    assert.equal(d.severity, 'critical');
    assert.deepEqual(d.anomalyTypes.sort(), ['HIGH_RESPONSE_TIME', 'SERVER_ERROR', 'ZERO_RECORDS']);
});

test('slow but successful => warning, critical above threshold', () => {
    assert.equal(detectAnomalies(rec({ response_time_ms: 3000 }), T).severity, 'warning');
    assert.equal(detectAnomalies(rec({ response_time_ms: 5000 }), T).severity, 'critical');
});

test('zero records on 200 => warning ZERO_RECORDS', () => {
    const d = detectAnomalies(rec({ records_returned: 0 }), T);
    assert.deepEqual(d.anomalyTypes, ['ZERO_RECORDS']);
    assert.equal(d.severity, 'warning');
});

test('missing / negative records are flagged', () => {
    assert.deepEqual(detectAnomalies(rec({ records_returned: null }), T).anomalyTypes, ['MISSING_RECORDS']);
    assert.deepEqual(detectAnomalies(rec({ records_returned: -4 }), T).anomalyTypes, ['INVALID_DATA']);
});

test('4xx => CLIENT_ERROR warning', () => {
    const d = detectAnomalies(rec({ status_code: 404 }), T);
    assert.deepEqual(d.anomalyTypes, ['CLIENT_ERROR']);
    assert.equal(d.severity, 'warning');
});

test('fingerprint ignores order of anomaly types', () => {
    assert.equal(buildFingerprint('A', ['B', 'A']), buildFingerprint('A', ['A', 'B']));
});
