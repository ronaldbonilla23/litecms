import { Router } from 'express';
import type { Response, NextFunction } from 'express';
import { verifyToken, type AuthRequest } from '../auth/auth.middleware';
import { EntrySchema, EntryUpdateSchema } from '../../../../shared/contentTypes';
import { getContentType } from '../contentTypes/contentTypes.service';
import * as service from './entries.service';
import { fireAction } from '../../plugins/hooks';

const router = Router();

// Todo el módulo es de administración: requiere sesión
router.use(verifyToken);

const handleError = (error: unknown, res: Response, next: NextFunction) => {
    if (error instanceof service.EntryValidationError) {
        res.status(400).json({ error: error.message, details: { data: error.details } });
        return;
    }
    next(error);
};

const badRequest = (res: Response, error: { flatten: () => { fieldErrors: unknown } }) =>
    res.status(400).json({ error: 'Datos de la entrada inválidos', details: error.flatten().fieldErrors });

// GET /api/entries?type=proyectos&status=published
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const type = typeof req.query.type === 'string' ? await getContentType({ slug: req.query.type }) : null;
        if (!type) {
            res.status(400).json({ error: 'Indica un tipo de contenido válido (?type=slug)' });
            return;
        }
        const status = typeof req.query.status === 'string' ? req.query.status : undefined;
        res.json(await service.listEntries(type.id, status ? { status } : {}));
    } catch (error) {
        handleError(error, res, next);
    }
});

router.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const entry = await service.getEntry(Number(req.params.id));
        if (!entry) {
            res.status(404).json({ error: 'La entrada no existe' });
            return;
        }
        res.json(entry);
    } catch (error) {
        handleError(error, res, next);
    }
});

// POST /api/entries  { type_id, title, slug?, status, data: { ...campos } }
router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const typeId = Number(req.body?.type_id);
        if (!Number.isInteger(typeId) || typeId <= 0) {
            res.status(400).json({ error: 'type_id es obligatorio' });
            return;
        }
        const validation = EntrySchema.safeParse(req.body);
        if (!validation.success) return badRequest(res, validation.error);

        const authorId = (req.user as { id?: number } | undefined)?.id;
        const entry = await service.createEntry(typeId, validation.data, authorId);
        fireAction('entry.saved', entry);
        res.status(201).json(entry);
    } catch (error) {
        handleError(error, res, next);
    }
});

router.put('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const validation = EntryUpdateSchema.safeParse(req.body);
        if (!validation.success) return badRequest(res, validation.error);
        const entry = await service.updateEntry(Number(req.params.id), validation.data);
        fireAction('entry.saved', entry);
        res.json(entry);
    } catch (error) {
        handleError(error, res, next);
    }
});

router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        await service.deleteEntry(Number(req.params.id));
        fireAction('entry.deleted', { id: Number(req.params.id) });
        res.json({ message: 'Entrada eliminada' });
    } catch (error) {
        handleError(error, res, next);
    }
});

export default router;
