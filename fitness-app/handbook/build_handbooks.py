"""Generates one glossy 3D MyWorkOut handbook (HTML) per supported platform.

Usage:
  python3 build_handbooks.py        # writes dist/handbook_<platform>.html
  node render_pdfs.js               # renders those to dist/MyWorkOut_Handbuch_<platform>.pdf

Re-run capture_screens.js first if the app's UI has changed, so the
screenshots/ folder reflects the current look.
"""
import base64
import datetime
import html
import pathlib
import re

BASE = pathlib.Path(__file__).parent
JS_DIR = BASE.parent / 'js'
SCREENSHOT_DIR = BASE / 'screenshots'
DIST_DIR = BASE / 'dist'
YEAR = datetime.date.today().year


def b64(name):
    return base64.b64encode((SCREENSHOT_DIR / name).read_bytes()).decode()


TOKEN_RE = re.compile(
    r"(?P<comment>//[^\n]*)"
    r"|(?P<string>'(?:\\.|[^'\\])*'|\"(?:\\.|[^\"\\])*\"|`(?:\\.|[^`\\])*`)"
    r"|(?P<keyword>\b(?:function|const|let|var|if|else|return|for|while|new|true|false|null"
    r"|typeof|in|of|break|continue|switch|case|default|try|catch|throw|class|extends|this"
    r"|void|instanceof|document|window)\b)"
)


def highlight_js(code):
    escaped = html.escape(code, quote=False)

    def repl(m):
        if m.group('comment'):
            return f'<span class="tok-comment">{m.group("comment")}</span>'
        if m.group('string'):
            return f'<span class="tok-string">{m.group("string")}</span>'
        if m.group('keyword'):
            return f'<span class="tok-keyword">{m.group("keyword")}</span>'
        return m.group(0)

    return TOKEN_RE.sub(repl, escaped)


def code_file_card(filename):
    code = (JS_DIR / filename).read_text()
    highlighted = highlight_js(code)
    return f"""<div class="code-file-card">
      <div class="code-file-header">{filename}</div>
      <div class="code-file-body"><pre class="code">{highlighted}</pre></div>
    </div>"""


IMG = {
    'tasks': b64('shot_tasks.png'),
    'goal': b64('shot_goal.png'),
    'muscle': b64('shot_muscle.png'),
    'announce': b64('shot_announce.png'),
    'session': b64('shot_session.png'),
    'plan': b64('shot_plan.png'),
}

PLATFORMS = [
    {
        'id': 'web',
        'label': 'Web',
        'subtitle': 'Browser & PWA',
        'steps': [
            'Öffne die MyWorkOut-Webadresse in deinem Browser (Chrome, Edge, Safari oder Firefox).',
            'Für die Installation als App: Browser-Menü öffnen → „App installieren“ bzw. '
            '„Zum Startbildschirm hinzufügen“ auswählen.',
            'MyWorkOut startet danach wie eine eigenständige App – dank Service Worker auch offline nutzbar.',
            'Beim nächsten Öffnen werden Updates automatisch geladen.',
        ],
    },
    {
        'id': 'windows',
        'label': 'Windows',
        'subtitle': 'Desktop-App',
        'steps': [
            'Lade die Installationsdatei „MyWorkOut Setup.exe“ herunter.',
            'Doppelklick auf die Datei startet den Windows-Installer.',
            'Folge den Anweisungen des Installationsassistenten.',
            'Nach der Installation findest du MyWorkOut im Startmenü und als Desktop-Verknüpfung.',
            'Starte die App über das Startmenü oder die Verknüpfung auf dem Desktop.',
        ],
    },
    {
        'id': 'macos',
        'label': 'macOS',
        'subtitle': 'Desktop-App',
        'steps': [
            'Öffne die heruntergeladene Datei „MyWorkOut.dmg“.',
            'Ziehe das MyWorkOut-Symbol in den Ordner „Programme“.',
            'Starte MyWorkOut über Launchpad oder den Ordner „Programme“.',
            'Blockiert macOS die App beim ersten Start: Rechtsklick auf das Symbol → „Öffnen“ wählen und bestätigen.',
        ],
    },
    {
        'id': 'linux',
        'label': 'Linux',
        'subtitle': 'Desktop-App (AppImage)',
        'steps': [
            'Lade die Datei „MyWorkOut.AppImage“ herunter.',
            'Mache die Datei ausführbar: Rechtsklick → Eigenschaften → „Ausführung erlauben“, '
            'oder im Terminal mit „chmod +x MyWorkOut.AppImage“.',
            'Starte die App per Doppelklick oder im Terminal mit „./MyWorkOut.AppImage“.',
            'Keine Installation notwendig – die AppImage-Datei läuft eigenständig.',
        ],
    },
    {
        'id': 'ios',
        'label': 'iOS',
        'subtitle': 'iPhone & iPad',
        'steps': [
            'MyWorkOut wird für iOS als native App bereitgestellt.',
            'Installiere die App über den dir bereitgestellten Installationslink bzw. deine Einladung.',
            'Nach der Installation erscheint MyWorkOut auf deinem Homescreen wie jede andere App.',
            'Öffne die App über das MyWorkOut-Symbol auf dem Homescreen.',
        ],
    },
    {
        'id': 'android',
        'label': 'Android',
        'subtitle': 'Smartphone & Tablet',
        'steps': [
            'MyWorkOut wird für Android als Installationsdatei (APK) bereitgestellt.',
            'Erlaube in den Android-Einstellungen einmalig die „Installation aus unbekannten Quellen“.',
            'Öffne die Installationsdatei und bestätige die Installation.',
            'Starte MyWorkOut über das App-Symbol auf deinem Homescreen.',
        ],
    },
]

