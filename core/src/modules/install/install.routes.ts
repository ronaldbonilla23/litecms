import { Router } from 'express';
import { installCMS } from './install.controller';

const router = Router();

// Esta ruta responderá a solicitudes POST en /api/install
router.post('/', installCMS);

export default router;