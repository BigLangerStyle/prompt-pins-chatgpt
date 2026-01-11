module.exports = {
  // Ignore these files/folders when building
  ignoreFiles: [
    'package.json',
    'package-lock.json',
    '.web-ext-config.js',
    '.git',
    '.gitignore',
    'node_modules',
    'README.md',
    'PRIVACY.md',
    'PROJECT_SUMMARY.md',
    'screenshots',
    '*.log',
    '*.md',
    '.vscode',
    '.idea'
  ],

  // Build configuration
  build: {
    overwriteDest: true
  },

  // Run configuration
  run: {
    // Automatically open these URLs when starting
    startUrl: [
      'https://chatgpt.com'
    ],
    
    // Browser window settings
    browserConsole: false,
    
    // Uncomment to use a specific Firefox binary
    // firefox: 'C:\\Program Files\\Firefox Developer Edition\\firefox.exe'
  }
};
