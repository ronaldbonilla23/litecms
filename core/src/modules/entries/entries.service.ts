import type { Knex } from 'knex';
import db from '../../database';
import {
    buildEntryDataSchema, toSlug,
    type ContentType, type Entry, type EntryInput, type EntryUpdateInput, type FieldDefinition,
} from '../../../../shared/contentTypes';
import { sanitizeRichText } from '../../services/sanitize.service';
import { recordSlugChange } from '../redirects/redirects.service';
import { ContentTypeError, getContentType } from '../contentTypes/contentTypes.service';

/**
 * ============================================================================
 * ENTRADAS DE UN TIPO DE CONTENIDO
 * ============================================================================
 * Los valores de los campos se validan con el schema generado a partir de la
 * definición del tipo (shared/contentTypes.ts) antes de guardarse en `data`.
 * ============================================================================
 */

export class EntryValidationError extends ContentTypeError {
    constructor(message: string, public details: Record<string, string[]>) {
        super(message, 400);
    }
}

export const parseEntry = (row: any): Entry => ({
    ...row,
    data: typeof row.data === 'string' ? JSON.parse(row.data || '{}') : (row.data ?? {}),
    compiled_css: undefined,
});

// Valida `data` contra los campos del tipo y sanitiza el texto enriquecido
const validateData = (fields: FieldDefinition[], data: Record<string, unknown>): Record<string, unknown> => {
    const result = buildEntryDataSchema(fields).safeParse(data);
    if (!result.success) {
        const details: Record<string, string[]> = {};
        for (const issue of result.error.issues) {
            const key = String(issue.path[0] ?? 'data');
            (details[key] ??= []).push(issue.message);
        }
        throw new EntryValidationError('Hay campos con valores inválidos', details);
    }

    const clean: Record<string, unknown> = { ...result.data };
    for (const field of fields) {
        if (field.type === 'richtext' && typeof clean[field.key] === 'string') {
            clean[field.key] = sanitizeRichText(clean[field.key] as string);
        }
        if (clean[field.key] === undefined) delete clean[field.key];
    }
    return clean;
};

// Slug único dentro del tipo: "casa", "casa-2", "casa-3"...
const uniqueSlug = async (conn: Knex, typeId: number, base: string, excludeId?: number): Promise<string> => {
    const root = toSlug(base) || 'entrada';
    let candidate = root;
    for (let suffix = 2; ; suffix += 1) {
        const existing = await conn('entries')
            .where({ type_id: typeId, slug: candidate })
            .modify((qb) => { if (excludeId) qb.whereNot({ id: excludeId }); })
            .first('id');
        if (!existing) return candidate;
        candidate = `${root}-${suffix}`;
    }
};

const requireType = async (typeId: number): Promise<ContentType> => {
    const type = await getContentType({ id: typeId });
    if (!type) throw new ContentTypeError('El tipo de contenido no existe', 404);
    return type;
};

export const listEntries = async (typeId: number, filters: { status?: string } = {}): Promise<Entry[]> => {
    const rows = await db('entries')
        .where({ type_id: typeId })
        .modify((qb) => { if (filters.status) qb.where({ status: filters.status }); })
        .orderBy([{ column: 'published_at', order: 'desc' }, { column: 'id', order: 'desc' }]);
    return rows.map(parseEntry);
};

export const getEntry = async (id: number): Promise<Entry | null> => {
    const row = await db('entries').where({ id }).first();
    return row ? parseEntry(row) : null;
};

export const createEntry = async (typeId: number, input: EntryInput, authorId?: number): Promise<Entry> => {
    const type = await requireType(typeId);
    const data = validateData(type.fields, input.data ?? {});
    const slug = await uniqueSlug(db, typeId, input.slug || input.title);

    const [id] = await db('entries').insert({
        type_id: typeId,
        title: input.title,
        slug,
        status: input.status,
        data: JSON.stringify(data),
        meta_title: input.meta_title ?? null,
        meta_description: input.meta_description ?? null,
        og_image_id: input.og_image_id ?? null,
        author_id: authorId ?? null,
        // Al publicar por primera vez se fija la fecha de publicación
        published_at: input.published_at ?? (input.status === 'published' ? new Date().toISOString() : null),
    });

    await db('content_types').where({ id: typeId }).update({ archive_css: null });
    return (await getEntry(Number(id)))!;
};

export const updateEntry = async (id: number, input: EntryUpdateInput): Promise<Entry> => {
    const current = await getEntry(id);
    if (!current) throw new ContentTypeError('La entrada no existe', 404);
    const type = await requireType(current.type_id);

    const update: Record<string, unknown> = { updated_at: db.fn.now(), compiled_css: null };

    if (input.title !== undefined) update.title = input.title;
    if (input.data !== undefined) {
        // Edición parcial: se combinan los valores nuevos con los existentes antes de validar
        update.data = JSON.stringify(validateData(type.fields, { ...current.data, ...input.data }));
    }
    if (input.slug !== undefined) update.slug = await uniqueSlug(db, type.id, input.slug, id);
    if (input.status !== undefined) {
        update.status = input.status;
        if (input.status === 'published' && !current.published_at && input.published_at === undefined) {
            update.published_at = new Date().toISOString();
        }
    }
    if (input.published_at !== undefined) update.published_at = input.published_at;
    if (input.meta_title !== undefined) update.meta_title = input.meta_title;
    if (input.meta_description !== undefined) update.meta_description = input.meta_description;
    if (input.og_image_id !== undefined) update.og_image_id = input.og_image_id;

    await db('entries').where({ id }).update(update);
    await db('content_types').where({ id: type.id }).update({ archive_css: null });

    if (typeof update.slug === 'string' && update.slug !== current.slug) {
        await recordSlugChange(`${type.url_prefix}/${current.slug}`, `${type.url_prefix}/${update.slug}`);
    }

    return (await getEntry(id))!;
};

export const deleteEntry = async (id: number): Promise<void> => {
    const current = await getEntry(id);
    if (!current) throw new ContentTypeError('La entrada no existe', 404);
    await db('entries').where({ id }).delete();
    await db('content_types').where({ id: current.type_id }).update({ archive_css: null });
};
