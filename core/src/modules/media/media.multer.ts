import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Directorio relativo: ../content/uploads (desde "core")
const baseUploadsDir = path.resolve(__dirname, '../../../../content/uploads');

if (!fs.existsSync(baseUploadsDir)) {
    fs.mkdirSync(baseUploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, baseUploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + file.originalname;
        cb(null, uniqueSuffix);
    }
});

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    console.log('--- EVALUANDO ARCHIVO EN MULTER ---');
    console.log('Mimetype:', file.mimetype);

    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        const err: any = new Error('Formato de archivo no soportado. Solo .jpg, .png, .webp');
        err.statusCode = 400; // Pasamos status al global handler
        cb(err);
    }
};

export const upload = multer({ 
    storage, 
    fileFilter 
});
