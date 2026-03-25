import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
    return knex.schema.createTable('pages', (table) => {
        table.increments('id').primary();
        table.string('title').notNullable();
        table.string('slug').notNullable().unique();
        table.json('fields');
        table.string('status').notNullable().defaultTo('draft');
        table.integer('author_id').unsigned().references('id').inTable('users');
        table.timestamps(true, true);
    });
}

export async function down(knex: Knex): Promise<void> {
    return knex.schema.dropTableIfExists('pages');
}