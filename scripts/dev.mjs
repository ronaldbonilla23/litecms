#!/usr/bin/env node
/**
 * Desarrollo: arranca el servidor (core, con recarga) y el admin (Vite) a la vez.
 *   core  → http://localhost:3000        (sitio público y API)
 *   admin → http://localhost:5173/admin/ (con proxy a la API)
 */
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const children = [
  ['core', '\x1b[36m'],
  ['admin', '\x1b[35m'],
].map(([name, color]) => {
  const child = spawn(npm, ['run', 'dev'], { cwd: join(root, name), env: process.env });
  const prefix = (chunk) => chunk.toString().split('\n').filter(Boolean).map((line) => `${color}[${name}]\x1b[0m ${line}`).join('\n');
  child.stdout.on('data', (chunk) => console.log(prefix(chunk)));
  child.stderr.on('data', (chunk) => console.error(prefix(chunk)));
  child.on('exit', (code) => {
    console.log(`[${name}] terminó (${code}). Cerrando todo.`);
    children.forEach((other) => other.kill());
    process.exit(code ?? 0);
  });
  return child;
});

process.on('SIGINT', () => children.forEach((child) => child.kill('SIGINT')));
