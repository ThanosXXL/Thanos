#!/usr/bin/env bash
# Unterlegt ein Demovideo mit der Branding-Hintergrundmusik (lounge-band.mp3)
# und passt deren Länge automatisch an die Videolänge an: Musik wird geloopt,
# wenn sie kürzer als das Video ist, und gekürzt, wenn sie länger ist.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MUSIC="$SCRIPT_DIR/lounge-band.mp3"

if [ "$#" -ne 2 ]; then
  echo "Verwendung: $0 <eingabe-video.mp4> <ausgabe-video-mit-musik.mp4>" >&2
  exit 1
fi

INPUT_VIDEO="$1"
OUTPUT_VIDEO="$2"

if [ ! -f "$MUSIC" ]; then
  echo "Fehler: $MUSIC fehlt. Branding-Hintergrundmusik einmalig unter diesem Pfad ablegen (siehe README.md in diesem Ordner)." >&2
  exit 1
fi

if [ ! -f "$INPUT_VIDEO" ]; then
  echo "Fehler: Eingabevideo nicht gefunden: $INPUT_VIDEO" >&2
  exit 1
fi

VIDEO_DURATION="$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$INPUT_VIDEO")"

ffmpeg -y -stream_loop -1 -i "$MUSIC" -i "$INPUT_VIDEO" \
  -map 1:v -map 0:a -c:v copy -c:a aac -t "$VIDEO_DURATION" \
  "$OUTPUT_VIDEO"

echo "Fertig: $OUTPUT_VIDEO (Hintergrundmusik automatisch auf ${VIDEO_DURATION}s angepasst)"
