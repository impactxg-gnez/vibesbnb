@echo off
setlocal
cd /d F:\VibesBNB
set GIT_PAGER=

echo ========================================
echo Pushing Auth Pages to vibesbnb
echo ========================================
echo.

echo [1/3] Staging files...
git add -A

echo [2/3] Committing...
git commit -m "feat: add login and signup pages with updated header navigation"

echo [3/3] Pushing to vibesbnb repository...
git push vibesbnb main

echo.
echo ========================================
echo SUCCESS! Auth pages pushed!
echo ========================================
echo.
echo Added:
echo - Login page with social auth buttons
echo - Signup page with account type selection
echo - Updated header with Login/Sign Up buttons
echo - Navigation links (Search, Become a Host)
echo.
pause

