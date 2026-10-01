#!/usr/bin/env node
/**
 * Genera el paquete de distribución: npm run package
 *
 *   release/litecms/            ← carpeta lista para producción
 *   release/litecms-<versión>.zip
 *
 * Contenido: servidor compilado, admin compilado, plugins, temas y un app.js de
 * arranque. En el servidor solo hace falta Node.js:
 *   npm ci --omit=dev && node app.js
 * Es el mismo paquete para cPanel (Setup Node.js App), Docker y cualquier VPS.
 *
 * Opciones:  --skip-build  usa los builds existentes
 *            --no-zip      no genera el .zip (lo usa el Dockerfile)
 */
import { execSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = new Set(process.argv.slice(2));
const run = (command, cwd = root) => execSync(command, { cwd, stdio: 'inherit' });

const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const releaseRoot = join(root, 'release');
const out = join(releaseRoot, 'litecms');

if (!args.has('--skip-build')) run('npm run build');
for (const required of ['core/dist/core/src/index.js', 'admin/dist/index.html']) {
  if (!existsSync(join(root, required))) {
    console.error(`Falta ${required}. Ejecuta primero npm run build.`);
    process.exit(1);
  }
}

console.log(`\nEmpaquetando LiteCMS ${version}...`);
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const copy = (from, to = from, options = {}) => cpSync(join(root, from), join(out, to), { recursive: true, ...options });

// Servidor compilado (incluye shared/ compilado) y su package.json como marca de raíz
copy('core/dist', 'core/dist', { filter: (src) => !src.endsWith('.map') });
copy('core/package.json');
copy('core/.env.example');
copy('admin/dist');
mkdirSync(join(out, 'shared'), { recursive: true });
writeFileSync(join(out, 'shared', 'README.md'), 'Código compartido (compilado en core/dist/shared).\n');

// Extensiones (sin node_modules locales de plugins, si los hubiera)
const noNodeModules = { filter: (src) => !src.includes('node_modules') };
copy('plugins', 'plugins', noNodeModules);
copy('themes', 'themes', noNodeModules);
copy('LITECMS_SKILLS.md', 'docs/ARQUITECTURA.md');

// Datos: carpeta vacía (la BD y las imágenes se crean al usar el CMS)
mkdirSync(join(out, 'content', 'uploads'), { recursive: true });
writeFileSync(join(out, 'content', 'uploads', '.gitkeep'), '');

// package.json de producción: dependencias de core, arranque con app.js.
// Se conservan las devDependencies para que coincida con el lockfile (se instalan con --omit=dev).
const corePackage = JSON.parse(readFileSync(join(root, 'core', 'package.json'), 'utf8'));
writeFileSync(join(out, 'package.json'), JSON.stringify({
  ...corePackage,
  name: 'litecms-site',
  version,
  description: 'LiteCMS listo para producción',
  main: 'app.js',
  engines: { node: '>=20.11' },
  scripts: {
    start: 'node app.js',
    'media:variants': 'node core/dist/core/src/scripts/generate-media-variants.js',
    admin: 'node core/dist/core/src/scripts/create-admin.js',
  },
}, null, 2) + '\n');
copy('core/package-lock.json', 'package-lock.json');

// Punto de entrada (cPanel/Passenger busca app.js por defecto)
writeFileSync(join(out, 'app.js'), `/**
 * Arranque de LiteCMS en producción.
 * cPanel (Setup Node.js App): "Application startup file" = app.js
 */
require('./core/dist/core/src/index.js');
`);

copy('docs/INSTALL.md', 'INSTALL.md');

if (!args.has('--no-zip')) {
  const zipName = `litecms-${version}.zip`;
  rmSync(join(releaseRoot, zipName), { force: true });
  run(`zip -qr ../${zipName} .`, out);
  console.log(`\n✔ release/${zipName}`);
}
console.log('✔ release/litecms/ (instalar con: npm ci --omit=dev && node app.js)');
