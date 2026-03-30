import { Router } from 'express';
import * as templatesController from './templates.controller';
import { authMiddleware } from '../auth/auth.middleware';

const router = Router();

// Rutas públicas
router.get('/', templatesController.getAllTemplates);
router.get('/:id', templatesController.getTemplateById);

// Rutas protegidas
router.post('/', authMiddleware, templatesController.createTemplate);
router.put('/:id', authMiddleware, templatesController.updateTemplate);
router.delete('/:id', authMiddleware, templatesController.deleteTemplate);
router.post('/:id/toggle-active', authMiddleware, templatesController.toggleTemplateActive);

export default router;
