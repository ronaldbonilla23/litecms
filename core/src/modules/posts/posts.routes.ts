import { Router } from 'express';
import * as postsController from './posts.controller';
import { verifyToken } from '../auth/auth.middleware';

const router = Router();

/**
 * ============================================================================
 * POSTS ROUTES
 * ============================================================================
 * Rutas públicas y protegidas para gestión de posts
 * ============================================================================
 */

// Rutas PÚBLICAS (cualquiera puede leer posts publicados)
router.get('/', postsController.getAllPosts); // Listar posts (con filtros)
router.get('/slug/:slug', postsController.getPostBySlug); // Obtener post por slug
router.get('/:id/related', postsController.getRelatedPosts); // Posts relacionados

// Rutas PROTEGIDAS (requieren autenticación)
router.get('/:id', verifyToken, postsController.getPostById); // Obtener post por ID (admin)
router.post('/', verifyToken, postsController.createPost); // Crear nuevo post
router.put('/:id', verifyToken, postsController.updatePost); // Actualizar post
router.delete('/:id', verifyToken, postsController.deletePost); // Eliminar post

export default router;
