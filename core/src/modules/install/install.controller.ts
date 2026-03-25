import type { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import db from '../../database'; // Importamos nuestra conexión a SQLite

export const installCMS = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { name, email, password } = req.body;

        // 1. Validamos que el cliente envíe todos los datos
        if (!name || !email || !password) {
            res.status(400).json({ error: 'Faltan datos obligatorios (name, email, password)' });
            return;
        }

        // 2. Seguridad: Verificamos si ya hay un admin. 
        // Si ya existe uno, bloqueamos la ruta para que nadie formatee el CMS de tu cliente.
        const existingUsers = await db('users').count('* as count').first();
        if (existingUsers && Number(existingUsers.count) > 0) {
            res.status(403).json({ error: 'LiteCMS ya se encuentra instalado en este servidor' });
            return;
        }

        // 3. Encriptamos la contraseña (Rasterizamos los vectores)
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 4. Guardamos el primer administrador en SQLite
        await db('users').insert({
            name,
            email,
            password: hashedPassword,
            role: 'admin'
        });

        res.status(201).json({
            message: 'Instalación exitosa',
            user: { name, email, role: 'admin' }
        });
    } catch (error) {
        // Si la base de datos falla, pasamos el error a nuestro manejador global
        next(error);
    }
};