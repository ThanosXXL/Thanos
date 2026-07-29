# Pruefungskorrektur

Eigenstaendiges Kommandozeilen-Tool zur automatisierten Korrektur von Tests und
Pruefungen aus einer Online-Weiterbildungsmassnahme. Unterstuetzt
Single-Choice-, Multiple-Choice- und Freitextfragen. Keine externen
Abhaengigkeiten, laeuft mit reinem Node.js.

## Verwendung

```bash
cd pruefungskorrektur
npm test   # Selbsttest der Korrektur-Logik

node cli.js --exam examples/exam.example.json --submissions examples/submissions.example.csv --out-dir ergebnisse
```

Ergebnisse landen im angegebenen Ordner:

- `ergebnisse.json` — vollstaendiges Detailergebnis pro Teilnehmer und Frage
- `ergebnisse.csv` — Zusammenfassung pro Teilnehmer (Punkte, Prozent, bestanden, needsReview)
- `ergebnisse_detail.csv` — eine Zeile pro Teilnehmer und Frage

## Prüfungsdefinition (`--exam`, JSON)

```json
{
  "title": "Zwischenpruefung Modul 1",
  "passThreshold": 60,
  "questions": [
    { "id": "q1", "type": "single-choice", "points": 1, "correct": "b" },
    { "id": "q2", "type": "multiple-choice", "points": 2, "correct": ["a", "c"] },
    {
      "id": "q3",
      "type": "text",
      "points": 3,
      "acceptedAnswers": ["Muster-Musterantwort ..."],
      "keywords": ["stichwort1", "stichwort2"],
      "minMatchRatio": 0.6,
      "similarityThreshold": 0.8
    }
  ]
}
```

Felder je Frage:

- `id` (Pflicht) — eindeutige Kennung, muss zu den Spalten/Keys in den Teilnehmerantworten passen
- `type` — `single-choice`, `multiple-choice` oder `text`
- `points` — Punktzahl bei voller Korrektheit (Standard: 1)
- `correct` — bei `single-choice` ein String, bei `multiple-choice` ein Array
- `acceptedAnswers` / `keywords` — bei `text`, siehe Bewertungslogik unten
- `minMatchRatio` (Standard 0.6) / `similarityThreshold` (Standard 0.8) — Schwellenwerte fuer die Freitextbewertung

## Teilnehmerantworten (`--submissions`, JSON oder CSV)

**CSV** (empfohlen fuer Export aus Lernplattformen/Excel): eine Zeile pro
Teilnehmer, Spalten `participant`, `email`, danach eine Spalte je Frage-`id`.
Bei `multiple-choice` mehrere Werte mit `|` trennen, z. B. `a|c`. Siehe
`examples/submissions.example.csv`.

**JSON**:

```json
[
  { "participant": "Max Mustermann", "email": "max@example.com", "answers": { "q1": "b", "q2": ["a", "c"], "q3": "..." } }
]
```

## Bewertungslogik

- **Single-Choice**: exakter Abgleich (ohne Beachtung von Gross-/Kleinschreibung und Leerraum) mit `correct`. Volle Punktzahl oder 0.
- **Multiple-Choice**: Teilpunkte nach `punkte * (Treffer − Fehltreffer) / Anzahl_korrekter_Optionen`, nach unten auf 0 begrenzt. Nur bei exakter Auswahl gilt die Frage als vollstaendig korrekt.
- **Freitext**: zunaechst automatischer Abgleich mit `acceptedAnswers` (kombiniert Zeichen-Aehnlichkeit und Wortabdeckung, robust gegen zusaetzliche Formulierungen). Liegt die Aehnlichkeit unter `similarityThreshold`, wird zusaetzlich geprueft, wie viele `keywords` in der Antwort vorkommen. Reicht das nicht (`minMatchRatio`), erhaelt die Antwort 0 Punkte **und** wird mit `needsReview: true` markiert, statt sie automatisch als "falsch" durchzuwinken.

## Wichtiger Hinweis zur Freitextbewertung

Freitextantworten koennen nicht mit letzter Sicherheit vollautomatisch bewertet
werden — es gibt beliebig viele korrekte Formulierungen. Das Tool markiert
deshalb bewusst unklare Faelle (`needsReview: true` in den Ergebnissen bzw.
Spalte `needsReview` in `ergebnisse.csv`/`ergebnisse_detail.csv`) statt sie zu
raten. Bei pruefungsrelevanten Tests (z. B. Abschlusspruefungen mit
Bestehensrelevanz) sollten diese markierten Antworten von einem Dozenten
gegengeprueft werden, bevor das Ergebnis final an Teilnehmer kommuniziert wird.
Single-Choice- und Multiple-Choice-Fragen werden dagegen deterministisch und
zuverlaessig korrigiert.
