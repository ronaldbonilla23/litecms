import { Router } from 'express';
import * as categoriesController from './categories.controller';
import { verifyToken } from '../auth/auth.middleware';

const router = Router();

/**
 * ============================================================================
 * CATEGORIES ROUTES
 * ============================================================================
 * Rutas públicas y protegidas para gestión de categorías
 * ============================================================================
 */

// Rutas PÚBLICAS (cualquiera puede leer categorías)
router.get('/', categoriesController.getAllCategories); // Listar categorías
router.get('/tree', categoriesController.getCategoriesTree); // Árbol jerárquico
router.get('/slug/:slug', categoriesController.getCategoryBySlug); // Obtener por slug con posts
router.get('/:id', categoriesController.getCategoryById); // Obtener por ID

// Rutas PROTEGIDAS (requieren autenticación)
router.post('/', verifyToken, categoriesController.createCategory); // Crear categoría
router.put('/:id', verifyToken, categoriesController.updateCategory); // Actualizar categoría
router.delete('/:id', verifyToken, categoriesController.deleteCategory); // Eliminar categoría

export default router;
