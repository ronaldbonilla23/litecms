import { Router } from 'express';
import * as templatesController from './templates.controller';
import { verifyToken } from '../auth/auth.middleware';

const router = Router();

// Rutas públicas
router.get('/', templatesController.getAllTemplates);
router.get('/:id', templatesController.getTemplateById);

// Rutas protegidas
router.post('/', verifyToken, templatesController.createTemplate);
router.put('/:id', verifyToken, templatesController.updateTemplate);
router.delete('/:id', verifyToken, templatesController.deleteTemplate);
router.post('/:id/toggle-active', verifyToken, templatesController.toggleTemplateActive);

export default router;
