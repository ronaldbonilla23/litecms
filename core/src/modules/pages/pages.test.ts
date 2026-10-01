import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../index';
import db from '../../database';
import jwt from 'jsonwebtoken';
import path from 'path';

process.env.JWT_SECRET = 'test_secret';

describe('Pages Module Tests', () => {
    let mockToken: string;

    beforeAll(async () => {
        // Crear tabla 'users'
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

        // Crear tabla 'pages'
        await db.schema.createTable('pages', (table) => {
            table.increments('id').primary();
            table.string('title').notNullable();
            table.string('slug').notNullable().unique();
            table.json('fields');
            table.text('content').nullable();
            table.text('compiled_css').nullable();
            table.string('status').notNullable().defaultTo('draft');
            table.integer('author_id').unsigned().references('id').inTable('users');
            table.string('header_id').nullable();
            table.string('footer_id').nullable();
            table.string('meta_title').nullable();
            table.string('meta_description').nullable();
            table.string('canonical_url').nullable();
            table.integer('og_image_id').nullable();
            table.timestamps(true, true);
        });

        // Crear tabla 'theme_settings'
        await db.schema.createTable('theme_settings', (table) => {
            table.increments('id').primary();
            table.string('primary_color').defaultTo('#C2F86C');
            table.string('secondary_color').defaultTo('#3B82F6');
            table.string('accent_color').defaultTo('#F59E0B');
            table.string('background_color').defaultTo('#141414');
            table.string('header_font').defaultTo('Plus Jakarta Sans');
            table.string('header_font_weight').defaultTo('700');
            table.string('body_font').defaultTo('Inter');
            table.string('body_font_weight').defaultTo('400');
            table.string('body_line_height').defaultTo('1.6');
            table.string('button_primary_bg').defaultTo('#C2F86C');
            table.string('button_primary_color').defaultTo('#141414');
            table.string('button_primary_radius').defaultTo('8');
            table.string('button_primary_border').defaultTo('0');
            table.string('button_secondary_bg').defaultTo('transparent');
            table.string('button_secondary_color').defaultTo('#C2F86C');
            table.string('button_secondary_radius').defaultTo('8');
            table.string('button_secondary_border').defaultTo('1');
            table.string('logo_url').nullable();
            table.string('favicon_url').nullable();
            table.timestamps(true, true);
        });

        // Insertar un theme_setting inicial para evitar errores en las consultas del controlador
        await db('theme_settings').insert({});

        // Crear tabla 'templates'
        await db.schema.createTable('templates', (table) => {
            table.uuid('id').primary();
            table.string('name').notNullable();
            table.string('type').notNullable();
            table.json('content').notNullable();
            table.boolean('is_active').defaultTo(true);
            table.timestamps(true, true);
        });

        // Crear tabla 'media'
        await db.schema.createTable('media', (table) => {
            table.increments('id').primary();
            table.string('filename').unique().notNullable();
            table.string('original_name').notNullable();
            table.string('mimetype').notNullable();
            table.integer('size').notNullable();
            table.string('path').notNullable();
            table.string('alt_text').nullable();
            table.string('seo_title').nullable();
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
            slug: '/inicio',
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
        const res = await request(app).get('/api/pages/by-slug?url=inicio');

        expect(res.status).toBe(200);
        expect(res.body.slug).toBe('/inicio');
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
        const verifyRes = await request(app).get('/api/pages/by-slug?url=inicio');
        expect(verifyRes.body.title).toBe('Página de Inicio Modificada');
        expect(verifyRes.body.fields.hero_title).toBe('Título Editado');
    });
});
