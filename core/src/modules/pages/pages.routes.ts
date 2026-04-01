import { Router } from 'express';
import { createPage, getPageBySlug, getAllPages, updatePage, getPageById, deletePage } from './pages.controller';
import { verifyToken } from '../auth/auth.middleware';

const router = Router();

// Rutas públicas (por slug) - Usar Query Params
router.get('/by-slug', getPageBySlug);

// Rutas protegidas
router.get('/', verifyToken, getAllPages);
router.get('/:id', verifyToken, getPageById);
router.post('/', verifyToken, createPage);
router.put('/:id', verifyToken, updatePage);
router.delete('/:id', verifyToken, deletePage);

export default router;