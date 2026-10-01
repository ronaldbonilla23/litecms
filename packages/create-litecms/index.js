#!/usr/bin/env node
/**
 * create-litecms: crea un sitio nuevo con LiteCMS.
 *
 *   npx create-litecms mi-sitio
 *   npx create-litecms mi-sitio --ref v0.5.0        (versión concreta)
 *   npx create-litecms mi-sitio --from ../litecms   (desde una copia local)
 *   npx create-litecms mi-sitio --no-install        (solo copiar archivos)
 */
'use strict';

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const REPO = 'ronaldbonilla23/litecms';
// Nunca se copian: dependencias, builds, datos de un sitio existente ni historial git
const EXCLUDE = new Set(['node_modules', 'dist', 'release', 'content', '.git', '.vercel', '.vercel-static', '.env', '.DS_Store', '.qwen']);

const green = (text) => `\x1b[32m${text}\x1b[0m`;
const fail = (message) => {
  console.error(`\x1b[31m✖ ${message}\x1b[0m`);
  process.exit(1);
};

const parseArgs = (argv) => {
  const options = { dir: null, ref: 'main', from: null, install: true };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--ref') options.ref = argv[++i];
    else if (arg === '--from') options.from = argv[++i];
    else if (arg === '--no-install') options.install = false;
    else if (arg === '-h' || arg === '--help') options.help = true;
    else if (!arg.startsWith('-') && !options.dir) options.dir = arg;
    else fail(`Opción desconocida: ${arg}`);
  }
  return options;
};

const copyProject = (from, to) => {
  fs.cpSync(from, to, {
    recursive: true,
    filter: (src) => !EXCLUDE.has(path.basename(src)),
  });
};

const download = async (ref, to) => {
  const url = `https://codeload.github.com/${REPO}/tar.gz/${encodeURIComponent(ref)}`;
  console.log(`Descargando LiteCMS (${ref})...`);
  const response = await fetch(url);
  if (!response.ok) fail(`No se pudo descargar ${url} (${response.status})`);

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'create-litecms-'));
  const archive = path.join(tmp, 'litecms.tar.gz');
  fs.writeFileSync(archive, Buffer.from(await response.arrayBuffer()));
  execFileSync('tar', ['-xzf', archive, '-C', tmp]);

  // El tarball contiene una sola carpeta raíz: litecms-<ref>/
  const extracted = fs.readdirSync(tmp).find((name) => name !== 'litecms.tar.gz');
  if (!extracted) fail('El archivo descargado está vacío');
  copyProject(path.join(tmp, extracted), to);
  fs.rmSync(tmp, { recursive: true, force: true });
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help || !options.dir) {
    console.log('Uso: npx create-litecms <carpeta> [--ref <rama|tag>] [--from <ruta local>] [--no-install]');
    process.exit(options.help ? 0 : 1);
  }

  const [major, minor] = process.versions.node.split('.').map(Number);
  if (major < 20 || (major === 20 && minor < 11)) fail(`Se necesita Node.js 20.11 o superior (tienes ${process.versions.node})`);

  const target = path.resolve(options.dir);
  if (fs.existsSync(target) && fs.readdirSync(target).length > 0) fail(`La carpeta ${options.dir} ya existe y no está vacía`);
  fs.mkdirSync(target, { recursive: true });

  if (options.from) {
    const source = path.resolve(options.from);
    if (!fs.existsSync(path.join(source, 'core', 'package.json'))) fail(`${options.from} no parece una copia de LiteCMS`);
    console.log(`Copiando LiteCMS desde ${source}...`);
    copyProject(source, target);
  } else {
    await download(options.ref, target);
  }

  if (options.install) {
    execFileSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'setup'], { cwd: target, stdio: 'inherit', shell: process.platform === 'win32' });
  }

  const relative = path.relative(process.cwd(), target) || '.';
  console.log(`
${green('✔ Sitio creado en')} ${relative}

  cd ${relative}
${options.install ? '' : '  npm run setup\n'}  npm start                 → http://localhost:3000/admin
  npm run dev               → desarrollo (admin con recarga en caliente)

  Guía de instalación en producción: docs/INSTALL.md
`);
};

main().catch((error) => fail(error.message));
