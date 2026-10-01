# Plugins de LiteCMS

Un plugin es una carpeta dentro de `plugins/` con dos archivos:

```
plugins/mi-plugin/
├── plugin.json
└── index.js
```

Se activa, desactiva y configura desde **Admin → Extensiones**, sin reiniciar el servidor.

> Igual que en WordPress, un plugin es código de confianza: se ejecuta en el servidor con acceso a la base de datos. Instala solo plugins que conozcas.

## plugin.json

```json
{
  "name": "mi-plugin",
  "title": "Mi plugin",
  "version": "1.0.0",
  "description": "Qué hace, en una frase.",
  "author": "Tu agencia",
  "settings": [
    { "key": "api_key", "label": "API key", "type": "text", "required": true }
  ],
  "data": [
    { "collection": "registros", "title": "Registros", "columns": ["nombre", "email"] }
  ]
}
```

- `name` debe coincidir con el nombre de la carpeta.
- `settings` usa el mismo formato que los campos de los tipos de contenido (`text`, `textarea`, `number`, `boolean`, `select`, `url`, `email`, …). El admin genera el formulario y valida los valores.
- `data` declara colecciones guardadas con `api.storage` que el admin muestra como tabla.

## index.js

```js
exports.register = async (api) => {
  const settings = await api.settings.get();

  // Filtro: añadir etiquetas al <head> de las páginas públicas
  api.addFilter('render.head', (tags, context) => [...tags, '<meta name="ejemplo" content="1">']);

  // Acción: reaccionar cuando se guarda una entrada
  api.addAction('entry.saved', (entry) => api.log('Guardada', entry.title));

  // Helper para plantillas: {{{saludo "Ana"}}}
  api.registerTemplateHelper('saludo', (nombre) => api.html(`<b>Hola ${api.escape(nombre)}</b>`));

  // Ruta en /api/plugins/mi-plugin/ping (pública; sin { public: true } exige sesión)
  api.routes.get('/ping', (req, res) => res.json({ ok: true }), { public: true });
};
```

## API disponible

| Método | Uso |
|---|---|
| `api.addFilter(hook, fn, prioridad?)` | `render.head` y `render.bodyEnd` (arrays de HTML), `render.html` (documento completo). `fn(valor, contexto)` devuelve el nuevo valor. El contexto es `{ kind, path }`, con `kind` igual a `page`, `post`, `entry`, `archive` o `404`. |
| `api.addAction(hook, fn)` | `content.changed`, `entry.saved`, `entry.deleted` |
| `api.registerTemplateHelper(nombre, fn)` | Helper de Handlebars. Debe ser síncrono. Para devolver HTML usa `api.html()` y escapa los datos con `api.escape()`. |
| `api.routes.get/post/put/delete(ruta, handler, { public })` | Rutas en `/api/plugins/<nombre>/…`. Aceptan JSON y formularios HTML. Los POST públicos tienen límite de envíos. |
| `api.settings.get()` | Ajustes guardados desde el admin. Al guardarlos, el plugin se recarga. |
| `api.storage.add/list/remove` | Guardar registros sin crear tablas propias. |
| `api.db` | Knex con acceso completo a la base de datos. |
| `api.config` | `siteUrl`, `siteName`, `siteLang` |
| `api.log(...)` | Log con el nombre del plugin. |

Un error dentro de un plugin se registra en la consola y no tumba el sitio. Si `register` falla, el plugin no se activa y se deshace lo que había registrado.

## Ejemplos incluidos

- `contact-form`: formulario sin JavaScript, anti-spam, mensajes en el admin y webhook opcional.
- `analytics`: Google Analytics 4 o Plausible mediante `render.head`.
