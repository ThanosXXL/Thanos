# DE/GR TV Dashboard

Eigenständige Electron-Desktop-App zum Durchsuchen und Abspielen von Sendern
aus einer selbst bereitgestellten M3U-Playlist. Fokus auf deutsche und
griechische Sender, unterteilt in Live TV, Serien und Kino/Filme.

Dieses Projekt ist unabhängig vom Dozenten Dashboard im Repository-Root
(eigene `package.json`, eigener Electron-Prozess) – siehe die Kurz-Beschreibung
in der Root-`CLAUDE.md`.

## Ablauf

1. **M3U-Link eingeben** – eine beliebige, selbst bezogene M3U-Playlist-URL. Die zuletzt
   verwendete Playlist wird gespeichert und beim nächsten Start automatisch neu geladen.
2. **Land wählen** – Deutschland oder Griechenland (oder direkt zu den ★ Favoriten springen).
3. **Kategorie wählen** – Live TV, Serien oder Kino/Filme.
4. **Sender wählen** – bei mehr als 8 Sendern steht ein Suchfeld zur Verfügung; jeder Sender
   lässt sich per Stern-Icon favorisieren. Wiedergabe erfolgt im integrierten Player (HLS via
   hls.js, mit automatischem Fallback auf native Wiedergabe, Netzwerk-Retry und einer
   sichtbaren, wiederholbaren Fehlermeldung bei nicht erreichbaren oder nicht antwortenden
   Sendern).

Sender werden anhand von `group-title`, `tvg-language`/`tvg-country` und dem
Sendernamen automatisch dem passenden Land und der passenden Kategorie
zugeordnet (Stichwort-Erkennung, z. B. `DE`, `Deutschland`, `GR`,
`Griechenland`, `Live`, `Serien`/`Series`, `Film`/`Kino`/`VOD`). Playlists
unterscheiden sich in ihrer Benennung – bei Bedarf lässt sich die Zuordnung
in `renderer/m3u.js` anpassen.

## Demo-Modus

Auf dem Start-Bildschirm steht neben der M3U-Eingabe ein Button **„▶ Demo-Version
starten“** zur Verfügung. Er lädt sofort einen eingebauten Beispiel-Datensatz mit
echten deutschen (Das Erste, ZDF, RTL, SAT.1, ProSieben, VOX, kabel eins, RTLZWEI,
ZDFneo, 3sat, Phoenix, tagesschau24) und griechischen (ERT1, ERT2, ERT3, ERT NEWS,
ANT1, MEGA, SKAI, STAR Channel, ALPHA TV, OPEN TV) Sendernamen – ganz ohne eigenen
Link, sofort nutzbar. Die App kann keine echten Live-Signale dieser Sender
mitliefern (das wären unautorisierte Streams); im Player läuft daher ein neutraler,
öffentlich bereitgestellter HLS-Test-Stream (derselbe, den auch die hls.js-Doku als
Beispiel verwendet). Ein gut sichtbarer „Demo-Modus“-Hinweis in der Kopfzeile und im
Player macht das jederzeit klar. Über „Eigenen Link nutzen“ kommt man zurück zur
M3U-Eingabe für echtes Live-TV.

## Hinweis

Es wird ausschließlich die vom Nutzer eingegebene, rechtmäßig bezogene
M3U-Playlist verwendet. Die App liefert keine eigenen Sender oder Links mit
(der Demo-Modus ist die einzige Ausnahme und nutzt bewusst nur einen
neutralen Test-Stream, keine echten Sendersignale).

## Befehle

```bash
npm install     # Abhängigkeiten installieren
npm start        # App im Entwicklungsmodus starten (electron .)
npm run dist     # Installer nach dist/ bauen (electron-builder)
```

## Architektur

- **`main.js`** – erstellt das `BrowserWindow`, lädt/speichert die zuletzt
  verwendete M3U-URL unter `app.getPath('userData')/iptv-dashboard-settings.json`
  und lädt die vom Nutzer angegebene M3U-Playlist serverseitig (Node `fetch`),
  da viele IPTV-Hosts keine CORS-Header setzen. Aus demselben Grund werden
  Antwort-Header der Session um einen permissiven `Access-Control-Allow-Origin`
  ergänzt, damit hls.js im Renderer Playlist-Segmente laden kann.
- **`preload.js`** – exponiert `window.iptvAPI` (`loadSettings`, `saveSettings`,
  `fetchM3U`) via `contextBridge`; `contextIsolation: true`, `nodeIntegration: false`.
- **`renderer/`** – statisches UI (HTML/CSS/Vanilla JS, kein Build-Schritt).
  - `m3u.js` – M3U-Parser und Land-/Kategorie-Klassifizierung.
  - `demo-data.js` – eingebauter Beispiel-Datensatz für den Demo-Modus (siehe oben).
  - `renderer.js` – State-Machine (`input → loading → country → category → list →
    favorites → player`), rendert das UI bei jeder Zustandsänderung neu.
  - `vendor/hls.min.js` – gebündelte hls.js-Bibliothek für HLS-Wiedergabe im Chromium-Player.
