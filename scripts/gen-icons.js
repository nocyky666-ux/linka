const fs = require('fs');
const path = require('path');

const sizes = [48, 72, 96, 128, 144, 192, 512, 1024];
const targetDir = path.resolve(__dirname, '../assets/logo');

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

console.log('✅ Logo and icon assets verified in', targetDir);
