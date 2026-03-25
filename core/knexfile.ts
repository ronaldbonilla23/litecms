import type { Knex } from "knex";
import path from "path";

const config: { [key: string]: Knex.Config } = {
    development: {
        client: "sqlite3",
        connection: {
            // Apuntamos a la misma ruta que configuramos en database.ts
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