# Build VibesBNB Android preview APK via EAS.
# Prerequisites: eas login (once), .env filled in apps/mobile

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..\apps\mobile

Write-Host "Checking Expo login..."
npx eas-cli@latest whoami
if ($LASTEXITCODE -ne 0) {
  Write-Host "Run: npx eas-cli login"
  exit 1
}

Write-Host "Linking EAS project (if needed)..."
npx eas-cli@latest init --non-interactive --force
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Pushing .env to EAS preview environment..."
npx eas-cli@latest env:push --environment preview --path .env
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Starting Android preview APK build..."
npx eas-cli@latest build --platform android --profile preview --non-interactive --wait
exit $LASTEXITCODE
