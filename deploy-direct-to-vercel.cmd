@echo off
setlocal
cd /d F:\VibesBNB\apps\web

echo ========================================
echo Deploying directly to Vercel
echo ========================================
echo.

echo Deploying to production...
vercel --prod

echo.
echo ========================================
echo Deployment complete!
echo ========================================
pause

