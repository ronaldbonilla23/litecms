import bcrypt from 'bcryptjs';
import db from '../database';

async function createAdmin() {
    try {
        const email = 'hola@midominio.com';
        const password = 'miPasswordSeguro123';
        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await db('users').where({ email }).first();

        if (user) {
            await db('users').where({ email }).update({
                password: hashedPassword
            });
            console.log(`✅ Usuario ${email} actualizado con la nueva contraseña encriptada.`);
        } else {
            await db('users').insert({
                email,
                password: hashedPassword,
                name: 'Administrador',
                role: 'admin'
            });
            console.log(`✅ Usuario ${email} creado exitosamente.`);
        }
    } catch (error) {
        console.error('❌ Error creando el usuario administrador:', error);
    } finally {
        await db.destroy();
    }
}

createAdmin();
