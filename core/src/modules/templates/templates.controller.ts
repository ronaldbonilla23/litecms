import type { Request, Response, NextFunction } from 'express';
import db from '../../database';
import { AuthRequest } from '../auth/auth.middleware';
import { invalidateCssForTemplate } from '../render/css.service';

export const createTemplate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { name, type, content, is_active } = req.body;

        if (!name || !type || !content) {
            res.status(400).json({ error: 'Nombre, tipo y contenido son obligatorios' });
            return;
        }

        // El UUID se genera aquí: en SQLite el insert devuelve el rowid, no la clave primaria
        const id = crypto.randomUUID();
        await db('templates').insert({
            id,
            name,
            type,
            content: typeof content === 'string' ? content : JSON.stringify(content),
            is_active: is_active ?? true
        });

        // Las páginas y posts que usan plantillas activas recompilan su CSS al siguiente render
        await invalidateCssForTemplate(id);

        res.status(201).json({ message: 'Plantilla creada', id });
    } catch (error: any) {
        if (error.message.includes('UNIQUE constraint failed')) {
            res.status(400).json({ error: 'El nombre de la plantilla ya está en uso' });
            return;
        }
        next(error);
    }
};

export const getAllTemplates = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { type, is_active } = req.query;

        let query = db('templates').select('id', 'name', 'type', 'content', 'is_active', 'created_at', 'updated_at');

        if (type) {
            query = query.where('type', type as string);
        }

        if (is_active !== undefined) {
            query = query.where('is_active', is_active === 'true');
        }

        const templates = await query.orderBy('created_at', 'desc');

        res.json(templates);
    } catch (error) {
        next(error);
    }
};

export const getTemplateById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;
        const template = await db('templates').where({ id }).first();

        if (!template) {
            res.status(404).json({ error: 'La plantilla solicitada no existe' });
            return;
        }

        // El contenido se guarda como string, no necesita parseo
        res.json(template);
    } catch (error) {
        next(error);
    }
};

export const updateTemplate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;
        const { name, type, content, is_active } = req.body;

        const updateData: any = {
            updated_at: db.fn.now()
        };

        if (name !== undefined) updateData.name = name;
        if (type !== undefined) updateData.type = type;
        if (is_active !== undefined) updateData.is_active = is_active;

        if (content !== undefined) {
            updateData.content = typeof content === 'string' ? content : JSON.stringify(content);
        }

        const updatedCount = await db('templates').where({ id }).update(updateData);

        if (updatedCount === 0) {
            res.status(404).json({ error: 'La plantilla solicitada no existe o no se pudo actualizar' });
            return;
        }

        // El HTML de la plantilla forma parte de las páginas/posts: su CSS debe recompilarse
        await invalidateCssForTemplate(String(id));

        res.json({ message: 'Plantilla actualizada con éxito' });
    } catch (error) {
        next(error);
    }
};

export const deleteTemplate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;

        const deletedCount = await db('templates').where({ id }).delete();
        if (deletedCount > 0) await invalidateCssForTemplate(String(id));

        if (deletedCount === 0) {
            res.status(404).json({ error: 'La plantilla solicitada no existe' });
            return;
        }

        res.json({ message: 'Plantilla eliminada con éxito' });
    } catch (error) {
        next(error);
    }
};

export const toggleTemplateActive = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;

        const template = await db('templates').where({ id }).first();

        if (!template) {
            res.status(404).json({ error: 'La plantilla solicitada no existe' });
            return;
        }

        await db('templates').where({ id }).update({
            is_active: !template.is_active,
            updated_at: db.fn.now()
        });

        await invalidateCssForTemplate(String(id));

        res.json({ message: 'Estado de la plantilla actualizado', is_active: !template.is_active });
    } catch (error) {
        next(error);
    }
};
