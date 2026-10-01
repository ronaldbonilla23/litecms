import db from '../../database';
import { config } from '../../config';
import { toMetaDescription } from '../render/document';

/**
 * ============================================================================
 * ARCHIVOS PARA BUSCADORES Y BOTS DE IA
 * ============================================================================
 * robots.txt → qué se puede rastrear y dónde está el sitemap.
 * llms.txt   → resumen del sitio en Markdown para asistentes de IA (llmstxt.org):
 *              qué es el sitio y enlaces a su contenido principal.
 * ============================================================================
 */

export const generateRobotsTxt = (): string => {
    if (!config.indexable) {
        // Staging / pruebas: nadie debe indexar este sitio
        return 'User-agent: *\nDisallow: /\n';
    }

    return [
        'User-agent: *',
        'Allow: /',
        'Disallow: /admin/',
        'Disallow: /api/',
        '',
        `Sitemap: ${config.siteUrl}/sitemap.xml`,
        '',
    ].join('\n');
};

// Markdown no debe romperse con corchetes o saltos de línea en los títulos
const mdText = (value: string): string => value.replace(/[\[\]]/g, '').replace(/\s+/g, ' ').trim();

const LLMS_MAX_POSTS = 50;

export const generateLlmsTxt = async (): Promise<string> => {
    const [pages, posts] = await Promise.all([
        db('pages')
            .where({ status: 'published' })
            .whereNot({ slug: '/404' })
            .select('title', 'slug', 'meta_description', 'content')
            .orderBy('slug', 'asc'),
        db('posts')
            .where({ status: 'published' })
            .select('title', 'slug', 'meta_description', 'excerpt')
            .orderBy('published_at', 'desc')
            .limit(LLMS_MAX_POSTS),
    ]);

    const home = pages.find((page) => page.slug === '/');
    const summary = home?.meta_description || (home?.content ? toMetaDescription(home.content, 300) : '');

    const lines: string[] = [`# ${mdText(config.siteName)}`, ''];
    if (summary) lines.push(`> ${mdText(summary)}`, '');

    const entry = (title: string, path: string, description?: string | null): string => {
        const url = `${config.siteUrl}${path === '/' ? '/' : path}`;
        const detail = description ? `: ${mdText(description)}` : '';
        return `- [${mdText(title)}](${url})${detail}`;
    };

    if (pages.length > 0) {
        lines.push('## Páginas', '');
        pages.forEach((page) => lines.push(entry(page.title, page.slug, page.meta_description)));
        lines.push('');
    }

    if (posts.length > 0) {
        lines.push('## Blog', '');
        posts.forEach((post) => lines.push(entry(post.title, `/blog/${post.slug}`, post.meta_description || post.excerpt)));
        lines.push('');
    }

    // Una sección por cada tipo de contenido (Proyectos, Servicios...)
    const types = await db('content_types').select('id', 'name', 'description', 'url_prefix', 'has_archive').orderBy('name', 'asc');
    for (const type of types) {
        const entries = await db('entries')
            .where({ type_id: type.id, status: 'published' })
            .select('title', 'slug', 'meta_description')
            .orderBy('published_at', 'desc')
            .limit(LLMS_MAX_POSTS);
        if (entries.length === 0) continue;

        lines.push(`## ${mdText(type.name)}`, '');
        if (type.description) lines.push(mdText(type.description), '');
        if (type.has_archive) lines.push(entry(`Todos: ${type.name}`, type.url_prefix));
        entries.forEach((item) => lines.push(entry(item.title, `${type.url_prefix}/${item.slug}`, item.meta_description)));
        lines.push('');
    }

    lines.push('## Opcional', '', `- [Sitemap](${config.siteUrl}/sitemap.xml): lista completa de URLs`, '');
    return lines.join('\n');
};
