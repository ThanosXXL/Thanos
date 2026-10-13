# Baustelle Tagesreport - Download fuer Android
# Datei anschliessend per USB/Cloud aufs Android-Geraet uebertragen und antippen.
# Beim ersten Start fragt Android nach "Installation aus unbekannter Quelle zulassen" - das ist normal.

$url = "https://github.com/ThanosXXL/Thanos/releases/download/tagesreport-v1.0.1/BaustelleTagesreport-Android.apk"
Invoke-WebRequest -Uri $url -OutFile "BaustelleTagesreport.apk"
