# Deploy script for VibesBNB
Write-Host "Adding files to git..."
git add .

Write-Host "Committing changes..."
git commit -m "feat: restore complete VibesBNB marketplace with full homepage, search, listings, and host pages"

Write-Host "Pushing to main..."
git push origin main

Write-Host "Done! Deployment will start automatically on Vercel."

