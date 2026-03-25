import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
    return knex.schema.createTable('media', (table) => {
        table.increments('id').primary();
        table.string('filename').unique().notNullable();
        table.string('original_name').notNullable();
        table.string('mimetype').notNullable();
        table.integer('size').notNullable();
        table.string('path').notNullable();
        table.timestamps(true, true);
    });
}

export async function down(knex: Knex): Promise<void> {
    return knex.schema.dropTableIfExists('media');
}

