#!/usr/bin/env python3
"""Veredelt das echte M&C AKADEMIE Logo-Foto: entfernt nur den Studio-
Hintergrund und legt einen weichen Schlagschatten dahinter, fuer eine
freigestellte, leicht schwebende 3D-Praesentation. Die Farben (Rot,
Schwarz, Text) bleiben exakt wie im Original-Foto - KEINE Hell-/Dunkel-
oder Glanz-Ueberlagerung auf dem Logo selbst (das haette die Original-
farben eingefaerbt). Der Hochglanz-Effekt kommt stattdessen von der
Glas-/Glanzplatte, die akademie_style.py separat hinter dem Logo im
Seitenkopf bzw. in der Kapitel-Attribution zeichnet.
"""
import os
import numpy as np
from PIL import Image, ImageFilter

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(SCRIPT_DIR, "..", "assets", "logo_mc_akademie_original.jpg")
OUT = os.path.join(SCRIPT_DIR, "..", "assets", "logo_mc_akademie_3d.png")

img = Image.open(SRC).convert("RGB")
arr = np.array(img).astype(np.int16)

# --- Hintergrund freistellen (wie zuvor) ---
r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]
maxc = np.max(arr, axis=-1)
minc = np.min(arr, axis=-1)
sat = maxc - minc
brightness = maxc
bg_score = np.clip((40 - sat), 0, 40) / 40.0
dark_score = np.clip((brightness - 60), 0, 195) / 195.0
alpha_bg = bg_score * (0.15 + 0.85 * dark_score)
alpha = np.clip(1.0 - alpha_bg, 0, 1)

alpha_img = Image.fromarray((alpha * 255).astype(np.uint8), mode="L")
alpha_img = alpha_img.filter(ImageFilter.GaussianBlur(1.2))
alpha_img = alpha_img.point(lambda p: 255 if p > 150 else (0 if p < 40 else p))
alpha_img = alpha_img.filter(ImageFilter.GaussianBlur(0.6))

rgba = img.convert("RGBA")
rgba.putalpha(alpha_img)

bbox = alpha_img.getbbox()
pad = 40
l, t, rr, bb = bbox
l, t = max(0, l - pad), max(0, t - pad)
rr, bb = min(rgba.width, rr + pad), min(rgba.height, bb + pad)
rgba = rgba.crop((l, t, rr, bb))
mask = np.array(rgba.split()[-1])
W, H = rgba.size
alpha_np = mask

# Logo-Pixel bleiben unveraendert (Original-Farben) - keine Hell-/Dunkel-
# oder Glanz-Ueberlagerung auf dem Bild selbst.
canvas = rgba.copy()

# --- Weicher Schlagschatten fuer Tiefe (separat unter dem Logo) ---
shadow_canvas_pad = int(W * 0.06)
sc_w, sc_h = W + shadow_canvas_pad * 2, H + shadow_canvas_pad * 2
shadow_full = Image.new("RGBA", (sc_w, sc_h), (0, 0, 0, 0))
shadow_alpha_img = Image.fromarray(alpha_np, mode="L")
shadow_shape = Image.new("RGBA", (W, H), (0, 0, 0, 0))
shadow_shape.putalpha(shadow_alpha_img.point(lambda p: int(p * 0.42)))
shadow_black = Image.new("RGBA", (W, H), (5, 8, 20, 255))
shadow_black.putalpha(shadow_shape.split()[-1])
shadow_full.paste(shadow_black, (shadow_canvas_pad + int(W * 0.012), shadow_canvas_pad + int(H * 0.025)),
                   shadow_black)
shadow_full = shadow_full.filter(ImageFilter.GaussianBlur(W * 0.012))

final = Image.new("RGBA", (sc_w, sc_h), (0, 0, 0, 0))
final = Image.alpha_composite(final, shadow_full)
final.paste(canvas, (shadow_canvas_pad, shadow_canvas_pad), canvas)

final.save(OUT)
print("saved", final.size, OUT)
