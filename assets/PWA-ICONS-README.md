# PWA Icons and Assets Guide

## ✅ Production-Ready Icons

This folder contains all production-ready icon sizes for the Progressive Web App (PWA). All icons are automatically deployed during the build process.

### Icon Sizes and Usage

| Size | Filename | Purpose |
|------|----------|---------|
| 72x72 | icon-72x72.png | Android legacy devices |
| 96x96 | icon-96x96.png | Android standard density |
| 128x128 | icon-128x128.png | Chrome Web Store |
| 144x144 | icon-144x144.png | Android high density |
| 152x152 | icon-152x152.png | iOS/iPad |
| 192x192 | icon-192x192.png | Android Chrome (standard), PWA install prompt |
| 384x384 | icon-384x384.png | Android Chrome (high density) |
| 512x512 | icon-512x512.png | Android Chrome (extra high), Splash screens |

### Important Notes

1. **All icons should be high-quality PNG files** with transparent or solid backgrounds
2. **Icons should be square** (1:1 aspect ratio)
3. **Use the 512x512 version** as the master icon for best quality
4. **Avoid text in icons** - use simple, recognizable graphics
5. **Test on actual devices** to ensure icons are not blurry or pixelated

### Current Setup

- **Source Logo**: logo.png (525KB) - High-quality source for regeneration
- **Main Icon**: icon-512x512.png (175KB) - High quality, used for splash screens
- **Critical Icon**: icon-192x192.png (36KB) - Primary Android home screen icon
- **Favicon**: favicon.png + favicon.ico - Browser tab icons
- **Adaptive Icon**: adaptive-icon.png - Android adaptive icon with safe zone

### Icon Quality

All icons have been regenerated with optimal quality:
- **icon-192x192.png**: 36KB (minimum 35KB for sharp display on Android)
- **icon-512x512.png**: 175KB (optimal for splash screens)
- High-quality PNG format with minimal compression
- Generated from 525KB source logo for maximum clarity

### Manifest Configuration

The PWA manifest (`public/manifest.json`) references these icons with:
- `purpose: "any"` - Standard display for all sizes
- `purpose: "maskable"` - Android adaptive icons (192x192 and 512x512)

### Automatic Build Process

**Important**: Icons are automatically copied during build!

The build script (`scripts/inject-env.js`) runs during `npm run build:web` and:
1. Copies all `icon-*.png` files from `/assets` to `/dist`
2. Copies `favicon.png` and `favicon.ico` to `/dist`
3. Copies `manifest.json` from `/public` to `/dist`

This ensures all PWA assets are included in Netlify deployments.

**No manual copying required!**

### Testing Checklist

- [x] Icons appear sharp on Android home screen ✅
- [x] Icons appear sharp on iOS home screen ✅
- [x] Splash screen shows logo clearly during app boot ✅
- [x] Browser tab shows favicon correctly ✅
- [x] PWA install prompt shows correct icon ✅
- [x] Icons automatically deploy to Netlify ✅

### Regenerating Icons (If Needed)

If you need to update the logo and regenerate icons:

1. **Replace source logo**: Update `logo.png` with new high-resolution image (minimum 1024x1024)
2. **Use online tool** (recommended):
   - Visit: https://www.pwabuilder.com/imageGenerator
   - Upload `logo.png`
   - Download generated icons
   - Replace files in `/assets`
3. **Or use ImageMagick**:
   ```bash
   cd assets
   magick logo.png -resize 192x192 -quality 95 icon-192x192.png
   magick logo.png -resize 512x512 -quality 95 icon-512x512.png
   # ... repeat for other sizes
   ```
4. **Build and deploy**:
   ```bash
   npm run build:web
   git add assets/icon-*.png
   git commit -m "Update PWA icons"
   git push origin main
   ```

The build process will automatically copy new icons to `/dist` for deployment.

### Resources

- [PWA Icon Generator](https://www.pwabuilder.com/imageGenerator)
- [Maskable Icon Editor](https://maskable.app/)
- [Android Asset Studio](https://romannurik.github.io/AndroidAssetStudio/)
