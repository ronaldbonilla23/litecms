import db from '../../database';
import { PageSchema } from '../../../../shared/types';
import type { z } from 'zod';
import Handlebars from 'handlebars';
import { compilePostCss } from '../render/css.service';
import { recordSlugChange } from '../redirects/redirects.service';
import { sanitizeRichText } from '../../services/sanitize.service';
import { generateStructuredData, StructuredDataPost } from '../../services/structuredData.service';
import type { Knex } from 'knex';
import { config } from '../../config';

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
export type CreatePostDTO = Omit<z.infer<typeof PageSchema>, 'fields' | 'author_id' | 'header_id' | 'footer_id'> & {
  published_at?: string | null;
  scheduled_for?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  canonical_url?: string | null;
  view_count?: number;
  comments_enabled?: boolean;
  category_ids?: number[];
  tag_ids?: number[];
};

export type UpdatePostDTO = Partial<CreatePostDTO>;

export interface PostFilters {
  status?: string;
  category_id?: number | undefined;
  tag_id?: number | undefined;
  author_id?: number | undefined;
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

/**
 * Rendered Post with Layout, CSS, metadata and structured data
 */
export interface RenderedPost {
  html: string;
  css: string;
  metadata: PostWithRelations;
  structured_data: Record<string, any> | null;
}

// ----------------------------------------------------------------------------
// Helper Functions
// ----------------------------------------------------------------------------

/**
 * Genera un slug único a partir de un título
 * Si el slug ya existe, agrega un sufijo numérico
 */
// Recibe la conexión (transacción) en uso: SQLite tiene una sola conexión y consultar con
// `db` dentro de una transacción abierta se queda esperando para siempre (deadlock).
const generateUniqueSlug = async (title: string, conn: Knex | Knex.Transaction, postId?: number): Promise<string> => {
  // Generar slug base ("Artículo Ñandú" → "articulo-nandu")
  const baseSlug = title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .substring(0, 190); // Dejar espacio para sufijo

  let slug = baseSlug;
  let counter = 1;

  // Verificar unicidad
  while (true) {
    const query = conn('posts').where({ slug });

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
    query = query.whereIn('posts.id', (qb) => {
      qb.select('post_id')
        .from('post_category')
        .where('category_id', category_id);
    });
  }

  if (tag_id) {
    query = query.whereIn('posts.id', (qb) => {
      qb.select('post_id')
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
export const getBySlug = async (slug: string): Promise<RenderedPost | null> => {
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

  const postData: PostWithRelations = {
    ...post,
    categories,
    tags,
    featured_image
  };

  // 1. Obtener los Templates necesarios
  const [header, footer, blogLayout] = await Promise.all([
    db('templates').where({ type: 'header', is_active: true }).first(),
    db('templates').where({ type: 'footer', is_active: true }).first(),
    db('templates').where({ type: 'blog_single', is_active: true }).first()
  ]);

  // 2. Preparar el HTML principal del post con Handlebars (si existe el layout)
  let mainContent = postData.content;
  if (blogLayout) {
    const template = Handlebars.compile(blogLayout.content);
    // Usamos el Data Preparer para preparar los datos semánticos
    const mappedData = prepareTemplateData(postData);
    mainContent = template(mappedData);
  }

  // 3. Unificar con Header y Footer
  const headerHtml = header?.content || '';
  const footerHtml = footer?.content || '';

  const fullHtml = `
    ${headerHtml}
    ${mainContent}
    ${footerHtml}
  `;

  // 4. CSS Maestro del Post: cacheado en la BD, se compila solo si falta
  const compiledCss = post.compiled_css || await compilePostCss(post.id, fullHtml);

  // 5. Generar datos estructurados Schema.org
  const structuredDataPost: StructuredDataPost = {
    meta_title: postData.meta_title,
    meta_description: postData.meta_description,
    featured_image: postData.featured_image,
    published_at: postData.published_at,
    author_name: postData.author_name,
    categories: postData.categories,
    title: postData.title,
    slug: postData.slug
  };
  const structuredData = generateStructuredData(structuredDataPost);

  return {
    html: fullHtml,
    css: compiledCss,
    metadata: postData,
    structured_data: structuredData
  };
};

/**
 * ============================================================================
 * DATA PREPARER - TEMPLATE ENGINE HELPER
 * ============================================================================
 * Transforma los datos crudos del post en objetos semánticos listos para ser 
 * renderizados por el motor de templates (Handlebars).
 * ============================================================================
 */
const prepareTemplateData = (post: PostWithRelations) => {
  // 1. Cálculo de Reading Time (basado en promedio de 200 palabras por minuto)
  const words = post.content ? post.content.split(/\s+/).length : 0;
  const readingTimeMinutes = Math.ceil(words / 200);
  const reading_time = readingTimeMinutes + " min";

  // 2. Formateo de fecha usando Intl (Español elegante)
  const dateOptions: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  };
  const pubDate = post.published_at;
  const formattedDate = pubDate
    ? new Intl.DateTimeFormat('es-ES', dateOptions).format(new Date(pubDate))
    : 'Borrador';

  // 3. Fallback inteligente de imagen destacada
  const featured_image_url = post.featured_image
    ? `${config.siteUrl}/uploads/${post.featured_image}`
    : 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&q=80&w=1200';

  // 4. Obtener categoría primaria (la primera asociada)
  const categoryPrimary = post.categories?.[0]?.name || "General";

  // 5. Mapeo final optimizado ({{{content}}} para inyección segura)
  return {
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt || post.title,
    content: post.content,
    featured_image: featured_image_url,
    author_name: post.author_name || 'Anónimo',
    published_at: formattedDate,
    reading_time: reading_time,
    category_primary: categoryPrimary,
    tags: post.tags || [],
    categories: post.categories || []
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
  return db.transaction(async (trx: Knex.Transaction) => {
    const {
      title,
      slug: providedSlug,
      content,
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
      ? await generateUniqueSlug(providedSlug, trx)
      : await generateUniqueSlug(title, trx);

    // Insertar post
    const [id] = await trx('posts').insert({
      title,
      slug: finalSlug,
      content: sanitizeRichText(content || ''),
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

    return { id: id as number, slug: finalSlug };
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
  const previous = await db('posts').where({ id }).first('slug');

  await db.transaction(async (trx: Knex.Transaction) => {
    const {
      title,
      slug: providedSlug,
      content,
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
      updated_at: trx.fn.now(),
      // El título, contenido o layout pueden cambiar: el CSS se recompila en el siguiente render
      compiled_css: null
    };

    if (title !== undefined) updateData.title = title;
    if (providedSlug !== undefined) {
      // Verificar unicidad del slug (excluyendo este post)
      updateData.slug = await generateUniqueSlug(providedSlug, trx, id);
    }
    if (content !== undefined) updateData.content = sanitizeRichText(content ?? '');
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

  // Si cambió el slug, la URL anterior redirige (301) a la nueva.
  // Fuera de la transacción: SQLite usa una sola conexión.
  const updated = await db('posts').where({ id }).first('slug');
  if (previous && updated) {
    await recordSlugChange(`/blog/${previous.slug}`, `/blog/${updated.slug}`);
  }
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

  const tagIds = currentTags.map((t: any) => t.tag_id);

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
