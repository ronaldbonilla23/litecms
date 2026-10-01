import { Router } from 'express';
import { uploadFile, getMediaLibrary, deleteMedia, updateMediaSeo } from './media.controller';
import { verifyToken } from '../auth/auth.middleware';
import { upload, verifyImageSignature } from './media.multer';

const router = Router();

router.post('/upload', verifyToken, upload.single('file'), verifyImageSignature, uploadFile);
router.get('/', verifyToken, getMediaLibrary);
router.put('/:id/seo', verifyToken, updateMediaSeo);
router.delete('/:id', verifyToken, deleteMedia);

export default router;
