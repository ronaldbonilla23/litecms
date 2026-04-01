import db from '../../database';
import { PageSchema } from '../../../../shared/types';
import type { z } from 'zod';

/**
 * ============================================================================
 * POSTS SERVICE
 * ============================================================================
 * Capa de servicio para gestión de posts del blog
 * Maneja: transacciones, validaciones, slug generation, relaciones
 * ============================================================================
 */

// ----------------------------------------------------------------------------
// Tipos
// ----------------------------------------------------------------------------
export type CreatePostDTO = z.infer<typeof PageSchema> & {
  category_ids?: number[];
  tag_ids?: number[];
};

export type UpdatePostDTO = Partial<CreatePostDTO>;

export interface PostFilters {
  status?: string;
  category_id?: number;
  tag_id?: number;
  author_id?: number;
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'ASC' | 'DESC';
}

export interface PostWithRelations {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  featured_image_id: number | null;
  author_id: number;
  status: 'draft' | 'published' | 'scheduled' | 'archived';
  published_at: string | null;
  scheduled_for: string | null;
  meta_title: string | null;
  meta_description: string | null;
  canonical_url: string | null;
  view_count: number;
  comments_enabled: boolean;
  created_at: string;
  updated_at: string;
  author_name: string;
  author_email: string;
  categories: Array<{ id: number; name: string; slug: string }>;
  tags: Array<{ id: number; name: string; slug: string; color: string }>;
  featured_image: string | null;
}

// ----------------------------------------------------------------------------
// Helper Functions
// ----------------------------------------------------------------------------

/**
 * Genera un slug único a partir de un título
 * Si el slug ya existe, agrega un sufijo numérico
 */
