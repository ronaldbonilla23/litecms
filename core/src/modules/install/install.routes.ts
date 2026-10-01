import { Router } from 'express';
import { installCMS, getInstallStatus } from './install.controller';

const router = Router();

router.get('/status', getInstallStatus);
router.post('/', installCMS);

export default router;
