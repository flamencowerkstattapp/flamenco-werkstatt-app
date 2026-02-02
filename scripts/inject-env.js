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
} else {
  console.log('index.html not found, skipping environment injection');
}
