# PWA Quick Start Guide

## 🚀 Get Your PWA Running in 3 Steps

### Step 1: Generate Icons (Required)

You need to create PWA icons before deployment. Choose one method:

**Method A: Online Tool (Easiest)**
1. Visit https://realfavicongenerator.net/
2. Upload `assets/logo.png`
3. Download the generated icons
4. Place them in `assets/icons/` folder

**Method B: Command Line**
```bash
# Install ImageMagick first, then:
cd assets
convert logo.png -resize 192x192 icons/icon-192x192.png
convert logo.png -resize 512x512 icons/icon-512x512.png
convert logo.png -resize 144x144 icons/icon-144x144.png
convert logo.png -resize 96x96 icons/icon-96x96.png
convert logo.png -resize 72x72 icons/icon-72x72.png
convert logo.png -resize 32x32 favicon.png
```

### Step 2: Test Locally

```bash
# Start development server
npm run web

# Open browser to http://localhost:19006
# Click install icon in address bar to test PWA installation
```

### Step 3: Build & Deploy

```bash
# Build production version
npm run build:web

# Deploy to your chosen platform
```

## 📦 Deployment Options

### Netlify (Recommended - Free & Easy)
1. Push code to GitHub
2. Go to https://netlify.com
3. Click "New site from Git"
4. Select your repository
5. Build settings:
   - Build command: `npm run build:web`
   - Publish directory: `web-build`
6. Click "Deploy site"

**Done!** Your PWA is live at `https://your-site.netlify.app`

### Vercel (Alternative)
1. Go to https://vercel.com
2. Import your Git repository
3. Build command: `npm run build:web`
4. Output directory: `web-build`
5. Deploy

### Firebase Hosting
```bash
npm install -g firebase-tools
firebase login
firebase init hosting
npm run build:web
firebase deploy
```

## ✅ Verify PWA Works

1. Open your deployed URL in Chrome
2. Press F12 → Lighthouse tab
3. Run PWA audit
4. Should score 90%+ on PWA category

## 📱 How Users Install

**Android:**
1. Open URL in Chrome
2. Tap "Add to Home screen"

**iOS:**
1. Open URL in Safari
2. Tap Share → "Add to Home Screen"

**Desktop:**
1. Open URL in Chrome/Edge
2. Click install icon (⊕) in address bar

## 🔧 Common Issues

**Icons not showing?**
- Make sure icons exist in `assets/icons/`
- Check paths in `public/manifest.json`

**Can't install PWA?**
- Must be served over HTTPS (deployment, not localhost)
- Check manifest.json is accessible
- Verify service worker registered (F12 → Application tab)

**Need help?**
See full documentation in `PWA_SETUP.md`

---

**That's it!** Your app is now installable without app stores! 🎉
