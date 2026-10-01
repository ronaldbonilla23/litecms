import knex, { type Knex } from 'knex';
import path from 'path';
import fs from 'fs';
import { config } from './config';

// La base de datos vive en /content, fuera del código del servidor.
const isTestEnv = process.env.NODE_ENV === 'test';

if (!isTestEnv && !fs.existsSync(config.paths.content)) {
    fs.mkdirSync(config.paths.content, { recursive: true });
}

const db = knex({
    client: 'sqlite3',
    connection: {
        filename: isTestEnv ? ':memory:' : config.paths.database, // Usar SQLite en memoria para tests
    },
    useNullAsDefault: true, // Configuración obligatoria de Knex para SQLite
});

// Función de prueba para verificar que la conexión es exitosa
export const checkDatabaseConnection = async () => {
    try {
        // Hacemos una consulta muy básica: pedirle a SQLite la versión actual
        const result = await db.raw('SELECT sqlite_version() as version');
        console.log(`📦 Base de datos LiteCMS conectada (SQLite v${result[0].version})`);
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
