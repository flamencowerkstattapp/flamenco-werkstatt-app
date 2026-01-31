# PWA Icons Guide

This directory should contain the PWA icons for the Antonio Dias Werkstatt app.

## Required Icon Sizes

You need to create the following icon sizes from your logo:

- **icon-72x72.png** - 72x72 pixels
- **icon-96x96.png** - 96x96 pixels
- **icon-128x128.png** - 128x128 pixels
- **icon-144x144.png** - 144x144 pixels
- **icon-152x152.png** - 152x152 pixels
- **icon-192x192.png** - 192x192 pixels (minimum for PWA)
- **icon-384x384.png** - 384x384 pixels
- **icon-512x512.png** - 512x512 pixels (recommended for PWA)

## How to Generate Icons

You can use the logo.png from the parent assets folder and resize it to these dimensions.

### Option 1: Online Tools
- Use https://realfavicongenerator.net/
- Use https://www.pwabuilder.com/imageGenerator

### Option 2: Command Line (ImageMagick)
```bash
convert ../logo.png -resize 72x72 icon-72x72.png
convert ../logo.png -resize 96x96 icon-96x96.png
convert ../logo.png -resize 128x128 icon-128x128.png
convert ../logo.png -resize 144x144 icon-144x144.png
convert ../logo.png -resize 152x152 icon-152x152.png
convert ../logo.png -resize 192x192 icon-192x192.png
convert ../logo.png -resize 384x384 icon-384x384.png
convert ../logo.png -resize 512x512 icon-512x512.png
```

### Option 3: Expo CLI
```bash
npx expo-optimize
```

## Favicon
Also create a **favicon.png** (32x32 or 64x64) in the parent assets folder.

## Shortcut Icons (Optional)
- **shortcut-book.png** - 96x96 pixels
- **shortcut-calendar.png** - 96x96 pixels
