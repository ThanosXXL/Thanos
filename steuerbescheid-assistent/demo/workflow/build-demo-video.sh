#!/usr/bin/env bash
# Baut ein fertiges Demo-Video aus Intro-/Outro-Standbild + einer aufgenommenen
# Walkthrough-Aufnahme + Hintergrundmusik zusammen. Wiederverwendbar für
# künftige Demovideos dieses oder anderer Projekte in diesem Repo.
#
# Ablauf:
#   1. Intro-/Outro-HTML (z. B. intro.html, outro.html) im Browser als PNG
#      rendern (z. B. per Playwright-Screenshot, 1280x720).
#   2. Walkthrough per Playwright aufnehmen (siehe record_walkthrough.js).
#   3. Dieses Skript aufrufen, um alles inkl. Musik zu einem mp4 zu mischen.
#
# Benötigt: ffmpeg (inkl. libx264/aac), python3 (nur für die Zeit-Arithmetik).
#
# Nutzung:
#   ./build-demo-video.sh \
#     --intro intro.png --outro outro.png --walkthrough walkthrough.webm \
#     --music lounge-band.mp3 --out demo.mp4 \
#     [--intro-duration 3.5] [--outro-duration 4.5]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

INTRO=""
OUTRO=""
WALKTHROUGH=""
MUSIC="${SCRIPT_DIR}/lounge-band.mp3"
OUT="demo-video.mp4"
INTRO_T="3.5"
OUTRO_T="4.5"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --intro) INTRO="$2"; shift 2 ;;
    --outro) OUTRO="$2"; shift 2 ;;
    --walkthrough) WALKTHROUGH="$2"; shift 2 ;;
    --music) MUSIC="$2"; shift 2 ;;
    --out) OUT="$2"; shift 2 ;;
    --intro-duration) INTRO_T="$2"; shift 2 ;;
    --outro-duration) OUTRO_T="$2"; shift 2 ;;
    *) echo "Unbekannte Option: $1" >&2; exit 1 ;;
  esac
done

if [[ -z "$INTRO" || -z "$OUTRO" || -z "$WALKTHROUGH" ]]; then
  echo "Benötigt: --intro <png> --outro <png> --walkthrough <webm/mp4> [--music <mp3>] [--out <mp4>]" >&2
  exit 1
fi

DUR=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$WALKTHROUGH")
TOTAL=$(python3 -c "print($INTRO_T + $DUR + $OUTRO_T)")
FADE_OUT_START=$(python3 -c "print(max(0, $TOTAL - 2))")

echo "Walkthrough-Dauer: ${DUR}s, Gesamtdauer: ${TOTAL}s"

ffmpeg -y \
  -loop 1 -t "$INTRO_T" -i "$INTRO" \
  -i "$WALKTHROUGH" \
  -loop 1 -t "$OUTRO_T" -i "$OUTRO" \
  -stream_loop -1 -i "$MUSIC" \
  -filter_complex "
    [0:v]scale=1280:720,fps=30,format=yuv420p,setsar=1[v0];
    [1:v]scale=1280:720,fps=30,format=yuv420p,setsar=1[v1];
    [2:v]scale=1280:720,fps=30,format=yuv420p,setsar=1[v2];
    [v0][v1][v2]concat=n=3:v=1:a=0[vout];
    [3:a]atrim=0:${TOTAL},afade=t=in:st=0:d=1.5,afade=t=out:st=${FADE_OUT_START}:d=2[aout]
  " \
  -map "[vout]" -map "[aout]" -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest \
  "$OUT"

echo "Fertig: $OUT"
