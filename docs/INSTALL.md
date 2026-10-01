# Instalar LiteCMS

LiteCMS necesita **Node.js 20.11 o superior**. Los datos (base de datos SQLite e imágenes) viven en la carpeta `content/`. Esa carpeta es lo único que hay que respaldar.

Elige la forma que encaje con tu hosting:

| Opción | Ideal para | Base de datos | Imágenes |
|---|---|---|---|
| [VPS / servidor propio](#vps-o-servidor-propio) | Hetzner, DigitalOcean, Hostinger VPS… | SQLite (archivo) | Disco |
| [Docker](#docker) | Cualquier servidor con Docker, Railway, Render, Fly | SQLite (volumen) | Disco (volumen) |
| [cPanel con Node.js](#cpanel-setup-nodejs-app) | Hosting compartido con "Setup Node.js App" | SQLite (archivo) | Disco |
| [Vercel](#vercel-experimental) | Serverless, sin servidor que mantener | Turso (libSQL) | Vercel Blob o R2 |

Después de instalar, abre `https://tu-dominio/admin`. La primera vez se muestra el asistente para crear el administrador.

---

## VPS o servidor propio

```bash
git clone https://github.com/ronaldbonilla23/litecms.git mi-sitio
cd mi-sitio
npm run setup     # instala, crea core/.env con un secreto aleatorio y compila
npm start         # http://localhost:3000
```

Edita `core/.env` con tu dominio:

```ini
SITE_URL=https://midominio.com
SITE_NAME=Mi Sitio
TRUST_PROXY=1        # si hay Nginx/Caddy delante
```

Para mantenerlo en marcha usa un gestor de procesos (por ejemplo `pm2 start "npm start" --name litecms`) y un proxy con HTTPS (Caddy o Nginx) hacia el puerto 3000.

**Actualizar:** `git pull && npm run setup && pm2 restart litecms`. Las migraciones de la base de datos se aplican solas al arrancar.

---

## Docker

```bash
JWT_SECRET=$(openssl rand -base64 48) SITE_URL=https://midominio.com docker compose up -d
```

O sin Compose:

```bash
docker build -t litecms .
docker run -d -p 3000:3000 \
  -e JWT_SECRET="cadena-larga-y-aleatoria" \
  -e SITE_URL="https://midominio.com" \
  -v litecms-content:/app/content \
  litecms
```

El volumen `/app/content` guarda la base de datos y las imágenes: no lo borres al actualizar la imagen.

---

## cPanel ("Setup Node.js App")

Muchos hostings compartidos con cPanel y CloudLinux (Hostinger, Namecheap, A2 y otros) incluyen **Setup Node.js App**.

1. En tu computadora ejecuta `npm run package`. Genera `release/litecms-<versión>.zip`.
2. En cPanel → **Administrador de archivos**, crea una carpeta (por ejemplo `litecms`) fuera de `public_html`, sube el ZIP y extráelo.
3. En cPanel → **Setup Node.js App** → **Create Application**:
   - *Node.js version*: 20 o superior
   - *Application root*: `litecms`
   - *Application URL*: tu dominio
   - *Application startup file*: `app.js`
4. En la misma pantalla añade las variables de entorno:
   - `JWT_SECRET`: una cadena larga y aleatoria
   - `SITE_URL`: `https://midominio.com`
   - `TRUST_PROXY`: `1`
5. Pulsa **Run NPM Install** y luego **Restart**.
6. Abre `https://midominio.com/admin`.

**Actualizar:** sube el nuevo ZIP, extráelo sobre la carpeta (sin borrar `content/`), pulsa **Run NPM Install** y **Restart**.

> Si tu hosting no ofrece "Setup Node.js App", LiteCMS no puede ejecutarse ahí. Usa un VPS económico o Vercel.

---

## Vercel (experimental)

En Vercel no hay disco permanente, así que la base de datos y las imágenes tienen que vivir fuera:

- **Base de datos:** [Turso](https://turso.tech) (libSQL, compatible con SQLite y con plan gratuito).
- **Imágenes:** Vercel Blob (Storage → Blob en tu proyecto) o Cloudflare R2.

1. Crea la base de datos en Turso y copia su URL y su token.
2. Importa el repositorio en Vercel. `vercel.json` ya define la instalación, el build y las rutas.
3. Variables de entorno del proyecto:

```ini
JWT_SECRET=cadena-larga-y-aleatoria
SITE_URL=https://tu-proyecto.vercel.app
DATABASE_URL=libsql://tu-base.turso.io
DATABASE_AUTH_TOKEN=token-de-turso
# Vercel Blob: al conectar un Blob store al proyecto se crea BLOB_READ_WRITE_TOKEN
```

4. Despliega y abre `/admin`.

**Estado:** la suite de tests pasa completa con el driver libSQL usando archivos locales. El despliegue real en Vercel + Turso todavía no se ha verificado de punta a punta. Pruébalo primero en un sitio que no sea crítico.

En serverless cada instancia tiene su propia caché de páginas en memoria. Las páginas se cachean además en el CDN de Vercel durante 60 segundos, así que un cambio puede tardar hasta un minuto en verse.

---

## Variables de entorno

| Variable | Por defecto | Descripción |
|---|---|---|
| `JWT_SECRET` | — (obligatoria) | Secreto para las sesiones del admin |
| `PORT` | `3000` | Puerto HTTP |
| `SITE_URL` | `http://localhost:3000` | URL pública (sitemap, canonical, Open Graph) |
| `SITE_NAME` | `LiteCMS` | Nombre del sitio (título, JSON-LD) |
| `SITE_LANG` | `es` | Idioma (`<html lang>`) |
| `SITE_INDEXABLE` | `true` | `false` en staging: robots.txt bloquea todo |
| `TRUST_PROXY` | — | `1` si hay un proxy delante (cPanel, Nginx, Docker) |
| `CORS_ORIGINS` | localhost | Solo para desarrollo con el admin en otro puerto |
| `MAX_UPLOAD_MB` | `10` | Tamaño máximo de imagen |
| `DATABASE_URL` | — | `libsql://…` para Turso (si no se define: SQLite local) |
| `DATABASE_AUTH_TOKEN` | — | Token de Turso |
| `STORAGE_DRIVER` | `local` | `local`, `s3` o `vercel-blob` |
| `S3_BUCKET`, `S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_URL` | — | Almacenamiento S3 compatible (Cloudflare R2: `S3_ENDPOINT=https://<cuenta>.r2.cloudflarestorage.com`) |
| `BLOB_READ_WRITE_TOKEN` | — | Vercel Blob (si existe, se usa automáticamente) |

## Recuperar el acceso

Si olvidas la contraseña del administrador:

```bash
# En el paquete de producción (cPanel/Docker/VPS con release):
npm run admin -- tu@email.com nueva-contraseña-segura
# En el repositorio (desarrollo):
npm run admin --prefix core -- tu@email.com nueva-contraseña-segura
```
