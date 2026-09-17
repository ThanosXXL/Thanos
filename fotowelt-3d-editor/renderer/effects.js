/* Gemeinsame Render-Pipeline für Vorschau und Export.
   Reine Funktionen auf Canvas-Basis – kein DOM-Zustand, damit Vorschau (klein/animiert)
   und Export (voller Auflösung) exakt denselben Look erzeugen. */
(function () {
  const DEFAULT_EFFECTS = {
    brightness: 100,
    contrast: 100,
    saturation: 100,
    hue: 0,
    blur: 0,
    sharpen: 0,
    sepia: 0,
    grayscale: 0,
    invert: 0,
    tiltX: 0,
    tiltY: 0,
    depth: 0,
    glossStrength: 0,
    glossAngle: 45,
    bevelStrength: 0,
    chromeStrength: 0,
    shadowBlur: 0,
    shadowColor: '#000000',
    shadowOffsetX: 0,
    shadowOffsetY: 10,
    shadowOpacity: 60,
    glowStrength: 0,
    glowColor: '#00eaff',
    vignetteStrength: 0,
    vignetteRadius: 70,
    duotoneEnabled: false,
    duotoneColor1: '#1a1a2e',
    duotoneColor2: '#e94560',
    duotoneMix: 100,
    grain: 0,
    reflection: 0,
    frameWidth: 0,
    frameColor: '#ffffff',
    frameRadius: 0
  };

  const EFFECT_GROUPS = [
    {
      title: 'Basis-Korrektur',
      fields: [
        { key: 'brightness', label: 'Helligkeit', type: 'range', min: 0, max: 200, step: 1, unit: '%' },
        { key: 'contrast', label: 'Kontrast', type: 'range', min: 0, max: 200, step: 1, unit: '%' },
        { key: 'saturation', label: 'Sättigung', type: 'range', min: 0, max: 200, step: 1, unit: '%' },
        { key: 'hue', label: 'Farbton', type: 'range', min: -180, max: 180, step: 1, unit: '°' },
        { key: 'blur', label: 'Weichzeichner', type: 'range', min: 0, max: 20, step: 0.5, unit: 'px' },
        { key: 'sharpen', label: 'Schärfen', type: 'range', min: 0, max: 100, step: 1, unit: '%' },
        { key: 'sepia', label: 'Sepia', type: 'range', min: 0, max: 100, step: 1, unit: '%' },
        { key: 'grayscale', label: 'Graustufen', type: 'range', min: 0, max: 100, step: 1, unit: '%' },
        { key: 'invert', label: 'Invertieren', type: 'range', min: 0, max: 100, step: 1, unit: '%' }
      ]
    },
    {
      title: '3D-Stil & Hochglanz',
      fields: [
        { key: 'tiltX', label: '3D-Neigung X', type: 'range', min: -30, max: 30, step: 1, unit: '°' },
        { key: 'tiltY', label: '3D-Neigung Y', type: 'range', min: -30, max: 30, step: 1, unit: '°' },
        { key: 'depth', label: 'Tiefe / Wölbung', type: 'range', min: 0, max: 40, step: 1, unit: '%' },
        { key: 'glossStrength', label: 'Hochglanz-Stärke', type: 'range', min: 0, max: 100, step: 1, unit: '%' },
        { key: 'glossAngle', label: 'Glanz-Winkel', type: 'range', min: 0, max: 180, step: 1, unit: '°' },
        { key: 'bevelStrength', label: '3D-Kante (Bevel)', type: 'range', min: 0, max: 100, step: 1, unit: '%' },
        { key: 'chromeStrength', label: 'Chrom / Metallic', type: 'range', min: 0, max: 100, step: 1, unit: '%' }
      ]
    },
    {
      title: 'Licht & Schatten',
      fields: [
        { key: 'shadowBlur', label: 'Schlagschatten-Unschärfe', type: 'range', min: 0, max: 80, step: 1, unit: 'px' },
        { key: 'shadowOffsetX', label: 'Schatten X-Versatz', type: 'range', min: -60, max: 60, step: 1, unit: 'px' },
        { key: 'shadowOffsetY', label: 'Schatten Y-Versatz', type: 'range', min: -60, max: 60, step: 1, unit: 'px' },
        { key: 'shadowOpacity', label: 'Schatten-Deckkraft', type: 'range', min: 0, max: 100, step: 1, unit: '%' },
        { key: 'shadowColor', label: 'Schattenfarbe', type: 'color' },
        { key: 'glowStrength', label: 'Leuchten (Glow)', type: 'range', min: 0, max: 100, step: 1, unit: '%' },
        { key: 'glowColor', label: 'Leuchtfarbe', type: 'color' },
        { key: 'vignetteStrength', label: 'Vignette-Stärke', type: 'range', min: 0, max: 100, step: 1, unit: '%' },
        { key: 'vignetteRadius', label: 'Vignette-Radius', type: 'range', min: 20, max: 100, step: 1, unit: '%' }
      ]
    },
    {
      title: 'Duoton-Verlauf',
      fields: [
        { key: 'duotoneEnabled', label: 'Duoton aktivieren', type: 'checkbox' },
        { key: 'duotoneColor1', label: 'Farbe – Schatten', type: 'color' },
        { key: 'duotoneColor2', label: 'Farbe – Lichter', type: 'color' },
        { key: 'duotoneMix', label: 'Mischstärke', type: 'range', min: 0, max: 100, step: 1, unit: '%' }
      ]
    },
    {
      title: 'Textur & Rahmen',
      fields: [
        { key: 'grain', label: 'Filmkorn / Rauschen', type: 'range', min: 0, max: 100, step: 1, unit: '%' },
        { key: 'reflection', label: 'Spiegelung', type: 'range', min: 0, max: 100, step: 1, unit: '%' },
        { key: 'frameWidth', label: 'Rahmenbreite', type: 'range', min: 0, max: 60, step: 1, unit: 'px' },
        { key: 'frameRadius', label: 'Rahmen-Rundung', type: 'range', min: 0, max: 100, step: 1, unit: 'px' },
        { key: 'frameColor', label: 'Rahmenfarbe', type: 'color' }
      ]
    }
  ];

  const PRESETS = [
    { name: 'Standard', effects: {} },
    {
      name: 'Hochglanz 3D',
      effects: {
        glossStrength: 55, glossAngle: 45, tiltX: 6, tiltY: -8, depth: 14,
        shadowBlur: 30, shadowOffsetY: 20, shadowOpacity: 55, bevelStrength: 45,
        contrast: 108, saturation: 112
      }
    },
    {
      name: 'Chrom Metallic',
      effects: {
        chromeStrength: 70, contrast: 118, saturation: 35, grayscale: 15,
        bevelStrength: 55, shadowBlur: 20, shadowOpacity: 45, glossStrength: 30
      }
    },
    {
      name: 'Neon Glow',
      effects: {
        glowStrength: 65, glowColor: '#00eaff', duotoneEnabled: true,
        duotoneColor1: '#0b0c2a', duotoneColor2: '#00eaff', duotoneMix: 35, contrast: 122
      }
    },
    {
      name: 'Film Noir',
      effects: { grayscale: 100, contrast: 130, vignetteStrength: 70, vignetteRadius: 65, grain: 25, shadowBlur: 25, shadowOpacity: 40 }
    },
    {
      name: 'Warmes Duoton',
      effects: { duotoneEnabled: true, duotoneColor1: '#2b1055', duotoneColor2: '#ff9a3c', duotoneMix: 60, contrast: 106 }
    },
    {
      name: 'Spiegel-Reflex',
      effects: { reflection: 45, glossStrength: 30, shadowBlur: 15, shadowOpacity: 35, tiltX: 3 }
    }
  ];

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function hexToRgb(hex) {
    const clean = hex.replace('#', '');
    const bigint = parseInt(clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean, 16);
    return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
  }

  function buildCssFilterString(fx) {
    const parts = [];
    parts.push(`brightness(${fx.brightness}%)`);
    parts.push(`contrast(${fx.contrast}%)`);
    parts.push(`saturate(${fx.saturation}%)`);
    if (fx.hue) parts.push(`hue-rotate(${fx.hue}deg)`);
    if (fx.blur) parts.push(`blur(${fx.blur}px)`);
    if (fx.sepia) parts.push(`sepia(${fx.sepia}%)`);
    if (fx.grayscale) parts.push(`grayscale(${fx.grayscale}%)`);
    if (fx.invert) parts.push(`invert(${fx.invert}%)`);
    return parts.join(' ');
  }

  function drawCover(ctx, img, w, h) {
    const imgRatio = img.width / img.height;
    const boxRatio = w / h;
    let sx, sy, sw, sh;
    if (imgRatio > boxRatio) {
      sh = img.height;
      sw = sh * boxRatio;
      sx = (img.width - sw) / 2;
      sy = 0;
    } else {
      sw = img.width;
      sh = sw / boxRatio;
      sx = 0;
      sy = (img.height - sh) / 2;
    }
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
  }

  function applySharpen(ctx, w, h, amountPercent) {
    if (amountPercent <= 0) return;
    const amount = amountPercent / 100;
    const src = ctx.getImageData(0, 0, w, h);
    const dst = ctx.createImageData(w, h);
    const s = src.data;
    const d = dst.data;
    const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        if (x === 0 || y === 0 || x === w - 1 || y === h - 1) {
          d[idx] = s[idx]; d[idx + 1] = s[idx + 1]; d[idx + 2] = s[idx + 2]; d[idx + 3] = s[idx + 3];
          continue;
        }
        for (let c = 0; c < 3; c++) {
          let sum = 0;
          let k = 0;
          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              const nIdx = ((y + ky) * w + (x + kx)) * 4 + c;
              sum += s[nIdx] * kernel[k];
              k++;
            }
          }
          const sharpened = clamp(sum, 0, 255);
          d[idx + c] = s[idx + c] * (1 - amount) + sharpened * amount;
        }
        d[idx + 3] = s[idx + 3];
      }
    }
    ctx.putImageData(dst, 0, 0);
  }

  function applyDuotone(ctx, w, h, color1, color2, mixPercent) {
    if (mixPercent <= 0) return;
    const mix = mixPercent / 100;
    const c1 = hexToRgb(color1);
    const c2 = hexToRgb(color2);
    const imageData = ctx.getImageData(0, 0, w, h);
    const d = imageData.data;
    for (let i = 0; i < d.length; i += 4) {
      const lum = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255;
      const r = c1.r + (c2.r - c1.r) * lum;
      const g = c1.g + (c2.g - c1.g) * lum;
      const b = c1.b + (c2.b - c1.b) * lum;
      d[i] = d[i] * (1 - mix) + r * mix;
      d[i + 1] = d[i + 1] * (1 - mix) + g * mix;
      d[i + 2] = d[i + 2] * (1 - mix) + b * mix;
    }
    ctx.putImageData(imageData, 0, 0);
  }

  function applyGloss(ctx, w, h, strengthPercent, angleDeg) {
    if (strengthPercent <= 0) return;
    const strength = strengthPercent / 100;
    const rad = (angleDeg * Math.PI) / 180;
    const diag = Math.sqrt(w * w + h * h);
    const dx = Math.cos(rad) * diag;
    const dy = Math.sin(rad) * diag;
    const grad = ctx.createLinearGradient(w / 2 - dx / 2, h / 2 - dy / 2, w / 2 + dx / 2, h / 2 + dy / 2);
    grad.addColorStop(0, 'rgba(255,255,255,0)');
    grad.addColorStop(0.42, 'rgba(255,255,255,0)');
    grad.addColorStop(0.5, `rgba(255,255,255,${0.85 * strength})`);
    grad.addColorStop(0.58, 'rgba(255,255,255,0)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  function applyChrome(ctx, w, h, strengthPercent) {
    if (strengthPercent <= 0) return;
    const strength = strengthPercent / 100;
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, `rgba(255,255,255,${0.55 * strength})`);
    grad.addColorStop(0.25, `rgba(120,120,130,${0.15 * strength})`);
    grad.addColorStop(0.5, `rgba(255,255,255,${0.35 * strength})`);
    grad.addColorStop(0.75, `rgba(80,80,90,${0.2 * strength})`);
    grad.addColorStop(1, `rgba(255,255,255,${0.45 * strength})`);
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  function applyBevel(ctx, w, h, strengthPercent) {
    if (strengthPercent <= 0) return;
    const strength = strengthPercent / 100;
    const edge = Math.max(6, Math.min(w, h) * 0.06);
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    const light = ctx.createLinearGradient(0, 0, edge, edge);
    light.addColorStop(0, `rgba(255,255,255,${0.9 * strength})`);
    light.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = light;
    ctx.fillRect(0, 0, w, edge * 1.5);
    ctx.fillRect(0, 0, edge * 1.5, h);
    const dark = ctx.createLinearGradient(w - edge, h - edge, w, h);
    dark.addColorStop(0, 'rgba(0,0,0,0)');
    dark.addColorStop(1, `rgba(0,0,0,${0.9 * strength})`);
    ctx.fillStyle = dark;
    ctx.fillRect(0, h - edge * 1.5, w, edge * 1.5);
    ctx.fillRect(w - edge * 1.5, 0, edge * 1.5, h);
    ctx.restore();
  }

  function applyVignette(ctx, w, h, strengthPercent, radiusPercent) {
    if (strengthPercent <= 0) return;
    const strength = strengthPercent / 100;
    const radius = (radiusPercent / 100) * (Math.max(w, h) / 1.3);
    const grad = ctx.createRadialGradient(w / 2, h / 2, radius * 0.3, w / 2, h / 2, radius);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, `rgba(0,0,0,${0.85 * strength})`);
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  function applyGrain(ctx, w, h, amountPercent) {
    if (amountPercent <= 0) return;
    const amount = amountPercent / 100;
    const tileSize = 128;
    const tile = document.createElement('canvas');
    tile.width = tileSize;
    tile.height = tileSize;
    const tctx = tile.getContext('2d');
    const imageData = tctx.createImageData(tileSize, tileSize);
    const d = imageData.data;
    for (let i = 0; i < d.length; i += 4) {
      const v = Math.floor(Math.random() * 255);
      d[i] = v; d[i + 1] = v; d[i + 2] = v; d[i + 3] = 255;
    }
    tctx.putImageData(imageData, 0, 0);
    const pattern = ctx.createPattern(tile, 'repeat');
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = amount * 0.5;
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  function applyFrame(ctx, w, h, width, color, radius) {
    if (width <= 0) return;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    const r = clamp(radius, 0, Math.min(w, h) / 2);
    const inset = width / 2;
    ctx.beginPath();
    ctx.moveTo(inset + r, inset);
    ctx.arcTo(w - inset, inset, w - inset, h - inset, r);
    ctx.arcTo(w - inset, h - inset, inset, h - inset, r);
    ctx.arcTo(inset, h - inset, inset, inset, r);
    ctx.arcTo(inset, inset, w - inset, inset, r);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  function compute3DTransform(w, h, tiltX, tiltY, depth) {
    const radX = (tiltX * Math.PI) / 180;
    const radY = (tiltY * Math.PI) / 180;
    const skewY = Math.tan(radX) * 0.35;
    const skewX = Math.tan(radY) * 0.35;
    const scale = 1 - clamp(depth, 0, 40) / 260;
    return { scale, skewX, skewY };
  }

  function renderComposite(ctx, w, h, opts) {
    const { image, effects, logoImage, logo } = opts;
    const fx = Object.assign({}, DEFAULT_EFFECTS, effects || {});

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, h);

    const base = document.createElement('canvas');
    base.width = w;
    base.height = h;
    const bctx = base.getContext('2d');
    bctx.filter = buildCssFilterString(fx);
    drawCover(bctx, image, w, h);
    bctx.filter = 'none';

    if (fx.sharpen > 0) applySharpen(bctx, w, h, fx.sharpen);
    if (fx.duotoneEnabled) applyDuotone(bctx, w, h, fx.duotoneColor1, fx.duotoneColor2, fx.duotoneMix);
    if (fx.glossStrength > 0) applyGloss(bctx, w, h, fx.glossStrength, fx.glossAngle);
    if (fx.chromeStrength > 0) applyChrome(bctx, w, h, fx.chromeStrength);
    if (fx.bevelStrength > 0) applyBevel(bctx, w, h, fx.bevelStrength);
    if (fx.vignetteStrength > 0) applyVignette(bctx, w, h, fx.vignetteStrength, fx.vignetteRadius);
    if (fx.grain > 0) applyGrain(bctx, w, h, fx.grain);
    if (fx.frameWidth > 0) applyFrame(bctx, w, h, fx.frameWidth, fx.frameColor, fx.frameRadius);

    const t = compute3DTransform(w, h, fx.tiltX, fx.tiltY, fx.depth);

    if (fx.glowStrength > 0) {
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.transform(t.scale, t.skewY, t.skewX, t.scale, 0, 0);
      ctx.translate(-w / 2, -h / 2);
      ctx.filter = `blur(${8 + fx.glowStrength / 3}px)`;
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = clamp(fx.glowStrength / 100, 0, 1) * 0.9;
      const rgb = hexToRgb(fx.glowColor);
      const glowCanvas = document.createElement('canvas');
      glowCanvas.width = w;
      glowCanvas.height = h;
      const gctx = glowCanvas.getContext('2d');
      gctx.drawImage(base, 0, 0);
      gctx.globalCompositeOperation = 'source-in';
      gctx.fillStyle = `rgb(${rgb.r},${rgb.g},${rgb.b})`;
      gctx.fillRect(0, 0, w, h);
      ctx.drawImage(glowCanvas, 0, 0);
      ctx.restore();
    }

    if (fx.reflection > 0) {
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.transform(t.scale, t.skewY, t.skewX, t.scale, 0, 0);
      ctx.translate(-w / 2, -h / 2);
      ctx.translate(0, h);
      ctx.scale(1, -1);
      const fadeGrad = ctx.createLinearGradient(0, 0, 0, h * 0.6);
      fadeGrad.addColorStop(0, `rgba(255,255,255,${0.35 * (fx.reflection / 100)})`);
      fadeGrad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.globalAlpha = 1;
      ctx.drawImage(base, 0, 0);
      ctx.globalCompositeOperation = 'destination-in';
      ctx.fillStyle = fadeGrad;
      ctx.fillRect(0, 0, w, h * 0.6);
      ctx.restore();
    }

    ctx.save();
    if (fx.shadowBlur > 0 || fx.shadowOffsetX !== 0 || fx.shadowOffsetY !== 0) {
      const rgb = hexToRgb(fx.shadowColor);
      ctx.shadowColor = `rgba(${rgb.r},${rgb.g},${rgb.b},${fx.shadowOpacity / 100})`;
      ctx.shadowBlur = fx.shadowBlur;
      ctx.shadowOffsetX = fx.shadowOffsetX;
      ctx.shadowOffsetY = fx.shadowOffsetY;
    }
    ctx.translate(w / 2, h / 2);
    ctx.transform(t.scale, t.skewY, t.skewX, t.scale, 0, 0);
    ctx.translate(-w / 2, -h / 2);
    ctx.drawImage(base, 0, 0);
    ctx.restore();

    if (logoImage && logo && logo.visible !== false) {
      ctx.save();
      const logoScale = (logo.scale || 100) / 100;
      const logoW = w * 0.28 * logoScale;
      const logoH = logoW * (logoImage.height / logoImage.width);
      const cx = (logo.x / 100) * w;
      const cy = (logo.y / 100) * h;
      ctx.translate(cx, cy);
      ctx.rotate(((logo.rotation || 0) * Math.PI) / 180);
      ctx.globalAlpha = clamp((logo.opacity != null ? logo.opacity : 100) / 100, 0, 1);
      ctx.globalCompositeOperation = logo.blendMode || 'source-over';
      ctx.drawImage(logoImage, -logoW / 2, -logoH / 2, logoW, logoH);
      ctx.restore();
    }

    ctx.restore();
  }

  window.FotoEffects = {
    DEFAULT_EFFECTS,
    EFFECT_GROUPS,
    PRESETS,
    renderComposite
  };
})();
