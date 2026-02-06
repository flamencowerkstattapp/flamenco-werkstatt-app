# Netlify Deployment Guide for PWA

## Prerequisites

Before deploying, ensure you have:
1. A Netlify account
2. The app built and ready for deployment
3. All icon assets in the correct locations

## Deployment Steps

### 1. Build the App

```bash
npm run build:web
```

### 2. Ensure Assets are Copied

The build script automatically copies all required files to the `dist` folder. Verify these files are present:

**Required Files:**
- `/manifest.json` (from `public/` folder)
- `/icon-72x72.png` (from `assets/` folder)
- `/icon-96x96.png` (from `assets/` folder)
- `/icon-128x128.png` (from `assets/` folder)
- `/icon-144x144.png` (from `assets/` folder)
- `/icon-152x152.png` (from `assets/` folder)
- `/icon-192x192.png` (from `assets/` folder)
- `/icon-384x384.png` (from `assets/` folder)
- `/icon-512x512.png` (from `assets/` folder)
- `/favicon.png` (from `assets/` folder)

### 3. Create `netlify.toml` Configuration

Create a `netlify.toml` file in your project root:

```toml
[build]
  command = "npm run build:web"
  publish = "dist"

[build.environment]
  NODE_VERSION = "18"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    X-XSS-Protection = "1; mode=block"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Permissions-Policy = "camera=(), microphone=(), geolocation=()"
    Strict-Transport-Security = "max-age=31536000; includeSubDomains"

[[headers]]
  for = "/manifest.json"
  [headers.values]
    Content-Type = "application/manifest+json"
    Cache-Control = "public, max-age=0, must-revalidate"

[[headers]]
  for = "/icon-*.png"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

### 4. Deploy to Netlify

**Option A: Netlify CLI**
```bash
npm install -g netlify-cli
netlify login
netlify deploy --prod
```

**Option B: Netlify Dashboard**
1. Go to https://app.netlify.com
2. Click "Add new site" > "Import an existing project"
3. Connect your Git repository
4. Configure build settings:
   - Build command: `npm run build:web`
   - Publish directory: `dist`
5. Click "Deploy site"

### 5. Verify PWA Installation

After deployment:

1. **Visit your Netlify URL** on a mobile device
2. **Check the manifest** is accessible at `https://your-site.netlify.app/manifest.json`
3. **Verify icons** are accessible (e.g., `https://your-site.netlify.app/icon-192x192.png`)
4. **Test PWA install prompt**:
   - Android Chrome: Look for "Add to Home Screen" prompt
   - iOS Safari: Share button > "Add to Home Screen"
5. **Check installed icon** on home screen - should be sharp and clear
6. **Open the PWA** - splash screen should show logo during bootup

## Troubleshooting

### Blurry Icons on Android

**Problem**: Icons appear pixelated or blurry on Android home screen

**Solutions**:
1. Ensure `icon-192x192.png` and `icon-512x512.png` are high quality
2. Check file sizes - they should be substantial (not overly compressed)
3. Verify icons are being served correctly from Netlify
4. Clear browser cache and reinstall PWA
5. Check manifest.json is being served with correct MIME type

### Text-Only Splash Screen

**Problem**: Only text appears during app bootup, no logo

**Solutions**:
1. Verify `icon-192x192.png` is accessible at the root URL
2. Check browser console for 404 errors on icon files
3. Ensure `web-template.html` includes the logo image tag
4. Clear browser cache and reinstall PWA
5. Check that icons are copied to build output directory

### PWA Not Installing

**Problem**: No "Add to Home Screen" prompt appears

**Solutions**:
1. Ensure site is served over HTTPS (Netlify does this automatically)
2. Verify `manifest.json` is valid and accessible
3. Check browser console for manifest errors
4. Ensure all required manifest fields are present
5. Test in Chrome DevTools > Application > Manifest

### Icons Not Loading

**Problem**: 404 errors for icon files

**Solutions**:
1. Check that icons are in the build output directory
2. Verify paths in `manifest.json` match actual file locations
3. Ensure icons are copied during build process
4. Check Netlify deploy log for any file copy errors
5. Manually upload icons to Netlify if needed

## Testing Checklist

Before considering deployment complete:

- [ ] PWA installs successfully on Android
- [ ] PWA installs successfully on iOS
- [ ] Home screen icon is sharp and clear (not blurry)
- [ ] Splash screen shows logo during bootup
- [ ] App opens correctly after installation
- [ ] All icons load without 404 errors
- [ ] Manifest.json is accessible and valid
- [ ] Theme color matches app branding
- [ ] Offline functionality works (if implemented)

## Post-Deployment

### Monitor Performance

1. Check Netlify Analytics for deployment success
2. Monitor browser console for any errors
3. Test on multiple devices and browsers
4. Gather user feedback on icon quality

### Updates

When updating icons:
1. Replace files in `assets/` folder
2. Rebuild the app
3. Redeploy to Netlify
4. Users may need to reinstall PWA to see new icons

## Resources

- [Netlify Documentation](https://docs.netlify.com/)
- [PWA Best Practices](https://web.dev/pwa/)
- [Manifest Validator](https://manifest-validator.appspot.com/)
- [Lighthouse PWA Audit](https://developers.google.com/web/tools/lighthouse)
