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

export type CssOwner = 'page' | 'post';

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
    const table = owner === 'page' ? 'pages' : 'posts';
    const row = await db(table).where({ id }).first('compiled_css');
    return row?.compiled_css || null;
};

/**
 * Invalida el CSS cacheado de todo lo que depende de un cambio global
 * (theme settings, header/footer, layout de blog). Se recompila al siguiente render.
 */
export const invalidateAllCss = async (): Promise<void> => {
    await Promise.all([
        db('pages').update({ compiled_css: null }),
        db('posts').update({ compiled_css: null }),
    ]);
};

// Al cambiar una plantilla: las páginas que la usan y todos los posts (usan header/footer/layout activos)
export const invalidateCssForTemplate = async (templateId: string): Promise<void> => {
    await Promise.all([
        db('pages').where({ header_id: templateId }).orWhere({ footer_id: templateId }).update({ compiled_css: null }),
        db('posts').update({ compiled_css: null }),
    ]);
};
