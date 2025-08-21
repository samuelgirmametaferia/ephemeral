// src/dataServer.ts
import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import dotenv from 'dotenv';
import crypto from 'crypto';
import sharp from 'sharp';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
const app = express();
app.use(cors());
app.use(express.json());

// Helpers
function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function randomHex(n = 16) {
  return crypto.randomBytes(n).toString('hex');
}

// Multer setup (use memory storage so we can compress before saving)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    if (/^(image|video)\//.test(file.mimetype)) cb(null, true);
    else cb(new Error('Unsupported file type'));
  },
});

// Serve media
app.use('/media', express.static(path.join(__dirname, '../uploads')));

// Endpoints
app.post('/upload/avatar', upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    if (!/^image\//.test(req.file.mimetype)) return res.status(400).json({ error: 'Avatar must be an image' });

    const outDir = path.join(__dirname, '../uploads/avatars');
    ensureDir(outDir);

    const filename = `${randomHex()}.webp`;
    const dest = path.join(outDir, filename);

    // Compress to 256x256 square, cover crop, WebP q80 (always output webp)
    await sharp(req.file.buffer, { animated: true })
      .rotate()
      .resize({ width: 256, height: 256, fit: 'cover' })
      .toFormat('webp', { quality: 80, effort: 5 })
      .toFile(dest);

    return res.json({ url: `/media/avatars/${filename}`, type: 'image', format: 'webp' });
  } catch (err: any) {
    console.error('[dataServer:/upload/avatar] Error:', err);
    return res.status(500).json({ error: 'Failed to process avatar' });
  }
});

app.post('/upload/post', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const isImage = /^image\//.test(req.file.mimetype);
    const isVideo = /^video\//.test(req.file.mimetype);

    const outDir = path.join(__dirname, '../uploads/posts');
    ensureDir(outDir);

    if (isImage) {
      // Always convert images to WebP. For animated inputs (gif/webp), preserve animation.
      const filename = `${randomHex()}.webp`;
      const dest = path.join(outDir, filename);

      const instance = sharp(req.file.buffer, { animated: true }).rotate();
      const meta = await instance.metadata();
      const animated = !!meta.pages && meta.pages > 1;

      await instance
        .resize({ width: 1280, height: 1280, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 75, effort: 5, smartSubsample: true, nearLossless: false, alphaQuality: 80, lossless: false })
        .toFile(dest);

      return res.json({ url: `/media/posts/${filename}`, type: 'image', format: 'webp', animated });
    }

    if (isVideo) {
      // Save videos as-is (no compression here). Optionally add ffmpeg later.
      const ext = path.extname(req.file.originalname) || '.mp4';
      const filename = `${randomHex()}${ext.toLowerCase()}`;
      const dest = path.join(outDir, filename);
      await fs.promises.writeFile(dest, req.file.buffer);
      return res.json({ url: `/media/posts/${filename}`, type: 'video' });
    }

    return res.status(400).json({ error: 'Unsupported media type' });
  } catch (err: any) {
    console.error('[dataServer:/upload/post] Error:', err);
    return res.status(500).json({ error: 'Failed to process media' });
  }
});

// Start server
const PORT = process.env.DATA_SERVER_PORT || 5000;
app.listen(PORT, () => console.log(`Data server running on port ${PORT}`));
