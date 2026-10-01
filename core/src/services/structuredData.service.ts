/**
 * ============================================================================
 * STRUCTURED DATA GENERATOR - SCHEMA.ORG
 * ============================================================================
 * Genera datos estructurados JSON-LD compatibles con Schema.org
 * para mejorar el SEO y los rich snippets en motores de búsqueda
 * ============================================================================
 */

import { config } from '../config';

export interface StructuredDataPost {
  meta_title: string | null;
  meta_description: string | null;
  featured_image: string | null;
  published_at: string | null;
  author_name: string;
  categories: Array<{ id: number; name: string; slug: string }>;
  title: string;
  slug: string;
}

/**
 * Genera un objeto JSON-LD compatible con Article de Schema.org
 * 
 * @param post - Datos del post con metadatos
 * @returns Objeto JSON compatible con Schema.org Article
 */
export const generateStructuredData = (post: StructuredDataPost): Record<string, any> | null => {
  if (!post) return null;

  const baseUrl = config.siteUrl;
  const postUrl = `${baseUrl}/blog/${post.slug}`;

  // Imagen destacada con fallback
  const imageUrl = post.featured_image
    ? (post.featured_image.startsWith('http')
      ? post.featured_image
      : `${baseUrl}/uploads/${post.featured_image}`)
    : 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&q=80&w=1200';

  // Construir el objeto Schema.org Article
  const structuredData: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    'mainEntityOfPage': {
      '@type': 'WebPage',
      '@id': postUrl
    },
    'headline': post.meta_title || post.title,
    'description': post.meta_description || post.title,
    'image': imageUrl,
    'datePublished': post.published_at || new Date().toISOString(),
    'dateModified': post.published_at || new Date().toISOString(),
    'author': {
      '@type': 'Person',
      'name': post.author_name || 'Anónimo',
      'url': `${baseUrl}/author/${post.author_name?.toLowerCase().replace(/\s+/g, '-') || 'anonymous'}`
    },
    'publisher': {
      '@type': 'Organization',
      'name': 'LiteCMS',
      'url': baseUrl,
      'logo': {
        '@type': 'ImageObject',
        'url': `${baseUrl}/uploads/logo.png`
      }
    },
    'url': postUrl
  };

  // Añadir categoría como articleSection si existe
  if (post.categories && post.categories.length > 0) {
    structuredData.articleSection = post.categories.map(cat => cat.name).join(', ');
    structuredData.keywords = post.categories.map(cat => cat.name).join(', ');
  }

  return structuredData;
};
