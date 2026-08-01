<#
    IT Schulungsmaßnahmen – VOLLVERSION für Android

    Hinweis: Die interaktive App ist eine Electron-Desktop-Anwendung und läuft
    NICHT nativ unter Android. Die Android-Ausgabe der Vollversion ist daher die
    gestaltete PDF-Broschüre (mit 3D-Beispielbildern im bekannten Farbschema),
    die sich auf jedem Android-Gerät öffnen lässt.

    Ausführen:  pwsh ./scripts/start-android.ps1
#>

$ErrorActionPreference = 'Stop'

Write-Host '== IT Schulungsmaßnahmen – Vollversion-PDF für Android ==' -ForegroundColor DarkRed
Write-Host 'Electron läuft nicht auf Android – es wird die Vollversion als PDF erzeugt.' -ForegroundColor Yellow

& (Join-Path $PSScriptRoot 'create-pdf.ps1') -Label 'Android' -Edition 'Vollversion'

Write-Host 'Fertig. "IT-Schulungsmassnahmen-Vollversion-Android.pdf" auf das Gerät' -ForegroundColor Green
Write-Host 'übertragen und mit einem PDF-Viewer öffnen.' -ForegroundColor Green
