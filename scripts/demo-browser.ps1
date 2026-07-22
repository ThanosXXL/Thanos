<#
    IT Schulungsmaßnahmen – Browser-Demo

    Startet einen kleinen lokalen Webserver und öffnet die Oberfläche im
    Standard-Browser. Es ist KEIN Electron nötig – Daten werden im Browser
    (localStorage) gespeichert. Kamera/Bildschirmfreigabe funktionieren, weil
    die Seite über http://localhost läuft (sicherer Kontext).

    Benötigt Node.js und PowerShell 7+/Windows PowerShell.
    Ausführen:  pwsh ./scripts/demo-browser.ps1   (optional: -Port 4173)
#>

param(
    [int]$Port = 4173
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host 'Node.js wurde nicht gefunden. Bitte von https://nodejs.org installieren.' -ForegroundColor Red
    exit 1
}

$onWindows = if ($null -ne $IsWindows) { $IsWindows } else { $true }
$onMac = if ($null -ne $IsMacOS) { $IsMacOS } else { $false }
$onLinux = if ($null -ne $IsLinux) { $IsLinux } else { $false }

$url = "http://localhost:$Port"
$env:PORT = "$Port"

Write-Host '== IT Schulungsmaßnahmen – Browser-Demo ==' -ForegroundColor DarkRed
Write-Host "Starte lokalen Server auf $url …" -ForegroundColor Green

# Server im Hintergrund starten
$serve = Start-Process -FilePath 'node' `
    -ArgumentList (Join-Path $root 'scripts/serve.js') `
    -PassThru

Start-Sleep -Seconds 1

# Standard-Browser öffnen
try {
    if ($onWindows) { Start-Process $url }
    elseif ($onMac) { & open $url }
    elseif ($onLinux) { & xdg-open $url }
    else { Write-Host "Bitte im Browser öffnen: $url" -ForegroundColor Yellow }
}
catch {
    Write-Host "Konnte den Browser nicht automatisch öffnen. Bitte manuell öffnen: $url" -ForegroundColor Yellow
}

Write-Host "Server läuft (PID $($serve.Id)). Zum Beenden dieses Fenster schließen oder den Prozess stoppen." -ForegroundColor Green
Wait-Process -Id $serve.Id
