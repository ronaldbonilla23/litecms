import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

// Carpeta de plugins temporal: los plugins de ejemplo del repo + uno roto a propósito.
// Se define antes de importar la app (config lee LITECMS_PLUGINS_DIR al cargarse).
const { pluginsDir } = vi.hoisted(() => {
    /* eslint-disable @typescript-eslint/no-require-imports */
    const fs = require('fs');
    const os = require('os');
    const path = require('path');
    /* eslint-enable @typescript-eslint/no-require-imports */
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'litecms-plugins-'));
    fs.cpSync(path.resolve(process.cwd(), '../plugins'), dir, { recursive: true });

    fs.mkdirSync(path.join(dir, 'roto'));
    fs.writeFileSync(path.join(dir, 'roto', 'plugin.json'), JSON.stringify({ name: 'roto', title: 'Roto', version: '0.0.1' }));
    fs.writeFileSync(path.join(dir, 'roto', 'index.js'), "exports.register = (api) => { api.addFilter('render.head', () => ['<meta name=\"roto\">']); throw new Error('fallo al registrar'); };");

    process.env.LITECMS_PLUGINS_DIR = dir;
    return { pluginsDir: dir };
});

import fs from 'fs';
import app from '../index';
import db, { runMigrations } from '../database';

process.env.JWT_SECRET = 'test_secret';

