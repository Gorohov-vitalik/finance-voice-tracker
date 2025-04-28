const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const ico = require('sharp-ico');

const svgPath = path.join(__dirname, '../public/icon.svg');
const publicPath = path.join(__dirname, '../public');

// Читаем SVG файл
const svgBuffer = fs.readFileSync(svgPath);

// Генерируем PNG файлы разных размеров
async function generatePngs() {
  const sizes = [16, 32, 64, 192, 512];
  
  for (const size of sizes) {
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(path.join(publicPath, `logo${size}.png`));
    
    console.log(`Generated logo${size}.png`);
  }
}

// Генерируем ICO файл
async function generateIco() {
  const sizes = [16, 32, 64];
  const pngBuffers = await Promise.all(
    sizes.map(size => 
      sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toBuffer()
    )
  );
  
  const icoBuffer = await ico.encode(pngBuffers);
  fs.writeFileSync(path.join(publicPath, 'favicon.ico'), icoBuffer);
  
  console.log('Generated favicon.ico');
}

// Запускаем генерацию
async function generateIcons() {
  try {
    await generatePngs();
    await generateIco();
    console.log('All icons generated successfully!');
  } catch (error) {
    console.error('Error generating icons:', error);
  }
}

generateIcons(); 