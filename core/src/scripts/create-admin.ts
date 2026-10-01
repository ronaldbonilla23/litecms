import bcrypt from 'bcryptjs';
import db, { runMigrations } from '../database';
import { InstallSchema } from '../../../shared/types';

/**
 * Crea un administrador o cambia la contraseña de uno existente.
 * Sirve para recuperar el acceso si se olvida la contraseña.
 *
 *   Desarrollo:  npm run admin -- <email> <contraseña> [nombre]   (desde /core)
 *   Producción:  node core/dist/core/src/scripts/create-admin.js <email> <contraseña> [nombre]
 */
const main = async () => {
    const [email, password, name = 'Administrador'] = process.argv.slice(2);

    const validation = InstallSchema.safeParse({ email, password, name });
    if (!validation.success) {
        console.error('Uso: create-admin <email> <contraseña (mín. 8 caracteres)> [nombre]');
        for (const issue of validation.error.issues) console.error(`  · ${issue.message}`);
        process.exitCode = 1;
        return;
    }

    await runMigrations();
    const hashedPassword = await bcrypt.hash(validation.data.password, 10);
    const existing = await db('users').where({ email: validation.data.email }).first('id');

    if (existing) {
        await db('users').where({ id: existing.id }).update({ password: hashedPassword, updated_at: db.fn.now() });
        console.log(`✅ Contraseña actualizada para ${validation.data.email}`);
    } else {
        await db('users').insert({ email: validation.data.email, password: hashedPassword, name: validation.data.name, role: 'admin' });
        console.log(`✅ Administrador ${validation.data.email} creado`);
    }
};

main()
    .catch((error) => {
        console.error('❌ Error:', error.message);
        process.exitCode = 1;
    })
    .finally(() => db.destroy());
