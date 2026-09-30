import type { Knex } from "knex";

/**
 * ============================================================================
 * ADD SEO FIELDS TO PAGES TABLE
 * ============================================================================
 *
 * Propósito: Añadir campos SEO a la tabla pages para permitir optimización
 * de páginas estáticas en motores de búsqueda
 *
 * Columnas añadidas:
 * - meta_title: Título SEO (máx 200 caracteres)
 * - meta_description: Descripción SEO (texto largo)
 * - canonical_url: URL canónica para evitar contenido duplicado
 * - og_image_id: Imagen para Open Graph (FK a media)
 *
 * ============================================================================
 */

export async function up(knex: Knex): Promise<void> {
  // Verificar si las columnas ya existen (evitar errores en re-migración)
  const hasMetaTitle = await knex.schema.hasColumn('pages', 'meta_title');
  const hasMetaDescription = await knex.schema.hasColumn('pages', 'meta_description');
  const hasCanonicalUrl = await knex.schema.hasColumn('pages', 'canonical_url');
  const hasOgImageId = await knex.schema.hasColumn('pages', 'og_image_id');

  if (!hasMetaTitle) {
    await knex.schema.alterTable('pages', (table) => {
      table.string('meta_title', 200).nullable().comment('SEO meta title for search engines');
    });
  }

  if (!hasMetaDescription) {
    await knex.schema.alterTable('pages', (table) => {
      table.text('meta_description').nullable().comment('SEO meta description for search engines');
    });
  }

  if (!hasCanonicalUrl) {
    await knex.schema.alterTable('pages', (table) => {
      table.string('canonical_url', 500).nullable().comment('Canonical URL to prevent duplicate content');
    });
  }

  if (!hasOgImageId) {
    await knex.schema.alterTable('pages', (table) => {
      table.integer('og_image_id').unsigned().nullable().comment('Open Graph image ID (FK to media)');
    });
  }

  // Añadir índices para optimizar consultas SEO
  // Nota: La foreign key se maneja a nivel de aplicación para evitar problemas con SQLite
}

/**
 * ============================================================================
 * ROLLBACK (DOWN)
 * ============================================================================
 * Elimina las columnas SEO añadidas
 * ============================================================================
 */
export async function down(knex: Knex): Promise<void> {
  // Eliminar columnas
  await knex.schema.alterTable('pages', (table) => {
    table.dropColumn('meta_title');
    table.dropColumn('meta_description');
    table.dropColumn('canonical_url');
    table.dropColumn('og_image_id');
  });
}
