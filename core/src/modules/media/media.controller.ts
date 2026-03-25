import type { Request, Response, NextFunction } from 'express';
import db from '../../database';
import fs from 'fs';
import path from 'path';

export const uploadFile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        console.log('--- REQ.FILE EN LLEGADA ---');
        console.log(req.file);
        console.log('--- FIN REQ.FILE ---');

        if (!req.file) {
            // Llegó undefind, puede que no se envíe con el form-data "file" o el archivo fue rechazado
            res.status(400).json({ error: 'No se subió ningún archivo válido o el formato no es soportado' });
            return;
        }

        const { filename, originalname, mimetype, size } = req.file;
        const filePath = `/uploads/${filename}`;

        const [id] = await db('media').insert({
            filename,
            original_name: originalname,
            mimetype,
            size,
            path: filePath
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

        // Eliminar del disco
        const baseUploadsDir = path.join(__dirname, '../../../../content/uploads');
        const filePhysicalPath = path.join(baseUploadsDir, mediaItem.filename);

        try {
            await fs.promises.unlink(filePhysicalPath);
        } catch (fsError) {
            // Si el archivo físico no existe, lo ignoramos para borrar de todas formas el registro
            console.warn(`El archivo físico ${filePhysicalPath} no existía o no se pudo borrar.`);
        }

        // Eliminar de base de datos
        await db('media').where({ id }).delete();

        res.json({ message: 'Archivo eliminado exitosamente' });
    } catch (error) {
        next(error);
    }
};
