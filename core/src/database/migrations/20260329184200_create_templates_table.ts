import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
    return knex.schema.createTable('templates', (table) => {
        table.uuid('id').primary();
        table.string('name').notNullable();
        table.string('type').notNullable(); // 'header', 'footer', 'page', etc.
        table.json('content').notNullable();
        table.boolean('is_active').defaultTo(true);
        table.timestamps(true, true);
    });
}

export async function down(knex: Knex): Promise<void> {
    return knex.schema.dropTableIfExists('templates');
}
