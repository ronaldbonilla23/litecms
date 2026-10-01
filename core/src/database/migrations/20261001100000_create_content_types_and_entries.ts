import type { Knex } from "knex";

// Tipos de contenido personalizados (Proyectos, Servicios, Equipo...) y sus entradas.
// Los campos de cada tipo se definen en `fields` (JSON) y los valores en entries.data (JSON).
export async function up(knex: Knex): Promise<void> {
    await knex.schema.createTable('content_types', (table) => {
        table.increments('id').primary();
        table.string('slug', 50).notNullable().unique();
        table.string('name', 100).notNullable();
        table.string('singular_name', 100).notNullable();
        table.text('description').nullable();
        table.string('url_prefix', 200).notNullable().unique();
        table.boolean('has_archive').notNullable().defaultTo(true);
        table.text('fields').notNullable().defaultTo('[]');
        table.string('single_template_id').nullable();
        table.string('archive_template_id').nullable();
        table.string('header_id').nullable();
        table.string('footer_id').nullable();
        table.text('archive_css').nullable();
        table.timestamps(true, true);
    });

    await knex.schema.createTable('entries', (table) => {
        table.increments('id').primary();
        table.integer('type_id').notNullable().references('id').inTable('content_types').onDelete('CASCADE');
        table.string('title', 200).notNullable();
        table.string('slug', 200).notNullable();
        table.string('status', 20).notNullable().defaultTo('draft');
        table.text('data').notNullable().defaultTo('{}');
        table.string('meta_title', 200).nullable();
        table.text('meta_description').nullable();
        table.integer('og_image_id').nullable();
        table.integer('author_id').nullable().references('id').inTable('users').onDelete('SET NULL');
        table.timestamp('published_at').nullable();
        table.text('compiled_css').nullable();
        table.timestamps(true, true);

        table.unique(['type_id', 'slug']);
        table.index(['type_id', 'status', 'published_at']);
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('entries');
    await knex.schema.dropTableIfExists('content_types');
}
