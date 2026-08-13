const fs = require('fs');
const sharp = require('sharp');

async function createFaviconIco() {
  const width = 1024;
  const height = 1024;

  const svg = `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${width}" height="${height}" fill="#0f172a" />
  <path d="M256,256 L768,256 L768,512 C768,690 610,790 512,820 C414,790 256,690 256,512 Z" fill="#1e293b" stroke="#6366f1" stroke-width="24" stroke-linejoin="round" />
  <line x1="300" y1="290" x2="340" y2="290" stroke="#6366f1" stroke-width="12" stroke-linecap="round" />
  <line x1="380" y1="290" x2="420" y2="290" stroke="#6366f1" stroke-width="12" stroke-linecap="round" />
  <line x1="460" y1="290" x2="500" y2="290" stroke="#6366f1" stroke-width="12" stroke-linecap="round" />
  <line x1="540" y1="290" x2="580" y2="290" stroke="#6366f1" stroke-width="12" stroke-linecap="round" />
  <line x1="620" y1="290" x2="660" y2="290" stroke="#6366f1" stroke-width="12" stroke-linecap="round" />
  <line x1="700" y1="290" x2="740" y2="290" stroke="#6366f1" stroke-width="12" stroke-linecap="round" />
  <path d="M512,384 L530,460 L606,478 L530,496 L512,572 L494,496 L418,478 L494,460 Z" fill="#a5b4fc" />
  <path d="M512,434 L520,466 L552,474 L520,482 L512,514 L504,482 L472,474 L504,466 Z" fill="#e0e7ff" />
  <path d="M512,590 L512,700" stroke="#818cf8" stroke-width="16" stroke-linecap="round" />
  <circle cx="512" cy="710" r="12" fill="#818cf8" />
  <path d="M400,478 L350,478 L350,600" stroke="#818cf8" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" fill="none" />
  <circle cx="350" cy="610" r="10" fill="#818cf8" />
  <path d="M624,478 L674,478 L674,600" stroke="#818cf8" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" fill="none" />
  <circle cx="674" cy="610" r="10" fill="#818cf8" />
</svg>
`;

  // Actually save as PNG temporarily
  await sharp(Buffer.from(svg))
    .resize(48, 48)
    .png()
    .toFile('public/favicon.png');

  // Since sharp doesn't output .ico, we will just copy it. Browsers support PNG in .ico files.
  fs.copyFileSync('public/favicon.png', 'public/favicon.ico');

  // also update assets/images/favicon.png to 48x48
  fs.copyFileSync('public/favicon.png', 'assets/images/favicon.png');

  // Clean up
  fs.unlinkSync('public/favicon.png');

  console.log('Favicon ICO generated');
}

createFaviconIco().catch(console.error);
