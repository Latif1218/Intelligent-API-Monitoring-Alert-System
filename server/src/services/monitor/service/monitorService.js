import AppError from '../../../shared/utils/AppError.js';
import { validateRecord } from '../validation/monitorSchema.js';
import { detectAnomalies } from '../../alerts/detection/anomalyDetector.js';

const silentLogger = { info() {}, warn() {}, error() {}, debug() {} };

export class MonitorService {
    constructor({ alertService, thresholds, maxBatchSize = 500, logger = silentLogger }) {
        if (!alertService) throw new Error('MonitorService requires alertService');
        this.alertService = alertService;
        this.thresholds = thresholds;
        this.maxBatchSize = maxBatchSize;
        this.logger = logger;
    }

    async processBatch(payload) {
        const items = Array.isArray(payload) ? payload : payload ? [payload] : [];
        if (items.length === 0) throw new AppError('Body must be a JSON array of API responses (or a single object)', 400);
        if (items.length > this.maxBatchSize) throw new AppError(`Batch too large (max ${this.maxBatchSize})`, 413);

        const started = Date.now();
        const settled = await Promise.allSettled(items.map((item, index) => this._processOne(item, index)));

        const results = settled.map((s, index) =>
            s.status === 'fulfilled'
                ? s.value
                : { index, status: 'error', error: s.reason?.message || 'Unexpected error' }
        );

        const count = (st) => results.filter((r) => r.status === st).length;
        const summary = {
            received: items.length,
            healthy: count('healthy'),
            anomalies: count('anomaly'),
            invalid: count('invalid'),
            errors: count('error'),
            durationMs: Date.now() - started,
        };
        this.logger.info('Monitor batch processed', summary);
        return { summary, results };
    }

    async _processOne(raw, index) {
        const checked = validateRecord(raw);
        if (!checked.valid) {
            return { index, status: 'invalid', api_name: raw?.api_name ?? null, issues: checked.issues };
        }

        const record = checked.value;
        const detection = detectAnomalies(record, this.thresholds);
        if (!detection) return { index, status: 'healthy', api_name: record.api_name };

        const { alert, deduplicated } = await this.alertService.raiseAlert(record, detection);
        return {
            index,
            status: 'anomaly',
            api_name: record.api_name,
            severity: detection.severity,
            anomalyTypes: detection.anomalyTypes,
            deduplicated,
            alertId: alert._id,
            message: alert.message,
            messageSource: alert.messageSource,
        };
    }
}
