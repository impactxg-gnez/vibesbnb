@echo off
echo Pushing to production...
cd /d F:\VibesBNB
git add .
git commit -m "feat: restore complete VibesBNB marketplace with full homepage, search, listings, and host pages"
git push origin main
echo.
echo Done! Check Vercel dashboard for deployment status.
pause

