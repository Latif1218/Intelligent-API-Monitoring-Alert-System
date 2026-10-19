import mongoose from 'mongoose';

export const ANOMALY_TYPES = [
    'HIGH_RESPONSE_TIME',
    'SERVER_ERROR',
    'CLIENT_ERROR',
    'ZERO_RECORDS',
    'MISSING_RECORDS',
    'INVALID_DATA',
];

/**
 * MongoDB schema for detected anomalies (alerts).
 * One document = one active problem for one API. Repeated identical anomalies
 * inside the dedupe window increment `occurrences` instead of creating new documents.
 */



const alertSchema = new mongoose.Schema(
    {
        apiName: { type: String, required: true, index: true },
        severity: { type: String, enum: ['warning', 'critical'], required: true, index: true },
        anomalyTypes: [{ type: String, enum: ANOMALY_TYPES }],
        reasons: [{ type: String }],
        metrics: {
            responseTimeMs: { type: Number },
            statusCode: { type: Number },
            recordsReturned: { type: Number, default: null },
        },
        message: { type: String, required: true },
        messageSource: { type: String, enum: ['llm', 'fallback'], default: 'fallback' },
        status: { type: String, enum: ['active', 'resolved'], default: 'active', index: true },
        fingerprint: { type: String, required: true, index: true },
        occurrences: { type: Number, default: 1 },
        lastSeenAt: { type: Date, default: Date.now },
        resolvedAt: { type: Date, default: null },
        emailSent: { type: Boolean, default: false },
    },
    { timestamps: true, collection: 'alerts' }
);


alertSchema.index({ status: 1, createdAt: -1 });
alertSchema.index({ fingerprint: 1, status: 1, lastSeenAt: -1 });

const Alert = mongoose.model('Alert', alertSchema);
export default Alert;
