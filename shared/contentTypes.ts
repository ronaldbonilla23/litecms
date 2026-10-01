import { z } from 'zod';

/**
 * ============================================================================
 * TIPOS DE CONTENIDO CON CAMPOS DINÁMICOS
 * ============================================================================
 * Un tipo de contenido (ej: "Proyectos") define una lista de campos. Cada
 * entrada guarda sus valores en `data` (JSON). El mismo schema se usa para:
 *  - validar en la API (core) al crear/editar entradas
 *  - generar el formulario del admin
 * ============================================================================
 */

export const FIELD_TYPES = [
    'text', 'textarea', 'richtext', 'number', 'boolean', 'date', 'image', 'select', 'url', 'email',
] as const;

export type FieldType = typeof FIELD_TYPES[number];

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
    text: 'Texto corto',
    textarea: 'Texto largo',
    richtext: 'Texto enriquecido',
    number: 'Número',
    boolean: 'Sí / No',
    date: 'Fecha',
    image: 'Imagen',
    select: 'Lista de opciones',
    url: 'URL',
    email: 'Email',
};

// Claves reservadas: ya existen como columnas propias de cada entrada
const RESERVED_KEYS = ['id', 'title', 'slug', 'status', 'data', 'type', 'published_at', 'created_at', 'updated_at'];

export const FieldDefinitionSchema = z.object({
    key: z.string()
        .regex(/^[a-z][a-z0-9_]{0,49}$/, 'La clave usa minúsculas, números y guion bajo, y empieza por letra')
        .refine((key) => !RESERVED_KEYS.includes(key), 'Esa clave está reservada'),
    label: z.string().min(1, 'El campo necesita una etiqueta').max(100),
    type: z.enum(FIELD_TYPES),
    required: z.boolean().default(false),
    help: z.string().max(300).optional().nullable(),
    options: z.array(z.string().min(1).max(100)).max(100).optional(),
}).refine(
    (field) => field.type !== 'select' || (field.options && field.options.length > 0),
    { message: 'Una lista de opciones necesita al menos una opción', path: ['options'] },
);

export type FieldDefinition = z.infer<typeof FieldDefinitionSchema>;

// Slug del tipo (para la API) y prefijo de URL pública (ej: "/proyectos")
const TYPE_SLUG = /^[a-z][a-z0-9-]{0,49}$/;
const URL_PREFIX = /^\/[a-z0-9][a-z0-9-]*(\/[a-z0-9][a-z0-9-]*)*$/;

// Prefijos que pertenecen al sistema y no pueden usar los tipos de contenido
const RESERVED_PREFIXES = ['/api', '/admin', '/uploads', '/css', '/blog'];

export const ContentTypeSchema = z.object({
    name: z.string().min(1, 'El nombre es obligatorio').max(100),
    singular_name: z.string().min(1, 'El nombre en singular es obligatorio').max(100),
    slug: z.string().regex(TYPE_SLUG, 'El slug usa minúsculas, números y guiones'),
    description: z.string().max(500).optional().nullable(),
    url_prefix: z.string()
        .regex(URL_PREFIX, 'El prefijo empieza con "/" y usa minúsculas, números y guiones (ej: /proyectos)')
        .refine((prefix) => !RESERVED_PREFIXES.some((reserved) => prefix === reserved || prefix.startsWith(`${reserved}/`)),
            'Ese prefijo está reservado por el sistema'),
    has_archive: z.boolean().default(true),
    fields: z.array(FieldDefinitionSchema).max(50)
        .refine((fields) => new Set(fields.map((field) => field.key)).size === fields.length, 'Hay claves de campo repetidas'),
    single_template_id: z.string().optional().nullable(),
    archive_template_id: z.string().optional().nullable(),
    header_id: z.string().optional().nullable(),
    footer_id: z.string().optional().nullable(),
});

export type ContentTypeInput = z.infer<typeof ContentTypeSchema>;

