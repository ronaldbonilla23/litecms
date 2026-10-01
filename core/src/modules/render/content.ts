import db from '../../database';
import type { ContentType, Entry, FieldDefinition } from '../../../../shared/contentTypes';
import { parseContentType } from '../contentTypes/contentTypes.service';
import { parseEntry } from '../entries/entries.service';
import { parseVariants } from '../../services/images.service';
import { DEFAULT_SIZES } from './images';

/**
 * ============================================================================
 * TIPOS DE CONTENIDO EN EL RENDER PÚBLICO
 * ============================================================================
 * - Resuelve URLs:  /proyectos → archivo,  /proyectos/casa-azul → entrada
 * - Prepara los datos que reciben las plantillas Handlebars:
 *     {{entry.title}}, {{entry.fields.precio}}, {{entry.fields.foto.url}}
 * - Precarga las consultas {{#each (query "proyectos" limit=3)}} de cualquier
 *   plantilla (Handlebars no admite helpers asíncronos).
 * ============================================================================
 */

export interface ImageValue {
    id: number;
    url: string;
    alt: string;
    width: number | null;
    height: number | null;
    srcset: string;
    sizes: string;
}

export interface TemplateEntry {
    id: number;
    title: string;
    slug: string;
    url: string;
    published_at: string | null;
    fields: Record<string, unknown>;
    // Lista ordenada para plantillas genéricas: [{ key, label, type, value }]
    field_list: Array<{ key: string; label: string; type: string; value: unknown; is_image: boolean; is_html: boolean }>;
}

export const listPublicContentTypes = async (): Promise<ContentType[]> =>
    (await db('content_types').select('*')).map(parseContentType);

// ----------------------------------------------------------------------------
// Rutas
// ----------------------------------------------------------------------------
export type ContentRoute =
    | { kind: 'archive'; type: ContentType }
    | { kind: 'single'; type: ContentType; slug: string };

export const matchContentRoute = async (path: string): Promise<ContentRoute | null> => {
    const types = await listPublicContentTypes();
    // El prefijo más largo gana (/servicios/web antes que /servicios)
    types.sort((a, b) => b.url_prefix.length - a.url_prefix.length);

    for (const type of types) {
        if (path === type.url_prefix) {
            return type.has_archive ? { kind: 'archive', type } : null;
        }
        if (path.startsWith(`${type.url_prefix}/`)) {
            const slug = path.slice(type.url_prefix.length + 1);
            if (slug && !slug.includes('/')) return { kind: 'single', type, slug };
        }
    }
    return null;
};

// ----------------------------------------------------------------------------
// Datos para plantillas
// ----------------------------------------------------------------------------
type MediaRow = { id: number; filename: string; alt_text: string | null; width: number | null; height: number | null; variants: unknown };

const loadMediaByIds = async (ids: number[]): Promise<Map<number, MediaRow>> => {
    if (ids.length === 0) return new Map();
    const rows: MediaRow[] = await db('media').whereIn('id', [...new Set(ids)]).select('id', 'filename', 'alt_text', 'width', 'height', 'variants');
    return new Map(rows.map((row) => [row.id, row]));
};

const toImageValue = (media: MediaRow | undefined, fallbackAlt: string): ImageValue | null => {
    if (!media) return null;
    const variants = parseVariants(media.variants);
    return {
        id: media.id,
        url: `/uploads/${media.filename}`,
        alt: media.alt_text || fallbackAlt,
        width: media.width,
        height: media.height,
        srcset: variants.map((variant) => `/uploads/${variant.filename} ${variant.width}w`).join(', '),
        sizes: DEFAULT_SIZES,
    };
};

const imageFieldIds = (fields: FieldDefinition[], entries: Entry[]): number[] =>
    entries.flatMap((entry) => fields
        .filter((field) => field.type === 'image')
        .map((field) => Number(entry.data[field.key]))
        .filter((id) => Number.isInteger(id) && id > 0));

