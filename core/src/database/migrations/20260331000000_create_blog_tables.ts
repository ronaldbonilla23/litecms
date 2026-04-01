import type { Knex } from "knex";

/**
 * ============================================================================
 * LITECMS BLOG ENGINE - DATABASE SCHEMA
 * ============================================================================
 * 
 * Propósito: Estructura relacional para gestión de contenido de blog
 * 
 * Tablas creadas:
 * - categories: Categorías jerárquicas para organizar posts
 * - tags: Etiquetas no jerárquicas para clasificación transversal
 * - posts: Entradas de blog con contenido y metadatos
 * - post_category: Relación muchos-a-muchos (posts ↔ categories)
 * - post_tag: Relación muchos-a-muchos (posts ↔ tags)
 * 
 * Consideraciones SQLite:
 * - Foreign keys habilitadas con ON DELETE CASCADE
 * - Timestamps automáticos con DEFAULT CURRENT_TIMESTAMP
 * - Índices para optimizar consultas frecuentes
 * ============================================================================
 */

export async function up(knex: Knex): Promise<void> {
  // ==========================================================================
  // 1. CATEGORIES TABLE
  // ==========================================================================
  // Categorías jerárquicas (pueden tener padre-hijo)
  // Ejemplo: "Tecnología" → "Frontend" → "React"
  // ==========================================================================
  await knex.schema.createTable('categories', (table) => {
    table.increments('id').primary();
    table.string('name', 100).notNullable();
    table.string('slug', 100).notNullable().unique();
    table.text('description').nullable();
    
    // Jerarquía: categoría padre (nullable para categorías raíz)
    table.integer('parent_id').unsigned().nullable();
    
    // Ordenamiento dentro del mismo nivel jerárquico
    table.integer('sort_order').defaultTo(0);
    
    // Estado de la categoría
    table.boolean('is_active').defaultTo(true);
    
    // SEO
    table.string('meta_title', 200).nullable();
    table.string('meta_description', 300).nullable();
    
    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Foreign Key: autoreferencia para jerarquía
    table.foreign('parent_id')
      .references('id')
      .inTable('categories')
      .onDelete('SET NULL'); // No eliminamos categorías hijas si el padre se borra
  });

  // Índices para optimizar consultas
  await knex.schema.alterTable('categories', (table) => {
    table.index('slug');
    table.index('parent_id');
    table.index('is_active');
  });

  // ==========================================================================
  // 2. TAGS TABLE
  // ==========================================================================
  // Etiquetas no jerárquicas para clasificación transversal
  // Ejemplo: "react", "tutorial", "javascript"
  // ==========================================================================
  await knex.schema.createTable('tags', (table) => {
    table.increments('id').primary();
    table.string('name', 50).notNullable();
    table.string('slug', 50).notNullable().unique();
    
    // Color opcional para UI (formato hex)
    table.string('color', 7).defaultTo('#C2F86C'); // Color por defecto del tema
    
    // Estado de la etiqueta
    table.boolean('is_active').defaultTo(true);
    
    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // Índices para optimizar consultas
  await knex.schema.alterTable('tags', (table) => {
    table.index('slug');
    table.index('is_active');
  });

  // ==========================================================================
  // 3. POSTS TABLE
  // ==========================================================================
  // Entradas de blog con contenido y metadatos
  // ==========================================================================
  await knex.schema.createTable('posts', (table) => {
    table.increments('id').primary();
    
    // Contenido básico
    table.string('title', 200).notNullable();
    table.string('slug', 200).notNullable().unique();
    table.text('excerpt').nullable(); // Resumen corto para previews
    table.text('content').notNullable(); // Contenido completo (HTML/Markdown)
    
    // Featured image (relación con media library existente)
    table.integer('featured_image_id').unsigned().nullable();
    
    // Autor (relación con users table existente)
    table.integer('author_id').unsigned().notNullable();
    
    // Estado de publicación
    table.enum('status', ['draft', 'published', 'scheduled', 'archived'])
      .notNullable()
      .defaultTo('draft');
    
    // Programación de publicación
    table.timestamp('published_at').nullable();
    table.timestamp('scheduled_for').nullable();
    
    // SEO
    table.string('meta_title', 200).nullable();
    table.string('meta_description', 300).nullable();
    table.string('canonical_url', 500).nullable();
    
    // Engagement
    table.integer('view_count').unsigned().defaultTo(0);
    table.boolean('comments_enabled').defaultTo(true);
    
    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Foreign Keys
    table.foreign('featured_image_id')
      .references('id')
      .inTable('media')
      .onDelete('SET NULL'); // Si se borra la imagen, el post queda sin featured image
      
    table.foreign('author_id')
      .references('id')
      .inTable('users')
      .onDelete('CASCADE'); // Si se borra el usuario, se borran sus posts
  });

  // Índices para optimizar consultas
  await knex.schema.alterTable('posts', (table) => {
    table.index('slug');
    table.index('status');
    table.index('published_at');
    table.index('author_id');
    table.index('featured_image_id');
    table.index('created_at');
  });

  // ==========================================================================
  // 4. POST_CATEGORY TABLE (Pivot)
  // ==========================================================================
  // Relación muchos-a-muchos: posts ↔ categories
  // Un post puede tener múltiples categorías (aunque típicamente 1 principal)
  // ==========================================================================
  await knex.schema.createTable('post_category', (table) => {
    // Composite Primary Key
    table.integer('post_id').unsigned().notNullable();
    table.integer('category_id').unsigned().notNullable();
    table.primary(['post_id', 'category_id']);
    
    // Indica si es la categoría principal del post
    table.boolean('is_primary').defaultTo(false);
    
    // Timestamps (útil para saber cuándo se asignó la categoría)
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    // Foreign Keys con CASCADE DELETE
    table.foreign('post_id')
      .references('id')
      .inTable('posts')
      .onDelete('CASCADE'); // Si se borra el post, se elimina la relación
      
    table.foreign('category_id')
      .references('id')
      .inTable('categories')
      .onDelete('CASCADE'); // Si se borra la categoría, se elimina la relación
  });

  // Índices para optimizar consultas
  await knex.schema.alterTable('post_category', (table) => {
    table.index('post_id');
    table.index('category_id');
  });

  // ==========================================================================
  // 5. POST_TAG TABLE (Pivot)
  // ==========================================================================
  // Relación muchos-a-muchos: posts ↔ tags
  // Un post puede tener múltiples etiquetas
  // ==========================================================================
  await knex.schema.createTable('post_tag', (table) => {
    // Composite Primary Key
    table.integer('post_id').unsigned().notNullable();
    table.integer('tag_id').unsigned().notNullable();
    table.primary(['post_id', 'tag_id']);
    
    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    // Foreign Keys con CASCADE DELETE
    table.foreign('post_id')
      .references('id')
      .inTable('posts')
      .onDelete('CASCADE'); // Si se borra el post, se elimina la relación
      
    table.foreign('tag_id')
      .references('id')
      .inTable('tags')
      .onDelete('CASCADE'); // Si se borra la etiqueta, se elimina la relación
  });

  // Índices para optimizar consultas
  await knex.schema.alterTable('post_tag', (table) => {
    table.index('post_id');
    table.index('tag_id');
  });
}

/**
 * ============================================================================
 * ROLLBACK (DOWN)
 * ============================================================================
 * Elimina las tablas en orden inverso (por dependencias de foreign keys)
 * ============================================================================
 */
export async function down(knex: Knex): Promise<void> {
  // Orden inverso: primero las tablas pivote, luego las principales
  
  // 1. Eliminar tablas pivote
  await knex.schema.dropTableIfExists('post_tag');
  await knex.schema.dropTableIfExists('post_category');
  
  // 2. Eliminar tabla posts (tiene foreign keys a media y users)
  await knex.schema.dropTableIfExists('posts');
  
  // 3. Eliminar tabla tags
  await knex.schema.dropTableIfExists('tags');
  
  // 4. Eliminar tabla categories (autoreferencia)
  await knex.schema.dropTableIfExists('categories');
}
