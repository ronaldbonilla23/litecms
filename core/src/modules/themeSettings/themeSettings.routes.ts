import { Router } from 'express';
import { getThemeSettings, updateThemeSettings } from './themeSettings.controller';
import { verifyToken } from '../auth/auth.middleware';

const router = Router();

// Endpoint: GET /api/theme-settings
router.get('/', getThemeSettings);

// Endpoint: PUT /api/theme-settings (solo usuarios autenticados)
router.put('/', verifyToken, updateThemeSettings);

export default router;