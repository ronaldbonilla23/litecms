import { Router } from 'express';
import * as tagsController from './tags.controller';
import { verifyToken } from '../auth/auth.middleware';

const router = Router();

/**
 * ============================================================================
 * TAGS ROUTES
 * ============================================================================
 * Rutas públicas y protegidas para gestión de tags
 * ============================================================================
 */

// Rutas PÚBLICAS (cualquiera puede leer tags)
router.get('/', tagsController.getAllTags); // Listar todos los tags
router.get('/popular', tagsController.getPopularTags); // Tags populares
router.get('/slug/:slug', tagsController.getTagBySlug); // Obtener por slug con posts
router.get('/:id', tagsController.getTagById); // Obtener por ID

// Rutas PROTEGIDAS (requieren autenticación)
router.post('/', verifyToken, tagsController.createTag); // Crear tag
router.put('/:id', verifyToken, tagsController.updateTag); // Actualizar tag
router.delete('/:id', verifyToken, tagsController.deleteTag); // Eliminar tag

export default router;
