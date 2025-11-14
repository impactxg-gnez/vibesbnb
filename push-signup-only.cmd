@echo off
setlocal
cd /d F:\VibesBNB
set GIT_PAGER=

echo Staging all changes...
git add -A

echo Committing cleanup...
git commit -m "chore: cleanup - signup repo now contains ONLY signup pages (no main app)"

echo Pushing to vibesbnb-signup repo...
git push origin main

echo.
echo ========================================
echo SUCCESS! Signup repo updated!
echo.
echo vibesbnb-signup now contains ONLY:
echo - /coming-soon
echo - /early-access  
echo - /thank-you
echo - /privacy
echo - /terms
echo.
echo All main app files removed!
echo ========================================
pause

