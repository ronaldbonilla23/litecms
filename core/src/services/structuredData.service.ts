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
export const generateStructuredData = (post: StructuredDataPost, options: { logoUrl?: string | null } = {}): Record<string, any> | null => {
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
    'publisher': generateOrganization(options.logoUrl),
    'url': postUrl
  };

  // Añadir categoría como articleSection si existe
  if (post.categories && post.categories.length > 0) {
    structuredData.articleSection = post.categories.map(cat => cat.name).join(', ');
    structuredData.keywords = post.categories.map(cat => cat.name).join(', ');
  }

  return structuredData;
};


// ----------------------------------------------------------------------------
// Datos estructurados del sitio y de páginas (SEO + AEO)
// ----------------------------------------------------------------------------

const toAbsolute = (url: string): string => (url.startsWith('http') ? url : `${config.siteUrl}${url}`);

// Organización que publica el sitio. El logo sale de Theme Settings (si está configurado)
export const generateOrganization = (logoUrl?: string | null): Record<string, any> => ({
  '@type': 'Organization',
  'name': config.siteName,
  'url': config.siteUrl,
  ...(logoUrl ? { 'logo': { '@type': 'ImageObject', 'url': toAbsolute(logoUrl) } } : {})
});

export interface StructuredDataPage {
  title: string;
  description: string;
  url: string;
  imageUrl?: string | null;
  updatedAt?: string | null;
  isHome: boolean;
  logoUrl?: string | null;
}

/**
 * WebPage para cada página. En la portada se añade también WebSite, que
 * identifica el sitio completo ante buscadores y asistentes de IA.
 */
export const generatePageStructuredData = (page: StructuredDataPage): Record<string, any>[] => {
  const webPage: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': page.url,
    'url': page.url,
    'name': page.title,
    'description': page.description,
    'inLanguage': config.siteLang,
    'isPartOf': { '@type': 'WebSite', 'name': config.siteName, 'url': config.siteUrl },
    ...(page.imageUrl ? { 'primaryImageOfPage': { '@type': 'ImageObject', 'url': toAbsolute(page.imageUrl) } } : {}),
    ...(page.updatedAt ? { 'dateModified': page.updatedAt } : {})
  };

  if (!page.isHome) return [webPage];

  return [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      'name': config.siteName,
      'url': config.siteUrl,
      'inLanguage': config.siteLang,
      'publisher': generateOrganization(page.logoUrl)
    },
    webPage
  ];
};

// Migas de pan: ayudan a buscadores a entender la jerarquía (Inicio › Blog › Post)
export const generateBreadcrumbs = (items: Array<{ name: string; url: string }>): Record<string, any> => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  'itemListElement': items.map((item, index) => ({
    '@type': 'ListItem',
    'position': index + 1,
    'name': item.name,
    'item': toAbsolute(item.url)
  }))
});

// Archivo de un tipo de contenido (/proyectos): página de colección con la lista de entradas
export const generateCollectionStructuredData = (collection: {
  title: string;
  description: string;
  url: string;
  items: Array<{ name: string; url: string }>;
}): Record<string, any> => ({
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  '@id': collection.url,
  'url': collection.url,
  'name': collection.title,
  'description': collection.description,
  'inLanguage': config.siteLang,
  'isPartOf': { '@type': 'WebSite', 'name': config.siteName, 'url': config.siteUrl },
  'mainEntity': {
    '@type': 'ItemList',
    'numberOfItems': collection.items.length,
    'itemListElement': collection.items.map((item, index) => ({
      '@type': 'ListItem',
      'position': index + 1,
      'name': item.name,
      'url': toAbsolute(item.url)
    }))
  }
});
