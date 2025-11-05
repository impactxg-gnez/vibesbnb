@echo off
setlocal
cd /d F:\VibesBNB
set GIT_PAGER=

echo ========================================
echo Pushing Header Fix to vibesbnb
echo ========================================
echo.

echo [1/3] Staging files...
git add -A

echo [2/3] Committing...
git commit -m "fix: add header and footer to all pages in LayoutContent"

echo [3/3] Pushing to vibesbnb repository...
git push vibesbnb main

echo.
echo ========================================
echo SUCCESS! Header now visible on all pages!
echo ========================================
echo.
echo The header with Login/Sign Up buttons will now appear!
echo.
pause

