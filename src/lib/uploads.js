const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const sharp = require('sharp');
const config = require('../config');

const MAX_BYTES = 12 * 1024 * 1024;
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

sharp.cache(false);

/** multer instance: files stay in memory, then get re-encoded by sharp (nothing is saved as uploaded). */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: 40 },
  fileFilter: (req, file, cb) => cb(null, ALLOWED.has(file.mimetype)),
});

async function ensureDir(sub) {
  const d = new Date();
  const rel = path.posix.join('uploads', sub.replace(/[^a-z0-9/_-]/gi, ''), String(d.getFullYear()), String(d.getMonth() + 1).padStart(2, '0'));
  const abs = path.join(config.uploadsDir, rel.replace(/^uploads\//, ''));
  await fs.mkdir(abs, { recursive: true });
  return { abs, rel };
}

/**
 * Validates and re-encodes an uploaded image to WebP.
 * Returns { file, thumb, width, height } with paths relative to the site root.
 */
async function storeImage(file, sub, { maxSide = 1600, thumbSide = 480, square = false } = {}) {
  if (!file || !file.buffer) throw new Error('No image received.');
  let meta;
  try {
    meta = await sharp(file.buffer, { limitInputPixels: 60_000_000 }).metadata();
  } catch {
    throw new Error('The file is not a valid image.');
  }
  if (!['jpeg', 'png', 'webp', 'gif'].includes(meta.format)) throw new Error('Only JPG, PNG, WebP or GIF images are allowed.');

  const { abs, rel } = await ensureDir(sub);
  const base = crypto.randomBytes(10).toString('hex');

  const pipeline = (side) => {
    const img = sharp(file.buffer, { limitInputPixels: 60_000_000, animated: false }).rotate();
    return square
      ? img.resize(side, side, { fit: 'cover', position: 'attention', withoutEnlargement: false })
      : img.resize(side, side, { fit: 'inside', withoutEnlargement: true });
  };

  const mainInfo = await pipeline(maxSide).webp({ quality: 82 }).toFile(path.join(abs, `${base}.webp`));
  let thumb = null;
  if (thumbSide) {
    await pipeline(thumbSide).webp({ quality: 75 }).toFile(path.join(abs, `${base}-thumb.webp`));
    thumb = `${rel}/${base}-thumb.webp`;
  }
  return { file: `${rel}/${base}.webp`, thumb, width: mainInfo.width, height: mainInfo.height };
}

/** Deletes an uploaded file. Seed images and anything outside uploads/ are never touched. */
async function deleteUpload(rel) {
  if (!rel || !rel.startsWith('uploads/') || rel.startsWith('uploads/seed/') || rel.includes('..')) return;
  try {
    await fs.unlink(path.join(config.uploadsDir, rel.replace(/^uploads\//, '')));
  } catch {
    /* already gone */
  }
}

module.exports = { upload, storeImage, deleteUpload, MAX_BYTES };
