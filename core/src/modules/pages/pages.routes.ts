import { Router } from 'express';
import { createPage, getPageBySlug, getAllPages, updatePage, getPageById } from './pages.controller';
import { verifyToken } from '../auth/auth.middleware';

const router = Router();

// Rutas públicas (por slug) - DEBEN IR PRIMERO
router.get('/slug/:slug', getPageBySlug);

// Rutas protegidas
router.get('/', verifyToken, getAllPages);
router.get('/:id', verifyToken, getPageById);
router.post('/', verifyToken, createPage);
router.put('/:id', verifyToken, updatePage);

export default router;