#Requires -Version 5.1
<#
.SYNOPSIS
    Hilfsskript für Kollegen, um RadarAlarm-Projektdaten (Projekte, Mängel, Team)
    direkt zu bearbeiten, ohne die App öffnen zu müssen.

.BESCHREIBUNG
    RadarAlarm speichert alle Daten lokal in einer JSON-Datei unter
    %APPDATA%\radaralarm\radaralarm-data.json. Dieses Skript lädt diese Datei,
    stellt Funktionen zum Anlegen/Bearbeiten von Projekten, Mängeln und
    Team-Mitgliedern bereit und schreibt die Datei danach wieder zurück
    (inklusive automatischem Backup vor jedem Schreibvorgang).

    WICHTIG:
    - RadarAlarm vorher schließen! Läuft die App noch, überschreibt sie beim
      nächsten Speichern diese Änderungen wieder mit ihrem eigenen Stand.
    - Die Demo-Version begrenzt auf max. 2 Projekte und max. 8 Mängel pro
      Projekt (serverseitig in main.js geprüft). Dieses Skript hält sich an
      dieselben Grenzen, damit die App die Datei danach noch speichern kann.

.VERWENDUNG
    1. Dieses Skript in der PowerShell "dot-sourcen" (mit führendem Punkt!):
         . .\RadarAlarm-Verwaltung.ps1

    2. Danach stehen folgende Befehle zur Verfügung:
         Get-RadarAlarmProjekte
         Neues-RadarAlarmProjekt -Name "Wohnanlage Lindenallee 12" -Adresse "Lindenallee 12, Düsseldorf"
         Get-RadarAlarmMaengel -Projekt "Wohnanlage Lindenallee 12"
         Neuer-RadarAlarmMangel -Projekt "Wohnanlage Lindenallee 12" -Titel "Steckdose defekt" -Prioritaet hoch -Gewerk Elektro
         Bearbeite-RadarAlarmMangel -MangelId "abc123" -Status in_bearbeitung -Kommentar "Termin vereinbart"
         Neues-RadarAlarmTeammitglied -Projekt "Wohnanlage Lindenallee 12" -Name "Markus Weber" -Rolle Bauleitung

       Oder einfach das interaktive Menü starten:
         Show-RadarAlarmMenue

.HINWEIS
    Dieses Skript wurde unter PowerShell 7 entwickelt und getestet. Es sollte
    auch unter der auf Windows vorinstallierten PowerShell 5.1 funktionieren,
    wurde dort aber nicht in einer echten Windows-Umgebung gegengetestet -
    bei Auffälligkeiten bitte kurz Rückmeldung geben.
#>

if ($env:APPDATA) {
    # Normalfall unter Windows
    $script:RadarAlarmDatenpfad = Join-Path $env:APPDATA 'radaralarm\radaralarm-data.json'
} else {
    # Fallback für macOS/Linux bzw. falls APPDATA ausnahmsweise nicht gesetzt ist
    $script:RadarAlarmDatenpfad = Join-Path $HOME '.config/radaralarm/radaralarm-data.json'
}
$script:DemoMaxProjekte = 2
$script:DemoMaxMaengelProProjekt = 8
$script:GueltigeStatus = @('offen', 'in_bearbeitung', 'erledigt')
$script:GueltigePrioritaeten = @('normal', 'hoch', 'dringend')
$script:GueltigeRollen = @('Bauleitung', 'Architektur', 'Gewerk', 'Auftraggeber')

function ConvertTo-Base36 {
    param([Parameter(Mandatory)][long]$Zahl)
    # [Convert]::ToString unterstützt nur Basis 2/8/10/16 - Basis 36 (wie bei
    # JavaScripts Number.toString(36), das die App für IDs nutzt) von Hand:
    $zeichen = '0123456789abcdefghijklmnopqrstuvwxyz'
    if ($Zahl -eq 0) { return '0' }
    $ergebnis = ''
    $rest = $Zahl
    while ($rest -gt 0) {
        $ergebnis = $zeichen[$rest % 36] + $ergebnis
        $rest = [long]([math]::Floor($rest / 36))
    }
    return $ergebnis
}

