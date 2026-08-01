<#
    IT Schulungsmaßnahmen – PDF-Generator
    Erzeugt eine gestaltete Demo-Broschüre als PDF im bekannten Farbschema:
      - Sandton/Beige-Hintergrund
      - weiße "Folienfläche"
      - dunkelrote Headlines
      - Beispielbilder (eingebettete Grafiken)
      - Copyright ganz unten auf jeder Seite

    Das Skript baut zunächst eine HTML-Datei und rendert sie anschließend über
    einen im System vorhandenen Chromium/Chrome/Edge headless zu PDF. Ist kein
    Browser vorhanden, bleibt die HTML-Datei erhalten und kann manuell als PDF
    gedruckt werden.

    Ausführen:  pwsh ./scripts/create-pdf.ps1 [-OutDir <Ordner>]
#>

param(
    [string]$OutDir = (Split-Path -Parent $PSScriptRoot),
    # Optionales Plattform-Label (z. B. Windows, Mac, Android, iOS, Browser).
    [string]$Label = '',
    # Ausgabe-Edition: 'Vollversion' (Standard) oder 'Demo'.
    [string]$Edition = 'Vollversion'
)

$ErrorActionPreference = 'Stop'

$year = (Get-Date).Year
$genDate = (Get-Date).ToString('dd.MM.yyyy HH:mm')

$editionSafe = ($Edition -replace '[^\w\-]', '')
$suffix = if ($Label) { '-' + ($Label -replace '[^\w\-]', '') } else { '' }
$platformNote = if ($Label) { " &middot; Ausgabe f&uuml;r $Label" } else { '' }

$htmlPath = Join-Path $OutDir "IT-Schulungsmassnahmen-$editionSafe$suffix.html"
$pdfPath = Join-Path $OutDir "IT-Schulungsmassnahmen-$editionSafe$suffix.pdf"

# --- Beispielbilder (Mockups) als eingebettete SVG-Grafiken, 3D-Optik ---
# Die Karten sind leicht isometrisch geneigt (skewY), mit Extrusion (Tiefe) und Schlagschatten.
$imgDashboard = @'
<svg viewBox="0 0 700 400" xmlns="http://www.w3.org/2000/svg" width="100%">
  <defs>
    <linearGradient id="d-red" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#6f2d2d"/><stop offset="1" stop-color="#8c3b3b"/></linearGradient>
    <filter id="d-ds" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="12" stdDeviation="11" flood-color="#3a2a10" flood-opacity="0.30"/></filter>
  </defs>
  <ellipse cx="360" cy="382" rx="250" ry="18" fill="#000000" opacity="0.12"/>
  <g transform="translate(78,44) skewY(-7)" filter="url(#d-ds)">
    <rect x="0" y="18" width="544" height="300" rx="16" fill="#c9b98f"/>
    <rect x="0" y="0" width="544" height="300" rx="16" fill="#ffffff" stroke="#e7dcc3"/>
    <rect x="0" y="0" width="544" height="44" rx="16" fill="url(#d-red)"/>
    <text x="18" y="29" fill="#fff" font-family="Segoe UI, Arial" font-size="17" font-weight="700">IT Schulungsmaßnahmen</text>
    <rect x="16" y="56" width="120" height="18" rx="9" fill="#8c3b3b"/>
    <rect x="146" y="56" width="120" height="18" rx="9" fill="#ffffff" stroke="#5b9bd5"/>
    <g font-family="Segoe UI, Arial" font-size="11" fill="#fff">
      <rect x="16" y="90" width="162" height="196" rx="10" fill="#e6dcc4"/>
      <rect x="16" y="86" width="162" height="196" rx="10" fill="#fbf8f0" stroke="#dceaf7"/>
      <rect x="16" y="86" width="162" height="26" rx="10" fill="#14367a"/><text x="26" y="104">Liste 1 – To-Do</text>
      <rect x="192" y="90" width="162" height="196" rx="10" fill="#e6dcc4"/>
      <rect x="192" y="86" width="162" height="196" rx="10" fill="#fbf8f0" stroke="#dceaf7"/>
      <rect x="192" y="86" width="162" height="26" rx="10" fill="#5b9bd5"/><text x="202" y="104">Liste 2 – Offen</text>
      <rect x="368" y="90" width="162" height="196" rx="10" fill="#e6dcc4"/>
      <rect x="368" y="86" width="162" height="196" rx="10" fill="#fbf8f0" stroke="#dceaf7"/>
      <rect x="368" y="86" width="162" height="26" rx="10" fill="#0b1f4d"/><text x="378" y="104">Liste 3 – Erledigt</text>
    </g>
    <g fill="#111" font-family="Segoe UI, Arial" font-size="10">
      <text x="26" y="132">☑ Folien vorbereiten</text><text x="26" y="152">☐ Quiz einsammeln</text>
      <text x="202" y="132">• Abschlussprojekt</text>
      <text x="378" y="132">✓ Grundlagen-Modul</text>
    </g>
  </g>
