# Patienten Welt

Die persönliche Gesundheits-App für Patientinnen und Patienten – Desktop-App (Windows, macOS, Linux) im Navy-Design mit weißer Open-Sans-Schrift, 3D-Hochglanz-Logo (Globus mit Herz) und Animationen.

- **Start** – Tagesüberblick, Fortschrittsring für die Medikamente, nächster Termin, letzter Blutdruck
- **Meine Termine** – Termine anfragen und verwalten
- **Medikamente** – Einnahmeplan (morgens/mittags/abends/nachts) abhaken, Rezept anfragen
- **Meine Werte** – Blutdruck-/Puls-/Gewichtstagebuch mit animiertem Diagramm
- **Befunde** – Bilder und Befunde ansehen und hochladen
- **Praxis-Nachrichten** – Anfragen und Notizen an die Praxis
- **Mein Profil** – Angaben, Allergien, Notfallkontakt, Datensicherung

Alle Daten bleiben lokal (`patienten-welt-data.json`); es gibt keine Verbindung zur Praxis, Anfragen werden nur gespeichert. Die Beispieldaten sind frei erfunden. Kein Ersatz für ärztliche Beratung.

```bash
npm install && npm start     # Entwicklung
npm run dist                 # Installer
```

Release per Tag `patienten-welt-v1.0.0`.
