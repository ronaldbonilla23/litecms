import type { Request, Response, NextFunction } from 'express';
import db from '../../database';
import { AuthRequest } from '../auth/auth.middleware';
import { compileTailwindCSS } from '../../services/tailwind.service';

/**
 * ============================================================================
 * POSTS CONTROLLER
 * ============================================================================
 * Maneja todas las operaciones CRUD para posts del blog
 * ============================================================================
 */

// ----------------------------------------------------------------------------
// GET /api/posts - Listar todos los posts (con filtros y paginación)
// ----------------------------------------------------------------------------
export const getAllPosts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const {
      status = 'published',
      category,
      tag,
      author,
      page = '1',
      limit = '10',
      sort = 'published_at',
      order = 'DESC'
    } = req.query;

    // Construir query base
    let query = db('posts')
      .leftJoin('users', 'posts.author_id', 'users.id')
      .select(
        'posts.*',
        'users.name as author_name',
        'users.email as author_email'
      );

    // Filtros
    if (status) {
      query = query.where('posts.status', status as string);
    }

    if (author) {
      query = query.where('posts.author_id', author as string);
    }

    // Filtro por categoría (usando subquery)
    if (category) {
      query = query.whereIn('posts.id', function () {
        this.select('post_id')
          .from('post_category')
          .where('category_id', category as string);
      });
    }

    // Filtro por tag (usando subquery)
    if (tag) {
      query = query.whereIn('posts.id', function () {
        this.select('post_id')
          .from('post_tag')
          .where('tag_id', tag as string);
      });
    }

    // Paginación
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const offset = (pageNum - 1) * limitNum;

    // Ordenamiento
    const orderDir = (order as string).toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
    query = query.orderBy(`posts.${sort}`, orderDir);

    // Obtener total para paginación
    const totalQuery = query.clone();
    const totalResult = await totalQuery.count('* as count');
    const total = parseInt((totalResult[0] as any).count, 10);

    // Aplicar paginación y obtener resultados
    const postsList = await query
      .limit(limitNum)
      .offset(offset);

    // Obtener categorías y tags para cada post
    const posts = await Promise.all(postsList.map(async (post) => {
      const [categories, tags] = await Promise.all([
        db('categories')
          .leftJoin('post_category', 'categories.id', 'post_category.category_id')
          .where('post_category.post_id', post.id)
          .select('categories.name'),
        db('tags')
          .leftJoin('post_tag', 'tags.id', 'post_tag.tag_id')
          .where('post_tag.post_id', post.id)
          .select('tags.name')
      ]);

      return {
        ...post,
        categories: categories.map(c => c.name).join(', '),
        tags: tags.map(t => t.name).join(', ')
      };
    }));

    res.json({
      posts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
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

    const post = await db('posts')
      .leftJoin('users', 'posts.author_id', 'users.id')
      .leftJoin('media', 'posts.featured_image_id', 'media.id')
      .select(
        'posts.*',
        'users.name as author_name',
        'users.email as author_email',
        'media.filename as featured_image',
        'media.url as featured_image_url'
      )
      .where('posts.slug', slug)
      .first();

    if (!post) {
      res.status(404).json({ error: 'Post no encontrado' });
      return;
    }

    // Obtener categorías del post
    const categories = await db('categories')
      .leftJoin('post_category', 'categories.id', 'post_category.category_id')
      .where('post_category.post_id', post.id)
      .select('categories.*');

    // Obtener tags del post
    const tags = await db('tags')
      .leftJoin('post_tag', 'tags.id', 'post_tag.tag_id')
      .where('post_tag.post_id', post.id)
      .select('tags.*');

    // Incrementar contador de vistas
    await db('posts')
      .where({ id: post.id })
      .increment('view_count', 1);

    res.json({
      ...post,
      categories,
      tags
    });
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

    const post = await db('posts')
      .leftJoin('users', 'posts.author_id', 'users.id')
      .leftJoin('media', 'posts.featured_image_id', 'media.id')
      .select(
        'posts.*',
        'users.name as author_name',
        'users.email as author_email',
        'media.filename as featured_image',
        'media.url as featured_image_url'
      )
      .where('posts.id', id)
      .first();

    if (!post) {
      res.status(404).json({ error: 'Post no encontrado' });
      return;
    }

    // Obtener categorías del post
    const categories = await db('categories')
      .leftJoin('post_category', 'categories.id', 'post_category.category_id')
      .where('post_category.post_id', post.id)
      .select('categories.id', 'categories.name', 'categories.slug', 'post_category.is_primary');

    // Obtener tags del post
    const tags = await db('tags')
      .leftJoin('post_tag', 'tags.id', 'post_tag.tag_id')
      .where('post_tag.post_id', post.id)
      .select('tags.id', 'tags.name', 'tags.slug');

    res.json({
      ...post,
      categories,
      tags
    });
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
      status = 'draft',
      published_at,
      scheduled_for,
      meta_title,
      meta_description,
      canonical_url,
      category_ids = [],
      tag_ids = []
    } = req.body;

    // Validaciones básicas
    if (!title || !content) {
      res.status(400).json({ error: 'Título y contenido son obligatorios' });
      return;
    }

    // Generar slug automático si no se proporciona
    let finalSlug = slug;
    if (!finalSlug) {
      finalSlug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    }

    // Verificar que el slug no exista
    const existingPost = await db('posts').where({ slug: finalSlug }).first();
    if (existingPost) {
      res.status(400).json({ error: 'El slug ya está en uso' });
      return;
    }

    // Insertar post
    const [id] = await db('posts').insert({
      title,
      slug: finalSlug,
      excerpt: excerpt || null,
      content,
      featured_image_id: featured_image_id || null,
      author_id: (req.user as any)?.id,
      status,
      published_at: published_at || null,
      scheduled_for: scheduled_for || null,
      meta_title: meta_title || null,
      meta_description: meta_description || null,
      canonical_url: canonical_url || null
    });

    // Asignar categorías
    if (category_ids.length > 0) {
      const categoryData = category_ids.map((catId: number, index: number) => ({
        post_id: id,
        category_id: catId,
        is_primary: index === 0 // Primera categoría es la principal
      }));
      await db('post_category').insert(categoryData);
    }

    // Asignar tags
    if (tag_ids.length > 0) {
      const tagData = tag_ids.map((tagId: number) => ({
        post_id: id,
        tag_id: tagId
      }));
      await db('post_tag').insert(tagData);
    }

    res.status(201).json({
      message: 'Post creado exitosamente',
      id,
      slug: finalSlug
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
      category_ids = [],
      tag_ids = []
    } = req.body;

    // Verificar que el post existe
    const existingPost = await db('posts').where({ id }).first();
    if (!existingPost) {
      res.status(404).json({ error: 'Post no encontrado' });
      return;
    }

    // Preparar datos de actualización
    const updateData: any = {
      updated_at: db.fn.now()
    };

    if (title !== undefined) updateData.title = title;
    if (slug !== undefined) updateData.slug = slug;
    if (excerpt !== undefined) updateData.excerpt = excerpt;
    if (content !== undefined) updateData.content = content;
    if (featured_image_id !== undefined) updateData.featured_image_id = featured_image_id;
    if (status !== undefined) updateData.status = status;
    if (published_at !== undefined) updateData.published_at = published_at;
    if (scheduled_for !== undefined) updateData.scheduled_for = scheduled_for;
    if (meta_title !== undefined) updateData.meta_title = meta_title;
    if (meta_description !== undefined) updateData.meta_description = meta_description;
    if (canonical_url !== undefined) updateData.canonical_url = canonical_url;

    // Actualizar post
    await db('posts').where({ id }).update(updateData);

    // Actualizar categorías (eliminar existentes y agregar nuevas)
    if (category_ids.length > 0) {
      await db('post_category').where({ post_id: id }).delete();
      const categoryData = category_ids.map((catId: number, index: number) => ({
        post_id: id,
        category_id: catId,
        is_primary: index === 0
      }));
      await db('post_category').insert(categoryData);
    }

    // Actualizar tags (eliminar existentes y agregar nuevos)
    if (tag_ids.length > 0) {
      await db('post_tag').where({ post_id: id }).delete();
      const tagData = tag_ids.map((tagId: number) => ({
        post_id: id,
        tag_id: tagId
      }));
      await db('post_tag').insert(tagData);
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
    const { id } = req.params;

    // Verificar que el post existe
    const existingPost = await db('posts').where({ id }).first();
    if (!existingPost) {
      res.status(404).json({ error: 'Post no encontrado' });
      return;
    }

    // Eliminar post (las relaciones en tablas pivote se eliminan por CASCADE)
    await db('posts').where({ id }).delete();

    res.json({ message: 'Post eliminado exitosamente' });
  } catch (error) {
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

    // Obtener tags del post actual
    const currentTags = await db('post_tag')
      .where({ post_id: id })
      .select('tag_id');

    if (currentTags.length === 0) {
      res.json({ related: [] });
      return;
    }

    const tagIds = currentTags.map(t => t.tag_id);

    // Buscar posts con tags similares (excluyendo el post actual)
    const related = await db('posts')
      .leftJoin('post_tag', 'posts.id', 'post_tag.post_id')
      .leftJoin('media', 'posts.featured_image_id', 'media.id')
      .whereIn('post_tag.tag_id', tagIds)
      .whereNot('posts.id', id)
      .where('posts.status', 'published')
      .select(
        'posts.id',
        'posts.title',
        'posts.slug',
        'posts.excerpt',
        'posts.published_at',
        'media.filename as featured_image',
        db.raw('COUNT(post_tag.tag_id) as match_count')
      )
      .groupBy('posts.id')
      .orderBy('match_count', 'DESC')
      .limit(limit);

    res.json({ related });
  } catch (error) {
    next(error);
  }
};
