const fs = require('fs');
const path = require('path');

// Load environment variables from .env file
require('dotenv').config();

// Read the built index.html file
const indexPath = path.join(__dirname, '../dist/index.html');

if (fs.existsSync(indexPath)) {
  let indexContent = fs.readFileSync(indexPath, 'utf8');
  
  // Fix the title if it's undefined or incorrect
  indexContent = indexContent.replace(/<title>.*?<\/title>/, '<title>Antonio Dias Flamenco Werkstatt</title>');
  
  // Add proper meta description if missing
  if (!indexContent.includes('<meta name="description"')) {
    indexContent = indexContent.replace('<title>', '<meta name="description" content="Antonio Dias Flamenco Werkstatt - Dance studio management and booking app">\n  <title>');
  }
  
  // Add manifest link if missing
  if (!indexContent.includes('<link rel="manifest"')) {
    indexContent = indexContent.replace('<title>', '<link rel="manifest" href="/manifest.json">\n  <title>');
  }
  
  // Add PWA meta tags if missing
  if (!indexContent.includes('apple-mobile-web-app-title')) {
    const pwaTags = `<meta name="apple-mobile-web-app-title" content="AD Werkstatt">
  <meta name="application-name" content="Antonio Dias Flamenco Werkstatt">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-capable" content="yes">`;
    indexContent = indexContent.replace('<title>', pwaTags + '\n  <title>');
  }
  
  // Add proper Open Graph tags if missing
  if (!indexContent.includes('<meta property="og:title"')) {
    indexContent = indexContent.replace('</title>', '</title>\n  <meta property="og:title" content="Antonio Dias Flamenco Werkstatt">\n  <meta property="og:description" content="Antonio Dias Flamenco Werkstatt - Dance studio management and booking app">');
  }
  
  // Debug environment variables
  console.log('Environment variables being injected:');
  console.log('EXPO_PUBLIC_FIREBASE_API_KEY:', process.env.EXPO_PUBLIC_FIREBASE_API_KEY ? 'SET' : 'MISSING');
  console.log('EXPO_PUBLIC_FIREBASE_PROJECT_ID:', process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ? 'SET' : 'MISSING');
  
  // Create environment injection script
  const envScript = `
    <script>
      window.__ENV__ = {
        EXPO_PUBLIC_FIREBASE_API_KEY: '${process.env.EXPO_PUBLIC_FIREBASE_API_KEY || ''}',
        EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: '${process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || ''}',
        EXPO_PUBLIC_FIREBASE_PROJECT_ID: '${process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || ''}',
        EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: '${process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || ''}',
        EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '${process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || ''}',
        EXPO_PUBLIC_FIREBASE_APP_ID: '${process.env.EXPO_PUBLIC_FIREBASE_APP_ID || ''}'
      };
      console.log('Environment variables loaded:', Object.keys(window.__ENV__));
    </script>
  `;
  
  // Inject the script before the closing head tag
  indexContent = indexContent.replace('</head>', envScript + '</head>');
  
  // Write the modified content back
  fs.writeFileSync(indexPath, indexContent);
  console.log('Environment variables and meta tags injected successfully');
  
  // Copy PWA icons and manifest to dist folder
  console.log('\nCopying PWA assets to dist folder...');
  const publicDir = path.join(__dirname, '../public');
  const distDir = path.join(__dirname, '../dist');
  
  // Copy manifest.json
  const manifestSrc = path.join(publicDir, 'manifest.json');
  const manifestDest = path.join(distDir, 'manifest.json');
  if (fs.existsSync(manifestSrc)) {
    fs.copyFileSync(manifestSrc, manifestDest);
    console.log('✓ Copied manifest.json');
  }
  
  // Copy all icon files from assets to dist
  const assetsDir = path.join(__dirname, '../assets');
  const iconFiles = [
    'icon-48x48.png',
    'icon-64x64.png',
    'icon-72x72.png',
    'icon-96x96.png',
    'icon-128x128.png',
    'icon-144x144.png',
    'icon-152x152.png',
    'icon-192x192.png',
    'icon-384x384.png',
    'icon-512x512.png',
    'favicon.png',
    'favicon.ico'
  ];
  
  let copiedCount = 0;
  iconFiles.forEach(file => {
    const src = path.join(assetsDir, file);
    const dest = path.join(distDir, file);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
      copiedCount++;
    }
  });
  
  console.log(`✓ Copied ${copiedCount} icon files to dist folder`);
  console.log('\nPWA assets ready for deployment!');
  
} else {
  console.log('index.html not found, skipping environment injection');
}