</svg>
'@

$imgLesson = @'
<svg viewBox="0 0 700 400" xmlns="http://www.w3.org/2000/svg" width="100%">
  <defs>
    <linearGradient id="l-blue" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#0b1f4d"/><stop offset="1" stop-color="#5b9bd5"/></linearGradient>
    <filter id="l-ds" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="12" stdDeviation="11" flood-color="#1a2a44" flood-opacity="0.30"/></filter>
  </defs>
  <ellipse cx="360" cy="384" rx="255" ry="18" fill="#000000" opacity="0.12"/>
  <g transform="translate(66,40) skewY(-6)" filter="url(#l-ds)">
    <rect x="0" y="18" width="568" height="316" rx="16" fill="#c9b98f"/>
    <rect x="0" y="0" width="568" height="316" rx="16" fill="#ffffff" stroke="#e7dcc3"/>
    <rect x="0" y="0" width="568" height="40" rx="16" fill="url(#l-blue)"/>
    <text x="16" y="26" fill="#fff" font-family="Segoe UI, Arial" font-size="14" font-weight="700">Video-Live-Chat – Unterricht</text>
    <g>
      <rect x="18" y="54" width="76" height="56" rx="8" fill="#16305f"/><rect x="18" y="50" width="76" height="56" rx="8" fill="#0b1f4d"/><text x="24" y="124" fill="#111" font-family="Segoe UI,Arial" font-size="10">Dozent</text>
      <rect x="102" y="54" width="76" height="56" rx="8" fill="#1b3f86"/><rect x="102" y="50" width="76" height="56" rx="8" fill="#14367a"/><text x="120" y="124" fill="#111" font-family="Segoe UI,Arial" font-size="10">Ich</text>
      <rect x="186" y="54" width="76" height="56" rx="8" fill="#33528f"/><rect x="186" y="50" width="76" height="56" rx="8" fill="#3a5a99"/><text x="200" y="124" fill="#111" font-family="Segoe UI,Arial" font-size="10">Max</text>
    </g>
    <rect x="18" y="140" width="330" height="150" rx="10" fill="#08163a"/>
    <rect x="18" y="136" width="330" height="150" rx="10" fill="#0b1f4d"/>
    <rect x="26" y="262" width="188" height="18" rx="9" fill="#8c3b3b"/><text x="34" y="275" fill="#fff" font-family="Segoe UI,Arial" font-size="10">Live-Übertragung – Unterricht</text>
    <rect x="362" y="140" width="188" height="150" rx="10" fill="#dfe9f6"/>
    <rect x="362" y="136" width="188" height="150" rx="10" fill="#ffffff" stroke="#dceaf7"/>
    <rect x="362" y="136" width="188" height="24" rx="10" fill="#14367a"/><text x="370" y="152" fill="#fff" font-family="Segoe UI,Arial" font-size="11">Unterrichts-Chat</text>
    <g fill="#111" font-family="Segoe UI,Arial" font-size="10">
      <text x="370" y="178">Max: Frage zu Aufgabe 3?</text>
      <text x="370" y="198">⏸ Pause – Ich (10:15)</text>
    </g>
  </g>
</svg>
'@

