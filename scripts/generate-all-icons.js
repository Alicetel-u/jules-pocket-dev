const fs = require('fs');
const sharp = require('sharp');

async function createIcons() {
  const width = 1024;
  const height = 1024;

  const svg = `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <!-- ダークネイビーの背景 -->
  <rect width="${width}" height="${height}" fill="#0f172a" />

  <!-- ポケットをモチーフにした形状 -->
  <path d="M256,256 L768,256 L768,512 C768,690 610,790 512,820 C414,790 256,690 256,512 Z" fill="#1e293b" stroke="#6366f1" stroke-width="24" stroke-linejoin="round" />

  <!-- 上部のステッチ -->
  <line x1="300" y1="290" x2="340" y2="290" stroke="#6366f1" stroke-width="12" stroke-linecap="round" />
  <line x1="380" y1="290" x2="420" y2="290" stroke="#6366f1" stroke-width="12" stroke-linecap="round" />
  <line x1="460" y1="290" x2="500" y2="290" stroke="#6366f1" stroke-width="12" stroke-linecap="round" />
  <line x1="540" y1="290" x2="580" y2="290" stroke="#6366f1" stroke-width="12" stroke-linecap="round" />
  <line x1="620" y1="290" x2="660" y2="290" stroke="#6366f1" stroke-width="12" stroke-linecap="round" />
  <line x1="700" y1="290" x2="740" y2="290" stroke="#6366f1" stroke-width="12" stroke-linecap="round" />

  <!-- AIコア / 星のような形状 -->
  <path d="M512,384 L530,460 L606,478 L530,496 L512,572 L494,496 L418,478 L494,460 Z" fill="#a5b4fc" />

  <path d="M512,434 L520,466 L552,474 L520,482 L512,514 L504,482 L472,474 L504,466 Z" fill="#e0e7ff" />

  <!-- デジタルな回路のライン -->
  <path d="M512,590 L512,700" stroke="#818cf8" stroke-width="16" stroke-linecap="round" />
  <circle cx="512" cy="710" r="12" fill="#818cf8" />

  <path d="M400,478 L350,478 L350,600" stroke="#818cf8" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" fill="none" />
  <circle cx="350" cy="610" r="10" fill="#818cf8" />

  <path d="M624,478 L674,478 L674,600" stroke="#818cf8" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" fill="none" />
  <circle cx="674" cy="610" r="10" fill="#818cf8" />
</svg>
`;

  const svgBuffer = Buffer.from(svg);

  // Main icon (1024x1024)
  await sharp(svgBuffer)
    .png()
    .toFile('assets/images/icon.png');

  // Favicon (48x48 is standard, 192x192 for generic use)
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile('assets/images/favicon.png');

  // PWA icons
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile('assets/images/icon-192.png');

  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile('assets/images/icon-512.png');

  // Android adaptive foreground
  const androidForegroundSvg = `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <!-- 透明な背景 -->
  <rect width="${width}" height="${height}" fill="transparent" />

  <!-- ポケットをモチーフにした形状 (少し小さめに、セーフエリア内に) -->
  <g transform="scale(0.8) translate(128, 128)">
    <path d="M256,256 L768,256 L768,512 C768,690 610,790 512,820 C414,790 256,690 256,512 Z" fill="#1e293b" stroke="#6366f1" stroke-width="24" stroke-linejoin="round" />

    <!-- 上部のステッチ -->
    <line x1="300" y1="290" x2="340" y2="290" stroke="#6366f1" stroke-width="12" stroke-linecap="round" />
    <line x1="380" y1="290" x2="420" y2="290" stroke="#6366f1" stroke-width="12" stroke-linecap="round" />
    <line x1="460" y1="290" x2="500" y2="290" stroke="#6366f1" stroke-width="12" stroke-linecap="round" />
    <line x1="540" y1="290" x2="580" y2="290" stroke="#6366f1" stroke-width="12" stroke-linecap="round" />
    <line x1="620" y1="290" x2="660" y2="290" stroke="#6366f1" stroke-width="12" stroke-linecap="round" />
    <line x1="700" y1="290" x2="740" y2="290" stroke="#6366f1" stroke-width="12" stroke-linecap="round" />

    <!-- AIコア / 星のような形状 -->
    <path d="M512,384 L530,460 L606,478 L530,496 L512,572 L494,496 L418,478 L494,460 Z" fill="#a5b4fc" />

    <path d="M512,434 L520,466 L552,474 L520,482 L512,514 L504,482 L472,474 L504,466 Z" fill="#e0e7ff" />

    <!-- デジタルな回路のライン -->
    <path d="M512,590 L512,700" stroke="#818cf8" stroke-width="16" stroke-linecap="round" />
    <circle cx="512" cy="710" r="12" fill="#818cf8" />

    <path d="M400,478 L350,478 L350,600" stroke="#818cf8" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" fill="none" />
    <circle cx="350" cy="610" r="10" fill="#818cf8" />

    <path d="M624,478 L674,478 L674,600" stroke="#818cf8" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" fill="none" />
    <circle cx="674" cy="610" r="10" fill="#818cf8" />
  </g>
</svg>
`;
  await sharp(Buffer.from(androidForegroundSvg))
    .png()
    .toFile('assets/images/android-icon-foreground.png');

  // Android background (just solid color)
  const androidBackgroundSvg = `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${width}" height="${height}" fill="#0f172a" />
</svg>
`;
  await sharp(Buffer.from(androidBackgroundSvg))
    .png()
    .toFile('assets/images/android-icon-background.png');

  // Splash icon
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile('assets/images/splash-icon.png');

  console.log('All icons generated');
}

createIcons().catch(console.error);
