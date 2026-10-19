import express from 'express';
import config from '../../../shared/config/index.js';
import AppError from '../../../shared/utils/AppError.js';
import container from '../Dependencies/dependencies.js';

const router = express.Router();
const { monitorController } = container.controllers;


function monitorAuth(req, res, next) {
    const expected = config.alerts.monitorApiKey;
    if (!expected) return next();
    if (req.get('x-monitor-key') !== expected) return next(new AppError('Invalid or missing x-monitor-key', 401));
    next();
}

router.post('/', monitorAuth, (req, res, next) => monitorController.monitor(req, res, next));

export default router;
