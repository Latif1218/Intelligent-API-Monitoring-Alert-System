import ResponseFormatter from '../../../shared/utils/responseFormatter.js';

export class MonitorController {
    constructor({ monitorService }) {
        if (!monitorService) throw new Error('MonitorController requires monitorService');
        this.monitorService = monitorService;
    }

    
    async monitor(req, res, next) {
        try {
            const result = await this.monitorService.processBatch(req.body);
            res.status(200).json(ResponseFormatter.success(result, 'Batch processed'));
        } catch (err) {
            next(err);
        }
    }
}
