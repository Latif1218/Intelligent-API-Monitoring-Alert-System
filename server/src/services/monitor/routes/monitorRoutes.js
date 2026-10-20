import express from 'express';
import jwt from 'jsonwebtoken';
import config from '../../../shared/config/index.js';
import AppError from '../../../shared/utils/AppError.js';
import container from '../Dependencies/dependencies.js';

const router = express.Router();
const { monitorController } = container.controllers;

function monitorAuth(req, res, next) {
    const expected = config.alerts.monitorApiKey;
    if (!expected) return next();
    if (req.get('x-monitor-key') === expected) return next();

    const token = req.cookies?.authToken;
    if (token) {
        try {
            jwt.verify(token, config.jwt.secret);
            return next();
        } catch {
            /* expired or invalid cookie: fall through to 401 */
        }
    }
    return next(new AppError('Invalid or missing x-monitor-key (or log in to the dashboard)', 401));
}

router.post('/', monitorAuth, (req, res, next) => monitorController.monitor(req, res, next));

export default router;
