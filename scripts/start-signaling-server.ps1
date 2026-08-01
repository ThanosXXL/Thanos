<#
    IT Schulungsmaßnahmen – Signaling-Server für den echten Mehrgeräte-Video-Chat

    Ohne diesen Server sind "Teilnehmer" im Video-Chat nur lokale Platzhalter auf einem
    einzelnen Gerät. Ein Rechner (z. B. der des Dozenten, oder ein zentraler Server im
    Netzwerk) startet dieses Skript einmal; alle Geräte tragen dann im Video-Chat-Fenster
    unter "Server-Adresse" dessen Adresse ein (z. B. ws://192.168.1.10:8787) und denselben
    Raum-Code, um sich zu verbinden.

    Ausführen:  pwsh ./scripts/start-signaling-server.ps1   (optional: -Port 8787)
#>

param(
    [int]$Port = 8787
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

Write-Host '== IT Schulungsmaßnahmen – Signaling-Server ==' -ForegroundColor DarkRed

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host 'Node.js wurde nicht gefunden. Bitte von https://nodejs.org installieren.' -ForegroundColor Red
    exit 1
}

Set-Location $root

if (-not (Test-Path (Join-Path $root 'node_modules'))) {
    Write-Host 'Installiere Abhängigkeiten (npm install)…' -ForegroundColor Yellow
    npm install
}

$env:PORT = "$Port"
Write-Host "Starte Signaling-Server auf ws://localhost:$Port …" -ForegroundColor Green
Write-Host 'Andere Geräte im selben Netzwerk verwenden die lokale IP dieses Rechners statt "localhost".' -ForegroundColor Yellow
node (Join-Path $root 'server/signaling-server.js')
