import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
    user?: string | jwt.JwtPayload;
}

export const verifyToken = (req: AuthRequest, res: Response, next: NextFunction): void => {
    const authHeader = req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Acceso denegado. Token no proporcionado.' });
        return;
    }

    // Extraemos la segunda parte del string (el token real)
    const token = authHeader.split(' ')[1];

    // NUEVA VALIDACIÓN: Le garantizamos a TypeScript que el token existe
    if (!token) {
        res.status(401).json({ error: 'Acceso denegado. Token malformado.' });
        return;
    }

    try {
        const secret = process.env.JWT_SECRET;

        if (!secret) {
            throw new Error('Falta configurar JWT_SECRET en las variables de entorno.');
        }

        // Ahora ambos parámetros (token y secret) son estrictamente 'string'
        const verified = jwt.verify(token, secret);

        req.user = verified;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Token inválido o expirado.' });
    }
};