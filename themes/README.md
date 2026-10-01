# Temas de LiteCMS

Un tema es una carpeta dentro de `themes/` con un `theme.json` y archivos de plantilla (`.hbs` o `.html`). Se aplica desde **Admin → Extensiones → Temas**.

Aplicar un tema:

- **Instala sus plantillas.** Su header y su footer pasan a ser los activos del sitio. Al reaplicarlo, las plantillas se actualizan.
- **Cambia el Design System:** colores y fuentes.
- **Crea sus tipos de contenido** con entradas de ejemplo, solo si no existen.
- **Crea sus páginas iniciales**, solo si no existen.
- **Activa los plugins recomendados.**

Nunca sobrescribe páginas ni tipos de contenido que ya existan.

## theme.json (resumen)

```json
{
  "name": "mi-tema",
  "title": "Mi tema",
  "version": "1.0.0",
  "settings": { "primary_color": "#C2F86C", "background_color": "#0e0e0e" },
  "plugins": ["contact-form"],
  "templates": [
    { "key": "header", "name": "Header", "type": "header", "file": "templates/header.hbs" },
    { "key": "proyecto", "name": "Proyecto", "type": "single", "file": "templates/proyecto.hbs" }
  ],
  "content_types": [
    {
      "name": "Proyectos", "singular_name": "Proyecto", "slug": "proyectos", "url_prefix": "/proyectos",
      "has_archive": true, "single_template": "proyecto",
      "fields": [{ "key": "cliente", "label": "Cliente", "type": "text" }],
      "entries": [{ "title": "Casa Azul", "data": { "cliente": "Familia Pérez" } }]
    }
  ],
  "pages": [
    { "title": "Inicio", "slug": "/", "file": "pages/home.hbs", "header": "header" }
  ]
}
```

Los tipos de contenido y las páginas referencian las plantillas por su `key`. Ver el tema de ejemplo `agencia/`.

## Variables en las plantillas

- **Todas:** `{{site.name}}`, `{{site.url}}`, `{{site.year}}`, `{{#each (query "slug-del-tipo" limit=3)}}…{{/each}}`, `{{formatDate fecha}}`, `(eq a b)`.
- **Páginas:** `{{page.title}}`, `{{page.fields.*}}`.
- **Entrada (`single`):** `{{entry.title}}`, `{{entry.url}}`, `{{entry.fields.clave}}`. Las imágenes son objetos `{ url, alt, width, height, srcset }`, y el texto enriquecido se escribe con `{{{ }}}`.
- **Archivo (`archive`):** `{{type.name}}`, `{{type.description}}`, `{{#each entries}}…{{/each}}`.

El CSS se genera automáticamente con Tailwind a partir de las clases que uses. El color `primary` y las fuentes `font-header` y `font-sans` salen del Design System.
