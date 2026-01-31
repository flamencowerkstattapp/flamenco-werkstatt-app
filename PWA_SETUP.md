# Progressive Web App (PWA) Setup Guide

This document explains how the Antonio Dias Werkstatt app has been configured as a Progressive Web App (PWA) and how to deploy it.

## What is a PWA?

A Progressive Web App is a web application that can be installed on users' devices (phones, tablets, desktops) directly from the browser, without needing the Apple App Store or Google Play Store. PWAs offer:

- **Installable**: Users can add the app to their home screen
- **Offline Support**: Works without internet connection (cached content)
- **App-like Experience**: Runs in standalone mode (no browser UI)
- **Push Notifications**: Can send notifications to users
- **Automatic Updates**: No manual updates required

## PWA Configuration Files

### 1. **manifest.json** (`/public/manifest.json`)
Defines the app's metadata, icons, colors, and behavior when installed.

### 2. **service-worker.js** (`/public/service-worker.js`)
Handles offline caching and background sync functionality.

### 3. **index.html** (`/public/index.html`)
HTML template with PWA meta tags and service worker registration.

### 4. **app.json** (Updated)
Expo configuration with PWA-specific settings in the `web` section.

### 5. **registerServiceWorker.ts** (`/src/utils/registerServiceWorker.ts`)
Utility to register the service worker on web platforms.

## Required Assets

Before deploying, you need to create the following assets:

### Icons
Create these in `/assets/icons/`:
- icon-72x72.png
- icon-96x96.png
- icon-128x128.png
- icon-144x144.png
- icon-152x152.png
- icon-192x192.png ⭐ (minimum required)
- icon-384x384.png
- icon-512x512.png ⭐ (recommended)

### Favicon
Create in `/assets/`:
- favicon.png (32x32 or 64x64)

### Splash Screens (Optional, for iOS)
Create these in `/assets/splash/`:
- Various sizes for different iOS devices (see `/assets/splash/README.md`)

**Quick Icon Generation:**
```bash
# Using online tools (easiest)
Visit: https://realfavicongenerator.net/
Upload your logo.png and download all sizes

# OR using ImageMagick
cd assets
convert logo.png -resize 192x192 icons/icon-192x192.png
convert logo.png -resize 512x512 icons/icon-512x512.png
# ... repeat for other sizes
```

## Development

### Run PWA in Development Mode
```bash
npm run web
```

This starts the Expo web server at `http://localhost:19006` (or similar port).

### Test PWA Features
1. Open Chrome/Edge DevTools (F12)
2. Go to Application tab
3. Check:
   - **Manifest**: Should show app details
   - **Service Workers**: Should show registered worker
   - **Cache Storage**: Should show cached resources

### Install PWA Locally
1. Run `npm run web`
2. Open in Chrome/Edge
3. Click the install icon in the address bar (⊕ or install prompt)
4. App will be installed to your system

## Building for Production

### Build the PWA
```bash
npm run build:web
```

This creates an optimized production build in the `/web-build` directory.

### Test Production Build Locally
```bash
npm run serve:web
```

This serves the production build locally for testing.

## Deployment Options

### Option 1: Netlify (Recommended)
1. Create account at https://netlify.com
2. Connect your Git repository
3. Build settings:
   - **Build command**: `npm run build:web`
   - **Publish directory**: `web-build`
4. Deploy!

**Custom Domain**: Configure in Netlify settings

### Option 2: Vercel
1. Create account at https://vercel.com
2. Import your Git repository
3. Build settings:
   - **Build command**: `npm run build:web`
   - **Output directory**: `web-build`
4. Deploy!

### Option 3: Firebase Hosting
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Initialize
firebase init hosting

# Build
npm run build:web

# Deploy
firebase deploy --only hosting
```

### Option 4: GitHub Pages
1. Build: `npm run build:web`
2. Install gh-pages: `npm install --save-dev gh-pages`
3. Add to package.json scripts:
   ```json
   "deploy:github": "gh-pages -d web-build"
   ```
4. Deploy: `npm run deploy:github`

### Option 5: Any Static Host
Upload the contents of `/web-build` to any static hosting service:
- AWS S3 + CloudFront
- Azure Static Web Apps
- Cloudflare Pages
- DigitalOcean App Platform

## PWA Installation Instructions for Users

### On Mobile (Android)
1. Open the app URL in Chrome
2. Tap the menu (⋮)
3. Select "Add to Home screen"
4. Confirm installation

### On Mobile (iOS)
1. Open the app URL in Safari
2. Tap the Share button
3. Select "Add to Home Screen"
4. Confirm installation

### On Desktop (Chrome/Edge)
1. Open the app URL
2. Click the install icon (⊕) in the address bar
3. Click "Install"

## Testing PWA Compliance

### Lighthouse Audit
1. Open Chrome DevTools (F12)
2. Go to Lighthouse tab
3. Select "Progressive Web App"
4. Click "Generate report"
5. Aim for 100% PWA score

### PWA Checklist
- ✅ Served over HTTPS
- ✅ Has a web app manifest
- ✅ Has a service worker
- ✅ Icons (192px and 512px)
- ✅ Works offline
- ✅ Installable
- ✅ Responsive design
- ✅ Fast load time

## Troubleshooting

### Service Worker Not Registering
- Check browser console for errors
- Ensure you're on HTTPS (or localhost)
- Clear browser cache and reload

### App Not Installable
- Verify manifest.json is accessible
- Check icons exist at specified paths
- Ensure service worker is registered
- Must be served over HTTPS

### Icons Not Showing
- Verify icon paths in manifest.json
- Check icons exist in `/assets/icons/`
- Clear cache and reload

### Offline Mode Not Working
- Check service worker is active (DevTools > Application)
- Verify cache storage has content
- Test by going offline (DevTools > Network > Offline)

## Environment Variables

If you use Firebase or other services requiring API keys:

1. Create `.env` file (already in `.gitignore`)
2. Add your keys:
   ```
   EXPO_PUBLIC_FIREBASE_API_KEY=your_key_here
   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_domain_here
   ```
3. Access in code: `process.env.EXPO_PUBLIC_FIREBASE_API_KEY`

**Security Note**: Never commit API keys to Git!

## Updates and Versioning

When you update the app:

1. Update version in `package.json`
2. Update `CACHE_NAME` in `service-worker.js` (e.g., `flamenco-werkstatt-v2`)
3. Build and deploy
4. Users will get the update automatically on next visit

## Browser Support

PWAs work best on:
- ✅ Chrome (Android & Desktop)
- ✅ Edge (Desktop)
- ✅ Safari (iOS 11.3+, limited features)
- ✅ Firefox (Desktop)
- ⚠️ Safari (macOS, limited PWA features)

## Next Steps

1. **Create Icons**: Generate all required icon sizes
2. **Test Locally**: Run `npm run web` and test installation
3. **Build**: Run `npm run build:web`
4. **Deploy**: Choose a hosting platform and deploy
5. **Test Live**: Install PWA from production URL
6. **Share**: Give users the URL to install the app

## Support

For issues or questions:
- Check Expo PWA docs: https://docs.expo.dev/guides/progressive-web-apps/
- Check browser console for errors
- Test with Lighthouse audit

---

**Congratulations!** Your app is now a fully functional PWA that users can install without app stores! 🎉
