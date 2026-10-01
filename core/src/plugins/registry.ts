import fs from 'fs';
import path from 'path';
import { Router } from 'express';
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { z } from 'zod';
import db from '../database';
import { config } from '../config';
import { FieldDefinitionSchema, buildEntryDataSchema } from '../../../shared/contentTypes';
import { verifyToken } from '../modules/auth/auth.middleware';
import { registerTemplateHelper, removePluginHelpers, safeHtml, escapeExpression } from '../modules/render/templating';
import { addAction, addFilter, removePluginHooks, type ActionHook, type FilterHook } from './hooks';

/**
 * ============================================================================
 * PLUGINS
 * ============================================================================
 * Un plugin es una carpeta en /plugins con:
 *   plugin.json  → nombre, versión, ajustes (mismo formato que los campos de
 *                  los tipos de contenido) y colecciones de datos para el admin
 *   index.js     → module.exports = { register(api) { ... } }
 *
 * Los plugins se activan/desactivan en caliente desde el admin. Igual que en
 * WordPress, el código de un plugin es de confianza: tiene acceso a la BD.
 * ============================================================================
 */

export const PluginManifestSchema = z.object({
    name: z.string().regex(/^[a-z][a-z0-9-]{1,59}$/, 'name usa minúsculas, números y guiones'),
    title: z.string().min(1).max(100),
    version: z.string().min(1).max(30),
    description: z.string().max(500).optional(),
    author: z.string().max(100).optional(),
    main: z.string().regex(/^[\w./-]+\.js$/).default('index.js'),
    settings: z.array(FieldDefinitionSchema).default([]),
    // Colecciones de plugin_data que el admin muestra como tabla (ej: mensajes recibidos)
    data: z.array(z.object({
        collection: z.string().regex(/^[a-z][a-z0-9_-]{0,59}$/),
        title: z.string().min(1).max(100),
        columns: z.array(z.string()).optional(),
    })).default([]),
});

export type PluginManifest = z.infer<typeof PluginManifestSchema>;

export interface DiscoveredPlugin {
    manifest: PluginManifest | null;
    dir: string;
    folder: string;
    error: string | null;
}

interface LoadedPlugin {
    router: Router;
}

const loaded = new Map<string, LoadedPlugin>();
const loadErrors = new Map<string, string>();

