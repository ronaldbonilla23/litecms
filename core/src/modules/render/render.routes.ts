import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { compilePageCss, cssHash, getStoredCss, type CssOwner } from './css.service';
import { renderPath } from './render.service';
import { generateLlmsTxt, generateRobotsTxt } from '../seo/seo.service';
import { getSitemap } from '../../controllers/sitemap.controller';

const router = Router();

// ----------------------------------------------------------------------------
// Archivos para buscadores y bots de IA
// ----------------------------------------------------------------------------
router.get('/robots.txt', (req: Request, res: Response) => {
    res.type('text/plain').set('Cache-Control', 'public, max-age=3600').send(generateRobotsTxt());
});

router.get('/llms.txt', async (req: Request, res: Response, next: NextFunction) => {
    try {
        res.type('text/markdown; charset=utf-8').set('Cache-Control', 'public, max-age=3600').send(await generateLlmsTxt());
    } catch (error) {
        next(error);
    }
});

router.get('/sitemap.xml', getSitemap);

// ----------------------------------------------------------------------------
// CSS compilado de cada documento: /css/page-6.css?v=<hash> (page, post, entry, archive)
// ----------------------------------------------------------------------------
router.get(/^\/css\/(page|post|entry|archive)-(\d+)\.css$/, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const owner = req.params[0] as CssOwner;
        const id = Number(req.params[1]);

        let css = await getStoredCss(owner, id);
        if (!css && owner === 'page') css = await compilePageCss(id);
        if (!css) {
            res.status(404).type('text/css').send('/* CSS no disponible */');
            return;
        }

        // Si la URL trae el hash correcto, el archivo nunca cambia: caché de un año
        const immutable = req.query.v === cssHash(css);
        res.type('text/css')
            .set('Cache-Control', immutable ? 'public, max-age=31536000, immutable' : 'public, max-age=300')
            .send(css);
    } catch (error) {
        next(error);
    }
});

// ----------------------------------------------------------------------------
// Sitio público: cualquier otra URL se renderiza en el servidor
// ----------------------------------------------------------------------------
router.get(/.*/, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const outcome = await renderPath(req.path);

        if (outcome.kind === 'redirect') {
            res.redirect(outcome.status, outcome.location);
            return;
        }

        // CDN (Vercel, Cloudflare): 1 min fresco y sirve la copia vieja mientras se regenera
        res.status(outcome.status)
            .type('html')
            .set('Cache-Control', outcome.status === 200
                ? 'public, max-age=0, s-maxage=60, stale-while-revalidate=86400'
                : 'no-store')
            .send(outcome.html);
    } catch (error) {
        next(error);
    }
});

export default router;
