import type { Request, Response, NextFunction } from 'express';
import db from '../../database';
import { AuthRequest } from '../auth/auth.middleware';
import { PageSchema, PageUpdateSchema } from '../../../../shared/types';
import { ZodError } from 'zod';
import { buildPageLayoutHtml, compilePageCss } from '../render/css.service';
import { recordSlugChange } from '../redirects/redirects.service';
import { config } from '../../config';

export const createPage = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const validation = PageSchema.safeParse(req.body);

        if (!validation.success) {
            console.error('[Pages Controller] Validation error:', validation.error.flatten().fieldErrors);
            res.status(400).json({
                error: 'Datos inválidos',
                details: validation.error.flatten().fieldErrors
            });
            return;
        }

        const { title, slug, fields, status, header_id, footer_id, content, meta_title, meta_description, canonical_url, og_image_id } = validation.data;

        // Insertamos PRIMERO para obtener el ID
        const [id] = await db('pages').insert({
            title,
            slug,
            fields: JSON.stringify(fields || {}),
            content: content || null,
            header_id: header_id || null,
            footer_id: footer_id || null,
            status: status || 'draft',
            author_id: (req.user as any)?.id,
            meta_title: meta_title || null,
            meta_description: meta_description || null,
            canonical_url: canonical_url || null,
            og_image_id: og_image_id || null
        });

        // Compilar y guardar CSS Maestro combinado
        await compilePageCss(Number(id));

        res.status(201).json({ message: 'Página creada', id });
    } catch (error: any) {
        console.error('[Pages Controller] Error:', error.message);
        if (error.message.includes('UNIQUE constraint failed')) {
            res.status(400).json({ error: 'El slug ya está en uso' });
            return;
        }
        next(error);
    }
};

// Función para obtener una página específica por su SLUG
export const getPageBySlug = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        let { url } = req.query;
        if (!url || typeof url !== 'string') {
            res.status(400).json({ error: 'Falta el parámetro de URL' });
            return;
        }

        let slug = url.trim();
        if (slug !== '/' && !slug.startsWith('/')) {
            slug = '/' + slug;
        }

        const page = await db('pages').where({ slug }).first();

        // Los borradores solo son visibles para usuarios autenticados (vista previa)
        if (!page || (!req.user && page.status !== 'published')) {
            res.status(404).json({ error: 'La página solicitada no existe' });
            return;
        }

        if (page.fields && typeof page.fields === 'string') {
            page.fields = JSON.parse(page.fields);
        }

        // 1-2. HTML unificado: header + contenido + footer
        const fullHtml = await buildPageLayoutHtml(page);

        // 3. Obtener o compilar el CSS Maestro precompilado
        let compiledCss = page.compiled_css;
        if (!compiledCss) {
            compiledCss = await compilePageCss(page.id);
        }

        // 4. Obtener OG image URL si existe
        let og_image_url = null;
        if (page.og_image_id) {
            const ogImage = await db('media').where({ id: page.og_image_id }).first('filename');
            if (ogImage) {
                og_image_url = `${config.siteUrl}/uploads/${ogImage.filename}`;
            }
        }

        // 5. Devolver la página con el HTML ensamblado, el CSS unificado y datos SEO
        res.json({
            ...page,
            full_html: fullHtml,
            master_css: compiledCss,
            og_image_url
        });
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
        const validation = PageUpdateSchema.safeParse(req.body);

        if (!validation.success) {
            res.status(400).json({
                error: 'Datos de actualización inválidos',
                details: validation.error.flatten().fieldErrors
            });
            return;
        }

        const { title, slug, fields, status, header_id, footer_id, content, meta_title, meta_description, canonical_url, og_image_id } = validation.data;

        const updateData: any = {
            updated_at: db.fn.now()
        };

        if (title !== undefined) updateData.title = title;
        if (slug !== undefined) updateData.slug = slug;
        if (status !== undefined) updateData.status = status;
        if (fields !== undefined) updateData.fields = JSON.stringify(fields);
        if (header_id !== undefined) updateData.header_id = header_id;
        if (footer_id !== undefined) updateData.footer_id = footer_id;
        if (meta_title !== undefined) updateData.meta_title = meta_title;
        if (meta_description !== undefined) updateData.meta_description = meta_description;
        if (canonical_url !== undefined) updateData.canonical_url = canonical_url;
        if (og_image_id !== undefined) updateData.og_image_id = og_image_id;

        if (content !== undefined) updateData.content = content;

        const previous = await db('pages').where({ id }).first('slug');
        const updatedCount = await db('pages').where({ id }).update(updateData);

        if (updatedCount === 0) {
            res.status(404).json({ error: 'La página solicitada no existe o no se pudo actualizar' });
            return;
        }

        // Compilar y guardar CSS Maestro si cambió el contenido, header, footer
        if (content !== undefined || header_id !== undefined || footer_id !== undefined) {
            await compilePageCss(Number(id));
        }

        // Si cambió la URL, la anterior redirige (301) a la nueva para no perder SEO
        if (previous && slug !== undefined) {
            await recordSlugChange(previous.slug, slug);
        }

        res.json({ message: 'Página actualizada con éxito' });
    } catch (error) {
        next(error);
    }
};

export const deletePage = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;

        const deletedCount = await db('pages').where({ id }).delete();

        if (deletedCount === 0) {
            res.status(404).json({ error: 'La página solicitada no existe' });
            return;
        }

        res.json({ message: 'Página eliminada con éxito' });
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