<#
    IT Schulungsmaßnahmen – Demo für iOS (iPhone/iPad)

    Hinweis: Die interaktive App ist eine Electron-Desktop-Anwendung und läuft
    NICHT nativ unter iOS. Die für Mobilgeräte gedachte Demo ist daher die
    gestaltete PDF-Broschüre (mit Beispielbildern im bekannten Farbschema), die
    sich auf iPhone/iPad öffnen lässt.

    Dieses Skript wird auf einem Rechner (Windows/macOS/Linux) ausgeführt und
    erzeugt die iOS-Ausgabe als PDF. Anschließend die Datei auf das iOS-Gerät
    übertragen (AirDrop, E-Mail, iCloud) und in Dateien/Bücher öffnen.

    Ausführen:  pwsh ./scripts/demo-ios.ps1
#>

$ErrorActionPreference = 'Stop'

Write-Host '== IT Schulungsmaßnahmen – Demo-PDF für iOS ==' -ForegroundColor DarkRed
Write-Host 'Electron läuft nicht auf iOS – es wird die themierte PDF-Broschüre erzeugt.' -ForegroundColor Yellow

& (Join-Path $PSScriptRoot 'create-pdf.ps1') -Label 'iOS' -Edition 'Demo'

Write-Host 'Fertig. Die PDF-Datei "IT-Schulungsmassnahmen-Demo-iOS.pdf" auf das' -ForegroundColor Green
Write-Host 'iOS-Gerät übertragen (z. B. AirDrop) und in "Dateien" oder "Bücher" öffnen.' -ForegroundColor Green
