import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import db from '../database';
import { config } from '../config';
import { ContentTypeSchema } from '../../../shared/contentTypes';
import { invalidateAllCss } from '../modules/render/css.service';
import { createContentType, getContentType } from '../modules/contentTypes/contentTypes.service';
import { createEntry } from '../modules/entries/entries.service';
import { findPlugin, setPluginEnabled } from '../plugins/registry';

/**
 * ============================================================================
 * TEMAS
 * ============================================================================
 * Un tema es una carpeta en /themes con theme.json y archivos de plantilla.
 * Aplicarlo instala en la BD:
 *   - plantillas (header, footer, single, archive...) → se actualizan al reaplicar
 *   - colores y fuentes del Design System
 *   - tipos de contenido con entradas de ejemplo  → solo si no existen
 *   - páginas iniciales                           → solo si no existen
 *   - plugins recomendados                        → se activan
 * Nunca sobrescribe páginas ni tipos de contenido que el usuario ya tenga.
 * ============================================================================
 */

const KEY = /^[a-z][a-z0-9-]{0,49}$/;
const FILE = /^[\w-]+(\/[\w-]+)*\.(hbs|html)$/;

const ThemeManifestSchema = z.object({
    name: z.string().regex(KEY),
    title: z.string().min(1).max(100),
    version: z.string().min(1).max(30),
    description: z.string().max(500).optional(),
    author: z.string().max(100).optional(),
    settings: z.record(z.string(), z.string()).default({}),
    plugins: z.array(z.string().regex(KEY)).default([]),
    templates: z.array(z.object({
        key: z.string().regex(KEY),
        name: z.string().min(1).max(100),
        type: z.enum(['header', 'footer', 'page', 'section', 'blog_single', 'single', 'archive']),
        file: z.string().regex(FILE),
    })).default([]),
    content_types: z.array(ContentTypeSchema.omit({
        single_template_id: true, archive_template_id: true, header_id: true, footer_id: true,
    }).extend({
        // Referencias a "key" de templates de este mismo tema
        single_template: z.string().regex(KEY).optional(),
        archive_template: z.string().regex(KEY).optional(),
        entries: z.array(z.object({
            title: z.string().min(1),
            slug: z.string().optional(),
            data: z.record(z.string(), z.unknown()).default({}),
        })).default([]),
    })).default([]),
    pages: z.array(z.object({
        title: z.string().min(1).max(200),
        slug: z.string().regex(/^\/[a-z0-9-/]*$/),
        file: z.string().regex(FILE),
        header: z.string().regex(KEY).optional(),
        footer: z.string().regex(KEY).optional(),
        meta_title: z.string().max(200).optional(),
        meta_description: z.string().max(500).optional(),
    })).default([]),
});

export type ThemeManifest = z.infer<typeof ThemeManifestSchema>;

export interface DiscoveredTheme {
    folder: string;
    dir: string;
    manifest: ThemeManifest | null;
    error: string | null;
}

