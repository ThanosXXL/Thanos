#!/bin/sh
# Allgemein Docs – vollautomatische Installation für macOS und Linux
#   curl -fsSL https://raw.githubusercontent.com/ThanosXXL/Thanos/main/allgemein-docs/install/install.sh | sh
# Lädt das neueste Release (Tag allgemein-docs-v*) von GitHub und installiert die App.
# Optionen (Umgebungsvariablen):
#   ALLGEMEIN_DOCS_REPO   GitHub-Repository (Standard: ThanosXXL/Thanos)
#   ALLGEMEIN_DOCS_API    API-URL der Release-Liste (zum Testen)
#   DRY_RUN=1             nur anzeigen, was installiert würde
set -eu

REPO="${ALLGEMEIN_DOCS_REPO:-ThanosXXL/Thanos}"
API="${ALLGEMEIN_DOCS_API:-https://api.github.com/repos/$REPO/releases?per_page=30}"
OS="$(uname -s)"
ARCH="$(uname -m)"

say()  { printf '\033[1;36m==>\033[0m %s\n' "$1"; }
fail() { printf '\033[1;31mFehler:\033[0m %s\n' "$1" >&2; exit 1; }
need() { command -v "$1" >/dev/null 2>&1 || fail "„$1“ wird benötigt, ist aber nicht installiert."; }

need curl

say "Suche das neueste Allgemein-Docs-Release …"
JSON="$(curl -fsSL "$API")" || fail "Release-Liste konnte nicht geladen werden (Repository öffentlich? Release veröffentlicht?)."
URLS="$(printf '%s' "$JSON" | grep -o '"browser_download_url": *"[^"]*"' | sed 's/.*"\(https[^"]*\)"$/\1/' | grep '/allgemein-docs-v' || true)"
[ -n "$URLS" ] || fail "Kein Release mit Tag „allgemein-docs-v…“ gefunden. Bitte zuerst einen Release-Tag veröffentlichen."

pick() { printf '%s\n' "$URLS" | grep -i "$1" | head -n 1 || true; }

case "$OS" in
  Linux)
    URL="$(pick '\.AppImage$')"
    [ -n "$URL" ] || fail "Im Release wurde kein Linux-AppImage gefunden."
    ;;
  Darwin)
    case "$ARCH" in
      arm64) URL="$(pick 'arm64.*\.dmg$')" ;;
      *)     URL="$(pick 'x64.*\.dmg$')" ;;
    esac
    [ -n "$URL" ] || URL="$(pick '\.dmg$')"
    [ -n "$URL" ] || fail "Im Release wurde kein macOS-Installer (.dmg) gefunden."
    ;;
  *) fail "Dieses Skript unterstützt macOS und Linux. Für Windows: install.ps1" ;;
esac

say "Gefunden: $URL"
[ "${DRY_RUN:-0}" = "1" ] && { say "DRY_RUN – es wird nichts installiert."; exit 0; }

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT INT TERM

case "$OS" in
  Linux)
    DEST="$HOME/.local/share/allgemein-docs"
    BIN="$HOME/.local/bin"
    APPS="$HOME/.local/share/applications"
    mkdir -p "$DEST" "$BIN" "$APPS"
    say "Lade AppImage herunter …"
    curl -fL --progress-bar -o "$DEST/Allgemein-Docs.AppImage" "$URL"
    chmod +x "$DEST/Allgemein-Docs.AppImage"
    ln -sf "$DEST/Allgemein-Docs.AppImage" "$BIN/allgemein-docs"
    ICON_URL="$(pick 'icon\.png$')"
    [ -n "$ICON_URL" ] && curl -fsSL -o "$DEST/icon.png" "$ICON_URL" 2>/dev/null || true
    cat > "$APPS/allgemein-docs.desktop" <<DESKTOP
[Desktop Entry]
Type=Application
Name=Allgemein Docs
Comment=Praxisverwaltung für Allgemeinmedizin
Exec=$DEST/Allgemein-Docs.AppImage --no-sandbox %U
Icon=$DEST/icon.png
Terminal=false
Categories=Office;MedicalSoftware;
DESKTOP
    command -v update-desktop-database >/dev/null 2>&1 && update-desktop-database "$APPS" >/dev/null 2>&1 || true
    say "Fertig! Starten über das Anwendungsmenü („Allgemein Docs“) oder im Terminal mit: allgemein-docs"
    case ":$PATH:" in *":$BIN:"*) ;; *) say "Hinweis: $BIN ist nicht im PATH." ;; esac
    ;;
  Darwin)
    need hdiutil
    say "Lade Installer herunter …"
    curl -fL --progress-bar -o "$TMP/AllgemeinDocs.dmg" "$URL"
    MNT="$TMP/mnt"
    mkdir -p "$MNT"
    hdiutil attach -nobrowse -quiet -mountpoint "$MNT" "$TMP/AllgemeinDocs.dmg" || fail "Das Installationsabbild konnte nicht geöffnet werden."
    APP="$(find "$MNT" -maxdepth 1 -name '*.app' | head -n 1)"
    [ -n "$APP" ] || { hdiutil detach -quiet "$MNT" || true; fail "Im Installationsabbild wurde keine App gefunden."; }
    say "Installiere nach /Applications …"
    TARGET="/Applications/$(basename "$APP")"
    rm -rf "$TARGET" 2>/dev/null || sudo rm -rf "$TARGET"
    cp -R "$APP" /Applications/ 2>/dev/null || sudo cp -R "$APP" /Applications/
    hdiutil detach -quiet "$MNT" || true
    xattr -dr com.apple.quarantine "$TARGET" 2>/dev/null || sudo xattr -dr com.apple.quarantine "$TARGET" 2>/dev/null || true
    say "Fertig! „Allgemein Docs“ finden Sie im Ordner Programme."
    open "$TARGET" 2>/dev/null || true
    ;;
esac
