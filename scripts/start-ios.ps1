<#
    IT Schulungsmaßnahmen – VOLLVERSION für iOS (iPhone/iPad)

    Hinweis: Die interaktive App ist eine Electron-Desktop-Anwendung und läuft
    NICHT nativ unter iOS. Die iOS-Ausgabe der Vollversion ist daher die
    gestaltete PDF-Broschüre (mit 3D-Beispielbildern im bekannten Farbschema),
    die sich auf iPhone/iPad öffnen lässt.

    Ausführen:  pwsh ./scripts/start-ios.ps1
#>

$ErrorActionPreference = 'Stop'

Write-Host '== IT Schulungsmaßnahmen – Vollversion-PDF für iOS ==' -ForegroundColor DarkRed
Write-Host 'Electron läuft nicht auf iOS – es wird die Vollversion als PDF erzeugt.' -ForegroundColor Yellow

& (Join-Path $PSScriptRoot 'create-pdf.ps1') -Label 'iOS' -Edition 'Vollversion'

Write-Host 'Fertig. "IT-Schulungsmassnahmen-Vollversion-iOS.pdf" auf das iOS-Gerät' -ForegroundColor Green
Write-Host 'übertragen (z. B. AirDrop) und in "Dateien" oder "Bücher" öffnen.' -ForegroundColor Green
