import type { Request, Response, NextFunction } from 'express';
import db from '../../database';
import { AuthRequest } from '../auth/auth.middleware';

/**
 * ============================================================================
 * TAGS CONTROLLER
 * ============================================================================
 * Maneja todas las operaciones CRUD para tags del blog
 * ============================================================================
 */

// ----------------------------------------------------------------------------
// GET /api/tags - Listar todos los tags
// ----------------------------------------------------------------------------
export const getAllTags = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { include_posts } = req.query;

    // Solo tags activos por defecto
    const tags = await db('tags')
      .where({ is_active: true })
      .orderBy('name');

    // Si se solicita, incluir conteo de posts por tag
    if (include_posts === 'true') {
      for (const tag of tags) {
        const postCount = await db('post_tag')
          .where({ tag_id: tag.id })
          .leftJoin('posts', 'post_tag.post_id', 'posts.id')
          .where('posts.status', 'published')
          .count('* as count');
        
        tag.post_count = parseInt((postCount[0] as any).count, 10);
      }
    }

    res.json(tags);
  } catch (error) {
    next(error);
  }
};

// ----------------------------------------------------------------------------
// GET /api/tags/popular - Obtener tags populares
// ----------------------------------------------------------------------------
export const getPopularTags = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string, 10) || 10;

    const popularTags = await db('tags')
      .leftJoin('post_tag', 'tags.id', 'post_tag.tag_id')
      .leftJoin('posts', 'post_tag.post_id', 'posts.id')
      .where({
        'tags.is_active': true,
        'posts.status': 'published'
      })
      .select(
        'tags.*',
        db.raw('COUNT(post_tag.tag_id) as post_count')
      )
      .groupBy('tags.id')
      .orderBy('post_count', 'DESC')
      .limit(limit);

    res.json(popularTags);
  } catch (error) {
    next(error);
  }
};

// ----------------------------------------------------------------------------
// GET /api/tags/:id - Obtener tag por ID
// ----------------------------------------------------------------------------
export const getTagById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const tag = await db('tags').where({ id }).first();

    if (!tag) {
      res.status(404).json({ error: 'Tag no encontrado' });
      return;
    }

    // Obtener posts con este tag
    const posts = await db('posts')
      .leftJoin('post_tag', 'posts.id', 'post_tag.post_id')
      .leftJoin('media', 'posts.featured_image_id', 'media.id')
      .where({
        'post_tag.tag_id': tag.id,
        'posts.status': 'published'
      })
      .select(
        'posts.id',
        'posts.title',
        'posts.slug',
        'posts.excerpt',
        'posts.published_at',
        'media.filename as featured_image'
      )
      .orderBy('posts.published_at', 'DESC');

    res.json({
      ...tag,
      posts
    });
  } catch (error) {
    next(error);
  }
};

// ----------------------------------------------------------------------------
// GET /api/tags/slug/:slug - Obtener tag por slug
// ----------------------------------------------------------------------------
export const getTagBySlug = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { slug } = req.params;

    const tag = await db('tags').where({ slug }).first();

    if (!tag) {
      res.status(404).json({ error: 'Tag no encontrado' });
      return;
    }

    // Obtener posts con este tag
    const posts = await db('posts')
      .leftJoin('post_tag', 'posts.id', 'post_tag.post_id')
      .leftJoin('media', 'posts.featured_image_id', 'media.id')
      .where({
        'post_tag.tag_id': tag.id,
        'posts.status': 'published'
      })
      .select(
        'posts.id',
        'posts.title',
        'posts.slug',
        'posts.excerpt',
        'posts.published_at',
        'media.filename as featured_image'
      )
      .orderBy('posts.published_at', 'DESC');

    res.json({
      ...tag,
      posts
    });
  } catch (error) {
    next(error);
  }
};

// ----------------------------------------------------------------------------
// POST /api/tags - Crear nuevo tag
// ----------------------------------------------------------------------------
export const createTag = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const {
      name,
      slug,
      color = '#C2F86C' // Color por defecto del tema
    } = req.body;

    // Validaciones básicas
    if (!name) {
      res.status(400).json({ error: 'El nombre es obligatorio' });
      return;
    }

    // Generar slug automático si no se proporciona
    let finalSlug = slug;
    if (!finalSlug) {
      finalSlug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    }

    // Verificar que el slug no exista
    const existingTag = await db('tags').where({ slug: finalSlug }).first();
    if (existingTag) {
      res.status(400).json({ error: 'El slug ya está en uso' });
      return;
    }

    // Insertar tag
    const [id] = await db('tags').insert({
      name,
      slug: finalSlug,
      color
    });

    res.status(201).json({ 
      message: 'Tag creado exitosamente', 
      id,
      slug: finalSlug
    });
  } catch (error) {
    next(error);
  }
};

// ----------------------------------------------------------------------------
// PUT /api/tags/:id - Actualizar tag
// ----------------------------------------------------------------------------
export const updateTag = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      name,
      slug,
      color,
      is_active
    } = req.body;

    // Verificar que el tag existe
    const existingTag = await db('tags').where({ id }).first();
    if (!existingTag) {
      res.status(404).json({ error: 'Tag no encontrado' });
      return;
    }

    // Preparar datos de actualización
    const updateData: any = {
      updated_at: db.fn.now()
    };

    if (name !== undefined) updateData.name = name;
    if (slug !== undefined) updateData.slug = slug;
    if (color !== undefined) updateData.color = color;
    if (is_active !== undefined) updateData.is_active = is_active;

    // Actualizar tag
    await db('tags').where({ id }).update(updateData);

    res.json({ message: 'Tag actualizado exitosamente' });
  } catch (error) {
    next(error);
  }
};

// ----------------------------------------------------------------------------
// DELETE /api/tags/:id - Eliminar tag
// ----------------------------------------------------------------------------
export const deleteTag = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    // Verificar que el tag existe
    const existingTag = await db('tags').where({ id }).first();
    if (!existingTag) {
      res.status(404).json({ error: 'Tag no encontrado' });
      return;
    }

    // Eliminar tag (las relaciones en post_tag se eliminan por CASCADE)
    await db('tags').where({ id }).delete();

    res.json({ message: 'Tag eliminado exitosamente' });
  } catch (error) {
    next(error);
  }
};