FEATURES = [
    ('Musikauswahl', IMG['tasks'],
     'In der Kopfzeile eine Musikrichtung wählen – Samba, Lounge, House oder Motivation – '
     'und mit dem Play-Symbol starten oder pausieren.'),
    ('Trainingsziel wählen', IMG['goal'],
     'Vor dem Training zuerst das Ziel festlegen: Ausdauertraining, Muskelaufbau oder Muskeln definieren.'),
    ('Muskelpartien aussuchen', IMG['muscle'],
     'Danach die gewünschten Muskelpartien für die heutige Einheit auswählen (Mehrfachauswahl möglich).'),
    ('Los geht’s', IMG['announce'],
     'Nach der Auswahl bestätigt die App mit „Okay, lass uns beginnen!“, bevor die Übungsliste erscheint.'),
    ('Aktives Training', IMG['session'],
     'Übungen der Reihe nach abhaken. Oben in der Kopfzeile bleibt die geplante Programmdauer sichtbar.'),
    ('Wochenplan', IMG['plan'],
     'Die Muskelpartien wechseln tageweise – für ein abwechslungsreiches, rundum starkes Training.'),
]

STYLE = """
:root {
  --yellow: #ffe600;
  --yellow-dark: #ffd000;
  --black: #111111;
  --gray: #4a4a4a;
  --surface-yellow: linear-gradient(180deg, #fff6a8 0%, #ffe600 45%, #e6b800 100%);
  --surface-black: linear-gradient(180deg, #3d3d3d 0%, #121212 55%, #000000 100%);
  --surface-white: linear-gradient(180deg, #ffffff 0%, #f4f4f4 60%, #e6e6e6 100%);
  --raise-yellow: inset 0 1px 0 rgba(255,255,255,.7), inset 0 -3px 5px rgba(0,0,0,.15), 0 4px 10px rgba(0,0,0,.25);
  --raise-black: inset 0 1px 0 rgba(255,255,255,.2), inset 0 -3px 5px rgba(0,0,0,.5), 0 4px 10px rgba(0,0,0,.4);
  --raise-white: inset 0 1px 0 rgba(255,255,255,.9), inset 0 -2px 4px rgba(0,0,0,.08), 0 4px 10px rgba(0,0,0,.18);
  --shadow-dark: 0 1px 0 rgba(255,255,255,.7), 0 2px 0 rgba(0,0,0,.18), 0 3px 5px rgba(0,0,0,.25);
  --shadow-dark-heading: 0 1px 0 rgba(255,255,255,.8), 0 2px 0 rgba(0,0,0,.16), 0 3px 0 rgba(0,0,0,.22),
    0 4px 0 rgba(0,0,0,.28), 0 6px 10px rgba(0,0,0,.3);
  --shadow-yellow-heading: 0 1px 0 rgba(255,255,255,.25), 0 2px 0 rgba(0,0,0,.5), 0 3px 0 rgba(0,0,0,.6),
    0 4px 0 rgba(0,0,0,.65), 0 6px 10px rgba(0,0,0,.5);
}
* { box-sizing: border-box; }
@page { size: A4; margin: 0; }
html, body { margin: 0; padding: 0; font-family: -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: var(--black); }
.page {
  width: 210mm; height: 297mm;
  padding: 16mm 18mm;
  page-break-after: always;
  position: relative;
  background: var(--yellow);
  overflow: hidden;
}
.page:last-child { page-break-after: auto; }

/* ---------- Cover ---------- */
.cover {
  background: radial-gradient(circle at 50% 32%, #262200 0%, #000000 62%);
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14mm;
  color: var(--yellow);
}
.cover .logo {
  font-size: 26mm; font-weight: 900; letter-spacing: 1px; color: var(--yellow);
  text-shadow: var(--shadow-yellow-heading);
}
.cover .bar { width: 60mm; height: 2.4mm; border-radius: 999px; background: var(--surface-yellow); box-shadow: var(--raise-yellow); }
.cover .platform-badge {
  background: var(--surface-yellow); box-shadow: var(--raise-yellow); color: var(--black);
  text-shadow: var(--shadow-dark); font-weight: 800; font-size: 9mm; padding: 5mm 14mm; border-radius: 999px;
}
.cover .subtitle { font-size: 5mm; font-weight: 600; color: #d8d8d8; }
.cover .tagline { font-size: 6mm; font-weight: 700; color: #ffffff; text-shadow: 0 1px 0 rgba(255,255,255,.3), 0 2px 4px rgba(0,0,0,.5); }
.cover .doctype { position: absolute; bottom: 14mm; font-size: 3.6mm; color: #999; letter-spacing: 1px; text-transform: uppercase; }

/* ---------- Content pages ---------- */
h1 { font-size: 9mm; margin: 0 0 4mm; text-shadow: var(--shadow-dark-heading); }
h2 { font-size: 5mm; margin: 8mm 0 4mm; text-shadow: var(--shadow-dark-heading); }
.kicker { font-weight: 700; color: var(--gray); text-shadow: var(--shadow-dark); margin: 0 0 10mm; font-size: 4mm; }

.install-box {
  background: var(--surface-white); box-shadow: var(--raise-white); border: 0.6mm solid var(--black);
  border-radius: 5mm; padding: 8mm; margin-bottom: 8mm;
}
.install-box ol { margin: 0; padding-left: 5mm; }
.install-box li { margin-bottom: 4mm; font-size: 4mm; line-height: 1.5; }

.phone-frame {
  width: 62mm; border: 2mm solid #050505; border-radius: 7mm; background: #050505; padding: 1.6mm;
  box-shadow: 0 6mm 12mm rgba(0,0,0,.35);
}
.phone-frame img { width: 100%; display: block; border-radius: 4mm; }

.two-col { display: flex; gap: 10mm; align-items: flex-start; }
.two-col .text { flex: 1; }

.feature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6mm; }
.feature-card {
  background: var(--surface-white); box-shadow: var(--raise-white); border: 0.6mm solid var(--black);
  border-radius: 5mm; padding: 5mm; display: flex; flex-direction: column; gap: 3mm;
}
.feature-card .phone-frame { width: 100%; align-self: center; max-width: 40mm; }
.feature-card h3 { margin: 0; font-size: 4.2mm; text-shadow: var(--shadow-dark); }
.feature-card p { margin: 0; font-size: 3.4mm; color: var(--gray); line-height: 1.45; }

.footer-note {
  margin-top: 12mm;
  border-top: 0.4mm solid rgba(0,0,0,.25); padding-top: 4mm;
  font-size: 3mm; color: var(--gray); text-align: center; line-height: 1.6;
}
.footer-note strong { color: var(--black); }

/* ---------- Flowing chapters (feature grid, source code) ----------
   These can run longer than one page, so instead of the fixed-height
   .page box used for cover/install, they flow naturally and use
   box-decoration-break to repeat the yellow background + margins on
   every auto-generated print page. */
.flow-chapter {
  background: var(--yellow);
  padding: 16mm 18mm;
  page-break-before: always;
  -webkit-box-decoration-break: clone;
  box-decoration-break: clone;
}
.code-file-card {
  background: var(--surface-black); box-shadow: var(--raise-black);
  border-radius: 4mm; margin-bottom: 6mm; overflow: hidden;
}
.code-file-header {
  background: var(--surface-yellow); box-shadow: var(--raise-yellow); color: var(--black);
  text-shadow: var(--shadow-dark); font-weight: 800; font-size: 4mm; padding: 3mm 6mm;
}
.code-file-body { padding: 5mm 6mm; }
pre.code {
  margin: 0; white-space: pre-wrap; word-break: break-word;
  font-family: 'Courier New', Courier, monospace; font-size: 2.5mm; line-height: 1.55; color: #f0f0f0;
}
.tok-comment { color: #b7a94a; font-style: italic; }
.tok-string { color: #ffe066; }
.tok-keyword { color: #ffe600; font-weight: 700; }
"""


