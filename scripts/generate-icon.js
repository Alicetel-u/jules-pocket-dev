const fs = require('fs');
const sharp = require('sharp');

async function createIcon() {
  const width = 1024;
  const height = 1024;

  const svg = `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <!-- ダークネイビーの背景 -->
  <rect width="${width}" height="${height}" fill="#0A1128" />

  <!-- ポケットをモチーフにした形状 -->
  <path d="M256,312 L768,312 L768,512 C768,680 660,780 512,812 C364,780 256,680 256,512 L256,312 Z" fill="#1B264F" stroke="#4F46E5" stroke-width="24" stroke-linejoin="round" />

  <!-- AIを表す光るコア -->
  <circle cx="512" cy="512" r="80" fill="#6366F1" />
  <circle cx="512" cy="512" r="40" fill="#818CF8" />
  <circle cx="512" cy="512" r="16" fill="#C7D2FE" />

  <!-- AIと通信するシグナル -->
  <path d="M512,384 L512,416" stroke="#818CF8" stroke-width="16" stroke-linecap="round" />
  <path d="M512,608 L512,640" stroke="#818CF8" stroke-width="16" stroke-linecap="round" />
  <path d="M400,512 L368,512" stroke="#818CF8" stroke-width="16" stroke-linecap="round" />
  <path d="M656,512 L624,512" stroke="#818CF8" stroke-width="16" stroke-linecap="round" />
</svg>
`;

  await sharp(Buffer.from(svg))
    .png()
    .toFile('assets/images/icon.png');

  console.log('Icon generated');
}

createIcon().catch(console.error);
