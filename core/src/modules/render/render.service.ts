import Handlebars from 'handlebars';
import crypto from 'crypto';
import db from '../../database';
import { config } from '../../config';
import * as postsService from '../posts/posts.service';
import { findRedirect, normalizePath } from '../redirects/redirects.service';
import { generateBreadcrumbs, generateOrganization, generatePageStructuredData } from '../../services/structuredData.service';
import { buildPageLayoutHtml, compilePageCss, cssHref } from './css.service';
import { buildDocument, toMetaDescription, type ThemeHead } from './document';
import { enhanceImages, loadMediaIndex } from './images';

/**
 * ============================================================================
 * RENDER PÚBLICO (SSR)
 * ============================================================================
 * Convierte una URL del sitio en un documento HTML completo:
 *   /            → página con slug "/"
 *   /blog/:slug  → post publicado (layout blog_single)
 *   /cualquier   → página publicada con ese slug
 * Si no existe: redirección 301 registrada, o 404 (página "/404" si existe).
 * ============================================================================
 */

export type RenderOutcome =
    | { kind: 'redirect'; location: string; status: number }
    | { kind: 'html'; status: number; html: string };

// ----------------------------------------------------------------------------
// Caché en memoria del HTML final. Se vacía con cualquier escritura en la API.
// ----------------------------------------------------------------------------
const MAX_CACHE_ENTRIES = 500;
const renderCache = new Map<string, RenderOutcome>();

export const clearRenderCache = (): void => {
    renderCache.clear();
};

const cacheSet = (key: string, value: RenderOutcome): void => {
    if (renderCache.size >= MAX_CACHE_ENTRIES) {
        const oldestKey = renderCache.keys().next().value;
        if (oldestKey !== undefined) renderCache.delete(oldestKey);
    }
    renderCache.set(key, value);
};

// ----------------------------------------------------------------------------
// Handlebars: instancia aislada + plantillas compiladas cacheadas por contenido
// ----------------------------------------------------------------------------
const handlebars = Handlebars.create();
const templateCache = new Map<string, HandlebarsTemplateDelegate>();

