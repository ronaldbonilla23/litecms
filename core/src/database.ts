import knex from 'knex';
import path from 'path';

// Resolvemos la ruta para que el archivo se guarde en la carpeta /content 
// que creamos en la raíz del proyecto, fuera del código del servidor.
const dbPath = path.join(__dirname, '../../content/litecms.sqlite');
const isTestEnv = process.env.NODE_ENV === 'test';

const db = knex({
    client: 'sqlite3',
    connection: {
        filename: isTestEnv ? ':memory:' : dbPath, // Usar SQLite en memoria para tests
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

export default db;