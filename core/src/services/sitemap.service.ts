import db from '../database';
import { config } from '../config';

/**
 * ============================================================================
 * SITEMAP SERVICE
 * ============================================================================
 * Genera XML dinámico para sitemap incluyendo pages y posts publicados
 * ============================================================================
 */

interface SitemapUrlEntry {
  loc: string;
  lastmod: string;
  changefreq?: string;
  priority?: string;
}

/**
 * Obtiene todas las páginas publicadas con sus fechas de actualización
 */
const getPublishedPages = async (): Promise<SitemapUrlEntry[]> => {
  const pages = await db('pages')
    .where({ status: 'published' })
    .whereNot({ slug: '/404' }) // la página de error no se indexa
    .select('slug', 'updated_at')
    .orderBy('updated_at', 'desc');

  const baseUrl = config.siteUrl;

  return pages.map(page => {
    // Si el slug es "/", es la página de inicio
    const path = page.slug === '/' ? '' : page.slug;
    return {
      loc: `${baseUrl}${path}`,
      lastmod: new Date(page.updated_at).toISOString().split('T')[0] ?? '' // YYYY-MM-DD
    };
  });
};

/**
 * Obtiene todos los posts publicados con sus fechas de publicación
 */
const getPublishedPosts = async (): Promise<SitemapUrlEntry[]> => {
  const posts = await db('posts')
    .where({ status: 'published' })
    .select('slug', 'updated_at', 'published_at')
    .orderBy('published_at', 'desc');

  const baseUrl = config.siteUrl;

  return posts.map(post => ({
    loc: `${baseUrl}/blog/${post.slug}`,
    lastmod: new Date(post.updated_at || post.published_at).toISOString().split('T')[0] ?? ''
  }));
};

const toDate = (value: string | Date | null | undefined): string =>
  new Date(value || Date.now()).toISOString().split('T')[0] ?? '';

/**
 * Entradas publicadas de los tipos de contenido y sus páginas de archivo
 */
const getPublishedEntries = async (): Promise<SitemapUrlEntry[]> => {
  const [types, entries] = await Promise.all([
    db('content_types').select('id', 'url_prefix', 'has_archive', 'updated_at'),
    db('entries').where({ status: 'published' }).select('type_id', 'slug', 'updated_at', 'published_at')
  ]);

  const baseUrl = config.siteUrl;
  const prefixById = new Map(types.map((type: { id: number; url_prefix: string }) => [type.id, type.url_prefix]));
  const urls: SitemapUrlEntry[] = [];

  for (const type of types) {
    const typeEntries = entries.filter((entry: { type_id: number }) => entry.type_id === type.id);
    if (type.has_archive) {
      // lastmod del archivo = última entrada modificada (o el propio tipo)
      const latest = typeEntries.map((entry: { updated_at: string }) => entry.updated_at).sort().pop();
      urls.push({ loc: `${baseUrl}${type.url_prefix}`, lastmod: toDate(latest || type.updated_at) });
    }
  }

  for (const entry of entries) {
    const prefix = prefixById.get(entry.type_id);
    if (prefix) {
      urls.push({ loc: `${baseUrl}${prefix}/${entry.slug}`, lastmod: toDate(entry.updated_at || entry.published_at) });
    }
  }
  return urls;
};

/**
 * Genera el XML completo del sitemap
 */
export const generateSitemapXml = async (): Promise<string> => {
  const [pages, posts, entries] = await Promise.all([
    getPublishedPages(),
    getPublishedPosts(),
    getPublishedEntries()
  ]);

  // Combinar todas las URLs
  const allUrls: SitemapUrlEntry[] = [...pages, ...posts, ...entries];

  // Construir XML
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  allUrls.forEach(url => {
    xml += '  <url>\n';
    xml += `    <loc>${escapeXml(url.loc)}</loc>\n`;
    xml += `    <lastmod>${url.lastmod}</lastmod>\n`;
    xml += '  </url>\n';
  });

  xml += '</urlset>';

  return xml;
};

/**
 * Escapa caracteres especiales en XML para evitar errores de parsing
 */
const escapeXml = (text: string): string => {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};
