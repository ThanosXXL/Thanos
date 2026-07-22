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
    [string]$OutDir = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = 'Stop'

$year = (Get-Date).Year
$genDate = (Get-Date).ToString('dd.MM.yyyy HH:mm')

$htmlPath = Join-Path $OutDir 'IT-Schulungsmassnahmen-Demo.html'
$pdfPath = Join-Path $OutDir 'IT-Schulungsmassnahmen-Demo.pdf'

# --- Beispielbilder (Mockups) als eingebettete SVG-Grafiken ---
$imgDashboard = @'
<svg viewBox="0 0 640 340" xmlns="http://www.w3.org/2000/svg" width="100%">
  <rect x="0" y="0" width="640" height="340" rx="10" fill="#ffffff" stroke="#e7dcc3"/>
  <rect x="0" y="0" width="640" height="46" rx="10" fill="url(#g1)"/>
  <defs><linearGradient id="g1" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#6f2d2d"/><stop offset="1" stop-color="#8c3b3b"/>
  </linearGradient></defs>
  <text x="18" y="30" fill="#fff" font-family="Segoe UI, Arial" font-size="18" font-weight="700">IT Schulungsmaßnahmen</text>
  <rect x="0" y="46" width="640" height="34" fill="#e7dcc3"/>
  <rect x="14" y="54" width="120" height="18" rx="9" fill="#8c3b3b"/>
  <rect x="144" y="54" width="120" height="18" rx="9" fill="#ffffff" stroke="#5b9bd5"/>
  <g font-family="Segoe UI, Arial" font-size="11" fill="#fff">
    <rect x="18" y="96" width="192" height="220" rx="8" fill="#ffffff" stroke="#dceaf7"/>
    <rect x="26" y="104" width="176" height="24" rx="5" fill="#14367a"/><text x="34" y="120">Liste 1 – To-Do</text>
    <rect x="224" y="96" width="192" height="220" rx="8" fill="#ffffff" stroke="#dceaf7"/>
    <rect x="232" y="104" width="176" height="24" rx="5" fill="#5b9bd5"/><text x="240" y="120">Liste 2 – Offen</text>
    <rect x="430" y="96" width="192" height="220" rx="8" fill="#ffffff" stroke="#dceaf7"/>
    <rect x="438" y="104" width="176" height="24" rx="5" fill="#0b1f4d"/><text x="446" y="120">Liste 3 – Erledigt</text>
  </g>
  <g fill="#111" font-family="Segoe UI, Arial" font-size="11">
    <text x="34" y="150">☑ Folien vorbereiten</text><text x="34" y="172">☐ Quiz einsammeln</text>
    <text x="240" y="150">• Abschlussprojekt</text><text x="446" y="150">✓ Grundlagen-Modul</text>
  </g>
</svg>
'@

$imgLesson = @'
<svg viewBox="0 0 640 340" xmlns="http://www.w3.org/2000/svg" width="100%">
  <rect x="0" y="0" width="640" height="340" rx="10" fill="#ffffff" stroke="#e7dcc3"/>
  <rect x="0" y="0" width="640" height="40" rx="10" fill="url(#g2)"/>
  <defs><linearGradient id="g2" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#0b1f4d"/><stop offset="1" stop-color="#5b9bd5"/>
  </linearGradient></defs>
  <text x="16" y="26" fill="#fff" font-family="Segoe UI, Arial" font-size="14" font-weight="700">Video-Live-Chat – Unterricht</text>
  <g>
    <rect x="16" y="52" width="72" height="54" rx="6" fill="#0b1f4d"/><text x="20" y="120" fill="#111" font-family="Segoe UI,Arial" font-size="10">Dozent</text>
    <rect x="96" y="52" width="72" height="54" rx="6" fill="#14367a"/><text x="112" y="120" fill="#111" font-family="Segoe UI,Arial" font-size="10">Ich</text>
    <rect x="176" y="52" width="72" height="54" rx="6" fill="#3a5a99"/><text x="188" y="120" fill="#111" font-family="Segoe UI,Arial" font-size="10">Max</text>
  </g>
  <rect x="16" y="134" width="380" height="180" rx="8" fill="#0b1f4d"/>
  <rect x="24" y="292" width="180" height="18" rx="9" fill="#8c3b3b"/><text x="32" y="305" fill="#fff" font-family="Segoe UI,Arial" font-size="10">Live-Übertragung – Unterricht</text>
  <rect x="408" y="134" width="214" height="180" rx="8" fill="#ffffff" stroke="#dceaf7"/>
  <rect x="408" y="134" width="214" height="24" rx="8" fill="#14367a"/><text x="416" y="150" fill="#fff" font-family="Segoe UI,Arial" font-size="11">Unterrichts-Chat</text>
  <g fill="#111" font-family="Segoe UI,Arial" font-size="10">
    <text x="416" y="176">Max: Frage zu Aufgabe 3?</text>
    <text x="416" y="196">⏸ Pause – Ich (10:15)</text>
  </g>
