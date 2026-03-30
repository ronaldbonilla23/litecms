import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
    return knex.schema.createTable('theme_settings', (table) => {
        table.increments('id').primary();
        table.string('key').notNullable().unique(); // Ej: 'primary_color'
        table.string('value').notNullable();        // Ej: '#C2F86C'
        table.timestamps(true, true);
    });
}

export async function down(knex: Knex): Promise<void> {
    return knex.schema.dropTable('theme_settings');
}