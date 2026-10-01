import 'dotenv/config';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { config } from './config';
import { checkDatabaseConnection, runMigrations } from './database';
import pageRoutes from './modules/pages/pages.routes';
import installRoutes from './modules/install/install.routes';
import authRoutes from './modules/auth/auth.routes';
import mediaRoutes from './modules/media/media.routes';
import statsRoutes from './modules/stats/stats.routes';
import themeSettingsRoutes from './modules/themeSettings/themeSettings.routes';
import templatesRoutes from './modules/templates/templates.routes';
import postsRoutes from './modules/posts/posts.routes';
import categoriesRoutes from './modules/categories/categories.routes';
import tagsRoutes from './modules/tags/tags.routes';
import contentTypesRoutes from './modules/contentTypes/contentTypes.routes';
import entriesRoutes from './modules/entries/entries.routes';
import pluginsAdminRoutes from './plugins/plugins.routes';
import themesRoutes from './themes/themes.routes';
import { initPlugins, pluginRoutesDispatcher } from './plugins/registry';
import { fireAction } from './plugins/hooks';
import renderRoutes from './modules/render/render.routes';
import { clearRenderCache } from './modules/render/render.service';


const app = express();

// Detrás de un proxy (cPanel, Nginx, Vercel) la IP real llega en X-Forwarded-For
if (process.env.TRUST_PROXY) {
    const hops = Number(process.env.TRUST_PROXY);
    app.set('trust proxy', Number.isNaN(hops) ? true : hops);
}

// Middlewares globales
app.use(helmet({
    // La CSP se definirá junto al render SSR del sitio público (M2)
    contentSecurityPolicy: false,
    // Permite que el frontend en otro puerto/dominio cargue /uploads y /css
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    // Valor por defecto de los navegadores: URL completa dentro del sitio (formularios
    // que vuelven a su página), solo el dominio hacia otros sitios
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));

// CORS: orígenes permitidos configurables con CORS_ORIGINS (separados por coma)
app.use(cors({
    origin: config.corsOrigins,
    methods: ['GET', 'PUT', 'POST', 'DELETE', 'OPTIONS'],
    credentials: true
}));
app.use(express.json({ limit: '5mb' })); // Permite a la API recibir payloads en formato JSON

// Límite de intentos para rutas sensibles (fuerza bruta)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Demasiados intentos. Intenta de nuevo en unos minutos.' },
});

// Cualquier escritura exitosa en la API (guardar página, post, plantilla, medios...)
// invalida el HTML cacheado del sitio público
app.use('/api', (req: Request, res: Response, next: NextFunction) => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        res.on('finish', () => {
            if (res.statusCode < 400) {
                clearRenderCache();
                fireAction('content.changed', { method: req.method, path: req.originalUrl });
            }
        });
    }
    next();
});

// Ruta de diagnóstico (Health Check)
app.get('/api/health', (req: Request, res: Response) => {
    res.json({ message: 'LiteCMS API funcionando correctamente' });
});


// El límite aplica solo a los intentos (POST), no a consultas como /install/status
app.post('/api/install', authLimiter);
app.post('/api/auth/login', authLimiter);
app.use('/api/install', installRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/pages', pageRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/theme-settings', themeSettingsRoutes);
app.use('/api/templates', templatesRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/tags', tagsRoutes);
app.use('/api/content-types', contentTypesRoutes);
app.use('/api/entries', entriesRoutes);
app.use('/api/extensions/plugins', pluginsAdminRoutes);
app.use('/api/extensions/themes', themesRoutes);

// Rutas que registran los plugins: /api/plugins/<nombre>/...
// Aceptan formularios HTML clásicos (sin JavaScript) y limitan los envíos públicos.
const pluginPostLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Demasiados envíos. Intenta de nuevo en unos minutos.' },
});
app.use('/api/plugins/:name',
    express.urlencoded({ extended: false, limit: '100kb' }),
    (req: Request, res: Response, next: NextFunction) => (req.method === 'POST' ? pluginPostLimiter(req, res, next) : next()),
    pluginRoutesDispatcher);

// Servir archivos estáticos de forma pública
app.use('/uploads', express.static(config.paths.uploads));

// Archivos estáticos opcionales (favicon.ico, verificaciones de Google, etc.)
app.use(express.static(config.paths.publicDir, { index: false }));

// Panel de administración (build de /admin). Cualquier ruta /admin/* devuelve el index.html de la SPA.
const adminIndex = path.join(config.paths.adminDist, 'index.html');
if (fs.existsSync(adminIndex)) {
    app.use('/admin', express.static(config.paths.adminDist, { index: false }));
    app.get(/^\/admin(\/.*)?$/, (req: Request, res: Response) => {
        res.sendFile(adminIndex);
    });
}


// Rutas de la API inexistentes: JSON, nunca el sitio público
app.use('/api', (req: Request, res: Response) => {
    res.status(404).json({ error: 'Ruta de API no encontrada' });
});

// Sitio público renderizado en el servidor: robots.txt, llms.txt, sitemap.xml, CSS y páginas
app.use(renderRoutes);

// MANEJADOR GLOBAL DE ERRORES (Cumpliendo el Technical Brief)
app.use((err: Error | any, req: Request, res: Response, next: NextFunction) => {
    // Errores de subida (tamaño excedido, demasiados archivos...) son culpa del cliente
    if (err instanceof multer.MulterError) {
        const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
        const message = err.code === 'LIMIT_FILE_SIZE'
            ? `El archivo supera el máximo de ${Math.round(config.maxUploadBytes / 1024 / 1024)} MB`
            : err.message;
        res.status(status).json({ error: message });
        return;
    }

    console.error('[LiteCMS Error]:', err.message);

    const statusCode = err.statusCode || 500;

    // Siempre devolvemos el formato exacto exigido en el documento.
    // En errores 5xx no exponemos el mensaje interno (rutas, SQL, etc.) al cliente.
    res.status(statusCode).json({
        error: statusCode < 500 && err.message ? err.message : 'Error interno del servidor'
    });
});


if (process.env.NODE_ENV !== 'test') {
    const start = async () => {
        await checkDatabaseConnection(); // Verificamos la DB al arrancar
        await runMigrations(); // Instalación nueva o actualización: deja el esquema al día
        await initPlugins(); // Carga los plugins activos
        app.listen(config.port, () => {
            console.log(`🚀 Servidor LiteCMS corriendo en http://localhost:${config.port}`);
            if (fs.existsSync(adminIndex)) {
                console.log(`🛠️  Admin disponible en http://localhost:${config.port}/admin`);
            }
        });
    };

    start().catch((error) => {
        console.error('[LiteCMS] No se pudo iniciar el servidor:', error);
        process.exit(1);
    });
}

export default app;
