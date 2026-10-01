import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../index';
import db, { runMigrations } from '../../database';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import { config } from '../../config';

// Mock secret JWT
process.env.JWT_SECRET = 'test_secret';

describe('Media Module Tests', () => {
    let mockToken: string;
    let uploadedMediaId: number;

    beforeAll(async () => {
        // Esquema real: mismas migraciones que en producción, sobre SQLite en memoria
        await runMigrations();

        // Crear token mock
        mockToken = jwt.sign({ id: 1, email: 'admin@test.com', role: 'admin' }, process.env.JWT_SECRET as string, { expiresIn: '1h' });
    });

    afterAll(async () => {
        await db.destroy();
    });

    it('Debe subir una imagen mockeada y retornar 201', async () => {
        // Buffer con la firma JPEG real (FF D8 FF) seguida de relleno
        const fakeImageBuffer = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.from('payload')]);

        const res = await request(app)
            .post('/api/media/upload')
            .set('Authorization', `Bearer ${mockToken}`)
            .attach('file', fakeImageBuffer, 'test-image.jpg');

        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('media');
        expect(res.body.media).toHaveProperty('id');
        expect(res.body.media).toHaveProperty('path');

        uploadedMediaId = res.body.media.id;
    });

    it('Debe generar variantes WebP para una imagen real', async () => {
        const png = await sharp({ create: { width: 1200, height: 600, channels: 3, background: '#C2F86C' } }).png().toBuffer();

        const res = await request(app)
            .post('/api/media/upload')
            .set('Authorization', `Bearer ${mockToken}`)
            .attach('file', png, 'Portada Principal.png');

        expect(res.status).toBe(201);
        expect(res.body.media.width).toBe(1200);
        const variants = JSON.parse(res.body.media.variants);
        expect(variants.map((v: { width: number }) => v.width)).toEqual([480, 960, 1200]);
        for (const variant of variants) {
            expect(fs.existsSync(path.join(config.paths.uploads, variant.filename))).toBe(true);
        }

        // Al borrar la imagen se borran también sus variantes
        const del = await request(app).delete(`/api/media/${res.body.media.id}`).set('Authorization', `Bearer ${mockToken}`);
        expect(del.status).toBe(200);
        for (const variant of variants) {
            expect(fs.existsSync(path.join(config.paths.uploads, variant.filename))).toBe(false);
        }
    });

    it('Debe rechazar un archivo con extensión .jpg que no es una imagen real', async () => {
        const res = await request(app)
            .post('/api/media/upload')
            .set('Authorization', `Bearer ${mockToken}`)
            .attach('file', Buffer.from('<?php echo "hola"; ?>'), 'shell.jpg');

        expect(res.status).toBe(400);
    });

    it('Debe guardar el archivo con un nombre saneado', async () => {
        const media = await db('media').where({ id: uploadedMediaId }).first();
        expect(media.filename).toMatch(/^\d+-test-image\.jpg$/);
    });

    it('Debe listar la librería de medios retornando un arreglo', async () => {
        const res = await request(app)
            .get('/api/media')
            .set('Authorization', `Bearer ${mockToken}`);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBeGreaterThan(0);
        expect(res.body[0].id).toBe(uploadedMediaId);
    });

    it('Debe borrar una imagen de la base de datos', async () => {
        const res = await request(app)
            .delete(`/api/media/${uploadedMediaId}`)
            .set('Authorization', `Bearer ${mockToken}`);

        expect(res.status).toBe(200);
        expect(res.body.message).toBe('Archivo eliminado exitosamente');

        // Confirmar que ya no existe en la DB
        const mediaInDb = await db('media').where({ id: uploadedMediaId }).first();
        expect(mediaInDb).toBeUndefined();
    });
});
