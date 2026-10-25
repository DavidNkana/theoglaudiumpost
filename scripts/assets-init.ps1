# Runs Capacitor assets init using the logo folder icon, regardless of current working directory
# Usage examples:
# - From any PowerShell location: & "C:\\JunieProjects\\Laudium Biz\\scripts\\assets-init.ps1"
# - Or: powershell -ExecutionPolicy Bypass -File "C:\\JunieProjects\\Laudium Biz\\scripts\\assets-init.ps1"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptDir

Write-Host "Changing directory to repo root: $repoRoot"
Set-Location -Path $repoRoot

# Ensure node_modules/.bin is available and use npx to resolve @capacitor/assets
Write-Host "Running: npx @capacitor/assets init --icon \"logo/LaudiumLogo.png\" --splash \"resources/splash.png\" --ios --android --force"

npx @capacitor/assets init --icon "logo/LaudiumLogo.png" --splash "resources/splash.png" --ios --android --force

if ($LASTEXITCODE -ne 0) {
  Write-Error "@capacitor/assets init failed with exit code $LASTEXITCODE"
  exit $LASTEXITCODE
}

Write-Host "Capacitor assets initialization completed successfully."