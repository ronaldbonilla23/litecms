import db from '../../database';
import { parseVariants, type ImageVariant } from '../../services/images.service';

/**
 * ============================================================================
 * <img> RESPONSIVE EN EL HTML RENDERIZADO
 * ============================================================================
 * Recorre los <img> que apuntan a /uploads/ y, si la imagen tiene variantes,
 * añade srcset + sizes. También añade width/height (evita saltos de layout),
 * loading="lazy" (excepto la primera imagen, candidata a LCP) y decoding="async".
 * Nunca pisa atributos que el autor ya haya puesto.
 * ============================================================================
 */

export interface MediaInfo {
    width: number | null;
    height: number | null;
    variants: ImageVariant[];
}

export const loadMediaIndex = async (): Promise<Map<string, MediaInfo>> => {
    const rows = await db('media').select('filename', 'width', 'height', 'variants');
    return new Map(rows.map((row) => [row.filename, {
        width: row.width ?? null,
        height: row.height ?? null,
        variants: parseVariants(row.variants),
    }]));
};

// <img ... src="/uploads/archivo.jpg" ...> (también con dominio absoluto delante)
const IMG_TAG = /<img\b[^>]*>/gi;
const UPLOAD_SRC = /\bsrc\s*=\s*["'](?:https?:\/\/[^"'/]+)?\/uploads\/([^"'?#]+)["']/i;

const hasAttr = (tag: string, name: string): boolean => new RegExp(`\\s${name}\\s*=`, 'i').test(tag);

export const DEFAULT_SIZES = '(max-width: 768px) 100vw, 768px';

export const enhanceImages = (html: string, mediaIndex: Map<string, MediaInfo>): string => {
    let imageCount = 0;

    return html.replace(IMG_TAG, (tag) => {
        imageCount += 1;
        const isFirstImage = imageCount === 1;
        const additions: string[] = [];

        const match = tag.match(UPLOAD_SRC);
        const media = match?.[1] ? mediaIndex.get(decodeURIComponent(match[1])) : undefined;

        if (media) {
            if (media.variants.length > 0 && !hasAttr(tag, 'srcset')) {
                const srcset = media.variants.map((variant) => `/uploads/${variant.filename} ${variant.width}w`).join(', ');
                additions.push(`srcset="${srcset}"`);
                if (!hasAttr(tag, 'sizes')) additions.push(`sizes="${DEFAULT_SIZES}"`);
            }
            if (media.width && media.height && !hasAttr(tag, 'width') && !hasAttr(tag, 'height')) {
                additions.push(`width="${media.width}"`, `height="${media.height}"`);
            }
        }

        if (!hasAttr(tag, 'loading')) additions.push(isFirstImage ? 'fetchpriority="high"' : 'loading="lazy"');
        if (!hasAttr(tag, 'decoding')) additions.push('decoding="async"');

        if (additions.length === 0) return tag;
        return tag.replace(/\s*\/?>$/, (end) => ` ${additions.join(' ')}${end.includes('/') ? ' />' : '>'}`);
    });
};
