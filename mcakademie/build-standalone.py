#!/usr/bin/env python3
"""Bundle mcakademie/ into a single self-contained HTML file.

Inlines css/style.css and js/main.js, and embeds assets/logo.png as a
base64 data URI, so the result is one standalone .html file with no
external dependencies - useful for sending as a single downloadable
file (e.g. via chat) instead of the multi-file source tree.

Usage:
    python3 build-standalone.py [output_path]

Defaults to writing mcakademie-standalone.html next to this script.
"""
import base64
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def build() -> str:
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    css = (ROOT / "css" / "style.css").read_text(encoding="utf-8")
    js = (ROOT / "js" / "main.js").read_text(encoding="utf-8")
    logo_b64 = base64.b64encode((ROOT / "assets" / "logo.png").read_bytes()).decode("ascii")
    data_uri = f"data:image/png;base64,{logo_b64}"

    out = html
    out = out.replace('src="assets/logo.png"', f'src="{data_uri}"')
    out = re.sub(
        r'<link rel="stylesheet" href="css/style\.css" />',
        f"<style>\n{css}\n</style>",
        out,
    )
    out = re.sub(r'<link rel="icon"[^>]*/>', "", out)
    out = re.sub(
        r'<script src="js/main\.js"></script>',
        f"<script>\n{js}\n</script>",
        out,
    )
    return out


if __name__ == "__main__":
    dest = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "mcakademie-standalone.html"
    dest.write_text(build(), encoding="utf-8")
    print(f"Wrote {dest} ({dest.stat().st_size:,} bytes)")