export const discoverThemes = (): DiscoveredTheme[] => {
    if (!fs.existsSync(config.paths.themes)) return [];

    return fs.readdirSync(config.paths.themes, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
        .map((entry): DiscoveredTheme => {
            const dir = path.join(config.paths.themes, entry.name);
            try {
                const parsed = ThemeManifestSchema.safeParse(JSON.parse(fs.readFileSync(path.join(dir, 'theme.json'), 'utf8')));
                if (!parsed.success) {
                    const issue = parsed.error.issues[0];
                    return { folder: entry.name, dir, manifest: null, error: `theme.json inválido (${issue?.path.join('.')}): ${issue?.message}` };
                }
                if (parsed.data.name !== entry.name) {
                    return { folder: entry.name, dir, manifest: null, error: 'El nombre debe coincidir con la carpeta' };
                }
                return { folder: entry.name, dir, manifest: parsed.data, error: null };
            } catch (error: any) {
                return { folder: entry.name, dir, manifest: null, error: `No se pudo leer theme.json: ${error.message}` };
            }
        });
};

export const getActiveTheme = async (): Promise<string | null> => {
    const row = await db('settings').where({ key: 'active_theme' }).first('value');
    return row ? JSON.parse(row.value) : null;
};

const readThemeFile = (dir: string, file: string): string => {
    const fullPath = path.join(dir, file);
    if (!fullPath.startsWith(dir + path.sep)) throw new Error(`Ruta fuera del tema: ${file}`);
    return fs.readFileSync(fullPath, 'utf8');
};

const templateId = (theme: string, key: string) => `theme-${theme}-${key}`;

export interface ApplyReport {
    templates: number;
    contentTypesCreated: string[];
    contentTypesSkipped: string[];
    pagesCreated: string[];
    pagesSkipped: string[];
    pluginsEnabled: string[];
    warnings: string[];
}

export const applyTheme = async (name: string, authorId?: number): Promise<ApplyReport> => {
    const theme = discoverThemes().find((item) => item.folder === name);
    if (!theme?.manifest) throw new Error(theme?.error ?? `El tema ${name} no existe`);
    const { manifest, dir } = theme;

    const report: ApplyReport = {
        templates: 0, contentTypesCreated: [], contentTypesSkipped: [],
        pagesCreated: [], pagesSkipped: [], pluginsEnabled: [], warnings: [],
    };

    // Se leen todos los archivos antes de tocar la BD: un archivo faltante no deja el tema a medias
    const templateSources = new Map(manifest.templates.map((tpl) => [tpl.key, readThemeFile(dir, tpl.file)]));
    const pageSources = new Map(manifest.pages.map((page) => [page.slug, readThemeFile(dir, page.file)]));
    const refTemplate = (key?: string) => {
        if (!key) return null;
        if (!templateSources.has(key)) throw new Error(`Plantilla "${key}" no declarada en theme.json`);
        return templateId(manifest.name, key);
    };

    // 1. Plantillas (upsert). Header y footer del tema pasan a ser los activos del sitio.
    for (const tpl of manifest.templates) {
        const id = templateId(manifest.name, tpl.key);
        if (tpl.type === 'header' || tpl.type === 'footer') {
            await db('templates').where({ type: tpl.type }).whereNot({ id }).update({ is_active: false });
        }
        await db('templates')
            .insert({ id, name: tpl.name, type: tpl.type, content: templateSources.get(tpl.key), is_active: true })
            .onConflict('id')
            .merge({ name: tpl.name, type: tpl.type, content: templateSources.get(tpl.key), is_active: true, updated_at: db.fn.now() });
        report.templates += 1;
    }

    // 2. Design System: solo columnas que existen en theme_settings
    if (Object.keys(manifest.settings).length > 0) {
        const columns = await db('theme_settings').columnInfo();
        const settings = Object.fromEntries(Object.entries(manifest.settings).filter(([key]) => key in columns && key !== 'id'));
        const existing = await db('theme_settings').first('id');
        if (existing) await db('theme_settings').where({ id: existing.id }).update({ ...settings, updated_at: db.fn.now() });
        else await db('theme_settings').insert(settings);
    }

    // 3. Tipos de contenido (y entradas de ejemplo) solo si no existen
    for (const { entries, single_template, archive_template, ...type } of manifest.content_types) {
        if (await getContentType({ slug: type.slug })) {
            report.contentTypesSkipped.push(type.slug);
            continue;
        }
        const created = await createContentType({
            ...type,
            single_template_id: refTemplate(single_template),
            archive_template_id: refTemplate(archive_template),
        });
        // Se crean en orden inverso: los listados muestran primero lo más reciente,
        // así la primera entrada del theme.json aparece primero en el sitio
        for (const entry of [...entries].reverse()) {
            await createEntry(created.id, { title: entry.title, slug: entry.slug, status: 'published', data: entry.data }, authorId);
        }
        report.contentTypesCreated.push(type.slug);
    }

    // 4. Páginas iniciales solo si no existen
    for (const page of manifest.pages) {
        if (await db('pages').where({ slug: page.slug }).first('id')) {
            report.pagesSkipped.push(page.slug);
            continue;
        }
        await db('pages').insert({
            title: page.title,
            slug: page.slug,
            status: 'published',
            content: pageSources.get(page.slug),
            header_id: refTemplate(page.header),
            footer_id: refTemplate(page.footer),
            meta_title: page.meta_title ?? null,
            meta_description: page.meta_description ?? null,
            author_id: authorId ?? null,
        });
        report.pagesCreated.push(page.slug);
    }

    // 5. Plugins recomendados
    for (const plugin of manifest.plugins) {
        if (!findPlugin(plugin)?.manifest) {
            report.warnings.push(`El plugin recomendado "${plugin}" no está instalado`);
            continue;
        }
        try {
            await setPluginEnabled(plugin, true);
            report.pluginsEnabled.push(plugin);
        } catch (error: any) {
            report.warnings.push(`No se pudo activar "${plugin}": ${error.message}`);
        }
    }

    await db('settings')
        .insert({ key: 'active_theme', value: JSON.stringify(manifest.name) })
        .onConflict('key')
        .merge({ value: JSON.stringify(manifest.name), updated_at: db.fn.now() });

    // Plantillas y colores cambian el CSS de todo el sitio
    await invalidateAllCss();
    return report;
};
