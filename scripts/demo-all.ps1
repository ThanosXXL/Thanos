<#
    IT Schulungsmaßnahmen – Demo-Start (plattformübergreifend)
    Erkennt das Betriebssystem automatisch und ruft das passende Demo-Skript auf.
    Benötigt PowerShell 7+ (pwsh).
    Ausführen:  pwsh ./scripts/demo-all.ps1
#>

$ErrorActionPreference = 'Stop'

# $IsWindows/$IsMacOS/$IsLinux gibt es ab PowerShell 7. In Windows PowerShell 5.1 ist es Windows.
$onWindows = if ($null -ne $IsWindows) { $IsWindows } else { $true }
$onMac = if ($null -ne $IsMacOS) { $IsMacOS } else { $false }
$onLinux = if ($null -ne $IsLinux) { $IsLinux } else { $false }

if ($onWindows) {
    Write-Host 'Erkanntes System: Windows' -ForegroundColor DarkRed
    & (Join-Path $PSScriptRoot 'demo-windows.ps1')
}
elseif ($onMac) {
    Write-Host 'Erkanntes System: macOS' -ForegroundColor DarkRed
    & (Join-Path $PSScriptRoot 'demo-macos.ps1')
}
elseif ($onLinux) {
    Write-Host 'Erkanntes System: Linux' -ForegroundColor DarkRed
    & (Join-Path $PSScriptRoot 'demo-linux.ps1')
}
else {
    Write-Host 'Betriebssystem konnte nicht erkannt werden.' -ForegroundColor Red
    exit 1
}
