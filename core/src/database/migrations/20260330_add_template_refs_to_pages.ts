import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
    return knex.schema.alterTable('pages', (table) => {
        // Columna para el contenido HTML de la página
        table.text('content').nullable();

        // Columnas para referenciar plantillas de header y footer (sin foreign key para evitar problemas con SQLite)
        table.string('header_id').nullable();
        table.string('footer_id').nullable();
    });
}

export async function down(knex: Knex): Promise<void> {
    return knex.schema.alterTable('pages', (table) => {
        table.dropColumn('content');
        table.dropColumn('header_id');
        table.dropColumn('footer_id');
    });
}
