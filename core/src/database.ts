import knex, { type Knex } from 'knex';
import path from 'path';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';
import { config } from './config';
import Client_Libsql from './database/libsqlDialect';

/**
 * Conexión a la base de datos:
 *   - Por defecto: SQLite en content/litecms.sqlite (VPS, Docker, cPanel).
 *   - DATABASE_URL con libsql://, wss://, https:// o file: → libSQL / Turso (EXPERIMENTAL,
 *     pensado para serverless como Vercel). El token va en DATABASE_AUTH_TOKEN.
 *   - Tests: SQLite en memoria (o libSQL en un archivo temporal con LITECMS_TEST_DRIVER=libsql).
 */
const isTestEnv = process.env.NODE_ENV === 'test';

const libsqlUrl = (): string | null => {
    if (isTestEnv && process.env.LITECMS_TEST_DRIVER === 'libsql') {
        // Un archivo por módulo de test: cada archivo de tests tiene su propia BD
        return `file:${path.join(os.tmpdir(), `litecms-test-${process.pid}-${crypto.randomUUID()}.db`)}`;
    }
    const url = isTestEnv ? null : process.env.DATABASE_URL;
    if (!url) return null;
    if (!/^(libsql|wss?|https?|file):/.test(url)) {
        throw new Error('DATABASE_URL debe empezar con libsql://, wss://, https:// o file:');
    }
    const token = process.env.DATABASE_AUTH_TOKEN;
    if (!token) return url;
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}authToken=${encodeURIComponent(token)}`;
};

const remoteUrl = libsqlUrl();

if (!isTestEnv && !remoteUrl && !fs.existsSync(config.paths.content)) {
    fs.mkdirSync(config.paths.content, { recursive: true });
}

const db = knex(remoteUrl
    ? {
        client: Client_Libsql as unknown as typeof Knex.Client,
        connection: { filename: remoteUrl },
        useNullAsDefault: true,
    }
    : {
        client: 'sqlite3',
        connection: {
            filename: isTestEnv ? ':memory:' : config.paths.database, // Usar SQLite en memoria para tests
        },
        useNullAsDefault: true, // Configuración obligatoria de Knex para SQLite
    });

export const databaseDriver = remoteUrl ? 'libsql' : 'sqlite';

// Función de prueba para verificar que la conexión es exitosa
export const checkDatabaseConnection = async () => {
    try {
        // Hacemos una consulta muy básica: pedirle a SQLite la versión actual
        const result = await db.raw('SELECT sqlite_version() as version');
        console.log(`📦 Base de datos LiteCMS conectada (${databaseDriver === 'libsql' ? 'libSQL' : 'SQLite'} v${result[0].version})`);
    } catch (error) {
        console.error('[LiteCMS DB Error]: No se pudo conectar a SQLite', error);
    }
};

/**
 * Fuente de migraciones que funciona igual en src/ (.ts) y dist/ (.js).
 * Knex registra el nombre del archivo en knex_migrations; usamos siempre el nombre
 * canónico ".ts" para que una BD creada en desarrollo siga valiendo en producción.
 */
const migrationSource: Knex.MigrationSource<string> = {
    getMigrations: async () => {
        const files = await fs.promises.readdir(config.paths.migrations);
        return files
            .filter((file) => file.endsWith(config.migrationExtension) && !file.endsWith('.d.ts'))
            .sort();
    },
    getMigrationName: (file) => file.replace(/\.js$/, '.ts'),
    getMigration: async (file) => import(path.join(config.paths.migrations, file)),
};

/**
 * Aplica las migraciones pendientes al arrancar.
 * Así una instalación nueva queda lista sin ejecutar comandos a mano.
 */
export const runMigrations = async (): Promise<void> => {
    const [, applied] = await db.migrate.latest({ migrationSource });
    if (applied.length > 0) {
        console.log(`🗄️  Migraciones aplicadas: ${applied.length}`);
    }
};

export default db;
