#!/usr/bin/env python3
"""Entfernt den hellgrauen Studio-Hintergrund des M&C AKADEMIE Logos
und erzeugt eine freigestellte PNG-Version mit Transparenz + sanftem
Schlagschatten fuer die Verwendung im PDF-Header."""
from PIL import Image, ImageFilter
import numpy as np

import os
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(SCRIPT_DIR, "..", "assets", "logo_mc_akademie_original.jpg")
OUT = os.path.join(SCRIPT_DIR, "..", "assets", "logo_mc_akademie.png")

img = Image.open(SRC).convert("RGB")
arr = np.array(img).astype(np.int16)

# Hintergrund ist ein heller, fast neutraler Grauton (Vignette Richtung Weiss).
# Schaetzen: Abstand jedes Pixels zu "hellgrau/weiss" (niedrige Saettigung, hohe Helligkeit).
r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]
maxc = np.max(arr, axis=-1)
minc = np.min(arr, axis=-1)
sat = (maxc - minc)  # 0 = neutral grau/weiss, hoch = gesaettigte Farbe (rot/schwarz-Logo)
brightness = maxc

# Hintergrund: niedrige Saettigung UND nicht zu dunkel
bg_score = np.clip((40 - sat), 0, 40) / 40.0  # 1 = sicher Hintergrund (neutral), 0 = Farbe
dark_score = np.clip((brightness - 60), 0, 195) / 195.0  # dunkle Pixel (schwarzer Teil des Logos) sollen NICHT als bg gelten
alpha_bg = bg_score * (0.15 + 0.85 * dark_score)  # dunkle neutrale Pixel (Schwarz im Logo) bleiben erhalten
alpha = 1.0 - alpha_bg
alpha = np.clip(alpha, 0, 1)

# Glaetten der Alpha-Maske
alpha_img = Image.fromarray((alpha * 255).astype(np.uint8), mode="L")
alpha_img = alpha_img.filter(ImageFilter.GaussianBlur(1.2))
alpha_img = alpha_img.point(lambda p: 255 if p > 150 else (0 if p < 40 else p))
alpha_img = alpha_img.filter(ImageFilter.GaussianBlur(0.6))

rgba = img.convert("RGBA")
rgba.putalpha(alpha_img)

# Auf Inhalt zuschneiden (bbox der Alpha-Maske) mit etwas Rand
bbox = alpha_img.getbbox()
if bbox:
    pad = 14
    l, t, rr, bb = bbox
    l = max(0, l - pad)
    t = max(0, t - pad)
    rr = min(rgba.width, rr + pad)
    bb = min(rgba.height, bb + pad)
    rgba = rgba.crop((l, t, rr, bb))

rgba.save(OUT)
print("saved", rgba.size, OUT)
