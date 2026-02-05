# PowerShell Script to Regenerate High-Quality PWA Icons
# This script uses .NET System.Drawing to resize icons with high quality

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "PWA Icon Regeneration Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Load System.Drawing assembly
Add-Type -AssemblyName System.Drawing

# Source image (highest quality available)
$sourceImage = "assets\logo.png"

if (-not (Test-Path $sourceImage)) {
    Write-Host "ERROR: Source image not found: $sourceImage" -ForegroundColor Red
    Write-Host "Please ensure logo.png exists in the assets folder." -ForegroundColor Yellow
    exit 1
}

Write-Host "Source image: $sourceImage" -ForegroundColor Green
$sourceInfo = Get-Item $sourceImage
Write-Host "Source size: $([math]::Round($sourceInfo.Length / 1KB, 2)) KB" -ForegroundColor Green
Write-Host ""

# Icon sizes to generate
$sizes = @(48, 64, 72, 96, 128, 144, 152, 192, 384, 512)

# Function to resize image with high quality
function Resize-Image {
    param(
        [string]$InputPath,
        [string]$OutputPath,
        [int]$Width,
        [int]$Height
    )
    
    try {
        # Load source image
        $img = [System.Drawing.Image]::FromFile($InputPath)
        
        # Create new bitmap with target size
        $newImg = New-Object System.Drawing.Bitmap($Width, $Height)
        
        # Create graphics object with high-quality settings
        $graphics = [System.Drawing.Graphics]::FromImage($newImg)
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        
        # Draw resized image
        $graphics.DrawImage($img, 0, 0, $Width, $Height)
        
        # Save with high quality (PNG format)
        $newImg.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
        
        # Cleanup
        $graphics.Dispose()
        $newImg.Dispose()
        $img.Dispose()
        
        return $true
    }
    catch {
        Write-Host "Error resizing image: $_" -ForegroundColor Red
        return $false
    }
}

Write-Host "Generating icons..." -ForegroundColor Cyan
Write-Host ""

$successCount = 0
$failCount = 0

foreach ($size in $sizes) {
    $outputFile = "assets\icon-${size}x${size}.png"
    Write-Host "Generating ${size}x${size}..." -NoNewline
    
    $result = Resize-Image -InputPath $sourceImage -OutputPath $outputFile -Width $size -Height $size
    
    if ($result) {
        $fileInfo = Get-Item $outputFile
        $fileSizeKB = [math]::Round($fileInfo.Length / 1KB, 2)
        Write-Host " OK ($fileSizeKB KB)" -ForegroundColor Green
        $successCount++
    }
    else {
        Write-Host " FAILED" -ForegroundColor Red
        $failCount++
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "  Success: $successCount icons" -ForegroundColor Green
Write-Host "  Failed: $failCount icons" -ForegroundColor $(if ($failCount -gt 0) { "Red" } else { "Green" })
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if ($successCount -gt 0) {
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Copy icons to dist folder:" -ForegroundColor White
    Write-Host "   Copy-Item -Path 'assets\icon-*.png' -Destination 'dist\' -Force" -ForegroundColor Gray
    Write-Host ""
    Write-Host "2. Copy icons to public folder (if needed):" -ForegroundColor White
    Write-Host "   Copy-Item -Path 'assets\icon-*.png' -Destination 'public\' -Force" -ForegroundColor Gray
    Write-Host ""
    Write-Host "3. Commit and deploy:" -ForegroundColor White
    Write-Host "   git add assets/icon-*.png dist/ public/" -ForegroundColor Gray
    Write-Host "   git commit -m 'fix: Regenerate high-quality PWA icons'" -ForegroundColor Gray
    Write-Host "   git push origin main" -ForegroundColor Gray
    Write-Host ""
    Write-Host "4. After deployment, test on Android:" -ForegroundColor White
    Write-Host "   - Uninstall old PWA" -ForegroundColor Gray
    Write-Host "   - Clear browser cache" -ForegroundColor Gray
    Write-Host "   - Install PWA again" -ForegroundColor Gray
    Write-Host "   - Check home screen icon clarity" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Done!" -ForegroundColor Green
