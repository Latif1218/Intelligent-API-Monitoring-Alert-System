import mongoose from 'mongoose';
import AppError from '../../../shared/utils/AppError.js';
import { buildFingerprint } from '../detection/anomalyDetector.js';


const silentLogger = { info() {}, warn() {}, error() {}, debug() {} };

export class AlertService {
    constructor({ alertRepository, aiAlertGenerator, emailService, dedupeWindowMinutes = 10, logger = silentLogger }) {
        if (!alertRepository || !aiAlertGenerator) throw new Error('AlertService requires alertRepository and aiAlertGenerator');
        this.repo = alertRepository;
        this.ai = aiAlertGenerator;
        this.email = emailService;
        this.dedupeWindowMs = dedupeWindowMinutes * 60 * 1000;
        this.logger = logger;
    }


    async raiseAlert(record, detection) {
        const fingerprint = buildFingerprint(record.api_name, detection.anomalyTypes);
        const metrics = {
            responseTimeMs: record.response_time_ms,
            statusCode: record.status_code,
            recordsReturned: record.records_returned,
        };

        const existing = await this.repo.findRecentActiveByFingerprint(fingerprint, new Date(Date.now() - this.dedupeWindowMs));
        if (existing) {
            const updated = await this.repo.touch(existing._id, metrics);
            return { alert: updated, deduplicated: true };
        }

        const { message, source } = await this.ai.generate(record, detection);
        const alert = await this.repo.create({
            apiName: record.api_name,
            severity: detection.severity,
            anomalyTypes: detection.anomalyTypes,
            reasons: detection.reasons,
            metrics,
            message,
            messageSource: source,
            fingerprint,
        });

        this._notify(alert); 
        return { alert, deduplicated: false };
    }

    _notify(alert) {
        if (!this.email?.enabled) return;
        this.email
            .sendAlert(alert)
            .then((sent) => sent && this.repo.markEmailSent(alert._id))
            .catch((err) => this.logger.error('Failed to send alert email', { alertId: String(alert._id), error: err.message }));
    }

    async listAlerts(query = {}) {
        const page = Math.max(1, parseInt(query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
        const status = ['active', 'resolved', 'all'].includes(query.status) ? query.status : 'active';
        const severity = ['warning', 'critical'].includes(query.severity) ? query.severity : undefined;

        const { items, total } = await this.repo.list({ status, severity, apiName: query.apiName, page, limit });
        return { items, page, limit, total };
    }

    getStats() {
        return this.repo.stats();
    }


    async resolveAlert(id) {
        if (!mongoose.isValidObjectId(id)) throw new AppError('Invalid alert id', 400);
        const alert = await this.repo.resolve(id);
        if (!alert) throw new AppError('Active alert not found', 404);
        return alert;
    }
}