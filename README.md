# LiteCMS

CMS ligero en TypeScript para agencias y freelancers: lo mejor de WordPress, sin PHP y sin lo que la mayoría de los sitios no necesita.

- **Render en el servidor:** HTML completo sin JavaScript obligatorio. Buscadores y asistentes de IA ven todo el contenido.
- **SEO y AEO de serie:** meta tags, Open Graph, JSON-LD, `sitemap.xml`, `robots.txt`, `llms.txt`, redirecciones 301 automáticas e imágenes WebP responsive.
- **Tipos de contenido con campos dinámicos:** proyectos, servicios, equipo… definidos desde el admin.
- **Plantillas Handlebars + Tailwind:** el CSS mínimo de cada página se compila automáticamente.
- **Plugins y temas:** hooks al estilo WordPress, activación en caliente y temas instalables.
- **Un solo proceso + SQLite:** corre en un VPS barato, en Docker, en cPanel con Node.js o en Vercel (con Turso, experimental).

## Empezar

```bash
npx create-litecms mi-sitio     # o: git clone … && npm run setup
cd mi-sitio
npm start                       # http://localhost:3000/admin
```

La primera vez, el admin muestra un asistente para crear el administrador. Para empezar con contenido de ejemplo, aplica el tema **Agencia** en *Extensiones → Temas*.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run setup` | Instala dependencias, crea `core/.env` con un secreto aleatorio y compila |
| `npm start` | Servidor de producción (sitio, admin en `/admin` y API) |
| `npm run dev` | Desarrollo: core con recarga + admin con Vite en `:5173/admin/` |
| `npm test` | Tests del servidor |
| `npm run package` | Genera `release/litecms-<versión>.zip` para cPanel, Docker o VPS |

## Documentación

- [Instalación en producción](docs/INSTALL.md): VPS, Docker, cPanel y Vercel
- [Crear plugins](plugins/README.md)
- [Crear temas](themes/README.md)
- [Arquitectura](LITECMS_SKILLS.md)

## Estructura

```
core/      Servidor: API, render SSR, plugins, temas (Express + Knex + SQLite)
admin/     Panel de administración (React + Vite), servido en /admin
shared/    Tipos y validaciones compartidos (Zod)
plugins/   Plugins instalados
themes/    Temas instalables
content/   Datos del sitio: base de datos e imágenes (no versionar)
```
