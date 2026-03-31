import type { Request, Response, NextFunction } from 'express';
import db from '../../database';
import { AuthRequest } from '../auth/auth.middleware';
import { PageSchema } from '../../../../shared/types';
import { ZodError } from 'zod';

export const createPage = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const validation = PageSchema.safeParse(req.body);

        if (!validation.success) {
            res.status(400).json({
                error: 'Datos inválidos',
                details: validation.error.flatten().fieldErrors
            });
            return;
        }

        const { title, slug, fields, status, header_id, footer_id, content } = validation.data;

        // Insertamos en SQLite. Knex se encarga de convertir el objeto 'fields' a JSON
        const [id] = await db('pages').insert({
            title,
            slug,
            fields: JSON.stringify(fields || {}),
            content: content || null,
            header_id: header_id || null,
            footer_id: footer_id || null,
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

        // El esquema de actualización es parcial ya que no requerimos todos los campos
        const validation = PageSchema.partial().safeParse(req.body);

        if (!validation.success) {
            res.status(400).json({
                error: 'Datos de actualización inválidos',
                details: validation.error.flatten().fieldErrors
            });
            return;
        }

        const { title, fields, status, header_id, footer_id, content } = validation.data;

        const updateData: any = {
            updated_at: db.fn.now()
        };

        if (title !== undefined) updateData.title = title;
        if (status !== undefined) updateData.status = status;
        if (fields !== undefined) updateData.fields = JSON.stringify(fields);
        if (content !== undefined) updateData.content = content;
        if (header_id !== undefined) updateData.header_id = header_id;
        if (footer_id !== undefined) updateData.footer_id = footer_id;

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