$env:GIT_PAGER = 'cat'
git config --global core.pager ''
Write-Host "=== Git Status ===" -ForegroundColor Cyan
git status --short
Write-Host "`n=== Recent Commits ===" -ForegroundColor Cyan
git log --oneline -3
Write-Host "`n=== Current Branch ===" -ForegroundColor Cyan
git branch --show-current

