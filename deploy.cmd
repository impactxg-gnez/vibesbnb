@echo off
setlocal
cd /d F:\VibesBNB
set GIT_PAGER=
git config core.pager ""
git add .
git commit -m "feat: restore complete VibesBNB marketplace with homepage, search, listings, and host pages"
git push origin main
echo Deployment pushed successfully!
exit /b 0

