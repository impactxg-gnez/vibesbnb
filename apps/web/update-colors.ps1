# Script to update color classes throughout the codebase
# This will be run manually to update all files

$files = Get-ChildItem -Path "apps/web/src" -Recurse -Include *.tsx,*.ts

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $originalContent = $content
    
    # Replace background colors
    $content = $content -replace 'bg-gray-950', 'bg-charcoal-950'
    $content = $content -replace 'bg-gray-900', 'bg-charcoal-900'
    $content = $content -replace 'bg-gray-800', 'bg-charcoal-800'
    $content = $content -replace 'bg-gray-700', 'bg-charcoal-700'
    $content = $content -replace 'bg-gray-600', 'bg-charcoal-600'
    
    # Replace text colors
    $content = $content -replace 'text-gray-100', 'text-mist-100'
    $content = $content -replace 'text-gray-300', 'text-mist-300'
    $content = $content -replace 'text-gray-400', 'text-mist-400'
    $content = $content -replace 'text-gray-500', 'text-mist-500'
    
    # Replace border colors
    $content = $content -replace 'border-gray-800', 'border-charcoal-800'
    $content = $content -replace 'border-gray-700', 'border-charcoal-700'
    $content = $content -replace 'border-gray-600', 'border-charcoal-600'
    
    # Replace emerald with earth
    $content = $content -replace 'bg-emerald-600', 'bg-earth-600'
    $content = $content -replace 'bg-emerald-500', 'bg-earth-500'
    $content = $content -replace 'bg-emerald-400', 'bg-earth-400'
    $content = $content -replace 'text-emerald-500', 'text-earth-500'
    $content = $content -replace 'text-emerald-400', 'text-earth-400'
    $content = $content -replace 'border-emerald-500', 'border-earth-500'
    $content = $content -replace 'focus:ring-emerald-500', 'focus:ring-earth-500'
    $content = $content -replace 'hover:border-emerald-500', 'hover:border-earth-500'
    $content = $content -replace 'hover:text-emerald-400', 'hover:text-earth-400'
    $content = $content -replace 'hover:text-emerald-500', 'hover:text-earth-500'
    $content = $content -replace 'hover:bg-emerald-600', 'hover:bg-earth-600'
    $content = $content -replace 'hover:bg-emerald-700', 'hover:bg-earth-700'
    $content = $content -replace 'hover:border-emerald-600', 'hover:border-earth-600'
    $content = $content -replace 'ring-emerald-500', 'ring-earth-500'
    $content = $content -replace 'ring-emerald-400', 'ring-earth-400'
    
    # Replace text-white with text-mist-100 where appropriate (but be careful)
    # We'll do this more selectively
    
    if ($content -ne $originalContent) {
        Set-Content -Path $file.FullName -Value $content -NoNewline
        Write-Host "Updated: $($file.FullName)"
    }
}

Write-Host "Color update complete!"