const generateUniqueSlug = async (title: string, postId?: number): Promise<string> => {
  // Generar slug base
  const baseSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .substring(0, 190); // Dejar espacio para sufijo

  let slug = baseSlug;
  let counter = 1;

  // Verificar unicidad
  while (true) {
    const query = db('posts').where({ slug });
    
    // Si estamos actualizando, excluir el post actual
    if (postId) {
      query.whereNot('id', postId);
    }

    const existing = await query.first();

    if (!existing) {
      return slug;
    }

    // Agregar sufijo numérico
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
};

/**
 * Obtiene categorías y tags para un post
 */
const getPostRelations = async (postId: number): Promise<{
  categories: Array<{ id: number; name: string; slug: string }>;
  tags: Array<{ id: number; name: string; slug: string; color: string }>;
}> => {
  const [categories, tags] = await Promise.all([
    db('categories')
      .leftJoin('post_category', 'categories.id', 'post_category.category_id')
      .where('post_category.post_id', postId)
      .select('categories.id', 'categories.name', 'categories.slug'),
    
    db('tags')
      .leftJoin('post_tag', 'tags.id', 'post_tag.tag_id')
      .where('post_tag.post_id', postId)
      .select('tags.id', 'tags.name', 'tags.slug', 'tags.color')
  ]);

  return { categories, tags };
};

/**
 * Obtiene featured image filename
 */
const getFeaturedImage = async (featuredImageId: number | null): Promise<string | null> => {
  if (!featuredImageId) return null;
  
  const media = await db('media')
    .where({ id: featuredImageId })
    .first('filename');
  
  return media?.filename || null;
};

// ----------------------------------------------------------------------------
// Service Methods
// ----------------------------------------------------------------------------

/**
 * ============================================================================
 * GET ALL POSTS
 * ============================================================================
 * Obtiene lista de posts con paginación y filtros
 * Incluye categorías y tags
 * ============================================================================
 */
export const getAll = async (filters: PostFilters = {}): Promise<{
  posts: PostWithRelations[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> => {
  const {
    status = 'published',
    category_id,
    tag_id,
    author_id,
    page = 1,
    limit = 10,
    sort = 'published_at',
    order = 'DESC'
  } = filters;

  // Construir query base
  let query = db('posts')
    .leftJoin('users', 'posts.author_id', 'users.id')
    .where('posts.status', status);

  // Filtros adicionales
  if (category_id) {
    query = query.whereIn('posts.id', function() {
      this.select('post_id')
        .from('post_category')
        .where('category_id', category_id);
    });
  }

  if (tag_id) {
    query = query.whereIn('posts.id', function() {
      this.select('post_id')
        .from('post_tag')
        .where('tag_id', tag_id);
    });
  }

  if (author_id) {
    query = query.where('posts.author_id', author_id);
  }

  // Obtener total para paginación
  const totalQuery = query.clone();
  const totalResult = await totalQuery.count('* as count');
  const total = parseInt((totalResult[0] as any).count, 10);

  // Calcular paginación
  const offset = (page - 1) * limit;
  const totalPages = Math.ceil(total / limit);

  // Obtener posts
  const postsList = await query
    .select(
      'posts.*',
      'users.name as author_name',
      'users.email as author_email'
    )
    .orderBy(`posts.${sort}`, order)
    .limit(limit)
    .offset(offset);

  // Obtener relaciones para cada post
  const posts: PostWithRelations[] = await Promise.all(
    postsList.map(async (post: any) => {
      const { categories, tags } = await getPostRelations(post.id);
      const featured_image = await getFeaturedImage(post.featured_image_id);

      return {
        ...post,
        categories,
        tags,
        featured_image
      };
    })
  );

  return {
    posts,
    total,
    page,
    limit,
    totalPages
  };
};

/**
 * ============================================================================
 * GET POST BY ID
 * ============================================================================
 * Obtiene un post por su ID con todas sus relaciones
 * ============================================================================
 */
export const getById = async (id: number): Promise<PostWithRelations | null> => {
  const post = await db('posts')
    .leftJoin('users', 'posts.author_id', 'users.id')
    .where('posts.id', id)
    .first(
      'posts.*',
      'users.name as author_name',
      'users.email as author_email'
    );

  if (!post) {
    return null;
  }

  const { categories, tags } = await getPostRelations(post.id);
  const featured_image = await getFeaturedImage(post.featured_image_id);

  return {
    ...post,
    categories,
    tags,
    featured_image
  };
};

/**
 * ============================================================================
 * GET POST BY SLUG
 * ============================================================================
 * Obtiene un post por su slug para el frontend público
 * Incrementa view_count atómicamente
 * ============================================================================
 */
export const getBySlug = async (slug: string): Promise<PostWithRelations | null> => {
  // Incrementar view_count atómicamente
  await db('posts')
    .where({ slug })
    .increment('view_count', 1);

  const post = await db('posts')
    .leftJoin('users', 'posts.author_id', 'users.id')
    .where('posts.slug', slug)
    .first(
      'posts.*',
      'users.name as author_name',
      'users.email as author_email'
    );

  if (!post) {
    return null;
  }

  const { categories, tags } = await getPostRelations(post.id);
  const featured_image = await getFeaturedImage(post.featured_image_id);

  return {
    ...post,
    categories,
    tags,
    featured_image
  };
};

/**
 * ============================================================================
 * CREATE POST
 * ============================================================================
 * Crea un nuevo post con sus relaciones en transacción
 * Genera slug único automáticamente
 * ============================================================================
 */
export const create = async (data: CreatePostDTO, authorId: number): Promise<{ id: number; slug: string }> => {
  return db.transaction(async (trx) => {
    const {
      title,
      slug: providedSlug,
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
    } = data;

    // Generar slug único
    const finalSlug = providedSlug 
      ? await generateUniqueSlug(providedSlug)
      : await generateUniqueSlug(title);

    // Insertar post
    const [id] = await trx('posts').insert({
      title,
      slug: finalSlug,
      excerpt: excerpt || null,
      content,
      featured_image_id: featured_image_id || null,
      author_id: authorId,
      status,
      published_at: published_at || null,
      scheduled_for: scheduled_for || null,
      meta_title: meta_title || null,
      meta_description: meta_description || null,
      canonical_url: canonical_url || null
    });

    // Insertar categorías
    if (category_ids.length > 0) {
      const categoryData = category_ids.map((catId, index) => ({
        post_id: id,
        category_id: catId,
        is_primary: index === 0 // Primera categoría es la principal
      }));
      await trx('post_category').insert(categoryData);
    }

    // Insertar tags
    if (tag_ids.length > 0) {
      const tagData = tag_ids.map((tagId) => ({
        post_id: id,
        tag_id: tagId
      }));
      await trx('post_tag').insert(tagData);
    }

    return { id, slug: finalSlug };
  });
};

/**
 * ============================================================================
 * UPDATE POST
 * ============================================================================
 * Actualiza un post y sincroniza sus relaciones en transacción
 * Borra relaciones antiguas e inserta nuevas
 * ============================================================================
 */
export const update = async (id: number, data: UpdatePostDTO): Promise<void> => {
  return db.transaction(async (trx) => {
    const {
      title,
      slug: providedSlug,
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
    } = data;

    // Preparar datos de actualización
    const updateData: any = {
      updated_at: trx.fn.now()
    };

    if (title !== undefined) updateData.title = title;
    if (providedSlug !== undefined) {
      // Verificar unicidad del slug (excluyendo este post)
      updateData.slug = await generateUniqueSlug(providedSlug, id);
    }
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
    await trx('posts').where({ id }).update(updateData);

    // Sincronizar categorías (borrar antiguas, insertar nuevas)
    if (category_ids !== undefined) {
      await trx('post_category').where({ post_id: id }).delete();
      
      if (category_ids.length > 0) {
        const categoryData = category_ids.map((catId, index) => ({
          post_id: id,
          category_id: catId,
          is_primary: index === 0
        }));
        await trx('post_category').insert(categoryData);
      }
    }

    // Sincronizar tags (borrar antiguos, insertar nuevos)
    if (tag_ids !== undefined) {
      await trx('post_tag').where({ post_id: id }).delete();
      
      if (tag_ids.length > 0) {
        const tagData = tag_ids.map((tagId) => ({
          post_id: id,
          tag_id: tagId
        }));
        await trx('post_tag').insert(tagData);
      }
    }
  });
};

/**
 * ============================================================================
 * DELETE POST
 * ============================================================================
 * Elimina un post (las relaciones se borran por CASCADE)
 * ============================================================================
 */
export const deletePost = async (id: number): Promise<void> => {
  await db('posts').where({ id }).delete();
};

/**
 * ============================================================================
 * GET RELATED POSTS
 * ============================================================================
 * Obtiene posts relacionados por tags compartidos
 * ============================================================================
 */
export const getRelated = async (postId: number, limit: number = 3): Promise<PostWithRelations[]> => {
  // Obtener tags del post actual
  const currentTags = await db('post_tag')
    .where({ post_id: postId })
    .select('tag_id');

  if (currentTags.length === 0) {
    return [];
  }

  const tagIds = currentTags.map(t => t.tag_id);

  // Buscar posts con tags similares (excluyendo el post actual)
  const relatedList = await db('posts')
    .leftJoin('post_tag', 'posts.id', 'post_tag.post_id')
    .leftJoin('media', 'posts.featured_image_id', 'media.id')
    .whereIn('post_tag.tag_id', tagIds)
    .where('posts.id', '!=', postId)
    .where('posts.status', 'published')
    .select(
      'posts.*',
      'media.filename as featured_image',
      db.raw('COUNT(post_tag.tag_id) as match_count')
    )
    .groupBy('posts.id')
    .orderBy('match_count', 'DESC')
    .limit(limit);

  // Obtener relaciones para cada post
  const posts: PostWithRelations[] = await Promise.all(
    relatedList.map(async (post: any) => {
      const { categories, tags } = await getPostRelations(post.id);
      
      return {
        ...post,
        categories,
        tags,
        featured_image: post.featured_image || null
      };
    })
  );

  return posts;
};
