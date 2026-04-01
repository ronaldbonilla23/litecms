import type { Request, Response, NextFunction } from 'express';
import db from '../../database';
import { AuthRequest } from '../auth/auth.middleware';
import { compileTailwindCSS } from '../../services/tailwind.service';

export const createTemplate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { name, type, content, is_active } = req.body;

        if (!name || !type || !content) {
            res.status(400).json({ error: 'Nombre, tipo y contenido son obligatorios' });
            return;
        }

        // Obtener theme settings y compilar CSS
        const themeSettings = await db('theme_settings').first();

        // Insertar PRIMERO para obtener el ID
        const [id] = await db('templates').insert({
            id: crypto.randomUUID(),
            name,
            type,
            content: typeof content === 'string' ? content : JSON.stringify(content),
            is_active: is_active ?? true
        });

        // Compilar CSS y guardar en archivo DESPUÉS de tener el ID
        const compiledCss = await compileTailwindCSS(content, themeSettings || {}, `template-${id}`);

        // Actualizar la plantilla con el CSS compilado
        if (compiledCss && compiledCss.length > 0) {
            await db('templates').where({ id }).update({ compiled_css: compiledCss });
        }

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

        // Compilar CSS si el contenido cambió
        if (content !== undefined) {
            updateData.content = typeof content === 'string' ? content : JSON.stringify(content);
            const themeSettings = await db('theme_settings').first();
            const compiledCss = await compileTailwindCSS(content, themeSettings || {}, `template-${id}`);
            updateData.compiled_css = compiledCss;
        }

        const updatedCount = await db('templates').where({ id }).update(updateData);

        if (updatedCount === 0) {
            res.status(404).json({ error: 'La plantilla solicitada no existe o no se pudo actualizar' });
            return;
        }

        res.json({ message: 'Plantilla actualizada con éxito' });
    } catch (error) {
        next(error);
    }
};

export const deleteTemplate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;

        const deletedCount = await db('templates').where({ id }).delete();

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

        res.json({ message: 'Estado de la plantilla actualizado', is_active: !template.is_active });
    } catch (error) {
        next(error);
    }
};
