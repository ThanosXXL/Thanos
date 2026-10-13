# Baustelle Tagesreport - Download fuer Windows
# Laedt den Installer direkt herunter und startet ihn. Kein Login, keine Zwischenabfrage noetig.

$url = "https://github.com/ThanosXXL/Thanos/releases/download/tagesreport-v1.0.1/BaustelleTagesreport-Windows-Setup.exe"
Invoke-WebRequest -Uri $url -OutFile "BaustelleTagesreport-Setup.exe"
Start-Process "BaustelleTagesreport-Setup.exe"
