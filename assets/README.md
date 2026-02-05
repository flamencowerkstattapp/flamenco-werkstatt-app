# Assets Folder

This folder contains all production-ready visual assets for the Antonio Dias Flamenco Werkstatt PWA.

## ✅ Production Assets

All required assets are in place and production-ready:

### Core Assets
- **logo.png** (525KB) - High-quality source logo for icon generation
- **icon.png** (1024x1024px) - App icon
- **adaptive-icon.png** (1024x1024px) - Android adaptive icon
- **favicon.png** - Web favicon
- **favicon.ico** - Browser favicon
- **logo.ico** - Alternative icon format

### PWA Icons (All Sizes)
All icons are automatically copied to `/dist` during build:
- icon-48x48.png (4.3 KB)
- icon-64x64.png (6.7 KB)
- icon-72x72.png (7.9 KB)
- icon-96x96.png (12 KB)
- icon-128x128.png (19 KB)
- icon-144x144.png (23 KB)
- icon-152x152.png (25 KB)
- **icon-192x192.png (36 KB)** - Critical for Android home screen
- icon-384x384.png (109 KB)
- **icon-512x512.png (175 KB)** - Critical for splash screens

## 🎨 Brand Colors

- **Primary**: #8B0000 (Dark Red)
- **Secondary**: #D4AF37 (Gold)
- **Background**: #FFFFFF (White)
- **Text**: #000000 (Black)

## 🔄 Build Process

The build script (`scripts/inject-env.js`) automatically:
1. Copies all icon files from `/assets` to `/dist`
2. Copies `manifest.json` from `/public` to `/dist`
3. Ensures all PWA assets are deployed to Netlify

**No manual copying required!**

## 📖 Documentation

For detailed PWA icon information, see:
- **[PWA-ICONS-README.md](PWA-ICONS-README.md)** - Icon requirements and quality guidelines
- **[docs/PWA_SETUP.md](../docs/PWA_SETUP.md)** - Complete PWA setup guide
