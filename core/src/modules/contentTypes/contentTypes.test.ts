import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../index';
import db, { runMigrations } from '../../database';

process.env.JWT_SECRET = 'test_secret';

const PROYECTOS = {
    name: 'Proyectos',
    singular_name: 'Proyecto',
    slug: 'proyectos',
    description: 'Obras realizadas por el estudio',
    url_prefix: '/proyectos',
    has_archive: true,
    fields: [
        { key: 'cliente', label: 'Cliente', type: 'text', required: true },
        { key: 'anio', label: 'Año', type: 'number' },
        { key: 'categoria', label: 'Categoría', type: 'select', options: ['Residencial', 'Comercial'] },
        { key: 'descripcion', label: 'Descripción', type: 'richtext' },
        { key: 'destacado', label: 'Destacado', type: 'boolean' },
    ],
};

const jsonLdTypes = (html: string): string[] =>
    [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map((match) => JSON.parse(match[1] ?? '{}')['@type']);

describe('Tipos de contenido y entradas', () => {
    let token: string;
    let typeId: number;
    let entryId: number;
    const auth = () => ({ Authorization: `Bearer ${token}` });

    beforeAll(async () => {
        await runMigrations();
        const [userId] = await db('users').insert({ name: 'Admin', email: 'admin@test.com', password: 'x', role: 'admin' });
        token = jwt.sign({ id: userId, role: 'admin' }, process.env.JWT_SECRET as string, { expiresIn: '1h' });
    }, 60_000);

    afterAll(async () => {
        await db.destroy();
    });

    describe('API de tipos', () => {
        it('Requiere sesión', async () => {
            const res = await request(app).get('/api/content-types');
            expect(res.status).toBe(401);
        });

        it('Rechaza claves de campo inválidas, repetidas o reservadas', async () => {
            const res = await request(app).post('/api/content-types').set(auth()).send({
                ...PROYECTOS,
                fields: [
                    { key: 'Mal Nombre', label: 'X', type: 'text' },
                    { key: 'title', label: 'Título', type: 'text' },
                ],
            });
            expect(res.status).toBe(400);
        });

        it('Rechaza prefijos reservados por el sistema', async () => {
            const res = await request(app).post('/api/content-types').set(auth()).send({ ...PROYECTOS, url_prefix: '/admin' });
            expect(res.status).toBe(400);
        });

        it('Un select necesita opciones', async () => {
            const res = await request(app).post('/api/content-types').set(auth()).send({
                ...PROYECTOS,
                fields: [{ key: 'tipo', label: 'Tipo', type: 'select' }],
            });
            expect(res.status).toBe(400);
        });

        it('Crea un tipo con sus campos', async () => {
            const res = await request(app).post('/api/content-types').set(auth()).send(PROYECTOS);
            expect(res.status).toBe(201);
            expect(res.body.fields).toHaveLength(5);
            expect(res.body.has_archive).toBe(true);
            typeId = res.body.id;
        });

        it('No permite repetir slug ni prefijo', async () => {
            const res = await request(app).post('/api/content-types').set(auth()).send(PROYECTOS);
            expect(res.status).toBe(409);
        });
    });

    describe('API de entradas', () => {
        it('Valida los campos según la definición del tipo', async () => {
            const res = await request(app).post('/api/entries').set(auth()).send({
                type_id: typeId,
                title: 'Casa Azul',
                data: { anio: 'no-numero', categoria: 'Industrial' }, // falta cliente (obligatorio)
            });
            expect(res.status).toBe(400);
            expect(Object.keys(res.body.details.data).sort()).toEqual(['anio', 'categoria', 'cliente']);
        });

        it('Crea una entrada: slug automático, números convertidos y richtext sanitizado', async () => {
            const res = await request(app).post('/api/entries').set(auth()).send({
                type_id: typeId,
                title: 'Casa Azul en la Montaña',
                status: 'published',
                data: {
                    cliente: 'Familia Pérez',
                    anio: '2025',
                    categoria: 'Residencial',
                    descripcion: '<p>Vista al <strong>valle</strong></p><script>alert(1)</script>',
                    destacado: true,
                    campo_inexistente: 'se descarta',
                },
            });
            expect(res.status).toBe(201);
            expect(res.body.slug).toBe('casa-azul-en-la-montana');
            expect(res.body.data.anio).toBe(2025);
            expect(res.body.data.descripcion).not.toContain('<script');
            expect(res.body.data).not.toHaveProperty('campo_inexistente');
            expect(res.body.published_at).toBeTruthy();
            entryId = res.body.id;
        });

        it('Genera slugs únicos dentro del tipo', async () => {
            const res = await request(app).post('/api/entries').set(auth()).send({
                type_id: typeId,
                title: 'Casa Azul en la Montaña',
                data: { cliente: 'Otro' },
            });
            expect(res.status).toBe(201);
            expect(res.body.slug).toBe('casa-azul-en-la-montana-2');
            expect(res.body.status).toBe('draft');
        });

        it('Edita parcialmente sin perder los demás campos', async () => {
            const res = await request(app).put(`/api/entries/${entryId}`).set(auth()).send({ data: { anio: 2026 } });
            expect(res.status).toBe(200);
            expect(res.body.data.anio).toBe(2026);
            expect(res.body.data.cliente).toBe('Familia Pérez');
            expect(res.body.status).toBe('published');
        });

        it('Lista entradas por tipo', async () => {
            const res = await request(app).get('/api/entries?type=proyectos').set(auth());
            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(2);
        });
    });

    describe('Render público', () => {
        it('Renderiza la entrada con la plantilla por defecto y datos estructurados', async () => {
            const res = await request(app).get('/proyectos/casa-azul-en-la-montana');
            expect(res.status).toBe(200);
            expect(res.text).toContain('<title>Casa Azul en la Montaña | LiteCMS</title>');
            expect(res.text).toContain('Familia Pérez');
            expect(res.text).toContain('Vista al <strong>valle</strong>');
            expect(res.text).toMatch(/\/css\/entry-\d+\.css\?v=/);
            expect(jsonLdTypes(res.text)).toEqual(['WebPage', 'BreadcrumbList']);
            // Instalación nueva sin Design System guardado: fondo oscuro por defecto (texto blanco legible)
            expect(res.text).toContain('background-color:#141414');
        }, 30_000);

        it('Un borrador no se publica', async () => {
            const res = await request(app).get('/proyectos/casa-azul-en-la-montana-2');
            expect(res.status).toBe(404);
        });

        it('El archivo lista solo las entradas publicadas', async () => {
            const res = await request(app).get('/proyectos');
            expect(res.status).toBe(200);
            expect(res.text).toContain('href="/proyectos/casa-azul-en-la-montana"');
            expect(res.text).not.toContain('casa-azul-en-la-montana-2');
            expect(jsonLdTypes(res.text)).toEqual(['CollectionPage', 'BreadcrumbList']);
        }, 30_000);

        it('Usa la plantilla single asignada con campos y helpers', async () => {
            await db('templates').insert({
                id: 'tpl-proyecto',
                name: 'Proyecto',
                type: 'single',
                content: '<article><h1 class="text-6xl">{{entry.title}}</h1><p>Cliente: {{entry.fields.cliente}} ({{entry.fields.anio}})</p>{{#if entry.fields.destacado}}<span>Destacado</span>{{/if}}<time>{{formatDate entry.published_at "long"}}</time></article>',
                is_active: true,
            });
            const update = await request(app).put(`/api/content-types/${typeId}`).set(auth()).send({ single_template_id: 'tpl-proyecto' });
            expect(update.status).toBe(200);

            const res = await request(app).get('/proyectos/casa-azul-en-la-montana');
            expect(res.text).toContain('<h1 class="text-6xl">Casa Azul en la Montaña</h1>');
            expect(res.text).toContain('Cliente: Familia Pérez (2026)');
            expect(res.text).toContain('<span>Destacado</span>');
            expect(res.text).toMatch(/<time>\d{1,2} de \w+ de \d{4}<\/time>/);
        }, 30_000);

        it('Cualquier página puede listar entradas con el helper query', async () => {
            await db('pages').insert({
                title: 'Inicio',
                slug: '/',
                status: 'published',
                content: '<section>{{#each (query "proyectos" limit=5)}}<a class="proyecto" href="{{url}}">{{title}} · {{fields.cliente}}</a>{{/each}}</section>',
            });

            const res = await request(app).get('/');
            expect(res.status).toBe(200);
            expect(res.text).toContain('<a class="proyecto" href="/proyectos/casa-azul-en-la-montana">Casa Azul en la Montaña · Familia Pérez</a>');
        }, 30_000);

        it('Cambiar el slug de una entrada crea una redirección 301', async () => {
            const res = await request(app).put(`/api/entries/${entryId}`).set(auth()).send({ slug: 'casa-azul' });
            expect(res.status).toBe(200);

            const old = await request(app).get('/proyectos/casa-azul-en-la-montana');
            expect(old.status).toBe(301);
            expect(old.headers.location).toBe('/proyectos/casa-azul');
        });

        it('Cambiar el prefijo del tipo redirige archivo y entradas', async () => {
            const res = await request(app).put(`/api/content-types/${typeId}`).set(auth()).send({ url_prefix: '/obras' });
            expect(res.status).toBe(200);

            const archive = await request(app).get('/proyectos');
            expect(archive.status).toBe(301);
            expect(archive.headers.location).toBe('/obras');

            const single = await request(app).get('/proyectos/casa-azul');
            expect(single.status).toBe(301);
            expect(single.headers.location).toBe('/obras/casa-azul');

            const current = await request(app).get('/obras/casa-azul');
            expect(current.status).toBe(200);
        }, 30_000);

        it('Sitemap y llms.txt incluyen el tipo y sus entradas', async () => {
            const sitemap = await request(app).get('/sitemap.xml');
            expect(sitemap.text).toContain('<loc>http://localhost:3000/obras</loc>');
            expect(sitemap.text).toContain('<loc>http://localhost:3000/obras/casa-azul</loc>');
            expect(sitemap.text).not.toContain('casa-azul-en-la-montana-2');

            const llms = await request(app).get('/llms.txt');
            expect(llms.text).toContain('## Proyectos');
            expect(llms.text).toContain('[Casa Azul en la Montaña](http://localhost:3000/obras/casa-azul)');
        });
    });

    describe('Borrado', () => {
        it('Pide confirmación si el tipo tiene entradas y luego borra todo', async () => {
            const blocked = await request(app).delete(`/api/content-types/${typeId}`).set(auth());
            expect(blocked.status).toBe(409);

            const forced = await request(app).delete(`/api/content-types/${typeId}?force=true`).set(auth());
            expect(forced.status).toBe(200);

            const remaining = await db('entries').where({ type_id: typeId });
            expect(remaining).toHaveLength(0);
        });
    });
});
