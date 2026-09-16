#!/usr/bin/env python3
"""Veredelt das echte M&C AKADEMIE Logo-Foto mit 3D-/Hochglanz-Effekten:
Bevel/Embossing an den Kanten (raised 3D look), Glanzstreifen (Glas-Reflex)
und weichem Schlagschatten. Die Formen/Farben des Original-Logos bleiben
unveraendert - es werden nur Licht-/Tiefeneffekte hinzugefuegt.
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

# --- Bevel / Emboss fuer 3D-Wirkung ---
def shift(a, dx, dy):
    out = np.zeros_like(a)
    h, w = a.shape
    x0, x1 = max(0, dx), w + min(0, dx)
    y0, y1 = max(0, dy), h + min(0, dy)
    sx0, sx1 = max(0, -dx), w + min(0, -dx)
    sy0, sy1 = max(0, -dy), h + min(0, -dy)
    out[y0:y1, x0:x1] = a[sy0:sy1, sx0:sx1]
    return out

d = 2
mask_i = mask.astype(np.int16)
shifted_dr = shift(mask_i, dx=d, dy=d)     # nach unten-rechts verschoben
shifted_ul = shift(mask_i, dx=-d, dy=-d)   # nach oben-links verschoben

highlight_band = np.clip(mask_i - shifted_dr, 0, 255).astype(np.uint8)
shadow_band = np.clip(mask_i - shifted_ul, 0, 255).astype(np.uint8)

base = np.array(rgba).astype(np.int16)

highlight_layer = Image.fromarray(highlight_band, mode="L").filter(
    ImageFilter.GaussianBlur(0.8))
shadow_layer = Image.fromarray(shadow_band, mode="L").filter(
    ImageFilter.GaussianBlur(0.8))

canvas = rgba.copy()

white_overlay = Image.new("RGBA", (W, H), (255, 255, 255, 0))
white_alpha = highlight_layer.point(lambda p: int(p * 0.32))
white_overlay.putalpha(white_alpha)
canvas = Image.alpha_composite(canvas, white_overlay)

black_overlay = Image.new("RGBA", (W, H), (10, 8, 20, 0))
black_alpha = shadow_layer.point(lambda p: int(p * 0.35))
black_overlay.putalpha(black_alpha)
canvas = Image.alpha_composite(canvas, black_overlay)

# --- Hochglanz-Glasstreifen (diagonaler Reflex) ueber dem Logo ---
gloss_mask = Image.new("L", (W, H), 0)
from PIL import ImageDraw
gd = ImageDraw.Draw(gloss_mask)
band_w = W * 0.16
gd.polygon([
    (W * 0.05, H * 1.15), (W * 0.05 + band_w, H * 1.15),
    (W * 0.55 + band_w, -H * 0.15), (W * 0.55, -H * 0.15),
], fill=255)
gloss_mask = gloss_mask.filter(ImageFilter.GaussianBlur(W * 0.012))
alpha_np = np.array(rgba.split()[-1])
gloss_mask_np = np.minimum(np.array(gloss_mask), alpha_np)
gloss_final = Image.fromarray(gloss_mask_np, mode="L").point(lambda p: int(p * 0.22))
gloss_white = Image.new("RGBA", (W, H), (255, 255, 255, 0))
gloss_white.putalpha(gloss_final)
canvas = Image.alpha_composite(canvas, gloss_white)

# top sheen (sehr weicher Glanz nur im oberen Drittel, dezent)
sheen_mask = Image.new("L", (W, H), 0)
sd = ImageDraw.Draw(sheen_mask)
sd.ellipse([-W * 0.1, -H * 0.75, W * 1.1, H * 0.25], fill=255)
sheen_mask = sheen_mask.filter(ImageFilter.GaussianBlur(W * 0.03))
sheen_mask_np = np.minimum(np.array(sheen_mask), alpha_np)
sheen_final = Image.fromarray(sheen_mask_np, mode="L").point(lambda p: int(p * 0.10))
sheen_white = Image.new("RGBA", (W, H), (255, 255, 255, 0))
sheen_white.putalpha(sheen_final)
canvas = Image.alpha_composite(canvas, sheen_white)

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
