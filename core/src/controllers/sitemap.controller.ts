import type { Request, Response, NextFunction } from 'express';
import { generateSitemapXml } from '../services/sitemap.service';

/**
 * ============================================================================
 * SITEMAP CONTROLLER
 * ============================================================================
 * Genera y sirve el sitemap.xml dinámico
 * ============================================================================
 */

export const getSitemap = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const xml = await generateSitemapXml();

    res.set('Content-Type', 'application/xml');
    res.send(xml);
  } catch (error) {
    console.error('[Sitemap Controller] Error:', error);
    next(error);
  }
};
