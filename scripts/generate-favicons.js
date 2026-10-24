import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

// 1. Create the SVG design
// 512x512 canvas with luxury dark rounded squircle and 4-point faceted diamond star
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <defs>
    <!-- Background Gradient -->
    <radialGradient id="bgGlow" cx="50%" cy="50%" r="70%" fx="50%" fy="40%">
      <stop offset="0%" stop-color="#1A1329" />
      <stop offset="60%" stop-color="#0E0A16" />
      <stop offset="100%" stop-color="#07050A" />
    </radialGradient>

    <!-- Border Ring Gradient -->
    <linearGradient id="borderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FDE68A" stop-opacity="0.8" />
      <stop offset="35%" stop-color="#D4AF37" stop-opacity="0.4" />
      <stop offset="70%" stop-color="#A855F7" stop-opacity="0.4" />
      <stop offset="100%" stop-color="#7C3AED" stop-opacity="0.7" />
    </linearGradient>

    <!-- Gold Facet Gradient (Top & Right) -->
    <linearGradient id="goldFacetGrad" x1="20%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF" />
      <stop offset="25%" stop-color="#FFFBEB" />
      <stop offset="50%" stop-color="#FDE68A" />
      <stop offset="75%" stop-color="#EAB308" />
      <stop offset="100%" stop-color="#B45309" />
    </linearGradient>

    <!-- Purple Facet Gradient (Bottom & Left) -->
    <linearGradient id="purpleFacetGrad" x1="0%" y1="0%" x2="80%" y2="100%">
      <stop offset="0%" stop-color="#E9D5FF" />
      <stop offset="30%" stop-color="#C084FC" />
      <stop offset="65%" stop-color="#9333EA" />
      <stop offset="100%" stop-color="#581C87" />
    </linearGradient>

    <!-- Radiant Star Flare Gradient -->
    <radialGradient id="centerFlare" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="1" />
      <stop offset="40%" stop-color="#FDE68A" stop-opacity="0.8" />
      <stop offset="70%" stop-color="#C084FC" stop-opacity="0.3" />
      <stop offset="100%" stop-color="#7C3AED" stop-opacity="0" />
    </radialGradient>

    <!-- Ambient Aura -->
    <radialGradient id="starAura" cx="50%" cy="50%" r="45%">
      <stop offset="0%" stop-color="#A855F7" stop-opacity="0.35" />
      <stop offset="60%" stop-color="#EAB308" stop-opacity="0.12" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0" />
    </radialGradient>
  </defs>

  <!-- Base Dark Luxury Squircle Container -->
  <rect x="16" y="16" width="480" height="480" rx="112" ry="112" fill="url(#bgGlow)" />
  <rect x="16" y="16" width="480" height="480" rx="112" ry="112" fill="none" stroke="url(#borderGrad)" stroke-width="4.5" />

  <!-- Ambient Glow Behind Star -->
  <circle cx="256" cy="256" r="190" fill="url(#starAura)" />

  <!-- 4-Point Star Facets -->
  <!-- Left Side (Purple-dominated) -->
  <path
    d="M 256 72 C 256 180 180 256 72 256 C 180 256 256 332 256 440 Z"
    fill="url(#purpleFacetGrad)"
  />

  <!-- Right Side (Gold-dominated) -->
  <path
    d="M 256 72 C 256 180 332 256 440 256 C 332 256 256 332 256 440 Z"
    fill="url(#goldFacetGrad)"
  />

  <!-- High-precision inner specular highlight along vertical/horizontal spine -->
  <line x1="256" y1="84" x2="256" y2="428" stroke="#FFFFFF" stroke-width="1.8" stroke-opacity="0.45" stroke-linecap="round" />
  <line x1="84" y1="256" x2="428" y2="256" stroke="#FFFFFF" stroke-width="1.8" stroke-opacity="0.45" stroke-linecap="round" />

  <!-- Secondary Mini Diamond Sparkle (Top-Right Accent) -->
  <g transform="translate(372, 136)">
    <path
      d="M 0 -26 C 0 -6 6 0 26 0 C 6 0 0 6 0 26 C 0 6 -6 0 -26 0 C -6 0 0 -6 0 -26 Z"
      fill="url(#goldFacetGrad)"
      opacity="0.9"
    />
    <circle cx="0" cy="0" r="3.5" fill="#FFFFFF" />
  </g>

  <!-- Tertiary Mini Sparkle (Bottom-Left Delicate Accent) -->
  <g transform="translate(138, 372)">
    <path
      d="M 0 -16 C 0 -4 4 0 16 0 C 4 0 0 4 0 16 C 0 4 -4 0 -16 0 C -4 0 0 -4 0 -16 Z"
      fill="url(#purpleFacetGrad)"
      opacity="0.75"
    />
    <circle cx="0" cy="0" r="2" fill="#FFFFFF" />
  </g>

  <!-- Radiant Center Core Glow -->
  <circle cx="256" cy="256" r="32" fill="url(#centerFlare)" />
  <circle cx="256" cy="256" r="7" fill="#FFFFFF" />
