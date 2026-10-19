import express from 'express';
import container from '../Dependencies/dependencies.js';

const router = express.Router();
const { alertController } = container.controllers;

router.get('/', (req, res, next) => alertController.list(req, res, next));
router.get('/stats', (req, res, next) => alertController.stats(req, res, next));
router.patch('/:id/resolve', (req, res, next) => alertController.resolve(req, res, next));

export default router;
