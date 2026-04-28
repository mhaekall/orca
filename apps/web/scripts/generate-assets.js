const fs = require('fs');
const sharp = require('sharp');
const path = require('path');

const cleanOrcaFile = path.join(__dirname, '../public/clean-orca.txt');
const lines = fs.readFileSync(cleanOrcaFile, 'utf8').split('\n').filter(Boolean);
const pathMain = lines[0] || "";
const pathAccent = lines[1] || "";

// The viewBox of the SVG is 940.5 x 940.5
// We will pad it slightly to make sure it fits perfectly
const svgBuffer = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="-50 -50 1040 1040">
  <rect width="100%" height="100%" fill="#000000"/>
  <path d="${pathMain}" fill="#ffffff" />
  <path d="${pathAccent}" fill="#ffffff" opacity="0.8" />
</svg>
`);

async function generate() {
  const assetsDir = path.join(__dirname, '../assets');

  if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

  console.log('[generate-assets] Generating icon.png (1024x1024)...');
  await sharp(svgBuffer)
    .resize(1024, 1024)
    .png()
    .toFile(path.join(assetsDir, 'icon.png'));

  console.log('[generate-assets] Generating splash.png (2732x2732)...');
  await sharp(svgBuffer)
    .resize(2732, 2732)
    .png()
    .toFile(path.join(assetsDir, 'splash.png'));

  console.log('[generate-assets] Done!');
}

generate().catch(console.error);