export interface ContentType extends ContentTypeInput {
    readonly id: number;
    created_at: string;
    updated_at: string;
}

export const ENTRY_STATUSES = ['draft', 'published'] as const;

export const EntrySchema = z.object({
    title: z.string().min(1, 'El título es obligatorio').max(200),
    slug: z.string().regex(/^[a-z0-9][a-z0-9-]*$/, 'El slug usa minúsculas, números y guiones').max(200).optional(),
    status: z.enum(ENTRY_STATUSES).default('draft'),
    data: z.record(z.string(), z.unknown()).default({}),
    meta_title: z.string().max(200).optional().nullable(),
    meta_description: z.string().max(500).optional().nullable(),
    og_image_id: z.number().int().optional().nullable(),
    published_at: z.string().optional().nullable(),
});

// Para PUT: todo opcional y sin defaults (no pisar status ni data al editar parcialmente)
export const EntryUpdateSchema = EntrySchema.extend({
    status: z.enum(ENTRY_STATUSES).optional(),
    data: z.record(z.string(), z.unknown()).optional(),
}).partial();

export type EntryInput = z.infer<typeof EntrySchema>;
export type EntryUpdateInput = z.infer<typeof EntryUpdateSchema>;

export interface Entry {
    readonly id: number;
    type_id: number;
    title: string;
    slug: string;
    status: typeof ENTRY_STATUSES[number];
    data: Record<string, unknown>;
    meta_title: string | null;
    meta_description: string | null;
    og_image_id: number | null;
    published_at: string | null;
    created_at: string;
    updated_at: string;
}

// Valor vacío de un formulario (input sin rellenar) → se trata como "sin valor"
const emptyToUndefined = (value: unknown) => (value === '' || value === null ? undefined : value);

const fieldValueSchema = (field: FieldDefinition): z.ZodType => {
    let schema: z.ZodType;
    switch (field.type) {
        case 'text':
            schema = z.string().max(500);
            break;
        case 'textarea':
            schema = z.string().max(10_000);
            break;
        case 'richtext':
            schema = z.string().max(200_000);
            break;
        case 'number':
            schema = z.coerce.number({ message: `${field.label} debe ser un número` });
            break;
        case 'boolean':
            schema = z.boolean();
            break;
        case 'date':
            schema = z.string().regex(/^\d{4}-\d{2}-\d{2}/, `${field.label} debe ser una fecha (AAAA-MM-DD)`);
            break;
        case 'image':
            schema = z.coerce.number().int().positive();
            break;
        case 'select':
            schema = z.enum((field.options ?? ['']) as [string, ...string[]], { message: `Elige una opción válida para ${field.label}` });
            break;
        case 'url':
            schema = z.string().regex(/^(https?:\/\/|\/)/, `${field.label} debe ser una URL (https://... o /ruta)`).max(2000);
            break;
        case 'email':
            schema = z.string().email(`${field.label} debe ser un email válido`);
            break;
    }

    // Obligatorio: primero se comprueba que haya valor (mensaje claro) y luego su formato
    const required = z.any()
        .refine((value) => value !== undefined, { message: `${field.label} es obligatorio` })
        .pipe(schema);

    if (field.type === 'boolean') {
        return field.required ? required : schema.optional();
    }
    return z.preprocess(emptyToUndefined, field.required ? required : schema.optional());
};

/**
 * Construye el validador de `data` a partir de la definición de campos.
 * Los campos que no existen en el tipo se descartan (strip).
 */
export const buildEntryDataSchema = (fields: FieldDefinition[]) =>
    z.object(Object.fromEntries(fields.map((field) => [field.key, fieldValueSchema(field)])));

// "Mis Proyectos 2026" → "mis_proyectos_2026" (para claves de campo)
export const toFieldKey = (label: string): string =>
    label.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
        .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').replace(/^(\d)/, 'f_$1').slice(0, 50);

// "Casa de Campo" → "casa-de-campo" (para slugs)
export const toSlug = (value: string): string =>
    value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
        .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 200);
