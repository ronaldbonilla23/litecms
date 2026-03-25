import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../index';
import db from '../../database';
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';

// Mock secret JWT
process.env.JWT_SECRET = 'test_secret';

describe('Media Module Tests', () => {
    let mockToken: string;
    let uploadedMediaId: number;

    beforeAll(async () => {
        // Crear tabla en SQLite en memoria
        await db.schema.createTable('media', (table) => {
            table.increments('id').primary();
            table.string('filename').unique().notNullable();
            table.string('original_name').notNullable();
            table.string('mimetype').notNullable();
            table.integer('size').notNullable();
            table.string('path').notNullable();
            table.timestamps(true, true);
        });

        // Crear token mock
        mockToken = jwt.sign({ id: 1, email: 'admin@test.com', role: 'admin' }, process.env.JWT_SECRET as string, { expiresIn: '1h' });
    });

    afterAll(async () => {
        await db.destroy();
    });

    it('Debe subir una imagen mockeada y retornar 201', async () => {
        // Creamos un buffer falso simulando el contenido de una imagen
        const fakeImageBuffer = Buffer.from('fake image content payload');

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
