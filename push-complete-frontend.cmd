@echo off
setlocal
cd /d F:\VibesBNB
set GIT_PAGER=

echo ========================================
echo Pushing Complete Frontend to vibesbnb
echo ========================================
echo.

echo [1/3] Staging all files...
git add -A

echo [2/3] Committing complete marketplace frontend...
git commit -m "feat: add complete marketplace frontend with homepage, search, listings, and host pages"

echo [3/3] Pushing to vibesbnb repository...
git remote set-url vibesbnb https://github.com/impactxg-gnez/vibesbnb.git
git push vibesbnb main

echo.
echo ========================================
echo SUCCESS! Complete frontend pushed!
echo ========================================
echo.
echo Repository: https://github.com/impactxg-gnez/vibesbnb
echo.
echo Next Step: Connect Vercel Project
echo 1. Go to: https://vercel.com/kevals-projects-6dce5dc6/vibesbnb-web
echo 2. Click "Connect Git"
echo 3. Select: impactxg-gnez/vibesbnb
echo 4. Configure build settings (see CONNECT_VERCEL.md)
echo 5. Deploy!
echo.
pause

