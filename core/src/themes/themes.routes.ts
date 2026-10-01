import { Router } from 'express';
import type { Response, NextFunction } from 'express';
import { verifyToken, type AuthRequest } from '../modules/auth/auth.middleware';
import { applyTheme, discoverThemes, getActiveTheme } from './themes.service';

/**
 * Gestión de temas desde el admin: /api/extensions/themes
 */
const router = Router();
router.use(verifyToken);

router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const active = await getActiveTheme();
        res.json(discoverThemes().map((theme) => ({
            name: theme.manifest?.name ?? theme.folder,
            manifest: theme.manifest,
            error: theme.error,
            active: theme.folder === active,
        })));
    } catch (error) {
        next(error);
    }
});

router.post('/:name/apply', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const name = String(req.params.name);
        if (!discoverThemes().some((theme) => theme.folder === name)) {
            res.status(404).json({ error: 'El tema no existe' });
            return;
        }
        const authorId = (req.user as { id?: number } | undefined)?.id;
        res.json({ message: 'Tema aplicado', report: await applyTheme(name, authorId) });
    } catch (error: any) {
        // Errores del propio tema (archivo faltante, referencia inválida): culpa del tema, no del servidor
        if (error.message?.startsWith('theme.json') || error.message?.includes('no declarada') || error.code === 'ENOENT') {
            res.status(422).json({ error: error.message });
            return;
        }
        next(error);
    }
});

export default router;
