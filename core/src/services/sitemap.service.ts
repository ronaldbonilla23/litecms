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

/**
 * Genera el XML completo del sitemap
 */
export const generateSitemapXml = async (): Promise<string> => {
  const [pages, posts] = await Promise.all([
    getPublishedPages(),
    getPublishedPosts()
  ]);

  // Combinar todas las URLs
  const allUrls: SitemapUrlEntry[] = [...pages, ...posts];

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
