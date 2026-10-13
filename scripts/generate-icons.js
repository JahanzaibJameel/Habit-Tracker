const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const outDir = path.join(root, 'public', 'icons');
fs.mkdirSync(outDir, { recursive: true });

const base = `<svg width="512" height="512" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="32" height="32" rx="8" fill="#3B82F6"/><path d="M16 8C16 8 20 12 20 16C20 20 16 24 16 24C16 24 12 20 12 16C12 12 16 8 16 8Z" fill="white"/><circle cx="16" cy="16" r="2" fill="#3B82F6"/></svg>`;

const addIcon = `<svg width="96" height="96" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg"><rect width="96" height="96" rx="20" fill="#3B82F6"/><path d="M48 28v40M28 48h40" stroke="white" stroke-width="8" stroke-linecap="round"/></svg>`;

const todayIcon = `<svg width="96" height="96" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg"><rect width="96" height="96" rx="20" fill="#10B981"/><path d="M30 50l12 12 26-28" stroke="white" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`;

async function render(svg, size, file) {
  await sharp(Buffer.from(svg))
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(outDir, file));
  console.log('wrote', file);
}

(async () => {
  for (const s of [72, 96, 128, 144, 152, 192, 384, 512]) {
    await render(base, s, `icon-${s}x${s}.png`);
  }
  await render(addIcon, 96, 'add-96x96.png');
  await render(todayIcon, 96, 'today-96x96.png');
  // apple-touch-icon (180x180), solid background
  await sharp(Buffer.from(base))
    .resize(180, 180, { fit: 'contain', background: { r: 59, g: 130, b: 246, alpha: 1 } })
    .png()
    .toFile(path.join(root, 'public', 'apple-touch-icon.png'));
  console.log('wrote apple-touch-icon.png');
  console.log('DONE');
})();
