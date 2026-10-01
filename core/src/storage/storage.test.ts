import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { getStorage } from './index';
import { config } from '../config';

describe('Almacenamiento local', () => {
    const storage = getStorage();
    const filename = `test-storage-${Date.now()}.txt`;

    it('Es el driver por defecto y lo sirve el propio servidor', () => {
        expect(storage.driver).toBe('local');
        expect(storage.publicUrl(filename)).toBeNull();
    });

    it('Guarda, lee y borra archivos en content/uploads', async () => {
        await storage.put(filename, Buffer.from('hola'), 'text/plain');
        expect(fs.existsSync(path.join(config.paths.uploads, filename))).toBe(true);
        expect((await storage.get(filename)).toString()).toBe('hola');

        await storage.delete(filename);
        expect(fs.existsSync(path.join(config.paths.uploads, filename))).toBe(false);
    });

    it('Rechaza nombres con rutas (no se puede escribir fuera de uploads)', async () => {
        await expect(storage.put('../escape.txt', Buffer.from('x'), 'text/plain')).rejects.toThrow('inválido');
        await expect(storage.put('sub/archivo.txt', Buffer.from('x'), 'text/plain')).rejects.toThrow('inválido');
        await expect(storage.put('.htaccess', Buffer.from('x'), 'text/plain')).rejects.toThrow('inválido');
    });
});
