# CLAUDE.md — akademie/

Guidance for Claude Code when generating **M&C Akademie** course-material
PDFs (course descriptions, handbooks, slide decks, exams) in this folder.
This is a fourth, self-contained sub-project of this repo — unrelated to
the Dozenten Dashboard, `omniroute/`, or `it-schulung/` — that produces
polished PDF deliverables from Python/ReportLab scripts, not an app.

> **Always apply to every new script/PDF in this folder, no exceptions:**
> 1. **Big page header logo** = `assets/logo_mc_akademie_3d.png`, top of
>    **page 1 only** of each document (not repeated on every page) —
>    inside a **flat white** card frame drawn by `_header_footer`.
> 2. **Every single chapter/section heading**, throughout every document
>    (all pages, not just page 1), gets a small logo chip directly
>    underneath it — use `akademie_style.chapter_heading(text, kicker=...)`
>    (`story.extend(...)`, not `.append`, it returns a list) for any
>    flowing document, or `draw_attribution_bar(c, x, y, w, h)` right
>    under a canvas-drawn banner (see `build_schulungsfolien.py`
>    `slide_title_banner`). Never add a bare `GlossyBanner` without it.
> 3. **No personal names anywhere, ever** — no "Erstellt von ...", no
>    author byline, on the title page or under chapter headings or
>    anywhere else. Only the M&C Akademie logo identifies authorship.
>    An earlier version showed "Erstellt von Matthias Gornik & Athanasios
>    Matziouridis" throughout; the user explicitly had it removed
>    ("erstelt Namen müssen raus") — **don't reintroduce any person's
>    name.** `ChapterAttribution`/`draw_attribution_bar` draw the logo
>    chip only, no text; `get_styles()["Authors"]` exists for backward
>    compatibility but must not be used in any story.
> 4. Font = **Work Sans** (`akademie_style.FONT_REGULAR/FONT_BOLD/
>    FONT_ITALIC/FONT_BOLDITALIC`) — a humanist, warm-reading typeface.
>    Never `"Helvetica"` / `"Helvetica-Bold"` / any ReportLab base-14 font.
> 5. The logo's own pixel colors are **never altered** — no highlight/
>    shadow bevel tint, no gloss/sheen overlay drawn *on* the logo artwork
>    itself (`make_logo_3d.py` only removes the studio background and adds
>    a drop shadow *behind* the shape). Any "hochglanz" look comes from
>    the white card/frame drawn *around* the logo, never from touching
>    the PNG.
> 6. All logo card/plate backgrounds (`_header_footer`'s header plate,
>    `draw_attribution_bar`'s chip) are **flat white** (`colors.white`),
>    not a gradient.
> 7. Course subject is **"Fachbauleiter"** (a Weiterbildung zur
>    Fachbauleitung im Bauwesen — construction-site supervision/technical
>    site-management training), **6 Tage (48 UE), 08:00–16:00 Uhr**. An
>    earlier version of all 6 documents was about a completely different
>    course ("Fachkurs Ausbau", interior-finishing trades, 8 Wochen/320
>    UE) — that subject and duration are gone, don't reintroduce them.
> 8. Schulungsfolien get **substantially more text per slide** than a bare
>    3-bullet summary: an italic intro paragraph (`intro_paragraph()`)
>    plus 5–8 fuller-sentence bullets per topic (`bullets()`), per
>    explicit user request ("deutlich mehr Text mit allem was dazu
>    gehört"). Split a topic into two slides rather than cramming it thin.
>
> All were explicitly requested and confirmed once already (most after an
> explicit follow-up correcting an earlier version); treat them as
> permanent house style, not per-request choices to re-derive.

## Directory layout

```
akademie/
  assets/
    logo_mc_akademie_3d.png        # THE logo — use this file, always (see below)
    logo_mc_akademie_original.jpg  # source photo the user supplied; do not edit/replace without being told
    fonts/WorkSans-*.ttf           # Regular/Bold/Italic/BoldItalic — the house typeface
  scripts/
    akademie_style.py              # shared layout module — import this, don't duplicate
    make_logo_3d.py                # regenerates the cutout+shadow logo from the original photo
    build_*.py                     # one script per deliverable, run standalone
  output/
    *.pdf                          # generated deliverables, committed to the repo
```

## The logo — non-negotiable rules

- **File:** `assets/logo_mc_akademie_3d.png`. This is the real M&C Akademie
  logo the user provided (`logo_mc_akademie_original.jpg`), run through
  `make_logo_3d.py`, which only (a) removes the light studio background
  (alpha cutout) and (b) adds a soft drop shadow behind the shape for a
  floating/3D presence. **The logo's own colors and pixels are pixel-for-
  pixel the original photo's — no bevel, highlight/shadow tint, or gloss
  overlay is drawn on the artwork itself.** An earlier version of
  `make_logo_3d.py` did add such an overlay (bevel edges + a diagonal
  gloss streak + a top sheen) and the user explicitly rejected it as
  altering the original colors — don't reintroduce that.
- **Never** invent a placeholder/generic logo, and never re-crop, re-color,
  or swap in a different image for "AKADEMIE" branding. If a new logo photo
  is ever supplied, save it as the new `logo_mc_akademie_original.jpg`,
  rerun `make_logo_3d.py`, and update nothing else.
- **Placement:** top-center of the page, inside a **flat white** card/frame
  (`colors.white`, not a gradient) drawn by `akademie_style._header_footer`
  — gold border + a subtle gloss-highlight overlay on the *card*, never on
  the logo PNG itself. Same for the small per-chapter attribution chip
  (`draw_attribution_bar`). An earlier version used a light-gray gradient
  card background; the user explicitly asked for a plain white background.
- **Big page-header logo only on page 1** of every document (including
  every slide deck's first slide only, not every slide). Later pages use
  a compact header with no logo so content gets the reclaimed vertical
  space. This is done via `akademie_style.build_flowing_document()` (two
  `PageTemplate`s + a `NextPageTemplate("Later")` flowable) for flowing
  documents, and via the `hf_first`/`hf_later` + slide-counter pattern in
  `build_schulungsfolien.py` for the canvas-drawn slide deck. Reuse these,
  don't re-derive per script.
- **Separately, a small logo thumbnail (no text/name) travels with every
  chapter/section heading**, on every page, via `ChapterAttribution` /
  `draw_attribution_bar()` (see next section) — this is intentionally
  different from the page-1-only big header and is not a contradiction:
  the big letterhead-style logo is page-1-only, the small per-chapter
  attribution chip is everywhere a chapter starts.
- **No personal names anywhere** — see rule 3 in the callout above.
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
  `H1`/`H2`, `Body`/`BodyLeft`/`Bullet`/`Small`, table + exam styles) — use
  these instead of ad-hoc `ParagraphStyle(...)` calls. `Authors` still
  exists for backward compatibility but must not be used (see "no
  personal names" rule above).
- `GlossyBanner` — the navy/gold gradient chapter-heading banner with
  auto-shrinking font size (won't overflow on long titles), with a
  `kicker=` like `"KAPITEL 3"` or `"ABSCHNITT 2"`. **Don't use this
  directly for chapter headings** — use `chapter_heading()` below instead,
  which bundles it with the required attribution bar.
- `ChapterAttribution` / `draw_attribution_bar(c, x, y, w, h)` — the small
  logo-thumbnail chip (no text, no name) that must sit directly under
  every chapter/section heading. `chapter_heading()` (below) already
  includes it for flowing documents; for canvas-drawn content call
  `draw_attribution_bar` yourself right after drawing the banner.
- `chapter_heading(text, kicker=None, subtitle=None)` — returns
  `[GlossyBanner(...), Spacer(...), ChapterAttribution()]`. **The standard
  way to start any chapter/section** in a flowing document:
  `story.extend(A.chapter_heading("3. Foo", kicker="KAPITEL 3"))` (note
  `.extend`, not `.append` — it's a list of flowables, not one).
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
every subsequent one, tracking a slide counter. Use `topic_slide(idx_label,
title, intro, items)` (banner + attribution chip + `intro_paragraph()` +
`bullets()`) for each topic — this is the pattern that gives slides
substantially more text than a bare 3-bullet list (see rule 8 above); split
a dense topic into two `topic_slide()` calls rather than shrinking fonts.

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
- Big page-header logo on page 1 only, not every page — corrected from an
  earlier draft that put it on every page.
- Small logo + "Erstellt von..." attribution chip under **every** chapter
  heading (every page a chapter starts on, not just page 1) — corrected
  from an earlier draft that (mis-)read "page 1 only" as applying here
  too; the user explicitly re-asked for per-chapter placement twice.
- Logo artwork colors are the untouched original photo, no bevel/gloss
  tint on the PNG itself — corrected from an earlier version that added
  a highlight/shadow bevel + gloss overlay directly on the logo.
- Logo card/plate backgrounds are flat white, not a light-gray gradient —
  corrected from an earlier version.
- No personal names anywhere in any document (not on the title page, not
  in the per-chapter attribution chip) — corrected from an earlier
  version that showed "Erstellt von Matthias Gornik & Athanasios
  Matziouridis" throughout; only the logo identifies authorship now.
- Course subject is "Fachbauleiter" (Weiterbildung zur Fachbauleitung im
  Bauwesen), 6 Tage / 48 UE — corrected from an earlier version about a
  different course ("Fachkurs Ausbau", interior finishing, 8 Wochen/320
  UE). If the subject ever changes again, rewrite content in all 6
  documents consistently, not just the title/duration fields.
- Schulungsfolien carry substantially more text per topic (intro
  paragraph + 5–8 detailed bullets, via `topic_slide()`) — corrected from
  an earlier version with only 3 short bullet fragments per slide.
- When a new request is genuinely ambiguous on branding/design (a new
  logo, a different font, color scheme) or otherwise irreversible/costly to
  redo, ask before implementing rather than guessing — per explicit user
  instruction.
