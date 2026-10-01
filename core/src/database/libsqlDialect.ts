/**
 * Dialecto de Knex para libSQL / Turso.
 * Reutiliza el dialecto SQLite de Knex y cambia el driver por @libsql/sqlite3,
 * que imita la API de sqlite3 pero conecta con archivos locales o servidores libSQL.
 * (Equivale a @libsql/knex-libsql, que no es compatible con los "exports" de Knex 3.)
 */
/* eslint-disable @typescript-eslint/no-require-imports */
const Client_SQLite3 = require('knex/lib/dialects/sqlite3/index');

class Client_Libsql extends Client_SQLite3 {
    _driver() {
        return require('@libsql/sqlite3');
    }
}

Object.assign(Client_Libsql.prototype, { dialect: 'libsql', driverName: 'libsql' });

export default Client_Libsql;