describe('Plugins y temas', () => {
    let token: string;
    const auth = () => ({ Authorization: `Bearer ${token}` });

    beforeAll(async () => {
        await runMigrations();
        const [userId] = await db('users').insert({ name: 'Admin', email: 'admin@test.com', password: 'x', role: 'admin' });
        token = jwt.sign({ id: userId, role: 'admin' }, process.env.JWT_SECRET as string, { expiresIn: '1h' });
    }, 60_000);

    afterAll(async () => {
        await db.destroy();
        fs.rmSync(pluginsDir, { recursive: true, force: true });
    });

    describe('Gestión de plugins', () => {
        it('Lista los plugins de la carpeta con su manifiesto', async () => {
            const res = await request(app).get('/api/extensions/plugins').set(auth());
            expect(res.status).toBe(200);
            const names = res.body.map((plugin: { name: string }) => plugin.name).sort();
            expect(names).toEqual(['analytics', 'contact-form', 'roto']);
            expect(res.body.every((plugin: { enabled: boolean }) => plugin.enabled === false)).toBe(true);
        });

        it('Requiere sesión', async () => {
            const res = await request(app).get('/api/extensions/plugins');
            expect(res.status).toBe(401);
        });

        it('Un plugin que falla al registrarse no se activa ni deja hooks colgados', async () => {
            const res = await request(app).post('/api/extensions/plugins/roto/enable').set(auth());
            expect(res.status).toBe(422);
            expect(res.body.error).toContain('fallo al registrar');

            await db('pages').insert({ title: 'Inicio', slug: '/', status: 'published', content: '<main>Hola</main>' });
            const home = await request(app).get('/');
            expect(home.status).toBe(200);
            expect(home.text).not.toContain('name="roto"');
        }, 30_000);
    });

    describe('Plugin de analítica', () => {
        it('Valida los ajustes con el schema del manifiesto', async () => {
            const res = await request(app).put('/api/extensions/plugins/analytics/settings').set(auth()).send({ provider: 'Otro' });
            expect(res.status).toBe(400);
        });

        it('Inserta el script en el <head> al activarse y lo quita al desactivarse', async () => {
            await request(app).put('/api/extensions/plugins/analytics/settings').set(auth())
                .send({ provider: 'Google Analytics 4', measurement_id: 'G-TEST12345' }).expect(200);
            await request(app).post('/api/extensions/plugins/analytics/enable').set(auth()).expect(200);

            const withPlugin = await request(app).get('/');
            expect(withPlugin.text).toContain('googletagmanager.com/gtag/js?id=G-TEST12345');

            await request(app).post('/api/extensions/plugins/analytics/disable').set(auth()).expect(200);
            const withoutPlugin = await request(app).get('/');
            expect(withoutPlugin.text).not.toContain('googletagmanager');
        }, 30_000);

        it('No mide las páginas 404', async () => {
            await request(app).post('/api/extensions/plugins/analytics/enable').set(auth()).expect(200);
            const res = await request(app).get('/no-existe');
            expect(res.status).toBe(404);
            expect(res.text).not.toContain('googletagmanager');
            await request(app).post('/api/extensions/plugins/analytics/disable').set(auth()).expect(200);
        });
    });

    describe('Tema Agencia + formulario de contacto', () => {
        it('Aplica el tema: plantillas, tipos, entradas, páginas y plugin recomendado', async () => {
            const res = await request(app).post('/api/extensions/themes/agencia/apply').set(auth());
            expect(res.status).toBe(200);
            const { report } = res.body;
            expect(report.templates).toBe(4);
            expect(report.contentTypesCreated).toEqual(['servicios', 'testimonios']);
            // La portada ya existía: no se sobrescribe
            expect(report.pagesSkipped).toEqual(['/']);
            expect(report.pagesCreated).toEqual(['/contacto']);
            expect(report.pluginsEnabled).toEqual(['contact-form']);

            const themes = await request(app).get('/api/extensions/themes').set(auth());
            expect(themes.body.find((theme: { name: string }) => theme.name === 'agencia').active).toBe(true);
        }, 30_000);

        it('Publica el archivo y las fichas de servicios con las plantillas del tema', async () => {
            const archive = await request(app).get('/servicios');
            expect(archive.status).toBe(200);
            expect(archive.text).toContain('Diseño web');
            expect(archive.text).toContain('Desde USD 900');
            // Orden del theme.json: Diseño web, SEO y AEO, Contenido y redes
            const order = ['Diseño web', 'SEO y AEO', 'Contenido y redes'].map((title) => archive.text.indexOf(title));
            expect(order).toEqual([...order].sort((a, b) => a - b));

            const single = await request(app).get('/servicios/diseno-web');
            expect(single.status).toBe(200);
            expect(single.text).toContain('Pedir presupuesto');
            expect(single.text).toContain('<li>Accesibilidad AA</li>');
        }, 30_000);

        it('La página de contacto incluye el formulario del plugin', async () => {
            const res = await request(app).get('/contacto');
            expect(res.status).toBe(200);
            expect(res.text).toContain('action="/api/plugins/contact-form/submit"');
            expect(res.text).toContain('name="website"'); // campo trampa
            // Sin Referer (helmet usa no-referrer por defecto) el formulario no podría volver a su página
            expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
        }, 30_000);

        it('Guarda un mensaje válido y vuelve a la página con #contacto-enviado', async () => {
            const res = await request(app)
                .post('/api/plugins/contact-form/submit')
                .set('Referer', 'http://localhost:3000/contacto')
                .type('form')
                .send({ name: 'Ana', email: 'ana@example.com', message: 'Quiero una web', _ts: String(Math.floor(Date.now() / 1000) - 30) });

            expect(res.status).toBe(303);
            expect(res.headers.location).toBe('/contacto#contacto-enviado');

            const messages = await request(app).get('/api/extensions/plugins/contact-form/data/messages').set(auth());
            expect(messages.body).toHaveLength(1);
            expect(messages.body[0]).toMatchObject({ name: 'Ana', email: 'ana@example.com', page: '/contacto' });
        });

        it('Descarta en silencio a los bots (campo trampa) y rechaza datos inválidos', async () => {
            const oldTs = String(Math.floor(Date.now() / 1000) - 30);
            const bot = await request(app).post('/api/plugins/contact-form/submit').type('form')
                .send({ name: 'Bot', email: 'bot@spam.com', message: 'spam', website: 'http://spam', _ts: oldTs });
            expect(bot.status).toBe(303);
            expect(bot.headers.location).toBe('/#contacto-enviado');

            const invalid = await request(app).post('/api/plugins/contact-form/submit').type('form')
                .send({ name: 'Ana', email: 'no-es-email', message: 'Hola', _ts: oldTs });
            expect(invalid.headers.location).toBe('/#contacto-error');

            const messages = await request(app).get('/api/extensions/plugins/contact-form/data/messages').set(auth());
            expect(messages.body).toHaveLength(1);
        });

        it('No redirige a otros dominios aunque el Referer lo indique', async () => {
            const res = await request(app).post('/api/plugins/contact-form/submit')
                .set('Referer', 'https://evil.example/phishing')
                .type('form')
                .send({ name: 'Ana', email: 'ana@example.com', message: 'Hola', _ts: String(Math.floor(Date.now() / 1000) - 30) });
            expect(res.headers.location).toBe('/#contacto-enviado');
        });

        it('Las rutas de un plugin desactivado responden 404', async () => {
            await request(app).post('/api/extensions/plugins/contact-form/disable').set(auth()).expect(200);
            const res = await request(app).post('/api/plugins/contact-form/submit').type('form').send({});
            expect(res.status).toBe(404);
        });

        it('Reaplicar el tema actualiza plantillas sin duplicar contenido', async () => {
            const res = await request(app).post('/api/extensions/themes/agencia/apply').set(auth());
            expect(res.status).toBe(200);
            expect(res.body.report.contentTypesCreated).toEqual([]);
            expect(res.body.report.pagesCreated).toEqual([]);

            const entries = await db('entries').count('* as total').first();
            expect(Number(entries?.total)).toBe(5);
        }, 30_000);
    });
});
