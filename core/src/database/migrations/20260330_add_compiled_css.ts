import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
    // Agregar columna compiled_css a pages
    await knex.schema.alterTable('pages', (table) => {
        table.text('compiled_css').nullable();
    });

    // Agregar columna compiled_css a templates
    await knex.schema.alterTable('templates', (table) => {
        table.text('compiled_css').nullable();
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.alterTable('pages', (table) => {
        table.dropColumn('compiled_css');
    });

    await knex.schema.alterTable('templates', (table) => {
        table.dropColumn('compiled_css');
    });
}
