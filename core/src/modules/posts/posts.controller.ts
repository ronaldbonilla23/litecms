import type { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../auth/auth.middleware';
import * as postsService from './posts.service';

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
export const getAllPosts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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

    const filters = {
      status: status as string,
      category_id: category ? parseInt(category as string, 10) : undefined,
      tag_id: tag ? parseInt(tag as string, 10) : undefined,
      author_id: author ? parseInt(author as string, 10) : undefined,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 10,
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
export const getPostBySlug = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { slug } = req.params;

    const post = await postsService.getBySlug(slug);

    if (!post) {
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
    const { id } = req.params;

    const post = await postsService.getById(parseInt(id, 10));

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
    const { id } = req.params;
    const limit = parseInt(req.query.limit as string, 10) || 3;

    const related = await postsService.getRelated(parseInt(id, 10), limit);

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
      excerpt,
      content,
      featured_image_id,
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
      excerpt,
      content,
      featured_image_id,
      status,
      published_at,
      scheduled_for,
      meta_title,
      meta_description,
      canonical_url,
      category_ids,
      tag_ids
    }, (req.user as any)?.id);

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
    const { id } = req.params;

    await postsService.update(parseInt(id, 10), req.body);

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
    const { id } = req.params;

    await postsService.deletePost(parseInt(id, 10));

    res.json({ message: 'Post eliminado exitosamente' });
  } catch (error) {
    next(error);
  }
};
