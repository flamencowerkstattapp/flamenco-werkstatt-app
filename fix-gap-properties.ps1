# PowerShell script to remove all gap properties from React Native Web files
# This fixes the "Unexpected text node" errors

$files = Get-ChildItem -Path "src" -Include "*.tsx","*.ts" -Recurse | 
    Where-Object { (Select-String -Path $_.FullName -Pattern "gap: theme\.spacing" -Quiet) }

Write-Host "Found $($files.Count) files with gap properties to fix..."

foreach ($file in $files) {
    Write-Host "Processing: $($file.Name)"
    
    $content = Get-Content $file.FullName -Raw
    
    # Remove gap properties and replace with comments for manual review
    $content = $content -replace "(\s+)gap: theme\.spacing\.\w+,?\s*\n", "`$1// gap removed - use margin instead`n"
    
    Set-Content -Path $file.FullName -Value $content -NoNewline
}

Write-Host "`nCompleted! Fixed $($files.Count) files."
Write-Host "Note: gap properties have been commented out. You may need to add margin properties manually."
