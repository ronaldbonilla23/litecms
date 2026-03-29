import type { Request, Response, NextFunction } from 'express';
import db from '../../database';
import { AuthRequest } from '../auth/auth.middleware';

export const createPage = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { title, slug, fields, status } = req.body;

        if (!title || !slug) {
            res.status(400).json({ error: 'Título y Slug son obligatorios' });
            return;
        }

        // Insertamos en SQLite. Knex se encarga de convertir el objeto 'fields' a JSON
        const [id] = await db('pages').insert({
            title,
            slug,
            fields: JSON.stringify(fields || {}),
            status: status || 'draft',
            author_id: (req.user as any)?.id // Tomamos el ID del administrador del token
        });

        res.status(201).json({ message: 'Página creada', id });
    } catch (error: any) {
        if (error.message.includes('UNIQUE constraint failed')) {
            res.status(400).json({ error: 'El slug ya está en uso' });
            return;
        }
        next(error);
    }
};

// Función para obtener una página específica por su SLUG
export const getPageBySlug = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { slug } = req.params; // Sacamos el nombre (ej: "inicio") de la URL

        const page = await db('pages').where({ slug }).first();

        if (!page) {
            res.status(404).json({ error: 'La página solicitada no existe' });
            return;
        }

        // TRUCO SENIOR: SQLite guarda el JSON como texto. 
        // Aquí lo convertimos de nuevo a un objeto de JavaScript para que React lo entienda.
        if (page.fields && typeof page.fields === 'string') {
            page.fields = JSON.parse(page.fields);
        }

        res.json(page);
    } catch (error) {
        next(error);
    }
};

export const getAllPages = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const pages = await db('pages')
            .select('id', 'title', 'slug', 'status', 'created_at')
            .orderBy('created_at', 'desc');

        res.json(pages);
    } catch (error) {
        next(error);
    }
};

export const updatePage = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;
        const { title, fields, status } = req.body;

        const updateData: any = {
            updated_at: db.fn.now()
        };

        if (title !== undefined) updateData.title = title;
        if (status !== undefined) updateData.status = status;
        if (fields !== undefined) updateData.fields = JSON.stringify(fields);

        const updatedCount = await db('pages').where({ id }).update(updateData);

        if (updatedCount === 0) {
            res.status(404).json({ error: 'La página solicitada no existe o no se pudo actualizar' });
            return;
        }

        res.json({ message: 'Página actualizada con éxito' });
    } catch (error) {
        next(error);
    }
};

export const getPageById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;
        const page = await db('pages').where({ id }).first();

        if (!page) {
            res.status(404).json({ error: 'La página solicitada no existe' });
            return;
        }

        if (page.fields && typeof page.fields === 'string') {
            page.fields = JSON.parse(page.fields);
        }

        res.json(page);
    } catch (error) {
        next(error);
    }
};