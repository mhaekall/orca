const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const svgPath = path.resolve(__dirname, '../public/orca-logo-new.svg');
const assetsDir = path.resolve(__dirname, '../assets');
const publicIconsDir = path.resolve(__dirname, '../public/icons');

if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir);
}

if (!fs.existsSync(publicIconsDir)) {
  fs.mkdirSync(publicIconsDir);
}

async function generate() {
  console.log('[generate-assets] Reading SVG...');
  const svgBuffer = fs.readFileSync(svgPath);

  console.log('[generate-assets] Generating icon.png (1024x1024)...');
  await sharp(svgBuffer)
    .resize(1024, 1024, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 1 } })
    .png()
    .toFile(path.join(assetsDir, 'icon.png'));

  console.log('[generate-assets] Generating splash.png (2732x2732)...');
  await sharp(svgBuffer)
    .resize(2732, 2732, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 1 } })
    .png()
    .toFile(path.join(assetsDir, 'splash.png'));

  console.log('[generate-assets] Generating public/icons for metadata...');
  await sharp(svgBuffer)
    .resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 1 } })
    .png()
    .toFile(path.join(publicIconsDir, 'icon-32.png'));

  await sharp(svgBuffer)
    .resize(192, 192, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 1 } })
    .png()
    .toFile(path.join(publicIconsDir, 'icon-192.png'));

  console.log('[generate-assets] Done!');
}

generate().catch(console.error);