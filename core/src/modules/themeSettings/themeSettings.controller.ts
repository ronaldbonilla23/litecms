import { Request, Response } from 'express';
import db from '../../database';

export const getThemeSettings = async (req: Request, res: Response) => {
    try {
        // Obtener la primera fila de configuración (solo hay una)
        const settings = await db('theme_settings').first();

        if (!settings) {
            // Retornar valores por defecto si no existe
            res.json(getDefaultSettings());
            return;
        }

        res.json(settings);
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ error: 'Error interno' });
    }
};

export const updateThemeSettings = async (req: Request, res: Response) => {
    const settings = req.body;
    try {
        // Verificar si ya existe una configuración
        const existing = await db('theme_settings').first();

        if (existing) {
            // Actualizar la fila existente
            await db('theme_settings')
                .where({ id: existing.id })
                .update({
                    ...settings,
                    updated_at: db.fn.now()
                });
        } else {
            // Insertar nueva configuración
            await db('theme_settings').insert({
                ...settings,
                created_at: db.fn.now(),
                updated_at: db.fn.now()
            });
        }

        res.json({ message: 'Design System actualizado 🚀' });
    } catch (error: any) {
        console.error('Error updating settings:', error.message);
        res.status(500).json({ error: 'Error interno' });
    }
};

const getDefaultSettings = () => ({
    // Colores Globales
    primary_color: '#C2F86C',
    secondary_color: '#3B82F6',
    accent_color: '#F59E0B',
    background_color: '#141414',

    // Tipografía - Headers
    header_font: 'Plus Jakarta Sans',
    header_font_weight: '700',

    // Tipografía - Body
    body_font: 'Inter',
    body_font_weight: '400',
    body_line_height: '1.6',

    // Botones - Primary
    button_primary_bg: '#C2F86C',
    button_primary_color: '#141414',
    button_primary_radius: '8',
    button_primary_border: '0',

    // Botones - Secondary
    button_secondary_bg: 'transparent',
    button_secondary_color: '#C2F86C',
    button_secondary_radius: '8',
    button_secondary_border: '1',

    // Logo y Favicon
    logo_url: null,
    favicon_url: null
});
