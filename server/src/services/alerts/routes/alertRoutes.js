import express from 'express';
import container from '../Dependencies/dependencies.js';
import authenticate from '../../../shared/middlewares/authenticate.js';

const router = express.Router();
const { alertController } = container.controllers;

router.get('/', (req, res, next) => alertController.list(req, res, next));
router.get('/email-status', authenticate, (req, res, next) => alertController.emailStatus(req, res, next));
router.post('/email-test', authenticate, (req, res, next) => alertController.emailTest(req, res, next));
router.get('/stats', (req, res, next) => alertController.stats(req, res, next));
router.patch('/:id/resolve', (req, res, next) => alertController.resolve(req, res, next));

export default router;
