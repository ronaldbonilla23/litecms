import { describe, it, expect } from 'vitest';
import { generateStructuredData, StructuredDataPost } from './structuredData.service';

describe('Structured Data Service', () => {
  const mockPost: StructuredDataPost = {
    meta_title: 'SEO Optimized Title',
    meta_description: 'This is a test description for SEO purposes',
    featured_image: 'test-image.jpg',
    published_at: '2026-04-03T10:00:00Z',
    author_name: 'John Doe',
    categories: [
      { id: 1, name: 'Technology', slug: 'technology' },
      { id: 2, name: 'Tutorials', slug: 'tutorials' }
    ],
    title: 'Original Post Title',
    slug: 'test-post-slug'
  };

  it('should generate valid Schema.org Article structure', () => {
    const result = generateStructuredData(mockPost);

    expect(result).not.toBeNull();
    expect(result!['@context']).toBe('https://schema.org');
    expect(result!['@type']).toBe('Article');
  });

  it('should include mainEntityOfPage with correct URL', () => {
    const result = generateStructuredData(mockPost);

    expect(result!.mainEntityOfPage['@type']).toBe('WebPage');
    expect(result!.mainEntityOfPage['@id']).toBe('http://localhost:3000/blog/test-post-slug');
  });

  it('should use meta_title for headline when available', () => {
    const result = generateStructuredData(mockPost);

    expect(result!.headline).toBe('SEO Optimized Title');
  });

  it('should fallback to title when meta_title is null', () => {
    const postWithoutMetaTitle = { ...mockPost, meta_title: null };
    const result = generateStructuredData(postWithoutMetaTitle);

    expect(result!.headline).toBe('Original Post Title');
  });

  it('should include description from meta_description', () => {
    const result = generateStructuredData(mockPost);

    expect(result!.description).toBe('This is a test description for SEO purposes');
  });

  it('should generate full image URL from filename', () => {
    const result = generateStructuredData(mockPost);

    expect(result!.image).toBe('http://localhost:3000/uploads/test-image.jpg');
  });

  it('should handle absolute image URLs', () => {
    const postWithAbsoluteImage = {
      ...mockPost,
      featured_image: 'https://example.com/custom-image.jpg'
    };
    const result = generateStructuredData(postWithAbsoluteImage);

    expect(result!.image).toBe('https://example.com/custom-image.jpg');
  });

  it('should use fallback image when featured_image is null', () => {
    const postWithoutImage = { ...mockPost, featured_image: null };
    const result = generateStructuredData(postWithoutImage);

    expect(result!.image).toContain('images.unsplash.com');
  });

  it('should include published date', () => {
    const result = generateStructuredData(mockPost);

    expect(result!.datePublished).toBe('2026-04-03T10:00:00Z');
  });

  it('should include author with name and URL', () => {
    const result = generateStructuredData(mockPost);

    expect(result!.author['@type']).toBe('Person');
    expect(result!.author.name).toBe('John Doe');
    expect(result!.author.url).toBe('http://localhost:3000/author/john-doe');
  });

  it('should handle anonymous authors', () => {
    const postWithAnonymousAuthor = { ...mockPost, author_name: '' };
    const result = generateStructuredData(postWithAnonymousAuthor);

    expect(result!.author.name).toBe('Anónimo');
    expect(result!.author.url).toBe('http://localhost:3000/author/anonymous');
  });

  it('should include publisher organization', () => {
    const result = generateStructuredData(mockPost);

    expect(result!.publisher['@type']).toBe('Organization');
    expect(result!.publisher.name).toBe('LiteCMS');
    expect(result!.publisher.url).toBe('http://localhost:3000');
  });

  it('should include articleSection from categories', () => {
    const result = generateStructuredData(mockPost);

    expect(result!.articleSection).toBe('Technology, Tutorials');
    expect(result!.keywords).toBe('Technology, Tutorials');
  });

  it('should handle posts without categories', () => {
    const postWithoutCategories = {
      ...mockPost,
      categories: []
    };
    const result = generateStructuredData(postWithoutCategories);

    expect(result!.articleSection).toBeUndefined();
    expect(result!.keywords).toBeUndefined();
  });

  it('should return null for null input', () => {
    const result = generateStructuredData(null as any);

    expect(result).toBeNull();
  });

  it('should include post URL', () => {
    const result = generateStructuredData(mockPost);

    expect(result!.url).toBe('http://localhost:3000/blog/test-post-slug');
  });
});
