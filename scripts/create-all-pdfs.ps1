<#
    IT Schulungsmaßnahmen – alle Vollversion-PDFs erzeugen

    Erstellt für jede Plattform eine eigene PDF-Datei mit 3D-Beispielbildern und
    Copyright im bekannten Farbschema:
      - IT-Schulungsmassnahmen-Vollversion-Windows.pdf
      - IT-Schulungsmassnahmen-Vollversion-Mac.pdf
      - IT-Schulungsmassnahmen-Vollversion-Android.pdf
      - IT-Schulungsmassnahmen-Vollversion-iOS.pdf
      - IT-Schulungsmassnahmen-Vollversion-Browser.pdf

    Ausführen:  pwsh ./scripts/create-all-pdfs.ps1 [-OutDir <Ordner>]
#>

param(
    [string]$OutDir = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = 'Stop'

$platforms = @('Windows', 'Mac', 'Android', 'iOS', 'Browser')

Write-Host '== Erzeuge Vollversion-PDFs für alle Plattformen ==' -ForegroundColor DarkRed

foreach ($p in $platforms) {
    Write-Host "-> $p" -ForegroundColor Green
    & (Join-Path $PSScriptRoot 'create-pdf.ps1') -OutDir $OutDir -Label $p -Edition 'Vollversion'
}

Write-Host 'Alle Vollversion-PDFs wurden erzeugt.' -ForegroundColor Green
