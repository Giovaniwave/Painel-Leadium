const sharp = require('sharp');
const fs = require('fs');

async function generate() {
  const svgBuffer = fs.readFileSync('public/icon.svg');
  
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile('public/icon-192.png');
    
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile('public/icon-512.png');
    
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile('public/apple-touch-icon.png');
    
  console.log('Icons generated successfully');
}

generate().catch(console.error);
