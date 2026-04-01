import type { Request, Response, NextFunction } from 'express';
import db from '../../database';
import { AuthRequest } from '../auth/auth.middleware';

/**
 * ============================================================================
 * CATEGORIES CONTROLLER
 * ============================================================================
 * Maneja todas las operaciones CRUD para categorías del blog
 * ============================================================================
 */

// ----------------------------------------------------------------------------
// GET /api/categories - Listar todas las categorías
// ----------------------------------------------------------------------------
export const getAllCategories = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { parent_id, include_posts } = req.query;

    let query = db('categories');

    // Filtro por categoría padre
    if (parent_id !== undefined) {
      if (parent_id === 'null') {
        query = query.whereNull('parent_id');
      } else {
        query = query.where('parent_id', parent_id as string);
      }
    }

    // Solo categorías activas por defecto
    query = query.where('categories.is_active', true);

    // Ordenar por sort_order y nombre
    query = query.orderBy('categories.sort_order').orderBy('categories.name');

    const categories = await query.select('categories.*');

    // Si se solicita, incluir conteo de posts por categoría
    if (include_posts === 'true') {
      for (const category of categories) {
        const postCount = await db('post_category')
          .where({ category_id: category.id })
          .leftJoin('posts', 'post_category.post_id', 'posts.id')
          .where('posts.status', 'published')
          .count('* as count');
        
        category.post_count = parseInt((postCount[0] as any).count, 10);
      }
    }

    res.json(categories);
  } catch (error) {
    next(error);
  }
};

// ----------------------------------------------------------------------------
// GET /api/categories/tree - Obtener árbol jerárquico de categorías
// ----------------------------------------------------------------------------
export const getCategoriesTree = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Obtener todas las categorías activas
    const allCategories = await db('categories')
      .where({ is_active: true })
      .orderBy('sort_order')
      .orderBy('name');

    // Construir árbol jerárquico
    const buildTree = (parentId: number | null = null): any[] => {
      return allCategories
        .filter(cat => cat.parent_id === parentId)
        .map(cat => ({
          ...cat,
          children: buildTree(cat.id)
        }));
    };

    const tree = buildTree(null);

    res.json(tree);
  } catch (error) {
    next(error);
  }
};

// ----------------------------------------------------------------------------
// GET /api/categories/:id - Obtener categoría por ID
// ----------------------------------------------------------------------------
export const getCategoryById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const category = await db('categories')
      .leftJoin('categories as parent', 'categories.parent_id', 'parent.id')
      .select(
        'categories.*',
        'parent.name as parent_name',
        'parent.slug as parent_slug'
      )
      .where('categories.id', id)
      .first();

    if (!category) {
      res.status(404).json({ error: 'Categoría no encontrada' });
      return;
    }

    // Obtener categorías hijas
    const children = await db('categories')
      .where({ parent_id: category.id, is_active: true })
      .orderBy('sort_order')
      .orderBy('name')
      .select('id', 'name', 'slug', 'description', 'sort_order');

    // Obtener conteo de posts
    const postCount = await db('post_category')
      .leftJoin('posts', 'post_category.post_id', 'posts.id')
      .where({
        category_id: category.id,
        'posts.status': 'published'
      })
      .count('* as count');

    res.json({
      ...category,
      children,
      post_count: parseInt((postCount[0] as any).count, 10)
    });
  } catch (error) {
    next(error);
  }
};

// ----------------------------------------------------------------------------
// GET /api/categories/slug/:slug - Obtener categoría por slug
// ----------------------------------------------------------------------------
export const getCategoryBySlug = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { slug } = req.params;

    const category = await db('categories')
      .leftJoin('categories as parent', 'categories.parent_id', 'parent.id')
      .select(
        'categories.*',
        'parent.name as parent_name',
        'parent.slug as parent_slug'
      )
      .where('categories.slug', slug)
      .first();

    if (!category) {
      res.status(404).json({ error: 'Categoría no encontrada' });
      return;
    }

    // Obtener posts de esta categoría
    const posts = await db('posts')
      .leftJoin('post_category', 'posts.id', 'post_category.post_id')
      .leftJoin('media', 'posts.featured_image_id', 'media.id')
      .where({
        'post_category.category_id': category.id,
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
      ...category,
      posts
    });
  } catch (error) {
    next(error);
  }
};

// ----------------------------------------------------------------------------
// POST /api/categories - Crear nueva categoría
// ----------------------------------------------------------------------------
export const createCategory = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const {
      name,
      slug,
      description,
      parent_id,
      sort_order = 0,
      meta_title,
      meta_description
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
    const existingCategory = await db('categories').where({ slug: finalSlug }).first();
    if (existingCategory) {
      res.status(400).json({ error: 'El slug ya está en uso' });
      return;
    }

    // Verificar que la categoría padre exista (si se proporciona)
    if (parent_id) {
      const parentCategory = await db('categories').where({ id: parent_id }).first();
      if (!parentCategory) {
        res.status(400).json({ error: 'La categoría padre no existe' });
        return;
      }
    }

    // Insertar categoría
    const [id] = await db('categories').insert({
      name,
      slug: finalSlug,
      description: description || null,
      parent_id: parent_id || null,
      sort_order,
      meta_title: meta_title || null,
      meta_description: meta_description || null
    });

    res.status(201).json({ 
      message: 'Categoría creada exitosamente', 
      id,
      slug: finalSlug
    });
  } catch (error) {
    next(error);
  }
};

// ----------------------------------------------------------------------------
// PUT /api/categories/:id - Actualizar categoría
// ----------------------------------------------------------------------------
export const updateCategory = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      name,
      slug,
      description,
      parent_id,
      sort_order,
      is_active,
      meta_title,
      meta_description
    } = req.body;

    // Verificar que la categoría existe
    const existingCategory = await db('categories').where({ id }).first();
    if (!existingCategory) {
      res.status(404).json({ error: 'Categoría no encontrada' });
      return;
    }

    // Preparar datos de actualización
    const updateData: any = {
      updated_at: db.fn.now()
    };

    if (name !== undefined) updateData.name = name;
    if (slug !== undefined) updateData.slug = slug;
    if (description !== undefined) updateData.description = description;
    if (parent_id !== undefined) updateData.parent_id = parent_id;
    if (sort_order !== undefined) updateData.sort_order = sort_order;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (meta_title !== undefined) updateData.meta_title = meta_title;
    if (meta_description !== undefined) updateData.meta_description = meta_description;

    // Actualizar categoría
    await db('categories').where({ id }).update(updateData);

    res.json({ message: 'Categoría actualizada exitosamente' });
  } catch (error) {
    next(error);
  }
};

// ----------------------------------------------------------------------------
// DELETE /api/categories/:id - Eliminar categoría
// ----------------------------------------------------------------------------
export const deleteCategory = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    // Verificar que la categoría existe
    const existingCategory = await db('categories').where({ id }).first();
    if (!existingCategory) {
      res.status(404).json({ error: 'Categoría no encontrada' });
      return;
    }

    // Verificar si tiene categorías hijas
    const hasChildren = await db('categories').where({ parent_id: id }).first();
    if (hasChildren) {
      res.status(400).json({ 
        error: 'No se puede eliminar una categoría con categorías hijas. Elimine o reasigne las categorías hijas primero.' 
      });
      return;
    }

    // Eliminar categoría (las relaciones en post_category se eliminan por CASCADE)
    await db('categories').where({ id }).delete();

    res.json({ message: 'Categoría eliminada exitosamente' });
  } catch (error) {
    next(error);
  }
};
