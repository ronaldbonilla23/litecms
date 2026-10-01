import db from '../../database';

/**
 * ============================================================================
 * REDIRECCIONES 301
 * ============================================================================
 * Cuando una página o post cambia de URL, la URL anterior redirige a la nueva.
 * Así no se pierden enlaces externos ni el posicionamiento en buscadores.
 * ============================================================================
 */

// Normaliza una ruta: siempre empieza con "/" y sin "/" final (excepto la raíz)
export const normalizePath = (value: string): string => {
    let normalized = value.trim();
    if (!normalized.startsWith('/')) normalized = `/${normalized}`;
    if (normalized.length > 1) normalized = normalized.replace(/\/+$/, '');
    return normalized || '/';
};

export const recordSlugChange = async (oldPath: string, newPath: string): Promise<void> => {
    const from = normalizePath(oldPath);
    const to = normalizePath(newPath);
    if (from === to) return;

    await db.transaction(async (trx) => {
        // La nueva URL vuelve a estar viva: si antes redirigía a otro lado, se elimina esa regla
        await trx('redirects').where({ from_path: to }).delete();

        // Evitar cadenas A → B → C: todo lo que apuntaba a la URL vieja apunta ahora a la nueva
        await trx('redirects').where({ to_path: from }).update({ to_path: to, updated_at: trx.fn.now() });

        await trx('redirects')
            .insert({ from_path: from, to_path: to, status_code: 301 })
            .onConflict('from_path')
            .merge({ to_path: to, status_code: 301, updated_at: trx.fn.now() });
    });
};

export const findRedirect = async (path: string): Promise<{ to_path: string; status_code: number } | undefined> =>
    db('redirects').where({ from_path: normalizePath(path) }).first('to_path', 'status_code');
