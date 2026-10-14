# Thraki (Neuaufbau)
Statische Seite, keine Abhängigkeiten. `node build.mjs` erzeugt die HTML-Seiten, `node server.js` startet den gehärteten Server.
- **Farben:** nur `:root` in `css/style.css` (TODO: Originalfarben von thraki.de).
- **Texte:** Platzhalter in `build.mjs` durch Originaltexte ersetzen, dann `node build.mjs`.
- **Schrift:** System-Schriften mit menschlicher Anmutung; eine selbst gehostete `.woff2` kann per `@font-face` in `img/`-Nachbarordner ergänzt werden (keine Google-Fonts-CDN, DSGVO).
- Impressum/Datenschutz sind Vorlagen und müssen rechtlich geprüft werden.
