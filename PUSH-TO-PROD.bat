@echo off
echo ========================================
echo   Pushing VibesBNB to Production
echo ========================================
echo.

cd /d "F:\VibesBNB"

echo [1/4] Configuring git...
git config core.pager ""

echo [2/4] Adding all files...
git add .

echo [3/4] Committing changes...
git commit -m "feat: restore complete VibesBNB marketplace with homepage, search, listings, and host pages"

echo [4/4] Pushing to origin main...
git push origin main

echo.
echo ========================================
echo   SUCCESS! Deployment in progress
echo ========================================
echo.
echo Check status at: https://vercel.com/dashboard
echo Your site will be live in 2-3 minutes at:
echo https://vibesbnb-web.vercel.app
echo.
pause

