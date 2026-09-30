import type { Knex } from "knex";

// Redirecciones 301: se crean automáticamente cuando cambia el slug de una página o post
export async function up(knex: Knex): Promise<void> {
    await knex.schema.createTable('redirects', (table) => {
        table.increments('id').primary();
        table.string('from_path', 500).notNullable().unique();
        table.string('to_path', 500).notNullable();
        table.integer('status_code').notNullable().defaultTo(301);
        table.timestamps(true, true);
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('redirects');
}
