import type { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../../database';

export const loginUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            res.status(400).json({ error: 'Email y contraseña son obligatorios' });
            return;
        }

        const user = await db('users').where({ email }).first();

        if (!user) {
            res.status(401).json({ error: 'Credenciales inválidas' });
            return;
        }

        const isValidPassword = await bcrypt.compare(password, user.password);

        if (!isValidPassword) {
            res.status(401).json({ error: 'Credenciales inválidas' });
            return;
        }

        // NUEVA VALIDACIÓN: Garantizamos que el secreto existe y es un 'string'
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            throw new Error('Falta configurar JWT_SECRET en las variables de entorno.');
        }

        const tokenPayload = {
            id: user.id,
            role: user.role
        };

        // Al pasar 'secret', TypeScript ya no marca error
        const token = jwt.sign(tokenPayload, secret, { expiresIn: '24h' });

        res.status(200).json({
            message: 'Inicio de sesión exitoso',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        next(error);
    }
};