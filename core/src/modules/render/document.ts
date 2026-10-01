import { config } from '../../config';

/**
 * ============================================================================
 * DOCUMENTO HTML (SSR)
 * ============================================================================
 * Arma el HTML completo que reciben navegadores, buscadores y bots de IA:
 * <head> con SEO, Open Graph, Twitter Card, JSON-LD y CSS; <body> con el
 * contenido ya renderizado. No requiere JavaScript para verse ni indexarse.
 * ============================================================================
 */

export interface DocumentSeo {
    title: string;
    description: string;
    canonicalUrl: string;
    indexable: boolean;
    ogType: 'website' | 'article';
    imageUrl?: string | null;
    article?: {
        publishedTime?: string | null;
        modifiedTime?: string | null;
        author?: string | null;
        sections?: string[];
        tags?: string[];
    };
}

export interface ThemeHead {
    backgroundColor?: string | null;
    headerFont?: string | null;
    bodyFont?: string | null;
    faviconUrl?: string | null;
}

export interface DocumentInput {
    seo: DocumentSeo;
    theme: ThemeHead;
    cssHref?: string | null;
    jsonLd?: Array<Record<string, any>>;
    body: string;
    // HTML extra aportado por plugins (filtros render.head / render.bodyEnd)
    extraHead?: string[];
    bodyEnd?: string[];
}

const HTML_ESCAPES: Record<string, string> = {
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
};

export const escapeHtml = (value: string): string => value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char] ?? char);

// JSON dentro de <script>: "</script>" en un texto no debe cerrar la etiqueta
const serializeJsonLd = (data: Record<string, any>): string =>
    JSON.stringify(data).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');

// Solo colores CSS simples (#hex, rgb(), nombres): el valor va dentro de una etiqueta <style>
const safeCssColor = (value?: string | null): string | null =>
    value && /^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\)|[a-z]+)$/i.test(value.trim()) ? value.trim() : null;

const safeFontName = (value?: string | null): string | null =>
    value && /^[a-z0-9 ]{2,60}$/i.test(value.trim()) ? value.trim() : null;

const googleFontsHref = (fonts: string[]): string | null => {
    const unique = [...new Set(fonts)];
    if (unique.length === 0) return null;
    const families = unique
        .map((font) => `family=${encodeURIComponent(font).replace(/%20/g, '+')}:wght@400;500;600;700;800`)
        .join('&');
    return `https://fonts.googleapis.com/css2?${families}&display=swap`;
};

export const absoluteUrl = (value: string): string =>
    /^https?:\/\//i.test(value) ? value : `${config.siteUrl}${value.startsWith('/') ? '' : '/'}${value}`;

// Texto plano para meta description: sin etiquetas, sin saltos, máximo 160 caracteres
export const toMetaDescription = (text: string, maxLength = 160): string => {
    const plain = text.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
    if (plain.length <= maxLength) return plain;
    const cut = plain.slice(0, maxLength - 1);
    return `${cut.slice(0, cut.lastIndexOf(' ') > 80 ? cut.lastIndexOf(' ') : cut.length)}…`;
};

const meta = (attr: 'name' | 'property', key: string, value?: string | null): string =>
    value ? `<meta ${attr}="${key}" content="${escapeHtml(value)}">` : '';

export const buildDocument = ({ seo, theme, cssHref, jsonLd = [], body, extraHead = [], bodyEnd = [] }: DocumentInput): string => {
    const indexable = seo.indexable && config.indexable;
    const imageUrl = seo.imageUrl ? absoluteUrl(seo.imageUrl) : null;

    const headerFont = safeFontName(theme.headerFont);
    const bodyFont = safeFontName(theme.bodyFont);
    const fontsHref = googleFontsHref([headerFont, bodyFont].filter((font): font is string => Boolean(font)));
    const background = safeCssColor(theme.backgroundColor);

    const baseStyle = [
        background ? `background-color:${background}` : '',
        'color:#fff',
        bodyFont ? `font-family:'${bodyFont}',sans-serif` : '',
        '-webkit-font-smoothing:antialiased',
    ].filter(Boolean).join(';');

    const head = [
        '<meta charset="utf-8">',
        '<meta name="viewport" content="width=device-width, initial-scale=1">',
        `<title>${escapeHtml(seo.title)}</title>`,
        meta('name', 'description', seo.description),
        `<link rel="canonical" href="${escapeHtml(seo.canonicalUrl)}">`,
        meta('name', 'robots', indexable ? 'index, follow, max-image-preview:large' : 'noindex, nofollow'),

        // Open Graph (Facebook, LinkedIn, WhatsApp...)
        meta('property', 'og:site_name', config.siteName),
        meta('property', 'og:locale', config.siteLang.replace('-', '_')),
        meta('property', 'og:type', seo.ogType),
        meta('property', 'og:title', seo.title),
        meta('property', 'og:description', seo.description),
        meta('property', 'og:url', seo.canonicalUrl),
        meta('property', 'og:image', imageUrl),
        meta('property', 'article:published_time', seo.article?.publishedTime),
        meta('property', 'article:modified_time', seo.article?.modifiedTime),
        meta('property', 'article:author', seo.article?.author),
        ...(seo.article?.sections ?? []).map((section) => meta('property', 'article:section', section)),
        ...(seo.article?.tags ?? []).map((tag) => meta('property', 'article:tag', tag)),

        // Twitter / X
        meta('name', 'twitter:card', imageUrl ? 'summary_large_image' : 'summary'),
        meta('name', 'twitter:title', seo.title),
        meta('name', 'twitter:description', seo.description),
        meta('name', 'twitter:image', imageUrl),

        theme.faviconUrl ? `<link rel="icon" href="${escapeHtml(theme.faviconUrl)}">` : '',
        fontsHref ? '<link rel="preconnect" href="https://fonts.googleapis.com">' : '',
        fontsHref ? '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' : '',
        fontsHref ? `<link rel="stylesheet" href="${escapeHtml(fontsHref)}">` : '',
        cssHref ? `<link rel="stylesheet" href="${escapeHtml(cssHref)}">` : '',
        `<style>body{${baseStyle}}</style>`,
        ...jsonLd.map((data) => `<script type="application/ld+json">${serializeJsonLd(data)}</script>`),
        '<meta name="generator" content="LiteCMS">',
        ...extraHead,
    ].filter(Boolean).join('\n    ');

    return `<!doctype html>
<html lang="${escapeHtml(config.siteLang)}">
<head>
    ${head}
</head>
<body>
${body}
${bodyEnd.join('\n')}
</body>
</html>`;
};
