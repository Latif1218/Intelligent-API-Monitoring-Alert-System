import Alert from '../../../shared/models/Alert.js';

export class AlertRepository {
    create(data) {
        return Alert.create(data);
    }

    findRecentActiveByFingerprint(fingerprint, since) {
        return Alert.findOne({ fingerprint, status: 'active', lastSeenAt: { $gte: since } }).sort({ lastSeenAt: -1 });
    }

   
    touch(id, metrics) {
        return Alert.findByIdAndUpdate(
            id,
            { $inc: { occurrences: 1 }, $set: { lastSeenAt: new Date(), metrics } },
            { new: true }
        );
    }

    async list({ status = 'active', severity, apiName, page = 1, limit = 20 }) {
        const filter = {};
        if (status !== 'all') filter.status = status;
        if (severity) filter.severity = severity;
        if (apiName) filter.apiName = apiName;

        const [items, total] = await Promise.all([
            Alert.find(filter).sort({ lastSeenAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
            Alert.countDocuments(filter),
        ]);
        return { items, total };
    }

    async stats() {
        const [bySeverity, byApi, total, llm] = await Promise.all([
            Alert.aggregate([{ $match: { status: 'active' } }, { $group: { _id: '$severity', count: { $sum: 1 } } }]),
            Alert.aggregate([
                { $match: { status: 'active' } },
                { $group: { _id: '$apiName', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 5 },
            ]),
            Alert.countDocuments({ status: 'active' }),
            Alert.countDocuments({ status: 'active', messageSource: 'llm' }),
        ]);
        const sev = Object.fromEntries(bySeverity.map((s) => [s._id, s.count]));
        return {
            active: total,
            critical: sev.critical || 0,
            warning: sev.warning || 0,
            aiGenerated: llm,
            topApis: byApi.map((a) => ({ apiName: a._id, count: a.count })),
        };
    }

    resolve(id) {
        return Alert.findOneAndUpdate(
            { _id: id, status: 'active' },
            { $set: { status: 'resolved', resolvedAt: new Date() } },
            { new: true }
        );
    }

    markEmailSent(id) {
        return Alert.findByIdAndUpdate(id, { $set: { emailSent: true } });
    }
}

export default new AlertRepository();