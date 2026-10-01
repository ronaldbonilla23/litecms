import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

/**
 * Configuración central de LiteCMS.
 * Todas las rutas y URLs salen de aquí para que el mismo código funcione
 * en desarrollo (ts-node), compilado (dist/) y en cualquier hosting.
 */

// Buscamos la raíz del proyecto subiendo desde este archivo hasta encontrar core/package.json.
// (core/dist también contiene core/ y shared/, por eso se exige el package.json)
// Así funciona igual desde src/ (ts-node) que desde dist/ (compilado).
const findProjectRoot = (): string => {
    if (process.env.LITECMS_ROOT) return path.resolve(process.env.LITECMS_ROOT);

    let dir = __dirname;
    while (dir !== path.dirname(dir)) {
        if (fs.existsSync(path.join(dir, 'core', 'package.json')) && fs.existsSync(path.join(dir, 'shared'))) {
            return dir;
        }
        dir = path.dirname(dir);
    }
    throw new Error('No se encontró la raíz de LiteCMS. Define LITECMS_ROOT.');
};

const ROOT = findProjectRoot();

// Variables de entorno: .env del directorio actual y core/.env (las ya definidas no se pisan).
// Así `npm start` funciona igual desde la raíz del proyecto que desde /core.
dotenv.config({ path: [path.join(process.cwd(), '.env'), path.join(ROOT, 'core', '.env')], quiet: true });

const parseList = (value: string | undefined, fallback: string[]): string[] =>
    value ? value.split(',').map((item) => item.trim()).filter(Boolean) : fallback;

export const config = {
    root: ROOT,
    port: Number(process.env.PORT) || 3000,
    siteUrl: (process.env.SITE_URL || 'http://localhost:3000').replace(/\/$/, ''),
    siteName: process.env.SITE_NAME || 'LiteCMS',
    siteLang: process.env.SITE_LANG || 'es',
    // false en entornos de prueba/staging: robots.txt bloquea todo y las páginas llevan noindex
    indexable: process.env.SITE_INDEXABLE !== 'false',
    corsOrigins: parseList(process.env.CORS_ORIGINS, [
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:5175',
    ]),
    migrationExtension: path.extname(__filename), // '.ts' o '.js'
    maxUploadBytes: (Number(process.env.MAX_UPLOAD_MB) || 10) * 1024 * 1024,
    paths: {
        content: path.join(ROOT, 'content'),
        database: path.join(ROOT, 'content', 'litecms.sqlite'),
        uploads: path.join(ROOT, 'content', 'uploads'),
        publicDir: path.join(ROOT, 'core', 'public'),
        adminDist: path.join(ROOT, 'admin', 'dist'),
        plugins: process.env.LITECMS_PLUGINS_DIR || path.join(ROOT, 'plugins'),
        themes: process.env.LITECMS_THEMES_DIR || path.join(ROOT, 'themes'),
        // Relativo a este archivo: vale para src/*.ts (ts-node) y dist/*.js (compilado)
        migrations: path.join(__dirname, 'database', 'migrations'),
    },
};
