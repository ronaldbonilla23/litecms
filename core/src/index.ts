import 'dotenv/config';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { checkDatabaseConnection } from './database';
import path from 'path';
import pageRoutes from './modules/pages/pages.routes';
import installRoutes from './modules/install/install.routes';
import authRoutes from './modules/auth/auth.routes';
import mediaRoutes from './modules/media/media.routes';
import statsRoutes from './modules/stats/stats.routes';
import themeSettingsRoutes from './modules/themeSettings/themeSettings.routes';
import templatesRoutes from './modules/templates/templates.routes';

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares globales
// CORS: Permitir tanto el admin (5173) como el frontend público (5174)
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'],
    methods: ['GET', 'PUT', 'POST', 'DELETE', 'OPTIONS'],
    credentials: true
}));
app.use(express.json()); // Permite a la API recibir payloads en formato JSON

// Ruta de diagnóstico (Health Check)
app.get('/api/health', (req: Request, res: Response) => {
    res.json({ message: 'LiteCMS API funcionando correctamente' });
});

app.use('/api/install', installRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/pages', pageRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/theme-settings', themeSettingsRoutes);
app.use('/api/templates', templatesRoutes);

// Servir archivos estáticos de forma pública
app.use('/uploads', express.static(path.join(__dirname, '../../content/uploads')));

// Servir archivos CSS compilados y toda la carpeta public
app.use('/css', express.static(path.join(__dirname, '../../public/css')));
app.use(express.static(path.join(__dirname, '../../public')));


// Ruta de prueba para forzar un error y validar nuestra arquitectura
app.get('/api/error-test', (req: Request, res: Response, next: NextFunction) => {
    const err = new Error('Este es un error de prueba simulado para LiteCMS');
    next(err); // Pasamos el error al manejador global
});

// MANEJADOR GLOBAL DE ERRORES (Cumpliendo el Technical Brief)
app.use((err: Error | any, req: Request, res: Response, next: NextFunction) => {
    console.error('[LiteCMS Error]:', err.message);

    const statusCode = err.statusCode || 500;

    // Siempre devolvemos el formato exacto exigido en el documento
    res.status(statusCode).json({
        error: err.message || 'Error interno del servidor'
    });
});


if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, async () => {
        console.log(`🚀 Servidor LiteCMS corriendo en http://localhost:${PORT}`);
        await checkDatabaseConnection(); // Verificamos la DB al arrancar
    });
}

export default app;