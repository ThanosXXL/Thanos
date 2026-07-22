<#
    IT Schulungsmaßnahmen – Demo-Start (Windows)
    Startet die Anwendung im Demo-Modus mit vorbefüllten Beispieldaten.
    Ausführen:  powershell -ExecutionPolicy Bypass -File scripts\demo-windows.ps1
#>

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

Write-Host '== IT Schulungsmaßnahmen – Demo (Windows) ==' -ForegroundColor DarkRed

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host 'Node.js wurde nicht gefunden. Bitte von https://nodejs.org installieren.' -ForegroundColor Red
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