$imgFolders = @'
<svg viewBox="0 0 700 340" xmlns="http://www.w3.org/2000/svg" width="100%">
  <defs>
    <linearGradient id="f-red" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#6f2d2d"/><stop offset="1" stop-color="#8c3b3b"/></linearGradient>
    <filter id="f-ds" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="11" stdDeviation="10" flood-color="#3a2a10" flood-opacity="0.28"/></filter>
  </defs>
  <ellipse cx="360" cy="322" rx="250" ry="16" fill="#000000" opacity="0.12"/>
  <g transform="translate(60,34) skewY(-6)" filter="url(#f-ds)">
    <rect x="0" y="16" width="286" height="256" rx="12" fill="#c9b98f"/>
    <rect x="0" y="0" width="286" height="256" rx="12" fill="#ffffff" stroke="#dceaf7"/>
    <rect x="0" y="0" width="286" height="26" rx="12" fill="url(#f-red)"/>
    <text x="10" y="18" fill="#fff" font-family="Segoe UI,Arial" font-size="12">📁 Hausaufgaben</text>
    <g font-family="Segoe UI,Arial" font-size="10" fill="#111">
      <rect x="12" y="40" width="262" height="52" rx="8" fill="#f7faff" stroke="#0b1f4d"/>
      <text x="20" y="58" font-weight="700">Max Mustermann</text><text x="20" y="76">Aufgabe 2 – Korrigiert &amp; zurückgegeben</text>
      <rect x="12" y="102" width="262" height="52" rx="8" fill="#fff" stroke="#5b9bd5"/>
      <text x="20" y="120" font-weight="700">Erika Beispiel</text><text x="20" y="138">Aufgabe 3 – Eingereicht</text>
    </g>
  </g>
  <g transform="translate(330,34) skewY(6)" filter="url(#f-ds)">
    <rect x="0" y="16" width="286" height="256" rx="12" fill="#c9b98f"/>
    <rect x="0" y="0" width="286" height="256" rx="12" fill="#ffffff" stroke="#dceaf7"/>
    <rect x="0" y="0" width="286" height="26" rx="12" fill="url(#f-red)"/>
    <text x="10" y="18" fill="#fff" font-family="Segoe UI,Arial" font-size="12">📁 Kalender – Tests &amp; Prüfungen</text>
    <rect x="12" y="40" width="262" height="30" rx="6" fill="#f2ead9"/><text x="22" y="60" fill="#8c3b3b" font-family="Segoe UI,Arial" font-size="11" font-weight="700">Dienstag, 22. Juli 2026, 14:30:05</text>
    <g font-family="Segoe UI,Arial" font-size="10" fill="#111">
      <rect x="12" y="80" width="262" height="34" rx="6" fill="#fff" stroke="#8c3b3b"/>
      <text x="20" y="94" font-weight="700">Java-Zwischentest</text><text x="20" y="108">Freitag, 25. Juli 2026, 10:00 · in 3 Tagen</text>
    </g>
  </g>
</svg>
'@

