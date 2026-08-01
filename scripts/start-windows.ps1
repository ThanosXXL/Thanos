<#
    IT Schulungsmaßnahmen – VOLLVERSION starten (Windows)
    Startet die echte Anwendung mit persistenter Datei-Speicherung (kein Demo-Modus).
    Ausführen:  powershell -ExecutionPolicy Bypass -File scripts\start-windows.ps1
#>

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

Write-Host '== IT Schulungsmaßnahmen – Vollversion (Windows) ==' -ForegroundColor DarkRed

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host 'Node.js wurde nicht gefunden. Bitte von https://nodejs.org installieren.' -ForegroundColor Red
    exit 1
}

Set-Location $root

if (-not (Test-Path (Join-Path $root 'node_modules'))) {
    Write-Host 'Installiere Abhängigkeiten (npm install)…' -ForegroundColor Yellow
    npm install
}

# Sicherstellen, dass KEIN Demo-Modus aktiv ist
Remove-Item Env:DASHBOARD_DEMO -ErrorAction SilentlyContinue
Write-Host 'Starte Vollversion…' -ForegroundColor Green
npm start
