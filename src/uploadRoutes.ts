import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import crypto from 'crypto';

export const uploadRouter = Router();

const postsDir = path.join(__dirname, '../uploads/posts');
if (!fs.existsSync(postsDir)) fs.mkdirSync(postsDir, { recursive: true });

// Switch to memory storage so we can compress images before saving
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => (/^(image|video)\//.test(file.mimetype) ? cb(null, true) : cb(new Error('Only image or video files allowed'))),
});

uploadRouter.post('/post', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const isImage = /^image\//.test(req.file.mimetype);
    const isVideo = /^video\//.test(req.file.mimetype);

    // Ensure output dir exists
    if (!fs.existsSync(postsDir)) fs.mkdirSync(postsDir, { recursive: true });

    if (isImage) {
      // Compress and convert all images to WebP
      const filename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}.webp`;
      const dest = path.join(postsDir, filename);

      await sharp(req.file.buffer, { animated: true })
        .rotate()
        .resize({ width: 1280, height: 1280, fit: 'inside', withoutEnlargement: true })
        .toFormat('webp', { quality: 75, effort: 5, smartSubsample: true, alphaQuality: 80 })
        .toFile(dest);

      return res.json({ url: `/uploads/posts/${filename}` });
    }

    if (isVideo) {
      // Save videos as-is (no compression for now)
      const ext = path.extname(req.file.originalname) || '.mp4';
      const filename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext.toLowerCase()}`;
      const dest = path.join(postsDir, filename);
      await fs.promises.writeFile(dest, req.file.buffer);
      return res.json({ url: `/uploads/posts/${filename}` });
    }

    return res.status(400).json({ error: 'Only image or video files allowed' });
  } catch (err) {
    console.error('[uploadRouter:/post] Error:', err);
    return res.status(500).json({ error: 'Failed to process upload' });
  }
});