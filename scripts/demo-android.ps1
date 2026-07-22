<#
    IT Schulungsmaßnahmen – Demo für Android

    Hinweis: Die interaktive App ist eine Electron-Desktop-Anwendung und läuft
    NICHT nativ unter Android. Die für Mobilgeräte gedachte Demo ist daher die
    gestaltete PDF-Broschüre (mit Beispielbildern im bekannten Farbschema), die
    sich auf jedem Android-Gerät öffnen lässt.

    Dieses Skript wird auf einem Rechner (Windows/macOS/Linux) ausgeführt und
    erzeugt die Android-Ausgabe als PDF. Anschließend die Datei auf das Android-
    Gerät übertragen (USB, E-Mail, Cloud) und mit einem PDF-Viewer öffnen.

    Ausführen:  pwsh ./scripts/demo-android.ps1
#>

$ErrorActionPreference = 'Stop'

Write-Host '== IT Schulungsmaßnahmen – Demo-PDF für Android ==' -ForegroundColor DarkRed
Write-Host 'Electron läuft nicht auf Android – es wird die themierte PDF-Broschüre erzeugt.' -ForegroundColor Yellow

& (Join-Path $PSScriptRoot 'create-pdf.ps1') -Label 'Android'

Write-Host 'Fertig. Die PDF-Datei "IT-Schulungsmassnahmen-Demo-Android.pdf" auf das' -ForegroundColor Green
Write-Host 'Android-Gerät übertragen und dort mit einem PDF-Viewer öffnen.' -ForegroundColor Green
