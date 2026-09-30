import type { Knex } from "knex";

// Dimensiones y variantes WebP (para srcset) de cada imagen subida
export async function up(knex: Knex): Promise<void> {
    await knex.schema.alterTable('media', (table) => {
        table.integer('width').nullable();
        table.integer('height').nullable();
        table.text('variants').nullable(); // JSON: [{ width, filename }]
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.alterTable('media', (table) => {
        table.dropColumn('width');
        table.dropColumn('height');
        table.dropColumn('variants');
    });
}
