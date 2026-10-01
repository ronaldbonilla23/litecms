import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
    // Estado de cada plugin instalado en /plugins (activo o no) y sus ajustes
    await knex.schema.createTable('plugins', (table) => {
        table.string('name', 60).primary();
        table.boolean('enabled').notNullable().defaultTo(false);
        table.text('settings').notNullable().defaultTo('{}');
        table.timestamps(true, true);
    });

    // Almacén genérico para que los plugins guarden registros sin crear tablas propias
    // (ej: mensajes del formulario de contacto)
    await knex.schema.createTable('plugin_data', (table) => {
        table.increments('id').primary();
        table.string('plugin', 60).notNullable();
        table.string('collection', 60).notNullable();
        table.text('data').notNullable();
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.index(['plugin', 'collection', 'created_at']);
    });

    // Ajustes generales del sitio en formato clave → valor JSON (ej: tema activo)
    await knex.schema.createTable('settings', (table) => {
        table.string('key', 100).primary();
        table.text('value').notNullable();
        table.timestamp('updated_at').defaultTo(knex.fn.now());
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('settings');
    await knex.schema.dropTableIfExists('plugin_data');
    await knex.schema.dropTableIfExists('plugins');
}
