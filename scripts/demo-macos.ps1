<#
    IT Schulungsmaßnahmen – Demo-Start (macOS)
    Benötigt PowerShell 7+ (pwsh) und Node.js.
    Ausführen:  pwsh ./scripts/demo-macos.ps1
#>

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

Write-Host '== IT Schulungsmaßnahmen – Demo (macOS) ==' -ForegroundColor DarkRed

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host 'Node.js wurde nicht gefunden. Installiere es z. B. mit "brew install node".' -ForegroundColor Red
    exit 1
}

Set-Location $root

if (-not (Test-Path (Join-Path $root 'node_modules'))) {
    Write-Host 'Installiere Abhängigkeiten (npm install)…' -ForegroundColor Yellow
    npm install
}

$env:DASHBOARD_DEMO = '1'
Write-Host 'Starte Demo…' -ForegroundColor Green
npm start
