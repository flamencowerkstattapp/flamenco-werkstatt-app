# PWA Icons and Assets Guide

## Icon Requirements for PWA

This folder contains all the necessary icon sizes for the Progressive Web App (PWA) to display correctly on various devices and platforms.

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

- **Main Icon**: icon-512x512.png (215KB) - High quality, used for splash screens
- **Favicon**: favicon.png - Browser tab icon
- **Adaptive Icon**: adaptive-icon.png - Android adaptive icon with safe zone

### Manifest Configuration

The PWA manifest (`public/manifest.json`) references these icons with:
- `purpose: "any"` - Standard display
- `purpose: "maskable"` - For Android adaptive icons (192x192 and 512x512)

### Testing Checklist

- [ ] Icons appear sharp on Android home screen
- [ ] Icons appear sharp on iOS home screen
- [ ] Splash screen shows logo clearly during app boot
- [ ] Browser tab shows favicon correctly
- [ ] PWA install prompt shows correct icon

### Regenerating Icons

If you need to regenerate icons from a new source:
1. Start with a high-resolution square image (at least 1024x1024)
2. Use an image editor or online tool to resize to each required size
3. Maintain aspect ratio and ensure no distortion
4. Export as PNG with appropriate compression
5. Replace the files in this folder
6. Test on actual devices

### Resources

- [PWA Icon Generator](https://www.pwabuilder.com/imageGenerator)
- [Maskable Icon Editor](https://maskable.app/)
- [Android Asset Studio](https://romannurik.github.io/AndroidAssetStudio/)
