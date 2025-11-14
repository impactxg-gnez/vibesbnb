@echo off
setlocal
cd /d F:\VibesBNB
set GIT_PAGER=

echo Removing main app files (keeping only signup pages)...

REM Remove main app pages
git rm -r apps/web/src/app/search 2>nul
git rm -r apps/web/src/app/listings 2>nul
git rm -r apps/web/src/app/host 2>nul

REM Remove home components
git rm -r apps/web/src/components/home 2>nul
git rm -r apps/web/src/components/search 2>nul

REM Remove documentation files not needed for signup
git rm SITE_RESTORED.md 2>nul
git rm DEPLOY_NOW.md 2>nul
git rm deploy*.cmd 2>nul
git rm deploy*.ps1 2>nul
git rm quick-push.bat 2>nul
git rm PUSH-TO-PROD.bat 2>nul
git rm git-status-check.ps1 2>nul

echo Committing cleanup...
git commit -m "chore: remove main app files - signup repo only contains signup pages"

echo Pushing to vibesbnb-signup repo...
git push origin main

echo.
echo ========================================
echo SUCCESS! Signup repo cleaned up!
echo Only contains: /coming-soon, /early-access, /thank-you
echo ========================================
pause

