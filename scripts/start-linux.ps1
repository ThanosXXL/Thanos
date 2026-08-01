<#
    IT Schulungsmaßnahmen – VOLLVERSION starten (Linux)
    Startet die echte Anwendung mit persistenter Datei-Speicherung (kein Demo-Modus).
    Benötigt PowerShell 7+ (pwsh) und Node.js.
    Ausführen:  pwsh ./scripts/start-linux.ps1
#>

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

Write-Host '== IT Schulungsmaßnahmen – Vollversion (Linux) ==' -ForegroundColor DarkRed

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host 'Node.js wurde nicht gefunden. Bitte über den Paketmanager installieren (z. B. "sudo apt install nodejs npm").' -ForegroundColor Red
    exit 1
}

Set-Location $root

if (-not (Test-Path (Join-Path $root 'node_modules'))) {
    Write-Host 'Installiere Abhängigkeiten (npm install)…' -ForegroundColor Yellow
    npm install
}

Remove-Item Env:DASHBOARD_DEMO -ErrorAction SilentlyContinue

$startArgs = @()
if ($env:ELECTRON_DISABLE_SANDBOX -eq '1') {
    $startArgs = @('--', '--no-sandbox')
}

Write-Host 'Starte Vollversion…' -ForegroundColor Green
npm start @startArgs
