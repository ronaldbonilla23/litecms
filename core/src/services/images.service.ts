import path from 'path';
import sharp from 'sharp';
import { getStorage } from '../storage';

/**
 * ============================================================================
 * IMÁGENES RESPONSIVE
 * ============================================================================
 * Al subir una imagen se generan copias WebP en varios anchos. El render
 * público las usa para añadir srcset/sizes a los <img>, de modo que cada
 * dispositivo descarga solo el tamaño que necesita (Core Web Vitals / SEO).
 * Los archivos se guardan con el adaptador de almacenamiento configurado.
 * ============================================================================
 */

export const VARIANT_WIDTHS = [480, 960, 1600];

export interface ImageVariant {
    width: number;
    filename: string;
}

export interface ProcessedImage {
    width: number | null;
    height: number | null;
    variants: ImageVariant[];
}

// "1712-foto.jpg" + 960 → "1712-foto-960w.webp"
const variantFilename = (filename: string, width: number): string =>
    `${path.parse(filename).name}-${width}w.webp`;

/** Genera y guarda las variantes WebP de una imagen a partir de su contenido */
export const generateImageVariants = async (filename: string, source: Buffer): Promise<ProcessedImage> => {
    const metadata = await sharp(source).metadata();
    const originalWidth = metadata.width ?? null;

    // Solo anchos menores que el original (no se agrandan imágenes) + una versión WebP a tamaño original
    const widths = originalWidth
        ? [...VARIANT_WIDTHS.filter((width) => width < originalWidth), originalWidth]
        : [];

    const storage = getStorage();
    const variants: ImageVariant[] = [];
    for (const width of [...new Set(widths)]) {
        const outputName = variantFilename(filename, width);
        const output = await sharp(source)
            .rotate() // respeta la orientación EXIF de fotos de móvil
            .resize({ width, withoutEnlargement: true })
            .webp({ quality: 80 })
            .toBuffer();
        await storage.put(outputName, output, 'image/webp');
        variants.push({ width, filename: outputName });
    }

    return { width: originalWidth, height: metadata.height ?? null, variants };
};

export const deleteImageVariants = async (variants: ImageVariant[]): Promise<void> => {
    const storage = getStorage();
    await Promise.all(variants.map((variant) => storage.delete(path.basename(variant.filename)).catch(() => undefined)));
};

export const parseVariants = (value: unknown): ImageVariant[] => {
    if (!value) return [];
    try {
        const parsed = typeof value === 'string' ? JSON.parse(value) : value;
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};