def render_cover(p):
    return f"""<div class="page cover">
      <div class="logo">MyWorkOut</div>
      <div class="bar"></div>
      <div class="platform-badge">{p['label']}</div>
      <div class="subtitle">{p['subtitle']}</div>
      <div class="tagline">Dein neuer Trainingscoach</div>
      <div class="doctype">Benutzerhandbuch</div>
    </div>"""


def render_install(p):
    steps = ''.join(f'<li>{s}</li>' for s in p['steps'])
    return f"""<div class="page">
      <p class="kicker">Kapitel 1</p>
      <h1>Installation & Start – {p['label']}</h1>
      <div class="two-col">
        <div class="text install-box">
          <ol>{steps}</ol>
        </div>
        <div class="phone-frame"><img src="data:image/png;base64,{IMG['tasks']}"></div>
      </div>
      <h2>Was du brauchst</h2>
      <p style="font-size:4mm; line-height:1.6;">
        Für MyWorkOut wird keine Registrierung benötigt. Alle Angaben (Tagesaufgaben, Trainingsfortschritt,
        Musikauswahl) werden lokal auf deinem Gerät gespeichert und bleiben beim nächsten Start erhalten.
      </p>
    </div>"""


def render_features():
    cards = ''.join(
        f"""<div class="feature-card">
              <div class="phone-frame"><img src="data:image/png;base64,{img}"></div>
              <h3>{title}</h3>
              <p>{desc}</p>
            </div>"""
        for title, img, desc in FEATURES
    )
    return f"""<div class="flow-chapter">
      <p class="kicker">Kapitel 2</p>
      <h1 style="margin-top:0">Bedienung im Überblick</h1>
      <div class="feature-grid">{cards}</div>
    </div>"""


def render_code_chapter():
    cards = ''.join(code_file_card(name) for name in ('data.js', 'audio.js', 'app.js'))
    return f"""<div class="flow-chapter">
      <h1 style="margin-top:0">Kapitel 3: Quellcode (JavaScript)</h1>
      <p class="kicker">Der vollständige, unveränderte Quellcode der App-Logik.</p>
      {cards}
      <div class="footer-note">
        <strong>© {YEAR} MyWorkOut. Alle Rechte vorbehalten.</strong><br>
        Hinweis: Die Verbreitung und Vervielfältigung dieser App ist nicht gestattet.
      </div>
    </div>"""


def build(platform):
    doc = f"""<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>MyWorkOut Handbuch – {platform['label']}</title>
<style>{STYLE}</style></head><body>
{render_cover(platform)}
{render_install(platform)}
{render_features()}
{render_code_chapter()}
</body></html>"""
    DIST_DIR.mkdir(exist_ok=True)
    out = DIST_DIR / f"handbook_{platform['id']}.html"
    out.write_text(doc)
    print('wrote', out)


if __name__ == '__main__':
    for platform in PLATFORMS:
        build(platform)