function New-RadarAlarmId {
    # Entspricht dem Format der App (Zeitstempel + Zufallsanteil, Basis 36)
    $zeit = ConvertTo-Base36 -Zahl ([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())
    $zufall = -join ((48..57) + (97..122) | Get-Random -Count 6 | ForEach-Object { [char]$_ })
    return "$zeit$zufall"
}

function Get-RadarAlarmZeitstempel {
    return (Get-Date).ToString('dd.MM. HH:mm')
}

function Test-RadarAlarmAppLaeuft {
    $prozess = Get-Process -Name 'RadarAlarm*', 'electron' -ErrorAction SilentlyContinue
    if ($prozess) {
        Write-Warning 'Es läuft noch ein Prozess, der RadarAlarm sein könnte. Bitte die App schließen, bevor du speicherst - sonst werden deine Änderungen beim nächsten Speichern der App wieder überschrieben.'
    }
}

function Get-RadarAlarmData {
    if (-not (Test-Path $script:RadarAlarmDatenpfad)) {
        Write-Warning "Keine Datendatei unter $script:RadarAlarmDatenpfad gefunden - RadarAlarm wurde hier wahrscheinlich noch nie gestartet."
        return [PSCustomObject]@{ projects = @() }
    }
    $roh = Get-Content -Path $script:RadarAlarmDatenpfad -Raw -Encoding UTF8
    $daten = $roh | ConvertFrom-Json
    if (-not $daten.projects) {
        $daten | Add-Member -NotePropertyName projects -NotePropertyValue @() -Force
    }
    # Arrays nach dem JSON-Parsen immer explizit als Array behandeln, auch bei
    # 0 oder 1 Element (sonst behandelt PowerShell sie stellenweise als Skalar).
    $daten.projects = @($daten.projects)
    foreach ($projekt in $daten.projects) {
        if (-not $projekt.defects) { $projekt | Add-Member -NotePropertyName defects -NotePropertyValue @() -Force }
        if (-not $projekt.team) { $projekt | Add-Member -NotePropertyName team -NotePropertyValue @() -Force }
        $projekt.defects = @($projekt.defects)
        $projekt.team = @($projekt.team)
        foreach ($mangel in $projekt.defects) {
            if (-not $mangel.comments) { $mangel | Add-Member -NotePropertyName comments -NotePropertyValue @() -Force }
            if (-not $mangel.activity) { $mangel | Add-Member -NotePropertyName activity -NotePropertyValue @() -Force }
            $mangel.comments = @($mangel.comments)
            $mangel.activity = @($mangel.activity)
        }
    }
    return $daten
}

function Save-RadarAlarmData {
    param(
        [Parameter(Mandatory)]
        $Daten
    )
    Test-RadarAlarmAppLaeuft

    $ordner = Split-Path $script:RadarAlarmDatenpfad -Parent
    if (-not (Test-Path $ordner)) {
        New-Item -ItemType Directory -Path $ordner -Force | Out-Null
    }

    if (Test-Path $script:RadarAlarmDatenpfad) {
        $backupPfad = $script:RadarAlarmDatenpfad + '.bak-' + (Get-Date -Format 'yyyyMMdd-HHmmss')
        Copy-Item -Path $script:RadarAlarmDatenpfad -Destination $backupPfad -Force
        Write-Host "Backup erstellt: $backupPfad" -ForegroundColor DarkGray
    }

    $json = $Daten | ConvertTo-Json -Depth 15
    Set-Content -Path $script:RadarAlarmDatenpfad -Value $json -Encoding UTF8
    Write-Host "Gespeichert: $script:RadarAlarmDatenpfad" -ForegroundColor Green
}

function Find-RadarAlarmProjekt {
    param($Daten, [string]$Projekt)
    $treffer = $Daten.projects | Where-Object { $_.id -eq $Projekt -or $_.name -eq $Projekt }
    if (-not $treffer) {
        throw "Kein Projekt gefunden mit Name/ID '$Projekt'. Nutze Get-RadarAlarmProjekte zur Übersicht."
    }
    if (@($treffer).Count -gt 1) {
        throw "Mehrere Projekte heißen '$Projekt' - bitte stattdessen die eindeutige Projekt-ID verwenden (siehe Get-RadarAlarmProjekte)."
    }
    return $treffer
}

function Find-RadarAlarmMangel {
    param($Daten, [string]$MangelId)
    foreach ($projekt in $Daten.projects) {
        $treffer = $projekt.defects | Where-Object { $_.id -eq $MangelId }
        if ($treffer) {
            return [PSCustomObject]@{ Projekt = $projekt; Mangel = $treffer }
        }
    }
    throw "Kein Mangel mit ID '$MangelId' gefunden."
}

function Get-RadarAlarmProjekte {
    <# .SYNOPSIS Listet alle Projekte mit ID, Name, Adresse und Mängel-Anzahl auf. #>
    $daten = Get-RadarAlarmData
    if ($daten.projects.Count -eq 0) {
        Write-Host 'Keine Projekte vorhanden.'
        return
    }
    $daten.projects | ForEach-Object {
        [PSCustomObject]@{
            Id       = $_.id
            Name     = $_.name
            Adresse  = $_.address
            Maengel  = @($_.defects).Count
            Team     = @($_.team).Count
        }
    } | Format-Table -AutoSize
}

function Neues-RadarAlarmProjekt {
    <# .SYNOPSIS Legt ein neues Projekt an (max. 2 Projekte in der Demo-Version). #>
    param(
        [Parameter(Mandatory)][ValidateLength(1, 80)][string]$Name,
        [ValidateLength(0, 120)][string]$Adresse = ''
    )
    $daten = Get-RadarAlarmData
    if (@($daten.projects).Count -ge $script:DemoMaxProjekte) {
        throw "Demo-Grenze erreicht: maximal $script:DemoMaxProjekte Projekte. Lösche ggf. erst ein bestehendes Projekt in der App."
    }
    $neu = [PSCustomObject]@{
        id      = New-RadarAlarmId
        name    = $Name
        address = $Adresse
        floors  = @([PSCustomObject]@{ id = New-RadarAlarmId; name = 'Erdgeschoss'; image = $null })
        pins    = @()
        team    = @()
        defects = @()
    }
    $daten.projects = @($daten.projects) + $neu
    Save-RadarAlarmData -Daten $daten
    Write-Host "Projekt angelegt: $Name (ID: $($neu.id))" -ForegroundColor Cyan
    return $neu
}

function Get-RadarAlarmMaengel {
    <# .SYNOPSIS Listet alle Mängel eines Projekts auf. #>
    param([Parameter(Mandatory)][string]$Projekt)
    $daten = Get-RadarAlarmData
    $p = Find-RadarAlarmProjekt -Daten $daten -Projekt $Projekt
    if (@($p.defects).Count -eq 0) {
        Write-Host "Keine Mängel in '$($p.name)' vorhanden."
        return
    }
    $p.defects | ForEach-Object {
        $mangel = $_
        $zugewiesen = '-'
        if ($mangel.assigneeId) {
            $mitglied = $p.team | Where-Object { $_.id -eq $mangel.assigneeId } | Select-Object -First 1
            if ($mitglied) { $zugewiesen = $mitglied.name }
        }
        [PSCustomObject]@{
            Id        = $mangel.id
            Titel     = $mangel.title
            Status    = $mangel.status
            Prioritaet = $mangel.priority
            Gewerk    = $mangel.trade
            Faellig   = $mangel.dueDate
            Zugewiesen = $zugewiesen
        }
    } | Format-Table -AutoSize
}

function Neuer-RadarAlarmMangel {
    <# .SYNOPSIS Legt einen neuen Mangel in einem Projekt an (max. 8 pro Projekt). #>
    param(
        [Parameter(Mandatory)][string]$Projekt,
        [Parameter(Mandatory)][ValidateLength(1, 100)][string]$Titel,
        [ValidateLength(0, 500)][string]$Beschreibung = '',
        [ValidateSet('normal', 'hoch', 'dringend')][string]$Prioritaet = 'normal',
        [ValidateLength(0, 60)][string]$Gewerk = '',
        [string]$FaelligAm = $null,
        [string]$ZugewiesenAn = $null
    )
    $daten = Get-RadarAlarmData
    $p = Find-RadarAlarmProjekt -Daten $daten -Projekt $Projekt
    if (@($p.defects).Count -ge $script:DemoMaxMaengelProProjekt) {
        throw "Demo-Grenze erreicht: maximal $script:DemoMaxMaengelProProjekt Mängel pro Projekt."
    }

    $zugewiesenId = $null
    if ($ZugewiesenAn) {
        $mitglied = $p.team | Where-Object { $_.id -eq $ZugewiesenAn -or $_.name -eq $ZugewiesenAn }
        if (-not $mitglied) {
            throw "Team-Mitglied '$ZugewiesenAn' nicht gefunden. Nutze Neues-RadarAlarmTeammitglied, um es zuerst anzulegen."
        }
        $zugewiesenId = $mitglied.id
    }

    $neu = [PSCustomObject]@{
        id          = New-RadarAlarmId
        title       = $Titel
        description = $Beschreibung
        status      = 'offen'
        priority    = $Prioritaet
        trade       = $Gewerk
        dueDate     = $FaelligAm
        assigneeId  = $zugewiesenId
        photo       = $null
        pinId       = $null
        comments    = @()
        activity    = @([PSCustomObject]@{ id = New-RadarAlarmId; text = 'Mangel erstellt (per PowerShell-Skript).'; time = Get-RadarAlarmZeitstempel })
    }
    $p.defects = @($p.defects) + $neu
    Save-RadarAlarmData -Daten $daten
    Write-Host "Mangel angelegt: $Titel (ID: $($neu.id)) in Projekt '$($p.name)'" -ForegroundColor Cyan
    return $neu
}

function Bearbeite-RadarAlarmMangel {
    <# .SYNOPSIS Bearbeitet einen bestehenden Mangel (nur angegebene Felder werden geändert). #>
    param(
        [Parameter(Mandatory)][string]$MangelId,
        [ValidateSet('offen', 'in_bearbeitung', 'erledigt')][string]$Status,
        [ValidateSet('normal', 'hoch', 'dringend')][string]$Prioritaet,
        [ValidateLength(0, 60)][string]$Gewerk,
        [string]$FaelligAm,
        [ValidateLength(0, 500)][string]$Beschreibung,
        [string]$ZugewiesenAn,
        [string]$Kommentar
    )
    $daten = Get-RadarAlarmData
    $treffer = Find-RadarAlarmMangel -Daten $daten -MangelId $MangelId
    $mangel = $treffer.Mangel
    $projekt = $treffer.Projekt

    if ($PSBoundParameters.ContainsKey('Status')) {
        $mangel.status = $Status
        $mangel.activity = @($mangel.activity) + [PSCustomObject]@{ id = New-RadarAlarmId; text = "Status geändert zu: $Status"; time = Get-RadarAlarmZeitstempel }
    }
    if ($PSBoundParameters.ContainsKey('Prioritaet')) { $mangel.priority = $Prioritaet }
    if ($PSBoundParameters.ContainsKey('Gewerk')) { $mangel.trade = $Gewerk }
    if ($PSBoundParameters.ContainsKey('FaelligAm')) { $mangel.dueDate = $FaelligAm }
    if ($PSBoundParameters.ContainsKey('Beschreibung')) { $mangel.description = $Beschreibung }
    if ($PSBoundParameters.ContainsKey('ZugewiesenAn')) {
        $mitglied = $projekt.team | Where-Object { $_.id -eq $ZugewiesenAn -or $_.name -eq $ZugewiesenAn }
        if (-not $mitglied) { throw "Team-Mitglied '$ZugewiesenAn' nicht gefunden." }
        $mangel.assigneeId = $mitglied.id
        $mangel.activity = @($mangel.activity) + [PSCustomObject]@{ id = New-RadarAlarmId; text = "Zugewiesen an $($mitglied.name)."; time = Get-RadarAlarmZeitstempel }
    }
    if ($PSBoundParameters.ContainsKey('Kommentar') -and $Kommentar) {
        $mangel.comments = @($mangel.comments) + [PSCustomObject]@{ id = New-RadarAlarmId; text = $Kommentar; time = Get-RadarAlarmZeitstempel }
    }

    Save-RadarAlarmData -Daten $daten
    Write-Host "Mangel aktualisiert: $($mangel.title)" -ForegroundColor Cyan
    return $mangel
}

function Neues-RadarAlarmTeammitglied {
    <# .SYNOPSIS Fügt einem Projekt ein Team-Mitglied hinzu. #>
    param(
        [Parameter(Mandatory)][string]$Projekt,
        [Parameter(Mandatory)][ValidateLength(1, 60)][string]$Name,
        [ValidateSet('Bauleitung', 'Architektur', 'Gewerk', 'Auftraggeber')][string]$Rolle = 'Gewerk'
    )
    $daten = Get-RadarAlarmData
    $p = Find-RadarAlarmProjekt -Daten $daten -Projekt $Projekt
    $neu = [PSCustomObject]@{ id = New-RadarAlarmId; name = $Name; role = $Rolle }
    $p.team = @($p.team) + $neu
    Save-RadarAlarmData -Daten $daten
    Write-Host "Team-Mitglied hinzugefügt: $Name ($Rolle) zu Projekt '$($p.name)'" -ForegroundColor Cyan
    return $neu
}

function Show-RadarAlarmMenue {
    <# .SYNOPSIS Einfaches interaktives Textmenü für Kolleg:innen, die keine Befehle tippen möchten. #>
    while ($true) {
        Write-Host ''
        Write-Host '=== RadarAlarm-Verwaltung ===' -ForegroundColor Yellow
        Write-Host '1) Projekte anzeigen'
        Write-Host '2) Neues Projekt anlegen'
        Write-Host '3) Mängel eines Projekts anzeigen'
        Write-Host '4) Neuen Mangel anlegen'
        Write-Host '5) Mangel bearbeiten'
        Write-Host '6) Team-Mitglied hinzufügen'
        Write-Host '0) Beenden'
        $auswahl = Read-Host 'Auswahl'
        try {
            switch ($auswahl) {
                '1' { Get-RadarAlarmProjekte }
                '2' {
                    $n = Read-Host 'Projektname'
                    $a = Read-Host 'Adresse (optional)'
                    Neues-RadarAlarmProjekt -Name $n -Adresse $a
                }
                '3' {
                    $p = Read-Host 'Projektname oder -ID'
                    Get-RadarAlarmMaengel -Projekt $p
                }
                '4' {
                    $p = Read-Host 'Projektname oder -ID'
                    $t = Read-Host 'Titel'
                    $prio = Read-Host 'Priorität (normal/hoch/dringend, leer = normal)'
                    if (-not $prio) { $prio = 'normal' }
                    $gewerk = Read-Host 'Gewerk (optional)'
                    Neuer-RadarAlarmMangel -Projekt $p -Titel $t -Prioritaet $prio -Gewerk $gewerk
                }
                '5' {
                    $id = Read-Host 'Mangel-ID (siehe Menüpunkt 3)'
                    $status = Read-Host 'Neuer Status (offen/in_bearbeitung/erledigt, leer = unverändert)'
                    $kommentar = Read-Host 'Kommentar hinzufügen (optional)'
                    if ($status) {
                        Bearbeite-RadarAlarmMangel -MangelId $id -Status $status -Kommentar $kommentar
                    } else {
                        Bearbeite-RadarAlarmMangel -MangelId $id -Kommentar $kommentar
                    }
                }
                '6' {
                    $p = Read-Host 'Projektname oder -ID'
                    $n = Read-Host 'Name'
                    $r = Read-Host 'Rolle (Bauleitung/Architektur/Gewerk/Auftraggeber)'
                    Neues-RadarAlarmTeammitglied -Projekt $p -Name $n -Rolle $r
                }
                '0' { return }
                default { Write-Host 'Ungültige Auswahl.' -ForegroundColor Red }
            }
        } catch {
            Write-Host "Fehler: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

Write-Host "RadarAlarm-Verwaltung geladen. Datenpfad: $script:RadarAlarmDatenpfad" -ForegroundColor DarkGray
Write-Host "Tippe 'Show-RadarAlarmMenue' für ein Menü, oder nutze die einzelnen Funktionen direkt (siehe Get-Help .\RadarAlarm-Verwaltung.ps1 -Full)." -ForegroundColor DarkGray
