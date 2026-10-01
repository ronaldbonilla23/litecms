import fs from 'fs';
import path from 'path';
import { config } from '../config';

/**
 * ============================================================================
 * ALMACENAMIENTO DE ARCHIVOS SUBIDOS
 * ============================================================================
 * STORAGE_DRIVER elige dónde se guardan las imágenes:
 *   local        → content/uploads (VPS, Docker, cPanel)       [por defecto]
 *   s3           → cualquier servicio compatible con S3: Cloudflare R2, AWS S3,
 *                  Backblaze B2, MinIO...
 *   vercel-blob  → Vercel Blob (se elige solo si existe BLOB_READ_WRITE_TOKEN)
 *
 * Las URLs públicas son siempre /uploads/<archivo>. Con almacenamiento remoto,
 * el servidor responde con una redirección permanente al CDN del proveedor,
 * así el contenido y las plantillas no dependen de dónde vive el archivo.
 * ============================================================================
 */

export interface StorageAdapter {
    readonly driver: 'local' | 's3' | 'vercel-blob';
    put(filename: string, data: Buffer, contentType: string): Promise<void>;
    get(filename: string): Promise<Buffer>;
    delete(filename: string): Promise<void>;
    /** URL pública directa del archivo; null si lo sirve el propio servidor */
    publicUrl(filename: string): string | null;
}

// Solo nombres simples: nunca rutas (evita escribir o borrar fuera de uploads)
const safeName = (filename: string): string => {
    const name = path.basename(filename);
    if (!name || name !== filename || name.startsWith('.')) throw new Error(`Nombre de archivo inválido: ${filename}`);
    return name;
};

const required = (name: string): string => {
    const value = process.env[name];
    if (!value) throw new Error(`Falta la variable de entorno ${name} para el almacenamiento`);
    return value;
};

// ----------------------------------------------------------------------------
// Local
// ----------------------------------------------------------------------------
const createLocalStorage = (): StorageAdapter => {
    const dir = config.paths.uploads;
    return {
        driver: 'local',
        put: async (filename, data) => {
            await fs.promises.mkdir(dir, { recursive: true });
            await fs.promises.writeFile(path.join(dir, safeName(filename)), data);
        },
        get: async (filename) => fs.promises.readFile(path.join(dir, safeName(filename))),
        delete: async (filename) => {
            await fs.promises.unlink(path.join(dir, safeName(filename))).catch(() => undefined);
        },
        publicUrl: () => null,
    };
};

// ----------------------------------------------------------------------------
// S3 compatible (R2, AWS, Backblaze, MinIO)
// ----------------------------------------------------------------------------
const createS3Storage = (): StorageAdapter => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
    const bucket = required('S3_BUCKET');
    const publicBase = required('S3_PUBLIC_URL').replace(/\/$/, '');
    const prefix = (process.env.S3_PREFIX ?? 'uploads').replace(/^\/|\/$/g, '');
    const client = new S3Client({
        region: process.env.S3_REGION || 'auto',
        endpoint: process.env.S3_ENDPOINT || undefined,
        forcePathStyle: Boolean(process.env.S3_ENDPOINT),
        credentials: { accessKeyId: required('S3_ACCESS_KEY_ID'), secretAccessKey: required('S3_SECRET_ACCESS_KEY') },
    });
    const key = (filename: string) => (prefix ? `${prefix}/${safeName(filename)}` : safeName(filename));

    return {
        driver: 's3',
        put: async (filename, data, contentType) => {
            await client.send(new PutObjectCommand({
                Bucket: bucket, Key: key(filename), Body: data, ContentType: contentType,
                CacheControl: 'public, max-age=31536000, immutable',
            }));
        },
        get: async (filename) => {
            const result = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key(filename) }));
            return Buffer.from(await result.Body.transformToByteArray());
        },
        delete: async (filename) => {
            await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key(filename) }));
        },
        publicUrl: (filename) => `${publicBase}/${key(filename)}`,
    };
};

// ----------------------------------------------------------------------------
// Vercel Blob
// ----------------------------------------------------------------------------
const createVercelBlobStorage = (): StorageAdapter => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { put, del } = require('@vercel/blob');
    const token = required('BLOB_READ_WRITE_TOKEN');
    // El token tiene la forma vercel_blob_rw_<storeId>_<secreto>; la URL pública del store se deriva de él
    const storeId = token.split('_')[3]?.toLowerCase();
    const publicBase = (process.env.BLOB_PUBLIC_URL || `https://${storeId}.public.blob.vercel-storage.com`).replace(/\/$/, '');
    const key = (filename: string) => `uploads/${safeName(filename)}`;

    return {
        driver: 'vercel-blob',
        put: async (filename, data, contentType) => {
            await put(key(filename), data, {
                access: 'public', token, contentType, addRandomSuffix: false, allowOverwrite: true,
                cacheControlMaxAge: 31536000,
            });
        },
        get: async (filename) => {
            const response = await fetch(`${publicBase}/${key(filename)}`);
            if (!response.ok) throw new Error(`No se pudo leer ${filename} (${response.status})`);
            return Buffer.from(await response.arrayBuffer());
        },
        delete: async (filename) => {
            await del(`${publicBase}/${key(filename)}`, { token });
        },
        publicUrl: (filename) => `${publicBase}/${key(filename)}`,
    };
};

let storage: StorageAdapter | null = null;

export const getStorage = (): StorageAdapter => {
    if (storage) return storage;
    const driver = process.env.STORAGE_DRIVER || (process.env.BLOB_READ_WRITE_TOKEN ? 'vercel-blob' : 'local');
    switch (driver) {
        case 'local': storage = createLocalStorage(); break;
        case 's3': storage = createS3Storage(); break;
        case 'vercel-blob': storage = createVercelBlobStorage(); break;
        default: throw new Error(`STORAGE_DRIVER desconocido: ${driver} (usa local, s3 o vercel-blob)`);
    }
    return storage;
};
