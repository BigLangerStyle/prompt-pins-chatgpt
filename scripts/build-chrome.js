const fs = require('fs');
const path = require('path');

// Clean build directory
const buildDir = path.join(__dirname, '..', 'build', 'chrome');
if (fs.existsSync(buildDir)) {
  fs.rmSync(buildDir, { recursive: true });
}
fs.mkdirSync(buildDir, { recursive: true });

// Copy source files
const srcDir = path.join(__dirname, '..', 'src');
const chromeDir = path.join(__dirname, '..', 'chrome');

console.log('Building Chrome extension...');

// Copy all files from src/
copyRecursive(srcDir, buildDir);

// Copy Chrome-specific manifest
fs.copyFileSync(
  path.join(chromeDir, 'manifest.json'),
  path.join(buildDir, 'manifest.json')
);

// Convert browser.* API calls to chrome.* for Chrome compatibility
const jsFiles = [
  path.join(buildDir, 'background.js'),
  path.join(buildDir, 'content.js')
];

jsFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  // Replace browser. with chrome. for Chrome compatibility
  content = content.replace(/\bbrowser\./g, 'chrome.');
  fs.writeFileSync(file, content, 'utf8');
});

console.log('✓ Chrome extension built to build/chrome/');
console.log('  Load build/chrome in Chrome via chrome://extensions (Enable Developer Mode)');

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
