# Allgemein Docs – vollautomatische Installation für Windows (PowerShell)
#   irm https://raw.githubusercontent.com/ThanosXXL/Thanos/main/allgemein-docs/install/install.ps1 | iex
# Lädt das neueste Release (Tag allgemein-docs-v*) von GitHub und installiert die App leise.
$ErrorActionPreference = 'Stop'
$Repo = if ($env:ALLGEMEIN_DOCS_REPO) { $env:ALLGEMEIN_DOCS_REPO } else { 'ThanosXXL/Thanos' }
$Api  = if ($env:ALLGEMEIN_DOCS_API)  { $env:ALLGEMEIN_DOCS_API }  else { "https://api.github.com/repos/$Repo/releases?per_page=30" }
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

function Say($m) { Write-Host "==> $m" -ForegroundColor Cyan }

Say 'Suche das neueste Allgemein-Docs-Release ...'
try { $releases = Invoke-RestMethod -Uri $Api -Headers @{ 'User-Agent' = 'allgemein-docs-installer' } }
catch { throw 'Release-Liste konnte nicht geladen werden (Repository öffentlich? Release veröffentlicht?).' }

$asset = $releases | Where-Object { $_.tag_name -like 'allgemein-docs-v*' } |
  ForEach-Object { $_.assets } | Where-Object { $_.name -like '*.exe' } | Select-Object -First 1
if (-not $asset) { throw 'Kein Windows-Installer (.exe) in einem Release mit Tag "allgemein-docs-v..." gefunden.' }

Say "Gefunden: $($asset.browser_download_url)"
if ($env:DRY_RUN -eq '1') { Say 'DRY_RUN - es wird nichts installiert.'; return }

$tmp = Join-Path $env:TEMP $asset.name
Say 'Lade Installer herunter ...'
Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $tmp -UseBasicParsing

Say 'Installiere (leise) ...'
Start-Process -FilePath $tmp -ArgumentList '/S' -Wait
Remove-Item $tmp -Force -ErrorAction SilentlyContinue

Say 'Fertig! "Allgemein Docs" finden Sie im Startmenü und auf dem Desktop.'
