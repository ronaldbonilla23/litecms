import crypto from 'crypto';
import db from '../../database';
import { compileTailwindCSS } from '../../services/tailwind.service';

/**
 * ============================================================================
 * CSS POR DOCUMENTO
 * ============================================================================
 * Cada página y cada post tiene su CSS Tailwind mínimo, compilado a partir de
 * su HTML completo (header + contenido + footer) y guardado en compiled_css.
 * Se compila al guardar (o la primera vez que se visita) y se sirve desde
 * /css/page-:id.css o /css/post-:id.css con un hash para caché inmutable.
 * ============================================================================
 */

export type CssOwner = 'page' | 'post' | 'entry' | 'archive';

// Dónde guarda cada tipo de documento su CSS compilado
const CSS_STORAGE: Record<CssOwner, { table: string; column: string }> = {
    page: { table: 'pages', column: 'compiled_css' },
    post: { table: 'posts', column: 'compiled_css' },
    entry: { table: 'entries', column: 'compiled_css' },
    archive: { table: 'content_types', column: 'archive_css' },
};

export const cssHash = (css: string): string =>
    crypto.createHash('sha1').update(css).digest('hex').slice(0, 10);

export const cssHref = (owner: CssOwner, id: number, css: string): string =>
    `/css/${owner}-${id}.css?v=${cssHash(css)}`;

const getThemeSettings = async () => (await db('theme_settings').first()) || {};

// HTML completo de una página: header + contenido + footer (sin procesar Handlebars)
export const buildPageLayoutHtml = async (page: { content?: string | null; header_id?: string | null; footer_id?: string | null }): Promise<string> => {
    const [header, footer] = await Promise.all([
        page.header_id ? db('templates').where({ id: page.header_id }).first('content') : null,
        page.footer_id ? db('templates').where({ id: page.footer_id }).first('content') : null,
    ]);

    return `
        ${header?.content || ''}
        ${page.content || ''}
        ${footer?.content || ''}
    `;
};

export const compilePageCss = async (pageId: number): Promise<string> => {
    const page = await db('pages').where({ id: pageId }).first();
    if (!page) return '';

    const fullHtml = await buildPageLayoutHtml(page);
    const compiledCss = await compileTailwindCSS(fullHtml, await getThemeSettings());

    if (compiledCss) {
        await db('pages').where({ id: pageId }).update({ compiled_css: compiledCss });
    }
    return compiledCss;
};

// El HTML de un post ya viene ensamblado por posts.service (header + layout de blog + footer)
export const compilePostCss = async (postId: number, fullHtml: string): Promise<string> => {
    const compiledCss = await compileTailwindCSS(fullHtml, await getThemeSettings());

    if (compiledCss) {
        await db('posts').where({ id: postId }).update({ compiled_css: compiledCss });
    }
    return compiledCss;
};

export const getStoredCss = async (owner: CssOwner, id: number): Promise<string | null> => {
    const { table, column } = CSS_STORAGE[owner];
    const row = await db(table).where({ id }).first(column);
    return row?.[column] || null;
};

// Entradas y archivos de tipos de contenido: se compila a partir del HTML ya renderizado
export const compileRenderedCss = async (owner: 'entry' | 'archive', id: number, renderedHtml: string): Promise<string> => {
    const compiledCss = await compileTailwindCSS(renderedHtml, await getThemeSettings());
    if (compiledCss) {
        const { table, column } = CSS_STORAGE[owner];
        await db(table).where({ id }).update({ [column]: compiledCss });
    }
    return compiledCss;
};

/**
 * Invalida el CSS cacheado de todo lo que depende de un cambio global
 * (theme settings, header/footer, layout de blog). Se recompila al siguiente render.
 */
export const invalidateAllCss = async (): Promise<void> => {
    await Promise.all([
        db('pages').update({ compiled_css: null }),
        db('posts').update({ compiled_css: null }),
        db('entries').update({ compiled_css: null }),
        db('content_types').update({ archive_css: null }),
    ]);
};

// Al cambiar una plantilla: las páginas que la usan y todos los posts (usan header/footer/layout activos)
export const invalidateCssForTemplate = async (templateId: string): Promise<void> => {
    await Promise.all([
        db('pages').where({ header_id: templateId }).orWhere({ footer_id: templateId }).update({ compiled_css: null }),
        db('posts').update({ compiled_css: null }),
        // Las entradas usan header/footer activos o plantillas single/archive: se invalidan todas
        db('entries').update({ compiled_css: null }),
        db('content_types').update({ archive_css: null }),
    ]);
};
