import ResponseFormatter from '../../../shared/utils/responseFormatter.js';

export class AlertController {
    constructor({ alertService }) {
        if (!alertService) throw new Error('AlertController requires alertService');
        this.alertService = alertService;
    }

    /** GET /alerts : active anomalies (supports ?status=&severity=&apiName=&page=&limit=) */
    async list(req, res, next) {
        try {
            const { items, page, limit, total } = await this.alertService.listAlerts(req.query);
            res.status(200).json(ResponseFormatter.paginated(items, page, limit, total));
        } catch (err) {
            next(err);
        }
    }

    async stats(req, res, next) {
        try {
            res.status(200).json(ResponseFormatter.success(await this.alertService.getStats(), 'Alert stats'));
        } catch (err) {
            next(err);
        }
    }

    async emailStatus(req, res, next) {
        try {
            res.status(200).json(ResponseFormatter.success(await this.alertService.getEmailStatus(), 'Email status'));
        } catch (err) {
            next(err);
        }
    }

    async emailTest(req, res, next) {
        try {
            const result = await this.alertService.sendTestEmail();
            res.status(200).json(ResponseFormatter.success(result, result.message));
        } catch (err) {
            next(err);
        }
    }

    async resolve(req, res, next) {
        try {
            const alert = await this.alertService.resolveAlert(req.params.id);
            res.status(200).json(ResponseFormatter.success(alert, 'Alert resolved'));
        } catch (err) {
            next(err);
        }
    }
}
