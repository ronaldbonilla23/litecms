import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import db from '../database';
import { verifyToken } from '../modules/auth/auth.middleware';
import {
    discoverPlugins, findPlugin, getPluginLoadError, getPluginSettings, isPluginLoaded,
    listPluginData, loadPlugin, setPluginEnabled, validatePluginSettings,
} from './registry';

/**
 * Gestión de plugins desde el admin: /api/extensions/plugins
 */
const router = Router();
router.use(verifyToken);

const requirePlugin = (req: Request, res: Response) => {
    const plugin = findPlugin(String(req.params.name));
    if (!plugin?.manifest) {
        res.status(404).json({ error: plugin?.error ?? 'El plugin no existe' });
        return null;
    }
    return { ...plugin, manifest: plugin.manifest };
};

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const states = await db('plugins').select('name', 'enabled');
        const enabledByName = new Map(states.map((row) => [row.name, Boolean(row.enabled)]));

        const plugins = await Promise.all(discoverPlugins().map(async (plugin) => ({
            name: plugin.manifest?.name ?? plugin.folder,
            manifest: plugin.manifest,
            enabled: enabledByName.get(plugin.folder) ?? false,
            loaded: isPluginLoaded(plugin.folder),
            error: plugin.error ?? getPluginLoadError(plugin.folder),
            settings: plugin.manifest ? await getPluginSettings(plugin.folder) : {},
        })));
        res.json(plugins);
    } catch (error) {
        next(error);
    }
});

router.post('/:name/enable', async (req: Request, res: Response, next: NextFunction) => {
    const plugin = requirePlugin(req, res);
    if (!plugin) return;
    try {
        await setPluginEnabled(plugin.manifest.name, true);
        res.json({ message: `${plugin.manifest.title} activado` });
    } catch (error: any) {
        // Error dentro del código del plugin: es un problema del plugin, no del servidor
        if (getPluginLoadError(plugin.manifest.name)) {
            res.status(422).json({ error: `No se pudo activar: ${error.message}` });
            return;
        }
        next(error);
    }
});

router.post('/:name/disable', async (req: Request, res: Response, next: NextFunction) => {
    const plugin = requirePlugin(req, res);
    if (!plugin) return;
    try {
        await setPluginEnabled(plugin.manifest.name, false);
        res.json({ message: `${plugin.manifest.title} desactivado` });
    } catch (error) {
        next(error);
    }
});

router.put('/:name/settings', async (req: Request, res: Response, next: NextFunction) => {
    const plugin = requirePlugin(req, res);
    if (!plugin) return;
    try {
        const validation = validatePluginSettings(plugin.manifest, req.body ?? {});
        if (!validation.success) {
            const details: Record<string, string[]> = {};
            for (const issue of validation.error.issues) (details[String(issue.path[0])] ??= []).push(issue.message);
            res.status(400).json({ error: 'Ajustes inválidos', details: { data: details } });
            return;
        }

        const settings = JSON.stringify(validation.data);
        await db('plugins')
            .insert({ name: plugin.manifest.name, settings })
            .onConflict('name')
            .merge({ settings, updated_at: db.fn.now() });

        // Algunos plugins leen sus ajustes al registrarse: se recarga para aplicarlos
        if (isPluginLoaded(plugin.manifest.name)) await loadPlugin(plugin.manifest.name);
        res.json({ message: 'Ajustes guardados', settings: validation.data });
    } catch (error) {
        next(error);
    }
});

router.get('/:name/data/:collection', async (req: Request, res: Response, next: NextFunction) => {
    const plugin = requirePlugin(req, res);
    if (!plugin) return;
    const collection = String(req.params.collection);
    if (!plugin.manifest.data.some((item) => item.collection === collection)) {
        res.status(404).json({ error: 'Colección no declarada en plugin.json' });
        return;
    }
    try {
        res.json(await listPluginData(plugin.manifest.name, collection));
    } catch (error) {
        next(error);
    }
});

export default router;