// ----------------------------------------------------------------------------
// Descubrimiento
// ----------------------------------------------------------------------------
export const discoverPlugins = (): DiscoveredPlugin[] => {
    if (!fs.existsSync(config.paths.plugins)) return [];

    return fs.readdirSync(config.paths.plugins, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
        .map((entry): DiscoveredPlugin => {
            const dir = path.join(config.paths.plugins, entry.name);
            const manifestPath = path.join(dir, 'plugin.json');
            try {
                const parsed = PluginManifestSchema.safeParse(JSON.parse(fs.readFileSync(manifestPath, 'utf8')));
                if (!parsed.success) {
                    return { manifest: null, dir, folder: entry.name, error: `plugin.json inválido: ${parsed.error.issues[0]?.message}` };
                }
                if (parsed.data.name !== entry.name) {
                    return { manifest: null, dir, folder: entry.name, error: `El nombre (${parsed.data.name}) debe coincidir con la carpeta` };
                }
                return { manifest: parsed.data, dir, folder: entry.name, error: null };
            } catch (error: any) {
                return { manifest: null, dir, folder: entry.name, error: `No se pudo leer plugin.json: ${error.message}` };
            }
        });
};

export const findPlugin = (name: string): DiscoveredPlugin | undefined =>
    discoverPlugins().find((plugin) => plugin.folder === name);

// ----------------------------------------------------------------------------
// Ajustes y almacenamiento
// ----------------------------------------------------------------------------
export const getPluginSettings = async (name: string): Promise<Record<string, unknown>> => {
    const row = await db('plugins').where({ name }).first('settings');
    try {
        return row ? JSON.parse(row.settings || '{}') : {};
    } catch {
        return {};
    }
};

export const validatePluginSettings = (manifest: PluginManifest, values: Record<string, unknown>) =>
    buildEntryDataSchema(manifest.settings).safeParse(values);

const createStorage = (plugin: string) => ({
    add: async (collection: string, data: Record<string, unknown>): Promise<number> => {
        const [id] = await db('plugin_data').insert({ plugin, collection, data: JSON.stringify(data) });
        return Number(id);
    },
    list: async (collection: string, options: { limit?: number } = {}) => {
        const rows = await db('plugin_data')
            .where({ plugin, collection })
            .orderBy('id', 'desc')
            .limit(Math.min(options.limit ?? 100, 1000));
        return rows.map((row) => ({ id: row.id, created_at: row.created_at, ...JSON.parse(row.data) }));
    },
    remove: async (id: number) => db('plugin_data').where({ plugin, id }).delete(),
});

export const listPluginData = (plugin: string, collection: string, limit = 200) => createStorage(plugin).list(collection, { limit });

// ----------------------------------------------------------------------------
// API que recibe cada plugin en register(api)
// ----------------------------------------------------------------------------
type RouteOptions = { public?: boolean };

const createPluginApi = (manifest: PluginManifest, router: Router) => {
    const name = manifest.name;

    const route = (method: 'get' | 'post' | 'put' | 'delete') =>
        (routePath: string, handler: RequestHandler, options: RouteOptions = {}) => {
            if (!routePath.startsWith('/')) throw new Error(`La ruta debe empezar con "/": ${routePath}`);
            // Errores (también asíncronos) del plugin → manejador global, nunca un crash
            const safeHandler = (req: Request, res: Response, next: NextFunction) => {
                Promise.resolve(handler(req, res, next)).catch(next);
            };
            const middlewares: RequestHandler[] = options.public ? [] : [verifyToken as RequestHandler];
            router[method](routePath, ...middlewares, safeHandler);
        };

    return {
        name,
        config: { siteUrl: config.siteUrl, siteName: config.siteName, siteLang: config.siteLang },
        addFilter: (hook: FilterHook, callback: (value: any, context?: any) => unknown, priority?: number) =>
            addFilter(name, hook, callback, priority),
        addAction: (hook: ActionHook, callback: (payload: any) => unknown, priority?: number) =>
            addAction(name, hook, callback, priority),
        registerTemplateHelper: (helperName: string, helper: (...args: any[]) => unknown) =>
            registerTemplateHelper(name, helperName, helper),
        // Rutas en /api/plugins/<nombre>/... (requieren sesión salvo { public: true })
        routes: { get: route('get'), post: route('post'), put: route('put'), delete: route('delete') },
        settings: { get: () => getPluginSettings(name) },
        storage: createStorage(name),
        html: safeHtml,
        escape: escapeExpression,
        db,
        log: (...args: unknown[]) => console.log(`[Plugin ${name}]`, ...args),
    };
};

export type PluginApi = ReturnType<typeof createPluginApi>;

// ----------------------------------------------------------------------------
// Carga y descarga en caliente
// ----------------------------------------------------------------------------
const clearRequireCache = (dir: string) => {
    for (const cached of Object.keys(require.cache)) {
        if (cached.startsWith(dir + path.sep)) delete require.cache[cached];
    }
};

export const unloadPlugin = (name: string): void => {
    removePluginHooks(name);
    removePluginHelpers(name);
    loaded.delete(name);
    const plugin = findPlugin(name);
    if (plugin) clearRequireCache(plugin.dir);
};

export const loadPlugin = async (name: string): Promise<void> => {
    const plugin = findPlugin(name);
    if (!plugin?.manifest) throw new Error(plugin?.error ?? `El plugin ${name} no existe`);

    unloadPlugin(name); // recarga limpia si ya estaba cargado
    const router = Router();
    try {
        const entryFile = path.join(plugin.dir, plugin.manifest.main);
        if (!entryFile.startsWith(plugin.dir + path.sep)) throw new Error('main apunta fuera de la carpeta del plugin');
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const mod = require(entryFile);
        const register = mod.register ?? mod.default?.register;
        if (typeof register !== 'function') throw new Error(`${plugin.manifest.main} debe exportar register(api)`);

        await register(createPluginApi(plugin.manifest, router));
        loaded.set(name, { router });
        loadErrors.delete(name);
    } catch (error: any) {
        // Si falla a mitad de registro, se deshace lo que alcanzó a registrar
        unloadPlugin(name);
        loadErrors.set(name, error.message);
        throw error;
    }
};

export const isPluginLoaded = (name: string): boolean => loaded.has(name);
export const getPluginLoadError = (name: string): string | null => loadErrors.get(name) ?? null;

export const setPluginEnabled = async (name: string, enabled: boolean): Promise<void> => {
    if (enabled) await loadPlugin(name);
    else unloadPlugin(name);

    await db('plugins')
        .insert({ name, enabled })
        .onConflict('name')
        .merge({ enabled, updated_at: db.fn.now() });
};

/** Al arrancar: carga los plugins marcados como activos. Uno roto no impide arrancar. */
export const initPlugins = async (): Promise<void> => {
    const enabled = await db('plugins').where({ enabled: true }).select('name');
    for (const { name } of enabled) {
        try {
            await loadPlugin(name);
            console.log(`🧩 Plugin activo: ${name}`);
        } catch (error: any) {
            console.error(`[Plugins] No se pudo cargar ${name}:`, error.message);
        }
    }
};

/** /api/plugins/:name/* → rutas que registró ese plugin (si está activo) */
export const pluginRoutesDispatcher = (req: Request, res: Response, next: NextFunction): void => {
    const name = String(req.params.name ?? '');
    const plugin = loaded.get(name);
    if (!plugin) {
        res.status(404).json({ error: `El plugin ${name} no está activo` });
        return;
    }
    plugin.router(req, res, next);
};
