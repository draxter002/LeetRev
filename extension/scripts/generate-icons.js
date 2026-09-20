const fs = require('fs');
const path = require('path');

// Minimal valid 1x1 orange PNG buffer template to build valid PNGs for manifest
function createMinimalPng(size) {
  // SVG string for icon
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#f97316"/>
        <stop offset="100%" stop-color="#d97706"/>
      </linearGradient>
    </defs>
    <rect width="100" height="100" rx="22" fill="url(#g)"/>
    <text x="50" y="70" font-size="55" text-anchor="middle" dominant-baseline="middle">🔥</text>
  </svg>`;
  return svg;
}

const iconsDir = path.join(__dirname, '..', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

fs.writeFileSync(path.join(iconsDir, 'icon.svg'), createMinimalPng(128));
console.log('Icons directory initialized.');
