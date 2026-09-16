# CLAUDE.md — akademie/

Guidance for Claude Code when generating **M&C Akademie** course-material
PDFs (course descriptions, handbooks, slide decks, exams) in this folder.
This is a fourth, self-contained sub-project of this repo — unrelated to
the Dozenten Dashboard, `omniroute/`, or `it-schulung/` — that produces
polished PDF deliverables from Python/ReportLab scripts, not an app.

> **Always apply to every new script/PDF in this folder, no exceptions:**
> 1. Logo = `assets/logo_mc_akademie_3d.png` (top of page 1 **only** — not
>    repeated per chapter, not on every page; confirmed explicitly after
>    the user asked about per-chapter placement and clarified "auf jeder
>    ersten Seite", i.e. page 1 of each document).
> 2. Directly under the main title/subtitle on that same page 1, the
>    authors line **"Erstellt von Matthias Gornik & Athanasios
>    Matziouridis"** (the `Authors` paragraph style in `get_styles()`) —
>    logo and this byline always travel together on page 1.
> 3. Font = **Work Sans** (`akademie_style.FONT_REGULAR/FONT_BOLD/
>    FONT_ITALIC/FONT_BOLDITALIC`) — a humanist, warm-reading typeface.
>    Never `"Helvetica"` / `"Helvetica-Bold"` / any ReportLab base-14 font.
>
> All three were explicitly requested and confirmed once already; treat
> them as permanent house style, not per-request choices to re-derive.

## Directory layout

```
akademie/
  assets/
    logo_mc_akademie_3d.png        # THE logo — use this file, always (see below)
    logo_mc_akademie_original.jpg  # source photo the user supplied; do not edit/replace without being told
    fonts/WorkSans-*.ttf           # Regular/Bold/Italic/BoldItalic — the house typeface
  scripts/
    akademie_style.py              # shared layout module — import this, don't duplicate
    make_logo_3d.py                # regenerates the 3D/gloss logo from the original photo
    build_*.py                     # one script per deliverable, run standalone
  output/
    *.pdf                          # generated deliverables, committed to the repo
```

## The logo — non-negotiable rules

- **File:** `assets/logo_mc_akademie_3d.png`. This is the real M&C Akademie
  logo the user provided (`logo_mc_akademie_original.jpg`), run through
  `make_logo_3d.py` to add a 3D bevel/emboss edge, a diagonal glass-reflex
  gloss streak, a soft top sheen, and a drop shadow — **shapes, colors and
  text of the original are unchanged**, only light/depth was added.
- **Never** invent a placeholder/generic logo, and never re-crop, re-color,
  or swap in a different image for "AKADEMIE" branding. If a new logo photo
  is ever supplied, save it as the new `logo_mc_akademie_original.jpg`,
  rerun `make_logo_3d.py`, and update nothing else.
- **Placement:** top-center of the page, inside the glossy card/frame drawn
  by `akademie_style._header_footer` (light gradient plate + gold border +
  gloss highlight — this frame is separate styling, not baked into the PNG).
- **Only on page 1** of every document (including every slide deck's first
  slide only, not every slide). Later pages use a compact header with no
  logo so content gets the reclaimed vertical space. This is done via
  `akademie_style.build_flowing_document()` (two `PageTemplate`s + a
  `NextPageTemplate("Later")` flowable) for flowing documents, and via the
  `hf_first`/`hf_later` + slide-counter pattern in `build_schulungsfolien.py`
  for the canvas-drawn slide deck. Reuse these, don't re-derive per script.
- To regenerate the logo asset itself (e.g. to tune effect strength), edit
  and rerun `scripts/make_logo_3d.py` — it reads the original photo and
  overwrites `logo_mc_akademie_3d.png`. Don't hand-edit the PNG.

## Typography

- House font is **Work Sans** (`assets/fonts/WorkSans-{Regular,Bold,Italic,
  BoldItalic}.ttf`), a humanist grotesk (Open Sans/Lato-style) — chosen
  explicitly over Helvetica/the ReportLab base-14 fonts because it reads
  as warmer/more human. Registered once in `akademie_style.py` as
  `FONT_REGULAR` / `FONT_BOLD` / `FONT_ITALIC` / `FONT_BOLDITALIC` (plus a
  `registerFontFamily` mapping so `<b>`/`<i>` in Paragraph markup work).
- **Never** fall back to `"Helvetica"`/`"Helvetica-Bold"` string literals in
  new code — always use the `akademie_style.FONT_*` constants so a future
  font swap only touches one file.

## Shared layout module (`akademie_style.py`)

Import this from every build script rather than reimplementing layout:

- Colors: `NAVY`, `NAVY_MID`, `NAVY_LIGHT`, `GOLD`, `GOLD_LIGHT`, `GOLD_DARK`,
  `INK`, `LIGHT_BG`, `CONFIDENTIAL_RED`.
- `get_styles()` → dict of ParagraphStyles (`DocTitle`, `DocSubtitle`,
  `Authors`, `H1`/`H2`, `Body`/`BodyLeft`/`Bullet`/`Small`, table + exam
  styles) — use these instead of ad-hoc `ParagraphStyle(...)` calls.
- `GlossyBanner` — the navy/gold gradient chapter-heading banner with
  auto-shrinking font size (won't overflow on long titles). Use for every
  section/chapter heading, with a `kicker=` like `"KAPITEL 3"` or
  `"ABSCHNITT 2"`.
- `InfoBox` — bordered callout box (hint boxes, "Nur für Dozenten"
  confidential banners via `fill=CONFIDENTIAL_RED`, green solution boxes
  via a light-green fill/border — see `build_pruefung.py`).
- `styled_table()` / `bullet_list()` — consistent table and bullet styling.
- `header_footer_portrait(doc_short_title, show_logo=True)` /
  `header_footer_landscape(...)` — return the `onPage` draw callback;
  footer always shows "Seite N" centered at the bottom (continuous page
  numbering) plus the doc title (left) and "AKADEMIE" (right).
- `build_flowing_document(story, out_path, pagesize, doc_short_title,
  title=None, ...)` — the standard entry point for any new multi-page
  flowing document (portrait or landscape). Handles the first-page-logo /
  later-pages-compact-header split automatically. Prefer this over building
  a bare `SimpleDocTemplate` by hand.
- Page size constants: `PAGE_SIZE_PORTRAIT` (A4), `PAGE_SIZE_LANDSCAPE`
  (landscape A4, used for the slide deck).

For a canvas-drawn deck (not flowing text, e.g. more slides), follow the
`build_schulungsfolien.py` pattern: call `header_footer_landscape(...,
show_logo=True)` once for the first `showPage()` and `show_logo=False` for
every subsequent one, tracking a slide counter.

## Conventions

- All build scripts are standalone: `python3 build_xxx.py` run from
  `akademie/scripts/` (or any cwd — they resolve paths via
  `os.path.dirname(os.path.abspath(__file__))`) regenerates the matching
  PDF into `akademie/output/`. No project-wide build step exists; run the
  script(s) you touched.
- Content and all user-facing text is in German, matching the M&C Akademie
  course material this project produces.
- Output PDFs in `akademie/output/` are committed to the repo (this is a
  deliverables folder, not a build artifact to .gitignore) — regenerate and
  re-commit them whenever a build script or asset changes, so the checked-in
  PDFs always match the current scripts/assets.
- Preview changes before committing: render a page or two with PyMuPDF
  (`import fitz; fitz.open(path)[i].get_pixmap(dpi=110).save(...)`) and
  view it — don't ship a layout change unverified.

## Established decisions (don't relitigate without asking)

- Real logo photo (see above), not a generated placeholder — corrected
  from an earlier placeholder attempt.
- Work Sans, not Helvetica — corrected from an earlier draft.
- Logo on page 1 only, not every page — corrected from an earlier draft.
- When a new request is genuinely ambiguous on branding/design (a new
  logo, a different font, color scheme) or otherwise irreversible/costly to
  redo, ask before implementing rather than guessing — per explicit user
  instruction.
