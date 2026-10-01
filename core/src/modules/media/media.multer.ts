import type { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import { config } from '../../config';

const EXTENSION_BY_MIME: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
};

// Convierte "Mi Foto (final).JPG" en "mi-foto-final": sin acentos, espacios ni caracteres raros
const sanitizeBaseName = (originalName: string): string => {
    const base = path.parse(originalName).name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80);
    return base || 'archivo';
};

// Nombre final: "<timestamp>-<nombre-saneado>.<ext>". La extensión sale del mimetype validado,
// nunca del nombre que manda el cliente.
export const buildUploadFilename = (originalName: string, mimetype: string): string =>
    `${Date.now()}-${sanitizeBaseName(originalName)}${EXTENSION_BY_MIME[mimetype] ?? ''}`;

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (file.mimetype in EXTENSION_BY_MIME) {
        cb(null, true);
    } else {
        const err: any = new Error('Formato de archivo no soportado. Solo .jpg, .png, .webp');
        err.statusCode = 400; // Pasamos status al global handler
        cb(err);
    }
};

// En memoria: el archivo se valida y procesa antes de guardarse en el almacenamiento configurado
export const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter,
    limits: { fileSize: config.maxUploadBytes, files: 1 },
});

// Firmas binarias ("magic bytes") de cada formato permitido
const matchesSignature = (header: Buffer, mimetype: string): boolean => {
    switch (mimetype) {
        case 'image/jpeg':
            return header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
        case 'image/png':
            return header.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
        case 'image/webp':
            return header.subarray(0, 4).toString('ascii') === 'RIFF' && header.subarray(8, 12).toString('ascii') === 'WEBP';
        default:
            return false;
    }
};

/**
 * El mimetype lo declara el cliente y se puede falsificar.
 * Este middleware revisa los primeros bytes del archivo y lo rechaza si no es una imagen real.
 */
export const verifyImageSignature = (req: Request, res: Response, next: NextFunction): void => {
    if (!req.file) return next();
    if (!matchesSignature(req.file.buffer.subarray(0, 12), req.file.mimetype)) {
        res.status(400).json({ error: 'El contenido del archivo no corresponde a una imagen válida' });
        return;
    }
    next();
};
