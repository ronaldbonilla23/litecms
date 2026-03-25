import { Router } from 'express';
import { loginUser } from './auth.controller';
import { verifyToken, AuthRequest } from './auth.middleware'; // Importamos el guardia y el tipo

const router = Router();

// Ruta pública (cualquiera puede intentar loguearse)
router.post('/login', loginUser);

// Ruta PRIVADA de prueba. Fíjate cómo ponemos "verifyToken" en el medio.
router.get('/me', verifyToken, (req: AuthRequest, res) => {
    // Si el código llega hasta aquí, es porque el middleware lo dejó pasar
    res.status(200).json({
        message: '¡Bienvenido al área VIP!',
        userData: req.user // Aquí devolvemos los datos que el token tenía por dentro
    });
});

export default router;