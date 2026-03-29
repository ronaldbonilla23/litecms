import { Router } from 'express';
import { createPage, getPageBySlug, getAllPages, updatePage, getPageById } from './pages.controller';
import { verifyToken } from '../auth/auth.middleware';

const router = Router();

// Solo los usuarios con token válido pueden crear páginas
router.get('/', verifyToken, getAllPages);
router.get('/:id', verifyToken, getPageById);
router.post('/', verifyToken, createPage);
router.put('/:id', verifyToken, updatePage);

// Ruta pública (por slug)
router.get('/:slug', getPageBySlug);

export default router;