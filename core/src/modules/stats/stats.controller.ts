import type { Request, Response, NextFunction } from 'express';
import db from '../../database';

// Start time of the server process
const serverStartTime = Date.now();

export const getStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const pagesCountResult = await db('pages').count('id as count').first();
        const mediaCountResult = await db('media').count('id as count').first();
        
        const recentPages = await db('pages')
            .select('id', 'title', 'slug', 'status', 'updated_at')
            .orderBy('updated_at', 'desc')
            .limit(5);

        const uptimeSeconds = Math.floor((Date.now() - serverStartTime) / 1000);

        res.json({
            pages: Number(pagesCountResult?.count ?? 0),
            assets: Number(mediaCountResult?.count ?? 0),
            uptimeSeconds,
            recentPages
        });
    } catch (error) {
        next(error);
    }
};