const renderTemplate = (source: string, context: Record<string, any>): string => {
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

// ----------------------------------------------------------------------------
// Datos comunes
// ----------------------------------------------------------------------------
const uploadPath = (filename?: string | null): string | null =>
    filename ? (filename.startsWith('http') || filename.startsWith('/') ? filename : `/uploads/${filename}`) : null;

const loadTheme = async () => {
    const settings = (await db('theme_settings').first()) || {};
    const theme: ThemeHead = {
        backgroundColor: settings.background_color,
        headerFont: settings.header_font,
        bodyFont: settings.body_font,
        faviconUrl: uploadPath(settings.favicon_url),
    };
    return { settings, theme, logoUrl: uploadPath(settings.logo_url) };
};

const siteContext = (logoUrl: string | null) => ({
    name: config.siteName,
    url: config.siteUrl,
    lang: config.siteLang,
    logo_url: logoUrl,
    year: new Date().getFullYear(),
});

const finalizeBody = async (html: string): Promise<string> => enhanceImages(html, await loadMediaIndex());

// ----------------------------------------------------------------------------
// Páginas
// ----------------------------------------------------------------------------
const renderPage = async (path: string, status = 200): Promise<RenderOutcome | null> => {
    const page = await db('pages').where({ slug: path, status: 'published' }).first();
    if (!page) return null;

    const fields = typeof page.fields === 'string' ? JSON.parse(page.fields || 'null') : page.fields;
    const [{ theme, logoUrl }, layoutHtml] = await Promise.all([loadTheme(), buildPageLayoutHtml(page)]);
    const css = page.compiled_css || await compilePageCss(page.id);

    const body = renderTemplate(layoutHtml, {
        page: { ...page, fields, compiled_css: undefined },
        site: siteContext(logoUrl),
    });

    let imageUrl: string | null = null;
    if (page.og_image_id) {
        const ogImage = await db('media').where({ id: page.og_image_id }).first('filename');
        imageUrl = uploadPath(ogImage?.filename);
    }

    const isHome = path === '/';
    const canonicalUrl = page.canonical_url || `${config.siteUrl}${isHome ? '/' : path}`;
    const title = page.meta_title || (isHome ? config.siteName : `${page.title} | ${config.siteName}`);
    const description = page.meta_description || toMetaDescription(page.content || page.title);

    const html = buildDocument({
        seo: { title, description, canonicalUrl, indexable: status === 200, ogType: 'website', imageUrl },
        theme,
        cssHref: css ? cssHref('page', page.id, css) : null,
        jsonLd: status === 200
            ? generatePageStructuredData({ title, description, url: canonicalUrl, imageUrl, updatedAt: page.updated_at, isHome, logoUrl })
            : [],
        body: await finalizeBody(body),
    });

    return { kind: 'html', status, html };
};

// ----------------------------------------------------------------------------
// Posts del blog
// ----------------------------------------------------------------------------
export const BLOG_PREFIX = '/blog/';

const renderPost = async (slug: string): Promise<RenderOutcome | null> => {
    const post = await postsService.getBySlug(slug);
    if (!post || post.metadata.status !== 'published') return null;

    const { metadata } = post;
    const { theme, logoUrl } = await loadTheme();
    const path = `${BLOG_PREFIX}${metadata.slug}`;
    const canonicalUrl = metadata.canonical_url || `${config.siteUrl}${path}`;
    const title = metadata.meta_title || `${metadata.title} | ${config.siteName}`;
    const description = metadata.meta_description || toMetaDescription((metadata as any).excerpt || metadata.content || metadata.title);
    const imageUrl = uploadPath(metadata.featured_image);

    const jsonLd: Array<Record<string, any>> = [];
    if (post.structured_data) {
        jsonLd.push({ ...post.structured_data, publisher: generateOrganization(logoUrl) });
    }
    jsonLd.push(generateBreadcrumbs([
        { name: config.siteName, url: '/' },
        { name: 'Blog', url: '/blog' },
        { name: metadata.title, url: path },
    ]));

    const html = buildDocument({
        seo: {
            title, description, canonicalUrl, indexable: true, ogType: 'article', imageUrl,
            article: {
                publishedTime: metadata.published_at,
                modifiedTime: (metadata as any).updated_at,
                author: metadata.author_name,
                sections: metadata.categories?.map((category) => category.name),
                tags: metadata.tags?.map((tag) => tag.name),
            },
        },
        theme,
        cssHref: post.css ? cssHref('post', metadata.id, post.css) : null,
        jsonLd,
        body: await finalizeBody(post.html),
    });

    return { kind: 'html', status: 200, html };
};

// ----------------------------------------------------------------------------
// 404
// ----------------------------------------------------------------------------
const renderNotFound = async (): Promise<RenderOutcome> => {
    const customPage = await renderPage('/404', 404);
    if (customPage) return customPage;

    const { theme } = await loadTheme();
    const html = buildDocument({
        seo: {
            title: `Página no encontrada | ${config.siteName}`,
            description: 'La página que buscas no existe.',
            canonicalUrl: config.siteUrl,
            indexable: false,
            ogType: 'website',
        },
        theme,
        body: `<main style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1rem;text-align:center;padding:2rem">
    <h1 style="font-size:4rem;font-weight:900;margin:0">404</h1>
    <p style="opacity:.7;margin:0">La página que buscas no existe.</p>
    <a href="/" style="color:inherit">Volver al inicio</a>
</main>`,
    });
    return { kind: 'html', status: 404, html };
};

// ----------------------------------------------------------------------------
// Punto de entrada
// ----------------------------------------------------------------------------
export const renderPath = async (rawPath: string): Promise<RenderOutcome> => {
    let decoded: string;
    try {
        decoded = decodeURIComponent(rawPath);
    } catch {
        return renderNotFound();
    }

    // URL canónica sin "/" final: /contacto/ → 301 → /contacto
    const path = normalizePath(decoded);
    if (path !== decoded) {
        return { kind: 'redirect', location: encodeURI(path), status: 301 };
    }

    const cached = renderCache.get(path);
    if (cached) {
        // Las visitas a posts se cuentan aunque el HTML venga de caché
        if (cached.kind === 'html' && cached.status === 200 && path.startsWith(BLOG_PREFIX)) {
            await db('posts').where({ slug: path.slice(BLOG_PREFIX.length) }).increment('view_count', 1);
        }
        return cached;
    }

    let outcome: RenderOutcome | null = path.startsWith(BLOG_PREFIX)
        ? await renderPost(path.slice(BLOG_PREFIX.length))
        : await renderPage(path);

    if (!outcome) {
        const redirect = await findRedirect(path);
        outcome = redirect
            ? { kind: 'redirect', location: encodeURI(redirect.to_path), status: redirect.status_code }
            : await renderNotFound();
    }

    // Los 404 no se cachean: URLs al azar (bots) desplazarían a las páginas reales
    if (!(outcome.kind === 'html' && outcome.status === 404)) {
        cacheSet(path, outcome);
    }
    return outcome;
};