</svg>
'@

$imgFolders = @'
<svg viewBox="0 0 640 300" xmlns="http://www.w3.org/2000/svg" width="100%">
  <rect x="0" y="0" width="640" height="300" rx="10" fill="#ffffff" stroke="#e7dcc3"/>
  <rect x="16" y="16" width="290" height="268" rx="8" fill="#ffffff" stroke="#dceaf7"/>
  <rect x="16" y="16" width="290" height="26" rx="8" fill="url(#g3)"/>
  <rect x="334" y="16" width="290" height="268" rx="8" fill="#ffffff" stroke="#dceaf7"/>
  <rect x="334" y="16" width="290" height="26" rx="8" fill="url(#g3)"/>
  <defs><linearGradient id="g3" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#6f2d2d"/><stop offset="1" stop-color="#8c3b3b"/>
  </linearGradient></defs>
  <text x="26" y="34" fill="#fff" font-family="Segoe UI,Arial" font-size="12">📁 Hausaufgaben</text>
  <text x="344" y="34" fill="#fff" font-family="Segoe UI,Arial" font-size="12">📁 Kalender – Tests &amp; Prüfungen</text>
  <g font-family="Segoe UI,Arial" font-size="10" fill="#111">
    <rect x="26" y="54" width="270" height="52" rx="6" fill="#f7faff" stroke="#0b1f4d"/>
    <text x="34" y="72" font-weight="700">Max Mustermann</text><text x="34" y="90">Aufgabe 2 – Korrigiert &amp; zurückgegeben</text>
    <rect x="26" y="116" width="270" height="52" rx="6" fill="#fff" stroke="#5b9bd5"/>
    <text x="34" y="134" font-weight="700">Erika Beispiel</text><text x="34" y="152">Aufgabe 3 – Eingereicht</text>
  </g>
  <rect x="344" y="54" width="270" height="30" rx="6" fill="#f2ead9"/><text x="356" y="74" fill="#8c3b3b" font-family="Segoe UI,Arial" font-size="11" font-weight="700">Dienstag, 22. Juli 2026, 14:30:05</text>
  <g font-family="Segoe UI,Arial" font-size="10" fill="#111">
    <rect x="344" y="94" width="270" height="34" rx="6" fill="#fff" stroke="#8c3b3b"/>
    <text x="352" y="108" font-weight="700">Java-Zwischentest</text><text x="352" y="122">Freitag, 25. Juli 2026, 10:00 · in 3 Tagen</text>
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
      <p class="subtitle">Demo-Broschüre · Desktop-Dashboard für Dozenten, Teilnehmende und Unterricht</p>
    </div>

    <div class="slide">
      <h2>Dashboard &amp; Listen</h2>
      <p>Verwaltung von bis zu vier Dozenten mit To-Do-Liste, offenen und erledigten Projekten sowie Chat/Notizen – pro Dozent.</p>
      <div class="figure">$imgDashboard</div>
      <div class="caption">Beispielansicht: Dozenten-Dashboard mit drei Listen</div>
    </div>

    <div class="slide">
      <h2>Video-Live-Chat &amp; Unterricht</h2>
      <p>Teilnehmer-Leiste mit kleinen Live-Kacheln und Gesamtanzahl, große Live-Übertragung des Unterrichts, Unterrichts-Chat für alle (Fragen, Pause), Privat- und Gruppenchats. Der Dozent kann alle stummschalten; gemeldete Teilnehmer werden freigeschaltet.</p>
      <div class="figure">$imgLesson</div>
      <div class="caption">Beispielansicht: Unterrichts-Ansicht mit Teilnehmern und Chat</div>
    </div>

    <div class="slide">
      <h2>Ordner: Hausaufgaben &amp; Kalender</h2>
      <p>Im Hausaufgaben-Ordner reichen Teilnehmer Aufgaben ein; der Dozent korrigiert und gibt sie zurück. Der Kalender-Ordner zeigt eine Echtzeit-Uhr sowie anstehende Tests und Prüfungen mit Countdown.</p>
      <div class="figure">$imgFolders</div>
      <div class="caption">Beispielansicht: Hausaufgaben-Ordner und Echtzeit-Kalender</div>
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
