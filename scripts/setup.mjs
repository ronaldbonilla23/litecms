#!/usr/bin/env node
/**
 * Instalación en un paso: npm run setup
 *   1. Instala dependencias de core y admin
 *   2. Crea core/.env con un JWT_SECRET aleatorio (si no existe)
 *   3. Compila admin y core
 * Después: npm start → http://localhost:3000/admin para crear el administrador.
 */
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const run = (command, cwd = root) => execSync(command, { cwd, stdio: 'inherit' });
const step = (text) => console.log(`\n\x1b[32m▸ ${text}\x1b[0m`);

const [major, minor] = process.versions.node.split('.').map(Number);
if (major < 20 || (major === 20 && minor < 11)) {
  console.error(`LiteCMS necesita Node.js 20.11 o superior (tienes ${process.versions.node}).`);
  process.exit(1);
}

step('Instalando dependencias (core)');
run('npm ci', join(root, 'core'));
step('Instalando dependencias (admin)');
run('npm ci', join(root, 'admin'));

const envPath = join(root, 'core', '.env');
if (!existsSync(envPath)) {
  step('Creando core/.env');
  const template = readFileSync(join(root, 'core', '.env.example'), 'utf8');
  const secret = randomBytes(48).toString('base64url');
  writeFileSync(envPath, template.replace(/^JWT_SECRET=.*$/m, `JWT_SECRET=${secret}`));
} else {
  console.log('\ncore/.env ya existe: se conserva.');
}

step('Compilando');
run('npm run build');

console.log(`
\x1b[32m✔ LiteCMS listo.\x1b[0m

  Arrancar:  npm start
  Admin:     http://localhost:3000/admin  (la primera vez te pedirá crear el administrador)
  Sitio:     http://localhost:3000
`);
