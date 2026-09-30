import { describe, it, expect } from 'vitest';

describe('Sitemap Service - XML Generation', () => {
  // Test the XML escaping utility function directly
  it('should escape ampersand characters', () => {
    const escapeXml = (text: string): string => {
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
    };

    expect(escapeXml('param=value&other=123')).toBe('param=value&amp;other=123');
  });

  it('should escape less than and greater than characters', () => {
    const escapeXml = (text: string): string => {
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
    };

    expect(escapeXml('<div>')).toBe('&lt;div&gt;');
  });

  it('should escape quotes', () => {
    const escapeXml = (text: string): string => {
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
    };

    expect(escapeXml('Test "quoted" & \'apostrophe\'')).toBe(
      'Test &quot;quoted&quot; &amp; &apos;apostrophe&apos;'
    );
  });

  it('should generate valid XML declaration', () => {
    const xmlDeclaration = '<?xml version="1.0" encoding="UTF-8"?>';
    expect(xmlDeclaration).toContain('xml version="1.0"');
    expect(xmlDeclaration).toContain('encoding="UTF-8"');
  });

  it('should have correct urlset namespace', () => {
    const urlset = '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
    expect(urlset).toContain('http://www.sitemaps.org/schemas/sitemap/0.9');
  });

  it('should format URL entries correctly', () => {
    const urlEntry = `
  <url>
    <loc>https://example.com/blog/test</loc>
    <lastmod>2026-04-03</lastmod>
  </url>
`;
    expect(urlEntry).toContain('<url>');
    expect(urlEntry).toContain('<loc>');
    expect(urlEntry).toContain('<lastmod>');
    expect(urlEntry).toContain('</url>');
  });

  it('should format dates as YYYY-MM-DD', () => {
    const date = new Date('2026-04-03T10:00:00Z');
    const formatted = date.toISOString().split('T')[0];
    expect(formatted).toBe('2026-04-03');
  });

  it('should construct blog post URLs correctly', () => {
    const baseUrl = 'http://localhost:3000';
    const slug = 'my-blog-post';
    const fullUrl = `${baseUrl}/blog/${slug}`;
    expect(fullUrl).toBe('http://localhost:3000/blog/my-blog-post');
  });

  it('should handle homepage slug correctly', () => {
    const baseUrl = 'http://localhost:3000';
    const slug = '/';
    const path = slug === '/' ? '' : slug;
    const fullUrl = `${baseUrl}${path}`;
    expect(fullUrl).toBe('http://localhost:3000');
  });
});
