# Deploy VibesBNB Signup Site to Vercel
# Usage: npm run deploy:signup

Write-Host "🚀 Deploying VibesBNB Signup Site..." -ForegroundColor Green
Write-Host ""

Set-Location apps/web

# Check if vercel is installed
if (-not (Get-Command vercel -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Vercel CLI not found. Installing..." -ForegroundColor Red
    npm install -g vercel
}

# Link to signup project if not already linked
if (-not (Test-Path ".vercel/project.json")) {
    Write-Host "🔗 Linking to Vercel project..." -ForegroundColor Yellow
    vercel link --project=vibesbnb-signup --yes
}

# Deploy to production
Write-Host "📦 Building and deploying..." -ForegroundColor Cyan
vercel --prod --yes

Write-Host ""
Write-Host "✅ Signup site deployed successfully!" -ForegroundColor Green
Write-Host "📊 Check deployment at: https://vercel.com/dashboard" -ForegroundColor Cyan

