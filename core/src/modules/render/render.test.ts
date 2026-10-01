import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../index';
import db, { runMigrations } from '../../database';
import { enhanceImages, type MediaInfo } from './images';

process.env.JWT_SECRET = 'test_secret';

// Extrae los bloques JSON-LD de un documento
const jsonLdBlocks = (html: string): any[] =>
    [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map((match) => JSON.parse(match[1] ?? '{}'));

describe('Render público (SSR)', () => {
    let token: string;

    beforeAll(async () => {
        await runMigrations();

        const [userId] = await db('users').insert({ name: 'Autora', email: 'autora@test.com', password: 'x', role: 'admin' });
        token = jwt.sign({ id: userId, role: 'admin' }, process.env.JWT_SECRET as string, { expiresIn: '1h' });

        await db('templates').insert({
            id: 'header-1',
            name: 'Header',
            type: 'header',
            content: '<header class="p-4 bg-primary"><a href="/">{{site.name}}</a></header>',
            is_active: true,
        });

        await db('pages').insert([
            {
                title: 'Inicio',
                slug: '/',
                status: 'published',
                header_id: 'header-1',
                content: '<main class="text-4xl font-black">Hola {{page.title}}</main>',
                meta_description: 'Sitio de prueba de LiteCMS',
            },
            { title: 'Contacto', slug: '/contacto', status: 'published', content: '<p class="mt-8">Escríbenos</p>' },
            { title: 'Secreto', slug: '/borrador', status: 'draft', content: '<p>Aún no</p>' },
        ]);
    }, 60_000);

    afterAll(async () => {
        await db.destroy();
    });

    it('La portada es HTML completo con SEO sin necesitar JavaScript', async () => {
        const res = await request(app).get('/');

        expect(res.status).toBe(200);
        expect(res.headers['content-type']).toMatch(/text\/html/);
        expect(res.text).toMatch(/^<!doctype html>/);
        expect(res.text).toContain('<html lang="es">');
        expect(res.text).toContain('<title>LiteCMS</title>');
        expect(res.text).toContain('<meta name="description" content="Sitio de prueba de LiteCMS">');
        expect(res.text).toContain('<link rel="canonical" href="http://localhost:3000/">');
        expect(res.text).toContain('<meta property="og:title"');
        expect(res.text).not.toContain('id="root"');

        // Handlebars se procesa en el servidor
        expect(res.text).toContain('Hola Inicio');
        expect(res.text).toContain('<a href="/">LiteCMS</a>');

        const types = jsonLdBlocks(res.text).map((block) => block['@type']);
        expect(types).toEqual(['WebSite', 'WebPage']);
    }, 30_000);

    it('Sirve el CSS compilado con caché inmutable cuando el hash coincide', async () => {
        const home = await request(app).get('/');
        const href = home.text.match(/<link rel="stylesheet" href="(\/css\/page-\d+\.css\?v=[a-f0-9]+)">/)?.[1];
        expect(href).toBeDefined();

        const css = await request(app).get(href as string);
        expect(css.status).toBe(200);
        expect(css.headers['content-type']).toMatch(/text\/css/);
        expect(css.headers['cache-control']).toContain('immutable');
        expect(css.text).toContain('.font-black');
    }, 30_000);

    it('Redirige la barra final a la URL canónica', async () => {
        const res = await request(app).get('/contacto/');
        expect(res.status).toBe(301);
        expect(res.headers.location).toBe('/contacto');
    });

    it('Un borrador devuelve 404 con noindex', async () => {
        const res = await request(app).get('/borrador');
        expect(res.status).toBe(404);
        expect(res.text).toContain('noindex, nofollow');
    });

    it('Cambiar el slug de una página crea una redirección 301', async () => {
        const page = await db('pages').where({ slug: '/contacto' }).first();
        await request(app).get('/contacto'); // queda en caché

        const update = await request(app)
            .put(`/api/pages/${page.id}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ slug: '/contactanos' });
        expect(update.status).toBe(200);

        const old = await request(app).get('/contacto');
        expect(old.status).toBe(301);
        expect(old.headers.location).toBe('/contactanos');

        const current = await request(app).get('/contactanos');
        expect(current.status).toBe(200);
        expect(current.text).toContain('Escríbenos');
    }, 30_000);

    it('Sanitiza el contenido de los posts y los renderiza con Article + BreadcrumbList', async () => {
        const create = await request(app)
            .post('/api/posts')
            .set('Authorization', `Bearer ${token}`)
            .send({
                title: 'Primer artículo',
                slug: 'primer-articulo',
                status: 'published',
                published_at: '2026-09-01T10:00:00.000Z',
                content: '<p onclick="alert(1)">Contenido <strong>real</strong></p><script>alert("xss")</script><a href="javascript:alert(1)">x</a>',
            });
        expect(create.status).toBe(201);

        const stored = await db('posts').where({ slug: 'primer-articulo' }).first();
        expect(stored.content).not.toMatch(/<script|onclick|javascript:/);
        expect(stored.content).toContain('<strong>real</strong>');

        const res = await request(app).get('/blog/primer-articulo');
        expect(res.status).toBe(200);
        expect(res.text).toContain('<meta property="og:type" content="article">');
        expect(res.text).not.toContain('alert("xss")');

        const types = jsonLdBlocks(res.text).map((block) => block['@type']);
        expect(types).toEqual(['Article', 'BreadcrumbList']);
    }, 30_000);

    it('Cambiar el slug de un post redirige /blog/viejo → /blog/nuevo', async () => {
        const post = await db('posts').where({ slug: 'primer-articulo' }).first();
        const update = await request(app)
            .put(`/api/posts/${post.id}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ slug: 'articulo-renombrado' });
        expect(update.status).toBe(200);

        const old = await request(app).get('/blog/primer-articulo');
        expect(old.status).toBe(301);
        expect(old.headers.location).toBe('/blog/articulo-renombrado');
    }, 30_000);

    it('robots.txt permite rastrear y apunta al sitemap', async () => {
        const res = await request(app).get('/robots.txt');
        expect(res.status).toBe(200);
        expect(res.text).toContain('Disallow: /admin/');
        expect(res.text).toContain('Sitemap: http://localhost:3000/sitemap.xml');
    });

    it('llms.txt resume el sitio para asistentes de IA', async () => {
        const res = await request(app).get('/llms.txt');
        expect(res.status).toBe(200);
        expect(res.text).toMatch(/^# LiteCMS/);
        expect(res.text).toContain('> Sitio de prueba de LiteCMS');
        expect(res.text).toContain('[Contacto](http://localhost:3000/contactanos)');
        expect(res.text).toContain('[Primer artículo](http://localhost:3000/blog/articulo-renombrado)');
        expect(res.text).not.toContain('Secreto');
    });

    it('Las rutas de API inexistentes responden JSON, no el sitio', async () => {
        const res = await request(app).get('/api/no-existe');
        expect(res.status).toBe(404);
        expect(res.body.error).toBeDefined();
    });
});

describe('enhanceImages', () => {
    const media = new Map<string, MediaInfo>([
        ['foto.jpg', { width: 1600, height: 900, variants: [{ width: 480, filename: 'foto-480w.webp' }, { width: 1600, filename: 'foto-1600w.webp' }] }],
    ]);

    it('Añade srcset, sizes y dimensiones a imágenes de /uploads', () => {
        const html = enhanceImages('<img src="/uploads/foto.jpg" alt="Foto">', media);
        expect(html).toContain('srcset="/uploads/foto-480w.webp 480w, /uploads/foto-1600w.webp 1600w"');
        expect(html).toContain('sizes="(max-width: 768px) 100vw, 768px"');
        expect(html).toContain('width="1600" height="900"');
        expect(html).toContain('fetchpriority="high"'); // primera imagen: candidata a LCP
    });

    it('La segunda imagen es lazy y no se pisan atributos del autor', () => {
        const html = enhanceImages('<img src="/uploads/otra.png"><img src="/uploads/foto.jpg" loading="eager" width="300">', media);
        const second = html.split('<img')[2] ?? '';
        expect(second).toContain('loading="eager"');
        expect(second).not.toContain('loading="lazy"');
        expect(second).not.toContain('height="900"');
        expect(html.split('<img')[1]).not.toContain('loading="lazy"');
    });
});
