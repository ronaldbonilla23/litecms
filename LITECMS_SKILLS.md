🛸 LiteCMS: Master Identity & Architecture Skill
🎨 1. Sistema de Identidad Visual (UI/UX)
Para mantener la coherencia de Visual Designer, todos los nuevos componentes deben seguir estas reglas:

Paleta de Colores:

Background: #0e0e0e (Fondo principal)

Surface: #141414 (Cards, Sidebar, Secciones)

Accent/Primary: #C2F86C (Verde Lima Eléctrico)

Border/Outline: 1px solid rgba(255, 255, 255, 0.05)

Tipografía:

Headlines: Plus Jakarta Sans (Black/Bold, Tracking Tighter)

Body: Inter (Medium/Regular)

Componentes Clave:

Border Radius: 2.5rem (Contenedores), 1.5rem (Botones/Inputs).

Iconografía: Únicamente Flaticon UIcons (Regular Rounded: fi-rr-[nombre]).

Efectos: Animaciones suaves (animate-in, fade-in, duration-500), Glassmorphism sutil y bordes de alto contraste.

🏗️ 2. Arquitectura de Software
Estructura técnica que debe respetarse para evitar errores de importación:

Frontend (/admin):

src/api/axios.ts: Instancia de Axios con interceptor de JWT.

src/components/layout/: Header, Sidebar (Dock Flotante).

src/pages/: Dashboard, Login, MediaLibrary (ya funcionales).

Backend (/core):

Base de Datos: SQLite gestionada con Knex.

Endpoints:

POST /api/auth/login (Auth)

GET/POST/DELETE /api/media (Gestión de archivos)

PUT /api/media/:id/seo (Optimización SEO)

GET/POST/PUT/DELETE /api/pages (CRUD de contenidos)

🌐 Sitio público (SSR en /core, sin app frontend):
- `core/src/modules/render/`: toda URL que no sea /api, /admin o /uploads se renderiza en el servidor a HTML completo (SEO, Open Graph, JSON-LD, CSS). No crear una SPA para el sitio público: los bots de IA no ejecutan JavaScript.
- Rutas: `/` y `/:slug` → páginas publicadas; `/blog/:slug` → posts; slug inexistente → redirección 301 registrada o 404 (página "/404" si existe).
- CSS: Tailwind compilado por página/post, guardado en `compiled_css` y servido en `/css/page-:id.css?v=hash`. Cambios en plantillas o theme settings lo invalidan.
- Caché: el HTML se cachea en memoria y se vacía con cualquier escritura exitosa en /api.
- SEO/AEO: `/robots.txt`, `/llms.txt`, `/sitemap.xml`; redirecciones 301 automáticas al cambiar un slug; `<img>` de /uploads reciben srcset WebP.
- El contenido de posts se sanitiza al guardar (`services/sanitize.service.ts`); plantillas y páginas son HTML de confianza del admin.

🧩 Tipos de contenido (campos dinámicos):
- Definición compartida en `shared/contentTypes.ts`: tipos de campo, `ContentTypeSchema`, `EntrySchema` y `buildEntryDataSchema(fields)`. La API (core) y el formulario del admin validan con el mismo schema; no duplicar validaciones.
- Tablas `content_types` (campos en JSON) y `entries` (valores en `data` JSON). API: `/api/content-types` y `/api/entries?type=slug` (requieren sesión).
- URLs públicas: `url_prefix` del tipo → archivo en `/prefijo` y entradas en `/prefijo/:slug`. Una página con la misma URL tiene prioridad.
- Plantillas de tipo `single` (`{{entry.title}}`, `{{entry.fields.clave}}`, imágenes como `{{entry.fields.foto.url}}`) y `archive` (`{{#each entries}}`). Sin plantilla se usa una por defecto.
- Helpers Handlebars: `{{#each (query "slug-del-tipo" limit=3)}}` en cualquier plantilla o página, `{{formatDate fecha "long"}}`, `(eq a b)`. `query` se precarga antes de renderizar (Handlebars no admite helpers asíncronos).
- Páginas y posts siguen siendo tipos integrados con tablas propias.

🚀 3. Flujos de Trabajo (Workflow Skills)
Reglas para la generación de nuevo código:

Skill "NewPage": Crear páginas usando la estructura de Dashboard (Layout con Sidebar y Header persistentes).

Skill "DataBinding": Siempre usar useEffect para cargar datos, manejar estados de loading y errores visuales con estilo minimalista.

Skill "Responsive": Todo componente debe ser mobile-friendly usando el sistema de rejilla de Tailwind.


🎯 4. Próximo Objetivo: Page Editor
El editor debe permitir:
- Campos de Texto/Título con tipografía Plus Jakarta Sans.
- Selector de imágenes que abra un Modal conectado a la Media Library existente.
- Guardado automático o mediante botón flotante estilo "Rocket Launch".

🔍 5. Skill de Introspección (Base de Datos y Tipos)
Reglas para la integridad de datos entre Backend y Frontend:

Ubicación Central:
Toda definición de datos reside en `shared/types.ts`. Nunca redeclarar interfaces en componentes locales.

Sincronía con DB:
- Analizar migraciones (`core/src/database/migrations/`) para cambios.
- Actualizar `Page`, `Media` o `User` en `shared/types.ts`.
- Usar `readonly id: number` y tipos literales para estados (ej: `status: 'draft' | 'published'`).

Validación Universal (Zod):
- Usar esquemas de Zod para validación de Payloads en Express.
- Usar los mismos esquemas para validación de formularios en React.

Documentación:
- JSDoc obligatorio para cada propiedad (mejor autocompleto).