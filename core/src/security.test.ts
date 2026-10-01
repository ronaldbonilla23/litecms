import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from './index';
import db from './database';

process.env.JWT_SECRET = 'test_secret';

describe('Seguridad de rutas públicas e instalación', () => {
    let mockToken: string;

    beforeAll(async () => {
        await db.schema.createTable('users', (table) => {
            table.increments('id').primary();
            table.string('name').notNullable();
            table.string('email').notNullable().unique();
            table.string('password').notNullable();
            table.string('role').notNullable().defaultTo('admin');
            table.timestamps(true, true);
        });

        await db.schema.createTable('pages', (table) => {
            table.increments('id').primary();
            table.string('title').notNullable();
            table.string('slug').notNullable().unique();
            table.json('fields');
            table.text('content').nullable();
            table.text('compiled_css').nullable();
            table.string('status').notNullable().defaultTo('draft');
            table.string('header_id').nullable();
            table.string('footer_id').nullable();
            table.string('meta_title').nullable();
            table.text('meta_description').nullable();
            table.string('canonical_url').nullable();
            table.integer('og_image_id').nullable();
            table.integer('author_id').nullable();
            table.timestamps(true, true);
        });

        await db.schema.createTable('theme_settings', (table) => {
            table.increments('id').primary();
            table.string('primary_color').defaultTo('#C2F86C');
        });
        await db('theme_settings').insert({});

        await db('pages').insert([
            { title: 'Publicada', slug: '/publicada', status: 'published' },
            { title: 'Borrador', slug: '/borrador', status: 'draft' },
        ]);

        mockToken = jwt.sign({ id: 1, role: 'admin' }, process.env.JWT_SECRET as string, { expiresIn: '1h' });
    });

    afterAll(async () => {
        await db.destroy();
    });

    it('PUT /api/theme-settings sin token devuelve 401', async () => {
        const res = await request(app).put('/api/theme-settings').send({ primary_color: '#ff0000' });
        expect(res.status).toBe(401);
    });

    it('Un visitante no puede ver una página en borrador', async () => {
        const res = await request(app).get('/api/pages/by-slug?url=borrador');
        expect(res.status).toBe(404);
    });

    it('Un visitante sí ve una página publicada', async () => {
        const res = await request(app).get('/api/pages/by-slug?url=publicada');
        expect(res.status).toBe(200);
        expect(res.body.title).toBe('Publicada');
    });

    it('Un usuario autenticado puede previsualizar un borrador', async () => {
        const res = await request(app)
            .get('/api/pages/by-slug?url=borrador')
            .set('Authorization', `Bearer ${mockToken}`);
        expect(res.status).toBe(200);
    });

    it('Editar una página sin enviar status no la despublica', async () => {
        const page = await db('pages').where({ slug: '/publicada' }).first();
        const res = await request(app)
            .put(`/api/pages/${page.id}`)
            .set('Authorization', `Bearer ${mockToken}`)
            .send({ title: 'Publicada editada' });

        expect(res.status).toBe(200);
        const updated = await db('pages').where({ id: page.id }).first();
        expect(updated.status).toBe('published');
    });

    it('GET /api/install/status indica que no está instalado', async () => {
        const res = await request(app).get('/api/install/status');
        expect(res.status).toBe(200);
        expect(res.body.installed).toBe(false);
    });

    it('POST /api/install rechaza datos inválidos', async () => {
        const res = await request(app).post('/api/install').send({ name: 'A', email: 'no-es-email', password: '123' });
        expect(res.status).toBe(400);
        expect(res.body.details).toBeDefined();
    });

    it('POST /api/install crea el admin y luego queda bloqueado', async () => {
        const data = { name: 'Admin', email: 'admin@litecms.test', password: 'clave-segura-123' };

        const first = await request(app).post('/api/install').send(data);
        expect(first.status).toBe(201);

        const second = await request(app).post('/api/install').send({ ...data, email: 'otro@litecms.test' });
        expect(second.status).toBe(403);

        const status = await request(app).get('/api/install/status');
        expect(status.body.installed).toBe(true);
    });

    it('Los errores 500 no exponen detalles internos', async () => {
        // Forzamos un error de SQLite eliminando la tabla
        await db.schema.dropTable('theme_settings');
        const res = await request(app)
            .put('/api/theme-settings')
            .set('Authorization', `Bearer ${mockToken}`)
            .send({ primary_color: '#ff0000' });
        expect(res.status).toBe(500);
        expect(JSON.stringify(res.body)).not.toMatch(/SQLITE|no such table/i);
    });
});
