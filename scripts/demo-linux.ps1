<#
    IT Schulungsmaßnahmen – Demo-Start (Linux)
    Benötigt PowerShell 7+ (pwsh) und Node.js.
    Ausführen:  pwsh ./scripts/demo-linux.ps1
#>

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

Write-Host '== IT Schulungsmaßnahmen – Demo (Linux) ==' -ForegroundColor DarkRed

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host 'Node.js wurde nicht gefunden. Bitte über den Paketmanager installieren (z. B. "sudo apt install nodejs npm").' -ForegroundColor Red
    exit 1
}

Set-Location $root

if (-not (Test-Path (Join-Path $root 'node_modules'))) {
    Write-Host 'Installiere Abhängigkeiten (npm install)…' -ForegroundColor Yellow
    npm install
}

$env:DASHBOARD_DEMO = '1'

# Electron benötigt unter manchen Linux-Umgebungen (z. B. als root/Container) die Sandbox-Option.
$startArgs = @()
if ($env:ELECTRON_DISABLE_SANDBOX -eq '1') {
    $startArgs = @('--', '--no-sandbox')
}

Write-Host 'Starte Demo…' -ForegroundColor Green
npm start @startArgs
