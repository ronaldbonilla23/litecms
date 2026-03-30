import { Router } from 'express';
import { getThemeSettings, updateThemeSettings } from './themeSettings.controller';
// Si tienes un middleware de autenticación, impórtalo aquí
// import { requireAuth } from '../../middlewares/auth.middleware';

const router = Router();

// Endpoint: GET /api/theme-settings
router.get('/', getThemeSettings);

// Endpoint: PUT /api/theme-settings
// Aquí puedes inyectar tu middleware para que solo el admin pueda guardar colores:
// router.put('/', requireAuth, updateThemeSettings);
router.put('/', updateThemeSettings);

export default router;