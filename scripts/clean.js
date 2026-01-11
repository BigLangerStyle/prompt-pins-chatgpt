const fs = require('fs');
const path = require('path');

const buildDir = path.join(__dirname, '..', 'build');

console.log('Cleaning build directory...');

if (fs.existsSync(buildDir)) {
  fs.rmSync(buildDir, { recursive: true });
  console.log('✓ Build directory cleaned');
} else {
  console.log('✓ Build directory already clean');
}
