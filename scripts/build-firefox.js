const fs = require('fs');
const path = require('path');

// Clean build directory
const buildDir = path.join(__dirname, '..', 'build', 'firefox');
if (fs.existsSync(buildDir)) {
  fs.rmSync(buildDir, { recursive: true });
}
fs.mkdirSync(buildDir, { recursive: true });

// Copy source files
const srcDir = path.join(__dirname, '..', 'src');
const firefoxDir = path.join(__dirname, '..', 'firefox');

console.log('Building Firefox extension...');

// Copy all files from src/
copyRecursive(srcDir, buildDir);

// Copy Firefox-specific manifest
fs.copyFileSync(
  path.join(firefoxDir, 'manifest.json'),
  path.join(buildDir, 'manifest.json')
);

// Copy .web-ext-config.cjs for development
fs.copyFileSync(
  path.join(firefoxDir, '.web-ext-config.cjs'),
  path.join(buildDir, '.web-ext-config.cjs')
);

console.log('✓ Firefox extension built to build/firefox/');

// Helper function to copy directory recursively
function copyRecursive(src, dest) {
  if (fs.statSync(src).isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach(item => {
      copyRecursive(path.join(src, item), path.join(dest, item));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}
