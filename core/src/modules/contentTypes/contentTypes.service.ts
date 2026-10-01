import db from '../../database';
import type { ContentType, ContentTypeInput, FieldDefinition } from '../../../../shared/contentTypes';
import { recordSlugChange } from '../redirects/redirects.service';

/**
 * ============================================================================
 * TIPOS DE CONTENIDO
 * ============================================================================
 * Un tipo define los campos de sus entradas y cómo se publican:
 *   url_prefix "/proyectos" → archivo en /proyectos y entradas en /proyectos/:slug
 * ============================================================================
 */

export class ContentTypeError extends Error {
    constructor(message: string, public statusCode = 400) {
        super(message);
    }
}

// Fila de la BD → objeto con tipos correctos (fields JSON, booleanos de SQLite)
export const parseContentType = (row: any): ContentType => ({
    ...row,
    has_archive: Boolean(row.has_archive),
    fields: typeof row.fields === 'string' ? (JSON.parse(row.fields || '[]') as FieldDefinition[]) : (row.fields ?? []),
    archive_css: undefined,
});

const toRow = (input: Partial<ContentTypeInput>) => {
    const row: Record<string, unknown> = { ...input };
    if (input.fields !== undefined) row.fields = JSON.stringify(input.fields);
    return row;
};

export const listContentTypes = async (): Promise<ContentType[]> => {
    const rows = await db('content_types').orderBy('name', 'asc');
    return rows.map(parseContentType);
};

export const getContentType = async (where: { id: number } | { slug: string }): Promise<ContentType | null> => {
    const row = await db('content_types').where(where).first();
    return row ? parseContentType(row) : null;
};

const assertUnique = async (input: Partial<ContentTypeInput>, excludeId?: number) => {
    const conflicts = await db('content_types')
        .where((qb) => {
            if (input.slug) qb.orWhere({ slug: input.slug });
            if (input.url_prefix) qb.orWhere({ url_prefix: input.url_prefix });
        })
        .modify((qb) => { if (excludeId) qb.whereNot({ id: excludeId }); })
        .select('slug', 'url_prefix');

    if (conflicts.some((row: { slug: string }) => row.slug === input.slug)) {
        throw new ContentTypeError('Ya existe un tipo de contenido con ese slug', 409);
    }
    if (conflicts.some((row: { url_prefix: string }) => row.url_prefix === input.url_prefix)) {
        throw new ContentTypeError('Ya existe un tipo de contenido con ese prefijo de URL', 409);
    }

    // Una página publicada en la misma URL que el archivo lo taparía: avisamos
    if (input.url_prefix) {
        const page = await db('pages').where({ slug: input.url_prefix }).first('id');
        if (page) throw new ContentTypeError(`Ya existe una página en ${input.url_prefix}`, 409);
    }
};

export const createContentType = async (input: ContentTypeInput): Promise<ContentType> => {
    await assertUnique(input);
    const [id] = await db('content_types').insert(toRow(input));
    return (await getContentType({ id: Number(id) }))!;
};

export const updateContentType = async (id: number, input: Partial<ContentTypeInput>): Promise<ContentType> => {
    const current = await getContentType({ id });
    if (!current) throw new ContentTypeError('El tipo de contenido no existe', 404);

    await assertUnique(input, id);

    await db('content_types').where({ id }).update({
        ...toRow(input),
        archive_css: null, // plantillas o campos pueden haber cambiado
        updated_at: db.fn.now(),
    });
    await db('entries').where({ type_id: id }).update({ compiled_css: null });

    // Si cambia el prefijo, todas las URLs del tipo redirigen (301) a las nuevas
    if (input.url_prefix && input.url_prefix !== current.url_prefix) {
        const entries = await db('entries').where({ type_id: id }).select('slug');
        for (const entry of entries) {
            await recordSlugChange(`${current.url_prefix}/${entry.slug}`, `${input.url_prefix}/${entry.slug}`);
        }
        if (current.has_archive) await recordSlugChange(current.url_prefix, input.url_prefix);
    }

    return (await getContentType({ id }))!;
};

/**
 * Borrar un tipo borra también sus entradas. Para evitar accidentes,
 * si tiene entradas hay que confirmarlo explícitamente (force).
 */
export const deleteContentType = async (id: number, force: boolean): Promise<void> => {
    const current = await getContentType({ id });
    if (!current) throw new ContentTypeError('El tipo de contenido no existe', 404);

    const count = await db('entries').where({ type_id: id }).count('* as total').first();
    const total = Number(count?.total ?? 0);
    if (total > 0 && !force) {
        throw new ContentTypeError(`Este tipo tiene ${total} entradas. Confirma para borrarlas también.`, 409);
    }

    // SQLite no aplica ON DELETE CASCADE sin PRAGMA foreign_keys: se borra explícitamente
    await db.transaction(async (trx) => {
        await trx('entries').where({ type_id: id }).delete();
        await trx('content_types').where({ id }).delete();
    });
};
