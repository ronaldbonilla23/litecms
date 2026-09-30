import type { Knex } from "knex";
import path from "path";

// Usado solo por la CLI de Knex (npx knex migrate:make ...).
// En ejecución, core/src/database.ts aplica las migraciones automáticamente.
const config: { [key: string]: Knex.Config } = {
    development: {
        client: "sqlite3",
        connection: {
            filename: path.join(__dirname, "../content/litecms.sqlite"),
        },
        useNullAsDefault: true,
        migrations: {
            directory: path.join(__dirname, "src/database/migrations"),
        },
    },
};

// Usamos module.exports para garantizar compatibilidad con la consola
module.exports = config;
