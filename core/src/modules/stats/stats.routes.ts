import { Router } from 'express';
import { getStats } from './stats.controller';
import { verifyToken } from '../auth/auth.middleware';

const router = Router();

router.get('/', verifyToken, getStats);

export default router;
