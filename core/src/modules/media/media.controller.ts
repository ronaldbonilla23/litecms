import type { Request, Response, NextFunction } from 'express';
import db from '../../database';
import fs from 'fs';
import path from 'path';
import { MediaSchema } from '../../../../shared/types';
import { config } from '../../config';
import { generateImageVariants, deleteImageVariants, parseVariants, type ImageVariant } from '../../services/images.service';

export const uploadFile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {

        if (!req.file) {
            // Llegó undefind, puede que no se envíe con el form-data "file" o el archivo fue rechazado
            res.status(400).json({ error: 'No se subió ningún archivo válido o el formato no es soportado' });
            return;
        }

        const { filename, originalname, mimetype, size } = req.file;
        const filePath = `/uploads/${filename}`;

        // Variantes WebP para srcset. Si falla (imagen corrupta), la subida sigue siendo válida.
        let image = { width: null as number | null, height: null as number | null, variants: [] as ImageVariant[] };
        try {
            image = await generateImageVariants(filename);
        } catch (imageError: any) {
            console.warn(`[Media] No se pudieron generar variantes de ${filename}:`, imageError.message);
        }

        const [id] = await db('media').insert({
            filename,
            original_name: originalname,
            mimetype,
            size,
            path: filePath,
            width: image.width,
            height: image.height,
            variants: JSON.stringify(image.variants)
        });

        const newMedia = await db('media').where({ id }).first();

        res.status(201).json({ message: 'Archivo subido con éxito', media: newMedia });
    } catch (error) {
        next(error);
    }
};

export const getMediaLibrary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const mediaList = await db('media').orderBy('created_at', 'desc');
        res.json(mediaList);
    } catch (error) {
        next(error);
    }
};

export const deleteMedia = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;

        const mediaItem = await db('media').where({ id }).first();

        if (!mediaItem) {
            res.status(404).json({ error: 'El archivo indicado no existe' });
            return;
        }

        // Eliminar del disco (basename evita rutas fuera de /uploads)
        const filePhysicalPath = path.join(config.paths.uploads, path.basename(mediaItem.filename));

        try {
            await fs.promises.unlink(filePhysicalPath);
        } catch (fsError) {
            // Si el archivo físico no existe, lo ignoramos para borrar de todas formas el registro
            console.warn(`El archivo físico ${filePhysicalPath} no existía o no se pudo borrar.`);
        }

        await deleteImageVariants(parseVariants(mediaItem.variants));

        // Eliminar de base de datos
        await db('media').where({ id }).delete();

        res.json({ message: 'Archivo eliminado exitosamente' });
    } catch (error) {
        next(error);
    }
};

export const updateMediaSeo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;
        
        const validation = MediaSchema.safeParse(req.body);
        
        if (!validation.success) {
            res.status(400).json({ 
                error: 'Datos SEO inválidos', 
                details: validation.error.flatten().fieldErrors 
            });
            return;
        }

        const { alt_text, seo_title } = validation.data;

        const mediaItem = await db('media').where({ id }).first();

        if (!mediaItem) {
            res.status(404).json({ error: 'El archivo indicado no existe' });
            return;
        }

        await db('media').where({ id }).update({
            alt_text: alt_text || null,
            seo_title: seo_title || null,
            updated_at: db.fn.now()
        });

        const updatedMedia = await db('media').where({ id }).first();

        res.json({ message: 'SEO actualizado exitosamente', media: updatedMedia });
    } catch (error) {
        next(error);
    }
};
