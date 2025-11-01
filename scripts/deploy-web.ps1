# Deploy VibesBNB Main Web App to Vercel
# Usage: npm run deploy:web

Write-Host "🚀 Deploying VibesBNB Main Web App..." -ForegroundColor Green
Write-Host ""

Set-Location apps/web

# Check if vercel is installed
if (-not (Get-Command vercel -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Vercel CLI not found. Installing..." -ForegroundColor Red
    npm install -g vercel
}

# Link to web project if not already linked
if (-not (Test-Path ".vercel/project.json")) {
    Write-Host "🔗 Linking to Vercel project..." -ForegroundColor Yellow
    vercel link --project=vibesbnb-web --yes
}

# Deploy to production
Write-Host "📦 Building and deploying..." -ForegroundColor Cyan
vercel --prod --yes

Write-Host ""
Write-Host "✅ Main web app deployed successfully!" -ForegroundColor Green
Write-Host "📊 Check deployment at: https://vercel.com/dashboard" -ForegroundColor Cyan