</svg>`;

// Helper to assemble multi-icon ICO format containing PNG streams
function createIcoFromPngBuffers(pngBuffers) {
  // ICO header: 6 bytes
  // - 2 bytes: Reserved (always 0)
  // - 2 bytes: Image type (1 for icon)
  // - 2 bytes: Number of images
  const numImages = pngBuffers.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(numImages, 4);

  // Directory entries: 16 bytes each
  const dirEntrySize = 16;
  const dirSize = numImages * dirEntrySize;
  let currentOffset = 6 + dirSize;

  const dirBuffers = [];
  const imageBuffers = [];

  for (const { width, height, buffer } of pngBuffers) {
    const entry = Buffer.alloc(16);
    // Width (0 means 256)
    entry.writeUInt8(width >= 256 ? 0 : width, 0);
    // Height (0 means 256)
    entry.writeUInt8(height >= 256 ? 0 : height, 1);
    // Color palette (0 if no color palette)
    entry.writeUInt8(0, 2);
    // Reserved (0)
    entry.writeUInt8(0, 3);
    // Color planes (1)
    entry.writeUInt16LE(1, 4);
    // Bits per pixel (32)
    entry.writeUInt16LE(32, 6);
    // Image size in bytes
    entry.writeUInt32LE(buffer.length, 8);
    // Image data offset from start of file
    entry.writeUInt32LE(currentOffset, 12);

    dirBuffers.push(entry);
    imageBuffers.push(buffer);
    currentOffset += buffer.length;
  }

  return Buffer.concat([header, ...dirBuffers, ...imageBuffers]);
}

async function generate() {
  const publicDir = path.resolve('public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  // 1. Write favicon.svg
  const svgPath = path.join(publicDir, 'favicon.svg');
  fs.writeFileSync(svgPath, svgContent, 'utf8');
  console.log('Created favicon.svg');

  // Convert SVG buffer to sharp instance
  const svgBuffer = Buffer.from(svgContent);

  // List of icons to generate
  const pngTargets = [
    { name: 'favicon-16x16.png', size: 16 },
    { name: 'favicon-32x32.png', size: 32 },
    { name: 'favicon-48x48.png', size: 48 },
    { name: 'apple-touch-icon.png', size: 180 },
    { name: 'apple-touch-icon-precomposed.png', size: 180 },
    { name: 'icon-192.png', size: 192 },
    { name: 'android-chrome-192x192.png', size: 192 },
    { name: 'icon-512.png', size: 512 },
    { name: 'android-chrome-512x512.png', size: 512 },
  ];

  const icoPngBuffers = [];

  for (const target of pngTargets) {
    const outputPath = path.join(publicDir, target.name);
    const pngBuffer = await sharp(svgBuffer)
      .resize(target.size, target.size)
      .png({ compressionLevel: 9 })
      .toBuffer();

    fs.writeFileSync(outputPath, pngBuffer);
    console.log(`Created ${target.name} (${target.size}x${target.size})`);

    if ([16, 32, 48].includes(target.size)) {
      icoPngBuffers.push({ width: target.size, height: target.size, buffer: pngBuffer });
    }
  }

  // Generate favicon.ico containing 16x16, 32x32, and 48x48
  const icoBuffer = createIcoFromPngBuffers(icoPngBuffers);
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuffer);
  console.log('Created favicon.ico with 16x16, 32x32, and 48x48 resolutions');

  // Generate 1200x630 high-impact OpenGraph share banner
  const ogSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
    <defs>
      <radialGradient id="ogGlow" cx="50%" cy="40%" r="75%">
        <stop offset="0%" stop-color="#221838" />
        <stop offset="50%" stop-color="#0E0A17" />
        <stop offset="100%" stop-color="#060408" />
      </radialGradient>
      <linearGradient id="ogGold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#FFFFFF" />
        <stop offset="25%" stop-color="#FFFBEB" />
        <stop offset="50%" stop-color="#FDE68A" />
        <stop offset="75%" stop-color="#EAB308" />
        <stop offset="100%" stop-color="#CA8A04" />
      </linearGradient>
      <linearGradient id="ogPurple" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#E9D5FF" />
        <stop offset="35%" stop-color="#C084FC" />
        <stop offset="70%" stop-color="#9333EA" />
        <stop offset="100%" stop-color="#6B21A8" />
      </linearGradient>
      <linearGradient id="ogBorder" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#D4AF37" stop-opacity="0.6" />
        <stop offset="50%" stop-color="#A855F7" stop-opacity="0.6" />
        <stop offset="100%" stop-color="#D4AF37" stop-opacity="0.6" />
      </linearGradient>
    </defs>

    <rect width="1200" height="630" fill="url(#ogGlow)" />
    <!-- Luxury Gold Accent Border -->
    <rect x="24" y="24" width="1152" height="582" rx="24" fill="none" stroke="url(#ogBorder)" stroke-width="2" />

    <!-- Center 4-Point Emblem -->
    <g transform="translate(600, 220)">
      <!-- Left side purple facet -->
      <path d="M 0 -84 C 0 0 -72 0 -84 0 C 0 0 0 72 0 84 Z" fill="url(#ogPurple)" />
      <!-- Right side gold facet -->
      <path d="M 0 -84 C 0 0 72 0 84 0 C 0 0 0 72 0 84 Z" fill="url(#ogGold)" />
      <circle cx="0" cy="0" r="10" fill="#FFFFFF" />
    </g>

    <!-- NOVALUXE Title -->
    <text x="600" y="375" text-anchor="middle" font-family="'Playfair Display', Georgia, serif" font-size="62" font-weight="700" letter-spacing="10" fill="url(#ogGold)">
      NOVALUXE
    </text>

    <!-- BY SENNEL Subtitle -->
    <text x="600" y="425" text-anchor="middle" font-family="'DM Sans', -apple-system, sans-serif" font-size="20" font-weight="600" letter-spacing="8" fill="#E2D4B7">
      BY SENNEL
    </text>

    <!-- Tagline -->
    <text x="600" y="475" text-anchor="middle" font-family="'DM Sans', -apple-system, sans-serif" font-size="16" letter-spacing="3" fill="#A89BB5">
      COSMETICS • LUXURY BEAUTY • EVERYDAY ESSENTIALS
    </text>
    <text x="600" y="505" text-anchor="middle" font-family="'DM Sans', -apple-system, sans-serif" font-size="14" letter-spacing="2" fill="#CA8A04">
      MONROVIA, LIBERIA
    </text>
  </svg>`;

  const ogBuffer = await sharp(Buffer.from(ogSvg))
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(publicDir, 'og-image.png'), ogBuffer);
  console.log('Created og-image.png (1200x630)');

  console.log('All favicon and social share assets generated successfully!');
}

generate().catch(err => {
  console.error('Generation failed:', err);
  process.exit(1);
});
