import Handlebars from 'handlebars';
import crypto from 'crypto';
import { config } from '../../config';
import type { QueryStore } from './content';

/**
 * ============================================================================
 * MOTOR DE PLANTILLAS (Handlebars)
 * ============================================================================
 * Instancia aislada con los helpers del núcleo y los que registren plugins.
 * Las plantillas compiladas se cachean por contenido.
 * ============================================================================
 */

const handlebars = Handlebars.create();
const templateCache = new Map<string, HandlebarsTemplateDelegate>();

/**
 * Helpers del núcleo, disponibles en todas las plantillas:
 *   {{#each (query "proyectos" limit=3)}}...{{/each}}  → entradas publicadas de un tipo
 *   {{formatDate entry.published_at}}                    → "1 de octubre de 2026"
 *   {{#if (eq entry.fields.estado "Vendido")}}...{{/if}}
 */
const CORE_HELPERS = new Set(['query', 'formatDate', 'eq']);

handlebars.registerHelper('query', function (slug: unknown, options: Handlebars.HelperOptions) {
    const store: QueryStore = options.data?.root?.__queries ?? {};
    const entries = store[String(slug)] ?? [];
    const limit = Number(options.hash?.limit);
    return Number.isInteger(limit) && limit > 0 ? entries.slice(0, limit) : entries;
});

handlebars.registerHelper('formatDate', function (value: unknown, format: unknown) {
    if (!value) return '';
    const date = new Date(String(value));
    if (Number.isNaN(date.getTime())) return '';
    const style = typeof format === 'string' && ['short', 'medium', 'long', 'full'].includes(format)
        ? format as 'short' | 'medium' | 'long' | 'full'
        : 'long';
    return new Intl.DateTimeFormat(config.siteLang, { dateStyle: style, timeZone: 'UTC' }).format(date);
});

handlebars.registerHelper('eq', (a: unknown, b: unknown) => a === b);

// ----------------------------------------------------------------------------
// Helpers de plugins
// ----------------------------------------------------------------------------
const pluginHelpers = new Map<string, string>(); // helper → plugin dueño

export const registerTemplateHelper = (plugin: string, name: string, helper: Handlebars.HelperDelegate): void => {
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(name)) throw new Error(`Nombre de helper inválido: ${name}`);
    if (CORE_HELPERS.has(name)) throw new Error(`El helper "${name}" pertenece al núcleo`);
    const owner = pluginHelpers.get(name);
    if (owner && owner !== plugin) throw new Error(`El helper "${name}" ya lo registró el plugin ${owner}`);

    handlebars.registerHelper(name, helper);
    pluginHelpers.set(name, plugin);
};

export const removePluginHelpers = (plugin: string): void => {
    for (const [name, owner] of pluginHelpers) {
        if (owner === plugin) {
            handlebars.unregisterHelper(name);
            pluginHelpers.delete(name);
        }
    }
};

// HTML que un helper devuelve sin escapar (el plugin es responsable de escapar lo que inserte)
export const safeHtml = (html: string) => new handlebars.SafeString(html);
export const escapeExpression = (value: string) => handlebars.Utils.escapeExpression(value);

export const renderTemplate = (source: string, context: Record<string, any>): string => {
    const key = crypto.createHash('sha1').update(source).digest('hex');
    let template = templateCache.get(key);
    if (!template) {
        template = handlebars.compile(source);
        if (templateCache.size > 200) templateCache.clear();
        templateCache.set(key, template);
    }
    try {
        return template(context);
    } catch (error: any) {
        // Una plantilla con sintaxis inválida no debe tumbar el sitio: se muestra sin procesar
        console.error('[Render] Error en plantilla Handlebars:', error.message);
        return source;
    }
};
