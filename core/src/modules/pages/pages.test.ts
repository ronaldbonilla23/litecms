import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../index';
import db from '../../database';
import jwt from 'jsonwebtoken';

process.env.JWT_SECRET = 'test_secret';

describe('Pages Module Tests', () => {
    let mockToken: string;

    beforeAll(async () => {
        // 1. Crear tabla 'users' para satisfacer la llave foránea author_id
        await db.schema.createTable('users', (table) => {
            table.increments('id').primary();
            table.string('name').notNullable();
            table.string('email').notNullable().unique();
            table.string('password').notNullable();
            table.string('role').notNullable().defaultTo('admin');
            table.timestamps(true, true);
        });

        // Insertar usuario admin usado para el test
        await db('users').insert({
            name: 'Admin Test',
            email: 'admin@test.com',
            password: 'hashedpassword',
            role: 'admin'
        });

        // 2. Crear tabla 'pages'
        await db.schema.createTable('pages', (table) => {
            table.increments('id').primary();
            table.string('title').notNullable();
            table.string('slug').notNullable().unique();
            table.json('fields');
            table.string('status').notNullable().defaultTo('draft');
            table.integer('author_id').unsigned().references('id').inTable('users');
            table.timestamps(true, true);
        });

        // Generar token mock
        mockToken = jwt.sign({ id: 1, email: 'admin@test.com', role: 'admin' }, process.env.JWT_SECRET as string, { expiresIn: '1h' });
    });

    afterAll(async () => {
        await db.destroy();
    });

    it('Debe rechazar la creación sin token (401)', async () => {
        const res = await request(app)
            .post('/api/pages')
            .send({
                title: 'No Auth Page',
                slug: 'no-auth'
            });

        expect(res.status).toBe(401);
        expect(res.body.error).toBeDefined();
    });

    it('Debe crear una página con token válido y retornar 201', async () => {
        const newPage = {
            title: 'Página de Inicio',
            slug: 'inicio',
            fields: {
                hero_title: 'Bienvenidos a LiteCMS',
                hero_subtitle: 'El mejor CMS ligero'
            },
            status: 'published'
        };

        const res = await request(app)
            .post('/api/pages')
            .set('Authorization', `Bearer ${mockToken}`)
            .send(newPage);

        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('id', 1);
        expect(res.body.message).toBe('Página creada');
    });

    it('Debe obtener la página creada públicamente por slug con fields parseados a objeto', async () => {
        const res = await request(app).get('/api/pages/inicio');

        expect(res.status).toBe(200);
        expect(res.body.slug).toBe('inicio');
        expect(res.body.title).toBe('Página de Inicio');
        // Verificar que 'fields' es objeto (no string)
        expect(typeof res.body.fields).toBe('object');
        expect(res.body.fields.hero_title).toBe('Bienvenidos a LiteCMS');
    });

    it('Debe permitir editar el título o fields de una página', async () => {
        const updateData = {
            title: 'Página de Inicio Modificada',
            fields: {
                hero_title: 'Título Editado'
            }
        };

        const res = await request(app)
            .put('/api/pages/1')
            .set('Authorization', `Bearer ${mockToken}`)
            .send(updateData);

        expect(res.status).toBe(200);
        expect(res.body.message).toBe('Página actualizada con éxito');

        // Verificamos obteniendo de nuevo la página
        const verifyRes = await request(app).get('/api/pages/inicio');
        expect(verifyRes.body.title).toBe('Página de Inicio Modificada');
        expect(verifyRes.body.fields.hero_title).toBe('Título Editado');
    });
});
