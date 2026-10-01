import 'dotenv/config';
import db, { runMigrations } from '../database';
import { generateImageVariants, parseVariants } from '../services/images.service';

/**
 * Genera las variantes WebP (srcset) de las imágenes subidas antes de que existieran.
 * Uso: npm run media:variants            → solo las que no tienen variantes
 *      npm run media:variants -- --all   → regenera todas
 */
const main = async () => {
    await runMigrations();
    const regenerateAll = process.argv.includes('--all');

    const media = await db('media').select('id', 'filename', 'variants');
    let processed = 0;

    for (const item of media) {
        if (!regenerateAll && parseVariants(item.variants).length > 0) continue;
        try {
            const image = await generateImageVariants(item.filename);
            await db('media').where({ id: item.id }).update({
                width: image.width,
                height: image.height,
                variants: JSON.stringify(image.variants),
            });
            processed += 1;
            console.log(`✓ ${item.filename} → ${image.variants.map((v) => `${v.width}w`).join(', ')}`);
        } catch (error: any) {
            console.warn(`✗ ${item.filename}: ${error.message}`);
        }
    }

    console.log(`Imágenes procesadas: ${processed}/${media.length}`);
    await db.destroy();
};

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
