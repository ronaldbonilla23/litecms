import type { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import db from '../../database'; // Importamos nuestra conexión a SQLite
import { InstallSchema } from '../../../../shared/types';

const isInstalled = async (): Promise<boolean> => {
    const existingUsers = await db('users').count('* as count').first();
    return Boolean(existingUsers && Number(existingUsers.count) > 0);
};

// GET /api/install/status - El admin lo consulta para decidir si mostrar el asistente de instalación
export const getInstallStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        res.json({ installed: await isInstalled() });
    } catch (error) {
        next(error);
    }
};

export const installCMS = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        // 1. Validamos los datos con Zod
        const validation = InstallSchema.safeParse(req.body);
        if (!validation.success) {
            res.status(400).json({
                error: 'Datos de instalación inválidos',
                details: validation.error.flatten().fieldErrors
            });
            return;
        }

        // 2. Seguridad: si ya hay un admin, bloqueamos la ruta para que nadie formatee el CMS de tu cliente.
        if (await isInstalled()) {
            res.status(403).json({ error: 'LiteCMS ya se encuentra instalado en este servidor' });
            return;
        }

        const { name, email, password } = validation.data;

        // 3. Encriptamos la contraseña
        const hashedPassword = await bcrypt.hash(password, 10);

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
