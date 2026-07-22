<#
    IT Schulungsmaßnahmen – VOLLVERSION starten (plattformübergreifend)
    Erkennt das Desktop-Betriebssystem automatisch und startet die Vollversion.
    Benötigt PowerShell 7+ (pwsh).
    Ausführen:  pwsh ./scripts/start-all.ps1
#>

$ErrorActionPreference = 'Stop'

$onWindows = if ($null -ne $IsWindows) { $IsWindows } else { $true }
$onMac = if ($null -ne $IsMacOS) { $IsMacOS } else { $false }
$onLinux = if ($null -ne $IsLinux) { $IsLinux } else { $false }

if ($onWindows) {
    Write-Host 'Erkanntes System: Windows' -ForegroundColor DarkRed
    & (Join-Path $PSScriptRoot 'start-windows.ps1')
}
elseif ($onMac) {
    Write-Host 'Erkanntes System: macOS' -ForegroundColor DarkRed
    & (Join-Path $PSScriptRoot 'start-macos.ps1')
}
elseif ($onLinux) {
    Write-Host 'Erkanntes System: Linux' -ForegroundColor DarkRed
    & (Join-Path $PSScriptRoot 'start-linux.ps1')
}
else {
    Write-Host 'Betriebssystem konnte nicht erkannt werden.' -ForegroundColor Red
    exit 1
}