export const toTemplateEntries = async (type: ContentType, entries: Entry[]): Promise<TemplateEntry[]> => {
    const media = await loadMediaByIds(imageFieldIds(type.fields, entries));

    return entries.map((entry) => {
        const fields: Record<string, unknown> = {};
        for (const field of type.fields) {
            const raw = entry.data[field.key];
            fields[field.key] = field.type === 'image'
                ? toImageValue(media.get(Number(raw)), entry.title)
                : raw ?? null;
        }

        return {
            id: entry.id,
            title: entry.title,
            slug: entry.slug,
            url: `${type.url_prefix}/${entry.slug}`,
            published_at: entry.published_at,
            fields,
            field_list: type.fields
                .filter((field) => fields[field.key] !== null && fields[field.key] !== '' && fields[field.key] !== undefined)
                .map((field) => ({
                    key: field.key,
                    label: field.label,
                    type: field.type,
                    value: fields[field.key],
                    is_image: field.type === 'image',
                    is_html: field.type === 'richtext',
                })),
        };
    });
};

export const loadPublishedEntries = async (typeId: number, limit = 100): Promise<Entry[]> =>
    (await db('entries')
        .where({ type_id: typeId, status: 'published' })
        .orderBy([{ column: 'published_at', order: 'desc' }, { column: 'id', order: 'desc' }])
        .limit(limit)).map(parseEntry);

export const loadPublishedEntry = async (typeId: number, slug: string): Promise<(Entry & { compiled_css: string | null }) | null> => {
    const row = await db('entries').where({ type_id: typeId, slug, status: 'published' }).first();
    return row ? { ...parseEntry(row), compiled_css: row.compiled_css ?? null } : null;
};

// ----------------------------------------------------------------------------
// Helper {{query "slug-del-tipo" limit=3}}: precarga
// ----------------------------------------------------------------------------
const QUERY_USAGE = /\(\s*query\s+["']([a-z0-9-]+)["']/g;

export type QueryStore = Record<string, TemplateEntry[]>;

export const preloadQueries = async (...sources: string[]): Promise<QueryStore> => {
    const slugs = new Set<string>();
    for (const source of sources) {
        for (const match of source.matchAll(QUERY_USAGE)) {
            if (match[1]) slugs.add(match[1]);
        }
    }
    if (slugs.size === 0) return {};

    const store: QueryStore = {};
    const types = (await db('content_types').whereIn('slug', [...slugs])).map(parseContentType);
    for (const type of types) {
        store[type.slug] = await toTemplateEntries(type, await loadPublishedEntries(type.id));
    }
    return store;
};

// ----------------------------------------------------------------------------
// Plantillas por defecto (si el tipo no tiene plantilla asignada)
// ----------------------------------------------------------------------------
export const DEFAULT_SINGLE_TEMPLATE = `
<main class="max-w-3xl mx-auto px-6 py-16">
  <a href="{{type.url_prefix}}" class="text-sm opacity-60 hover:opacity-100">← {{type.name}}</a>
  <h1 class="text-4xl md:text-5xl font-black mt-4 mb-10 leading-tight">{{entry.title}}</h1>
  <dl class="space-y-8">
    {{#each entry.field_list}}
      <div>
        <dt class="text-xs uppercase tracking-widest opacity-60 mb-2">{{label}}</dt>
        <dd class="text-lg">
          {{#if is_image}}<img src="{{value.url}}" alt="{{value.alt}}" class="w-full h-auto rounded-2xl">
          {{else if is_html}}<div class="prose prose-invert max-w-none">{{{value}}}</div>
          {{else}}{{value}}{{/if}}
        </dd>
      </div>
    {{/each}}
  </dl>
</main>`;

export const DEFAULT_ARCHIVE_TEMPLATE = `
<main class="max-w-6xl mx-auto px-6 py-16">
  <h1 class="text-4xl md:text-5xl font-black mb-4">{{type.name}}</h1>
  {{#if type.description}}<p class="text-lg opacity-70 mb-12 max-w-2xl">{{type.description}}</p>{{/if}}
  <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
    {{#each entries}}
      <a href="{{url}}" class="block rounded-2xl border border-white/10 p-6 hover:border-white/30 transition-colors">
        <h2 class="text-xl font-bold">{{title}}</h2>
      </a>
    {{else}}
      <p class="opacity-60">Todavía no hay contenido publicado.</p>
    {{/each}}
  </div>
</main>`;
