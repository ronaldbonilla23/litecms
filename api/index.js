/**
 * Entrada para Vercel: toda la app (sitio, admin y API) corre como una función.
 * vercel.json redirige todas las rutas aquí. Ver docs/INSTALL.md → Vercel.
 */
module.exports = require('../core/dist/core/src/index.js').default;
