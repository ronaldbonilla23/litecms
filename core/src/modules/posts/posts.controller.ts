import type { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../auth/auth.middleware';
import * as postsService from './posts.service';
import { compileTailwindCSS } from '../../services/tailwind.service';
import db from '../../database';

/**
 * ============================================================================
 * POSTS CONTROLLER
 * ============================================================================
 * Controller delgado - toda la lógica está en el service
 * ============================================================================
 */

// ----------------------------------------------------------------------------
// GET /api/posts - Listar todos los posts (con filtros y paginación)
// ----------------------------------------------------------------------------
export const getAllPosts = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const {
      status,
      category,
      tag,
      author,
      page,
      limit,
      sort,
      order
    } = req.query;

    const filters: postsService.PostFilters = {
      // Los visitantes solo ven publicados; el filtro por estado es exclusivo del admin
      status: req.user ? (status as string) : 'published',
      category_id: category ? parseInt(category as string, 10) : undefined,
      tag_id: tag ? parseInt(tag as string, 10) : undefined,
      author_id: author ? parseInt(author as string, 10) : undefined,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? Math.min(parseInt(limit as string, 10) || 10, 100) : 10,
      sort: sort as string || 'published_at',
      order: (order as 'ASC' | 'DESC') || 'DESC'
    };

    const result = await postsService.getAll(filters);

    res.json(result);
  } catch (error) {
    console.error('Error en getAllPosts:', error);
    next(error);
  }
};

// ----------------------------------------------------------------------------
// GET /api/posts/:slug - Obtener post por slug (público)
// ----------------------------------------------------------------------------
export const getPostBySlug = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;

    if (!slug) {
      res.status(400).json({ error: 'Slug es requerido' });
      return;
    }

    const post = await postsService.getBySlug(slug);

    // Un borrador solo lo puede ver un usuario autenticado (vista previa)
    if (!post || (!req.user && post.metadata.status !== 'published')) {
      res.status(404).json({ error: 'Post no encontrado' });
      return;
    }

    res.json(post);
  } catch (error) {
    next(error);
  }
};

// ----------------------------------------------------------------------------
// GET /api/posts/:id - Obtener post por ID (admin)
// ----------------------------------------------------------------------------
export const getPostById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    if (!idParam) {
      res.status(400).json({ error: 'ID es requerido' });
      return;
    }

    const id = parseInt(idParam, 10);

    const post = await postsService.getById(id);

    if (!post) {
      res.status(404).json({ error: 'Post no encontrado' });
      return;
    }

    res.json(post);
  } catch (error) {
    console.error('Error en getPostById:', error);
    next(error);
  }
};

// ----------------------------------------------------------------------------
// GET /api/posts/:id/related - Obtener posts relacionados
// ----------------------------------------------------------------------------
export const getRelatedPosts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    if (!idParam) {
      res.status(400).json({ error: 'ID es requerido' });
      return;
    }

    const id = parseInt(idParam, 10);
    const limit = parseInt(req.query.limit as string, 10) || 3;

    const related = await postsService.getRelated(id, limit);

    res.json({ related });
  } catch (error) {
    next(error);
  }
};

// ----------------------------------------------------------------------------
// POST /api/posts - Crear nuevo post
// ----------------------------------------------------------------------------
export const createPost = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const {
      title,
      slug,
      content,
      status,
      published_at,
      scheduled_for,
      meta_title,
      meta_description,
      canonical_url,
      category_ids,
      tag_ids
    } = req.body;

    // Validaciones básicas
    if (!title || !content) {
      res.status(400).json({ error: 'Título y contenido son obligatorios' });
      return;
    }

    const result = await postsService.create({
      title,
      slug,
      content,
      status,
      published_at,
      scheduled_for,
      meta_title,
      meta_description,
      canonical_url,
      category_ids,
      tag_ids
    }, (req.user as any)?.id);

    // Generar CSS maestro del post (al igual que las páginas)
    try {
      const themeSettings = await db('theme_settings').first();
      await compileTailwindCSS(content, themeSettings || {}, `master-post-${result.id}`);
    } catch (cssError) {
      console.error('[Posts Controller] Error generando CSS:', cssError);
      // No bloqueamos la creación del post si falla el CSS
    }

    res.status(201).json({
      message: 'Post creado exitosamente',
      ...result
    });
  } catch (error) {
    next(error);
  }
};

// ----------------------------------------------------------------------------
// PUT /api/posts/:id - Actualizar post
// ----------------------------------------------------------------------------
export const updatePost = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    if (!idParam) {
      res.status(400).json({ error: 'ID es requerido' });
      return;
    }

    const id = parseInt(idParam, 10);

    await postsService.update(id, req.body);

    // Regenerar CSS si el contenido cambió
    if (req.body.content) {
      try {
        const themeSettings = await db('theme_settings').first();
        await compileTailwindCSS(req.body.content, themeSettings || {}, `master-post-${id}`);
      } catch (cssError) {
        console.error('[Posts Controller] Error regenerando CSS:', cssError);
      }
    }

    res.json({ message: 'Post actualizado exitosamente' });
  } catch (error) {
    next(error);
  }
};

// ----------------------------------------------------------------------------
// DELETE /api/posts/:id - Eliminar post
// ----------------------------------------------------------------------------
export const deletePost = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    if (!idParam) {
      res.status(400).json({ error: 'ID es requerido' });
      return;
    }

    const id = parseInt(idParam, 10);

    await postsService.deletePost(id);

    res.json({ message: 'Post eliminado exitosamente' });
  } catch (error) {
    next(error);
  }
};
