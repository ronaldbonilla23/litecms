import type { Knex } from "knex";

// Antes el admin guardaba imágenes con URL absoluta de desarrollo (http://localhost:3000/uploads/...).
// Las pasamos a ruta relativa para que funcionen en cualquier dominio.
// También vaciamos el CSS cacheado de páginas y posts: ahora el render SSR lo recompila
// a partir del HTML completo (header + contenido + footer) y lo guarda en la BD.
const LEGACY_PREFIX = 'http://localhost:3000/uploads/';

export async function up(knex: Knex): Promise<void> {
    for (const table of ['pages', 'posts', 'templates']) {
        await knex(table)
            .where('content', 'like', `%${LEGACY_PREFIX}%`)
            .update({ content: knex.raw('replace(content, ?, ?)', [LEGACY_PREFIX, '/uploads/']) });
    }
    await knex('pages').update({ compiled_css: null });
    await knex('posts').update({ compiled_css: null });
}

export async function down(): Promise<void> {
    // No reversible: la URL absoluta de desarrollo no debe volver a la BD
}
