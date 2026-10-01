import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../auth/auth.middleware';
import { ContentTypeSchema } from '../../../../shared/contentTypes';
import * as service from './contentTypes.service';

const router = Router();

// Todo el módulo es de administración: requiere sesión
router.use(verifyToken);

const parseId = (req: Request): number => Number(req.params.id);

const validationError = (res: Response, error: { flatten: () => { fieldErrors: unknown; formErrors: unknown } }) => {
    const { fieldErrors, formErrors } = error.flatten();
    res.status(400).json({ error: 'Datos del tipo de contenido inválidos', details: fieldErrors, form: formErrors });
};

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
        res.json(await service.listContentTypes());
    } catch (error) {
        next(error);
    }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const type = await service.getContentType({ id: parseId(req) });
        if (!type) {
            res.status(404).json({ error: 'El tipo de contenido no existe' });
            return;
        }
        res.json(type);
    } catch (error) {
        next(error);
    }
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const validation = ContentTypeSchema.safeParse(req.body);
        if (!validation.success) return validationError(res, validation.error);
        res.status(201).json(await service.createContentType(validation.data));
    } catch (error) {
        next(error);
    }
});

router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Los campos que vienen deben ser válidos; los que no vienen no se tocan
        const validation = ContentTypeSchema.partial().safeParse(req.body);
        if (!validation.success) return validationError(res, validation.error);

        const input = Object.fromEntries(
            Object.entries(validation.data).filter(([key]) => key in (req.body ?? {}))
        );
        res.json(await service.updateContentType(parseId(req), input));
    } catch (error) {
        next(error);
    }
});

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
        await service.deleteContentType(parseId(req), req.query.force === 'true');
        res.json({ message: 'Tipo de contenido eliminado' });
    } catch (error) {
        next(error);
    }
});

export default router;
