import type { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { config } from '../../config';

const baseUploadsDir = config.paths.uploads;

if (!fs.existsSync(baseUploadsDir)) {
    fs.mkdirSync(baseUploadsDir, { recursive: true });
}

const EXTENSION_BY_MIME: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
};

// Convierte "Mi Foto (final).JPG" en "mi-foto-final": sin acentos, espacios ni caracteres raros
const sanitizeBaseName = (originalName: string): string => {
    const base = path.parse(originalName).name
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80);
    return base || 'archivo';
};

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, baseUploadsDir);
    },
    filename: (req, file, cb) => {
        // La extensión sale del mimetype validado, nunca del nombre que manda el cliente
        const extension = EXTENSION_BY_MIME[file.mimetype] ?? '';
        cb(null, `${Date.now()}-${sanitizeBaseName(file.originalname)}${extension}`);
    }
});

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (file.mimetype in EXTENSION_BY_MIME) {
        cb(null, true);
    } else {
        const err: any = new Error('Formato de archivo no soportado. Solo .jpg, .png, .webp');
        err.statusCode = 400; // Pasamos status al global handler
        cb(err);
    }
};

export const upload = multer({
    storage,
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
 * Este middleware lee los primeros bytes del archivo ya guardado y lo borra si no es una imagen real.
 */
export const verifyImageSignature = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.file) return next();

    try {
        const handle = await fs.promises.open(req.file.path, 'r');
        const header = Buffer.alloc(12);
        await handle.read(header, 0, 12, 0);
        await handle.close();

        if (!matchesSignature(header, req.file.mimetype)) {
            await fs.promises.unlink(req.file.path).catch(() => undefined);
            res.status(400).json({ error: 'El contenido del archivo no corresponde a una imagen válida' });
            return;
        }
        next();
    } catch (error) {
        next(error);
    }
};
