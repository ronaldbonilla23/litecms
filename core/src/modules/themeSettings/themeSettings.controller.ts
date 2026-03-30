import { Request, Response } from 'express';
// Asegúrate de que esta ruta a tu base de datos sea la correcta
import db from '../../database';

export const getThemeSettings = async (req: Request, res: Response) => {
    try {
        const settings = await db('theme_settings').select('*');
        const formattedSettings = settings.reduce((acc: any, curr: any) => {
            acc[curr.key] = curr.value;
            return acc;
        }, {});
        res.json(formattedSettings);
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ error: 'Error interno' });
    }
};

export const updateThemeSettings = async (req: Request, res: Response) => {
    const settings = req.body;
    try {
        await db.transaction(async (trx) => {
            for (const [key, value] of Object.entries(settings)) {
                await trx('theme_settings')
                    .insert({ key, value })
                    .onConflict('key')
                    .merge({ value, updated_at: db.fn.now() });
            }
        });
        res.json({ message: 'Ajustes actualizados 🚀' });
    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({ error: 'Error interno' });
    }
};