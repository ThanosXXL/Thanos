# Baustelle Tagesreport - Download fuer macOS
# Laeuft mit PowerShell (pwsh), das auch auf macOS installierbar ist.
# "open" ist der macOS-Befehl zum Oeffnen der heruntergeladenen Datei.

$url = "https://github.com/ThanosXXL/Thanos/releases/download/tagesreport-v1.0.1/BaustelleTagesreport-macOS.dmg"
Invoke-WebRequest -Uri $url -OutFile "BaustelleTagesreport.dmg"
open "BaustelleTagesreport.dmg"
