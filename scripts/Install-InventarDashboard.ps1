<#
.SYNOPSIS
    Lädt die neueste Version des Inventar - Dashboard
    automatisch von GitHub Releases herunter, speichert sie auf dem Desktop und
    startet den Installer.

.DESCRIPTION
    Dieses Skript ist die "1-Klick"-Automatisierung hinter dem Download-Button auf
    der Download-Seite (docs/download.html). Eine gewöhnliche Webseite kann aus
    Sicherheitsgründen KEINE Datei unsichtbar auf den Desktop schreiben und
    ausführen (das würde jeder Browser blockieren, weil es wie das Verhalten von
    Schadsoftware aussieht). Ein Skript, das der Nutzer bewusst selbst startet,
    darf das aber ganz normal – genau das übernimmt dieses Skript:

      1. Fragt die GitHub-API nach dem neuesten Release des Projekts.
      2. Sucht darin die Windows-Installer-Datei (*.exe, per NSIS gebaut).
      3. Lädt sie direkt in den Desktop-Ordner des aktuellen Benutzers herunter.
      4. Startet den Installer (außer bei -NoRun), optional komplett unbeaufsichtigt
         mit -Silent.

    Dieses Skript dient gleichzeitig als technische Kurzanleitung ("Admin-Handbuch")
    zur Installationsautomatisierung – siehe die Kommentare in jedem Abschnitt.

.PARAMETER Repo
    GitHub-Repository im Format "Besitzer/Name". Standard: ThanosXXL/Thanos.

.PARAMETER DestinationFolder
    Zielordner für den Download. Standard: der Desktop-Ordner des aktuellen Benutzers
    (inkl. per OneDrive umgeleiteter Desktop-Ordner).

.PARAMETER Silent
    Führt den heruntergeladenen NSIS-Installer unbeaufsichtigt aus (Schalter /S),
    ohne Installations-Assistenten. Ohne diesen Parameter öffnet sich der normale,
    sichtbare Installations-Assistent.

.PARAMETER NoRun
    Lädt die Installer-Datei nur herunter, startet sie aber nicht automatisch.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\Install-InventarDashboard.ps1

    Lädt die aktuellste Version herunter, speichert sie auf dem Desktop und öffnet
    danach den normalen Installations-Assistenten.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\Install-InventarDashboard.ps1 -Silent

    Lädt herunter und installiert vollständig unbeaufsichtigt (z. B. für IT-Rollouts).

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\Install-InventarDashboard.ps1 -NoRun

    Lädt die Installer-Datei nur auf den Desktop, startet sie aber nicht.

.NOTES
    © 2026 Inventar - Dashboard – Alle Rechte vorbehalten.
    Hinweis: Eine Windows-Konsole kann keinen echten Gold/Braun-3D-Hochglanz-Stil
    darstellen wie die App selbst – die Banner unten nutzen daher die nächstliegenden
    Konsolenfarben (Gelb/DarkYellow) als Annäherung an das Gold/Braun-Farbschema.
#>

[CmdletBinding()]
param(
    [string]$Repo = 'ThanosXXL/Thanos',
    [string]$DestinationFolder = [Environment]::GetFolderPath('Desktop'),
    [switch]$Silent,
    [switch]$NoRun
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

function Write-GoldBanner {
    param([string]$Text)
    Write-Host ''
    Write-Host ('=' * 62) -ForegroundColor DarkYellow
    Write-Host ("  $Text") -ForegroundColor Yellow
    Write-Host ('=' * 62) -ForegroundColor DarkYellow
}

function Write-Step {
    param([string]$Text)
    Write-Host "  -> $Text" -ForegroundColor Yellow
}

try {
    Write-GoldBanner 'Inventar - Dashboard - Automatischer 1-Klick-Download'

    # TLS 1.2 erzwingen, damit ältere Windows/PowerShell-Kombinationen die
    # verschlüsselte Verbindung zu GitHub zuverlässig aufbauen können.
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

    Write-Step "Suche neueste Version im Repository '$Repo'..."
    $apiUrl = "https://api.github.com/repos/$Repo/releases/latest"
    $headers = @{ 'User-Agent' = 'InventarDashboard-InstallScript' }
    $release = Invoke-RestMethod -Uri $apiUrl -Headers $headers

    $asset = $release.assets | Where-Object { $_.name -like '*.exe' } | Select-Object -First 1
    if (-not $asset) {
        throw "Im Release '$($release.tag_name)' wurde keine Windows-Installer-Datei (.exe) gefunden."
    }

    Write-Step "Gefunden: $($asset.name) (Version $($release.tag_name))"

    if (-not (Test-Path -LiteralPath $DestinationFolder)) {
        New-Item -ItemType Directory -Path $DestinationFolder -Force | Out-Null
    }
    $destPath = Join-Path $DestinationFolder $asset.name

    Write-Step "Lade herunter nach: $destPath"
    Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $destPath -Headers $headers

    if (-not (Test-Path -LiteralPath $destPath) -or (Get-Item -LiteralPath $destPath).Length -eq 0) {
        throw 'Download fehlgeschlagen oder Datei ist leer.'
    }

    Write-Step 'Download abgeschlossen.'

    if ($NoRun) {
        Write-GoldBanner "Fertig! Installer liegt bereit auf dem Desktop: $($asset.name)"
    }
    elseif ($Silent) {
        Write-Step 'Starte unbeaufsichtigte Installation (/S)...'
        Start-Process -FilePath $destPath -ArgumentList '/S' -Wait
        Write-GoldBanner 'Installation abgeschlossen (unbeaufsichtigt).'
    }
    else {
        Write-Step 'Öffne Installations-Assistenten...'
        Start-Process -FilePath $destPath
        Write-GoldBanner 'Installer gestartet - bitte den Anweisungen auf dem Bildschirm folgen.'
    }

    Write-Host ''
    Write-Host '  © 2026 Inventar - Dashboard - Alle Rechte vorbehalten.' -ForegroundColor DarkYellow
    Write-Host ''
}
catch {
    Write-Host ''
    Write-Host "  FEHLER: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host '  Bitte Internetverbindung prüfen oder die Installer-Datei manuell' -ForegroundColor Red
    Write-Host '  von https://github.com/ThanosXXL/Thanos/releases herunterladen.' -ForegroundColor Red
    Write-Host ''
    exit 1
}