# --- HTML-Dokument im Farbschema ---
$html = @"
<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<title>IT Schulungsmaßnahmen – Demo</title>
<style>
  :root { --sand:#f2ead9; --sand-deep:#e7dcc3; --soft-dark-red:#8c3b3b; --white:#fff; --black:#111; }
  @page { size: A4; margin: 14mm 14mm 20mm 14mm; }
  * { box-sizing: border-box; }
  body { font-family: "Segoe UI", Arial, sans-serif; background: var(--sand); color: var(--black); margin: 0; }
  .page { padding: 6mm; }
  h1 { color: var(--soft-dark-red); font-size: 30px; margin: 0 0 4px 0; }
  h2 { color: var(--soft-dark-red); font-size: 20px; margin: 0 0 10px 0; border-bottom: 3px solid var(--soft-dark-red); padding-bottom: 6px; }
  .subtitle { color: #55606f; font-size: 14px; margin: 0 0 18px 0; }
  .slide { background: var(--white); border: 1px solid var(--sand-deep); border-radius: 12px; padding: 20px 22px; margin: 0 0 20px 0; box-shadow: 0 2px 8px rgba(0,0,0,0.06); page-break-inside: avoid; }
  .slide p { font-size: 13px; line-height: 1.5; color: var(--black); }
  ul { font-size: 13px; line-height: 1.6; }
  .figure { margin-top: 12px; border: 1px solid var(--sand-deep); border-radius: 8px; overflow: hidden; }
  .caption { font-size: 12px; color: #55606f; margin-top: 6px; text-align: center; }
  .copyright { position: fixed; bottom: 6mm; left: 0; right: 0; text-align: center; font-size: 11px; color: var(--soft-dark-red); }
  .hero { background: linear-gradient(90deg, #6f2d2d, var(--soft-dark-red)); color: var(--white); border-radius: 12px; padding: 24px; margin-bottom: 20px; }
  .hero h1 { color: var(--white); }
  .hero .subtitle { color: #f3e2e2; }
</style>
</head>
<body>
  <div class="page">
    <div class="hero">
      <h1>IT Schulungsmaßnahmen</h1>
      <p class="subtitle">$Edition-Broschüre · Desktop-Dashboard für Dozenten, Teilnehmende und Unterricht$platformNote</p>
    </div>

    <div class="slide">
      <h2>Dashboard &amp; Listen</h2>
      <p>Verwaltung von bis zu vier Dozenten mit To-Do-Liste, offenen und erledigten Projekten sowie Chat/Notizen – pro Dozent.</p>
      <div class="figure">$imgDashboard</div>
      <div class="caption">Beispielansicht (3D): Dozenten-Dashboard mit drei Listen</div>
    </div>

    <div class="slide">
      <h2>Video-Live-Chat &amp; Unterricht</h2>
      <p>Teilnehmer-Leiste mit kleinen Live-Kacheln und Gesamtanzahl, große Live-Übertragung des Unterrichts, Unterrichts-Chat für alle (Fragen, Pause), Privat- und Gruppenchats. Der Dozent kann alle stummschalten; gemeldete Teilnehmer werden freigeschaltet.</p>
      <div class="figure">$imgLesson</div>
      <div class="caption">Beispielansicht (3D): Unterrichts-Ansicht mit Teilnehmern und Chat</div>
    </div>

    <div class="slide">
      <h2>Ordner: Hausaufgaben &amp; Kalender</h2>
      <p>Im Hausaufgaben-Ordner reichen Teilnehmer Aufgaben ein; der Dozent korrigiert und gibt sie zurück. Der Kalender-Ordner zeigt eine Echtzeit-Uhr sowie anstehende Tests und Prüfungen mit Countdown.</p>
      <div class="figure">$imgFolders</div>
      <div class="caption">Beispielansicht (3D): Hausaufgaben-Ordner und Echtzeit-Kalender</div>
    </div>

    <div class="slide">
      <h2>Weitere Funktionen</h2>
      <ul>
        <li>Screenshot (ganzer Bildschirm) und Sniping (Bereichsauswahl) inkl. optionalem Google-Drive-Upload</li>
        <li>Audio/Video an-aus – in der Werkzeugleiste und im Video-Chat</li>
        <li>Dateifreigabe an "Nur Dozent" oder "Alle Teilnehmer"</li>
        <li>Demo-Modus mit vorbefüllten Beispieldaten (DASHBOARD_DEMO=1)</li>
      </ul>
    </div>
  </div>

  <div class="copyright">© $year IT Schulungsmaßnahmen – Alle Rechte vorbehalten. · Erstellt am $genDate</div>
</body>
</html>
"@

Set-Content -Path $htmlPath -Value $html -Encoding UTF8
Write-Host "HTML erzeugt: $htmlPath" -ForegroundColor Green

# --- Browser für Headless-PDF finden ---
function Find-Browser {
    # $IsWindows/$IsMacOS/$IsLinux gibt es ab PowerShell 7; in Windows PowerShell 5.1 = Windows.
    $onWindows = if ($null -ne $IsWindows) { $IsWindows } else { $true }
    $onMac = if ($null -ne $IsMacOS) { $IsMacOS } else { $false }
    $onLinux = if ($null -ne $IsLinux) { $IsLinux } else { $false }

    $candidates = @()
    if ($onWindows) {
        $candidates += @(
            "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
            "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
            "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
            "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
        )
    }
    if ($onMac) {
        $candidates += @(
            '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
            '/Applications/Chromium.app/Contents/MacOS/Chromium',
            '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'
        )
    }
    if ($onLinux) {
        foreach ($name in @('google-chrome', 'chromium', 'chromium-browser', 'microsoft-edge')) {
            $cmd = Get-Command $name -ErrorAction SilentlyContinue
            if ($cmd) { $candidates += $cmd.Source }
        }
    }
    foreach ($c in $candidates) {
        if ($c -and (Test-Path $c)) { return $c }
    }
    return $null
}

$browser = Find-Browser
if (-not $browser) {
    Write-Host 'Kein Chromium/Chrome/Edge gefunden – PDF wurde nicht erzeugt.' -ForegroundColor Yellow
    Write-Host "Die HTML-Datei kann manuell im Browser über 'Drucken -> Als PDF speichern' exportiert werden:" -ForegroundColor Yellow
    Write-Host "  $htmlPath"
    exit 0
}

$fileUri = ([System.Uri]$htmlPath).AbsoluteUri
Write-Host "Rendere PDF mit: $browser" -ForegroundColor Green
& $browser --headless=new --disable-gpu --no-pdf-header-footer "--print-to-pdf=$pdfPath" $fileUri 2>$null

if (Test-Path $pdfPath) {
    Write-Host "PDF erzeugt: $pdfPath" -ForegroundColor Green
} else {
    Write-Host 'PDF konnte nicht erzeugt werden. Bitte die HTML-Datei manuell drucken.' -ForegroundColor Yellow
}
