# Deploy both VibesBNB projects to Vercel
# Usage: npm run deploy:all

Write-Host "🚀 Deploying Both VibesBNB Projects..." -ForegroundColor Green
Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "📝 This will deploy:" -ForegroundColor Yellow
Write-Host "  1. Signup Site (vibesbnb-signup)"
Write-Host "  2. Main Web App (vibesbnb-web)"
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Deploy signup site
Write-Host "1️⃣  Deploying Signup Site..." -ForegroundColor Magenta
& "$PSScriptRoot\deploy-signup.ps1"

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Deploy main web app
Write-Host "2️⃣  Deploying Main Web App..." -ForegroundColor Magenta
& "$PSScriptRoot\deploy-web.ps1"

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "✅ All deployments complete!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan

