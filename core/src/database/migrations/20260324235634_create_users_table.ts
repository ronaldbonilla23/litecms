import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
    // Aquí definimos la estructura exacta de la tabla de usuarios
    return knex.schema.createTable('users', (table) => {
        table.increments('id').primary(); // ID autoincremental
        table.string('name').notNullable(); // Nombre obligatorio
        table.string('email').notNullable().unique(); // Email único
        table.string('password').notNullable(); // Contraseña encriptada
        table.string('role').notNullable().defaultTo('admin'); // Rol por defecto
        table.timestamps(true, true); // Crea las columnas created_at y updated_at
    });
}


export async function down(knex: Knex): Promise<void> {
    // Si revertimos la migración, borramos la tabla
    return knex.schema.dropTableIfExists('users');
}

