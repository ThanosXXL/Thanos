<#
    IT Schulungsmaßnahmen – VOLLVERSION starten (macOS)
    Startet die echte Anwendung mit persistenter Datei-Speicherung (kein Demo-Modus).
    Benötigt PowerShell 7+ (pwsh) und Node.js.
    Ausführen:  pwsh ./scripts/start-macos.ps1
#>

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

Write-Host '== IT Schulungsmaßnahmen – Vollversion (macOS) ==' -ForegroundColor DarkRed

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host 'Node.js wurde nicht gefunden. Installiere es z. B. mit "brew install node".' -ForegroundColor Red
    exit 1
}

Set-Location $root

if (-not (Test-Path (Join-Path $root 'node_modules'))) {
    Write-Host 'Installiere Abhängigkeiten (npm install)…' -ForegroundColor Yellow
    npm install
}

Remove-Item Env:DASHBOARD_DEMO -ErrorAction SilentlyContinue
Write-Host 'Starte Vollversion…' -ForegroundColor Green
npm start
