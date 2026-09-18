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

  const DEFAULT_LOGO = {
    x: 82,
    y: 85,
    scale: 60,
    rotation: 0,
    opacity: 90,
    blendMode: 'source-over',
    visible: true,
    loopEnabled: true,
    loopSpeed: 2.5,
    motionType: 'pulseSwing'
  };

  /* Collage-Vorlagen: feste Layouts aus mehreren Bildfeldern (0..1-Bruchteile der
     Leinwand). Jede Vorlage kombiniert das reale importierte Bildmaterial (kein
     synthetischer Platzhalter) mit den pro Bild bereits einstellbaren Hochglanz-/3D-
     Effekten, plus dem Logo obendrauf – für Collagen statt Einzelbild-Ansicht. */
  const COLLAGE_TEMPLATES = [
    {
      id: 'duo-h',
      name: 'Zweiteilig · Nebeneinander',
      slots: [
        { x: 0, y: 0, w: 0.5, h: 1 },
        { x: 0.5, y: 0, w: 0.5, h: 1 }
      ]
    },
    {
      id: 'duo-v',
      name: 'Zweiteilig · Übereinander',
      slots: [
        { x: 0, y: 0, w: 1, h: 0.5 },
        { x: 0, y: 0.5, w: 1, h: 0.5 }
      ]
    },
    {
      id: 'hero-left',
      name: 'Großbild Links + 2',
      slots: [
        { x: 0, y: 0, w: 0.62, h: 1 },
        { x: 0.62, y: 0, w: 0.38, h: 0.5 },
        { x: 0.62, y: 0.5, w: 0.38, h: 0.5 }
      ]
    },
    {
      id: 'hero-top',
      name: 'Großbild Oben + 2',
      slots: [
        { x: 0, y: 0, w: 1, h: 0.6 },
        { x: 0, y: 0.6, w: 0.5, h: 0.4 },
        { x: 0.5, y: 0.6, w: 0.5, h: 0.4 }
      ]
    },
    {
      id: 'trio',
      name: 'Dreispaltig',
      slots: [
        { x: 0, y: 0, w: 1 / 3, h: 1 },
        { x: 1 / 3, y: 0, w: 1 / 3, h: 1 },
        { x: 2 / 3, y: 0, w: 1 / 3, h: 1 }
      ]
    },
    {
      id: 'grid4',
      name: 'Raster 2×2',
      slots: [
        { x: 0, y: 0, w: 0.5, h: 0.5 },
        { x: 0.5, y: 0, w: 0.5, h: 0.5 },
        { x: 0, y: 0.5, w: 0.5, h: 0.5 },
        { x: 0.5, y: 0.5, w: 0.5, h: 0.5 }
      ]
    }
  ];

  const LOGO_MOTION_TYPES = [
    { value: 'none', label: 'Keine' },
    { value: 'pulseSwing', label: 'Pulsieren + Seitlich' },
    { value: 'swing', label: 'Seitlich (rechts/links)' },
    { value: 'float', label: 'Schweben' },
    { value: 'rotate', label: 'Rotieren' },
    { value: 'pulse', label: 'Pulsieren' },
    { value: 'wobble', label: 'Wippen' }
  ];

  /* Echte Bewegung des Logos selbst (nicht nur der Glanz-Sweep): liefert einen Versatz/
     Zusatzdrehung/Zusatzskalierung relativ zur eingestellten Basis-Position, abhängig von
     der Zeit. Nutzt dieselbe loopSpeed wie der Glanz-Sweep, damit beides synchron läuft.
     Kräftigere, lebendigere Amplituden als eine erste, zu vorsichtige Fassung. */
  function computeLogoMotion(logo, w, h, time) {
    const motionType = logo.motionType || 'none';
    if (motionType === 'none' || time == null) {
      return { dx: 0, dy: 0, extraRotation: 0, scale: 1 };
    }
    const loopSpeed = Math.max(0.3, logo.loopSpeed || 2.5);
    const cycleIndex = Math.floor(time / loopSpeed);
    // Jeder zweite Loop läuft spiegelverkehrt, damit die Bewegung nicht immer im selben
    // Muster startet, sondern die Richtung von Durchlauf zu Durchlauf wechselt.
    const dirSign = cycleIndex % 2 === 0 ? 1 : -1;
    const phase = (((time % loopSpeed) + loopSpeed) % loopSpeed) / loopSpeed;
    const angle2pi = phase * Math.PI * 2;
    switch (motionType) {
      case 'float':
        return { dx: 0, dy: Math.sin(angle2pi) * h * 0.045 * dirSign, extraRotation: 0, scale: 1 };
      case 'swing':
        return { dx: Math.sin(angle2pi) * w * 0.09 * dirSign, dy: 0, extraRotation: 0, scale: 1 };
      case 'pulseSwing':
        return {
          dx: Math.sin(angle2pi) * w * 0.08 * dirSign,
          dy: 0,
          extraRotation: 0,
          scale: 1 + Math.sin(angle2pi) * 0.12
        };
      case 'rotate':
        return { dx: 0, dy: 0, extraRotation: angle2pi * dirSign, scale: 1 };
      case 'pulse':
        return { dx: 0, dy: 0, extraRotation: 0, scale: 1 + Math.sin(angle2pi) * 0.14 };
      case 'wobble':
        return { dx: 0, dy: 0, extraRotation: ((Math.sin(angle2pi) * 18 * Math.PI) / 180) * dirSign, scale: 1 };
      default:
        return { dx: 0, dy: 0, extraRotation: 0, scale: 1 };
    }
  }

  function drawLogoShine(ctx, w, h, phase) {
    const angle = (42 * Math.PI) / 180;
    const dirX = Math.cos(angle);
    const dirY = Math.sin(angle);
    const span = Math.sqrt(w * w + h * h) * 1.4;
    const travel = span * 2;
    const center = -span + phase * travel;
    // Schmales, klar begrenztes Glanzband (statt eines breiten Wash-outs), damit die
    // eigentliche Logo-Zeichnung unter dem Sweep lesbar bleibt.
    const halfBand = span * 0.5;
    const x0 = dirX * (center - halfBand);
    const y0 = dirY * (center - halfBand);
    const x1 = dirX * (center + halfBand);
    const y1 = dirY * (center + halfBand);
    const grad = ctx.createLinearGradient(x0, y0, x1, y1);
    grad.addColorStop(0, 'rgba(255,241,196,0)');
    grad.addColorStop(0.46, 'rgba(255,241,196,0)');
    grad.addColorStop(0.5, 'rgba(255,241,196,0.55)');
    grad.addColorStop(0.54, 'rgba(255,241,196,0)');
    grad.addColorStop(1, 'rgba(255,241,196,0)');
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = grad;
    ctx.fillRect(-w, -h, w * 2, h * 2);
    ctx.restore();
  }

  // Zwei wiederverwendbare, transparente Zwischen-Ebenen für das Logo: eine für das Logo
  // selbst, eine für den Glanz-Sweep. Der Sweep wird per 'source-atop' exakt auf die
  // Alpha-Form des Logos maskiert (rund/transparent/Text – nicht nur sein rechteckiges
  // Bounding-Box), bevor das Ergebnis auf den eigentlichen Frame kommt. drawLogoShine()
  // setzt intern selbst globalCompositeOperation='screen', darum braucht der Sweep eine
  // eigene Ebene statt direkt mit 'source-atop' auf die Logo-Ebene zu zeichnen.
  const scratchCanvases = {};

  function getScratchCanvas(key, w, h) {
    let canvas = scratchCanvases[key];
    if (!canvas) {
      canvas = document.createElement('canvas');
      scratchCanvases[key] = canvas;
    }
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    return canvas;
  }

  /* Zeichnet nur das Logo (mit optionalem animiertem Gold-Glanz-Loop) auf eine bereits
     vorhandene Canvas-Ebene. Getrennt von renderBase(), damit die Logo-Animation
     unabhängig vom (teuren, gecachten) Bild-Effekt-Rendering jeden Frame neu gezeichnet
     werden kann. */
  function compositeLogo(ctx, w, h, opts) {
    const { logoImage, logo, time } = opts;
    if (!logoImage || !logo || logo.visible === false) return;
    const logoScale = (logo.scale || 100) / 100;
    const logoW = w * 0.28 * logoScale;
    const logoH = logoW * (logoImage.height / logoImage.width);
    const cx = (logo.x / 100) * w;
    const cy = (logo.y / 100) * h;
    const rotation = ((logo.rotation || 0) * Math.PI) / 180;
    const opacity = clamp((logo.opacity != null ? logo.opacity : 100) / 100, 0, 1);
    const motion = computeLogoMotion(logo, w, h, time);
    const effCx = cx + motion.dx;
    const effCy = cy + motion.dy;
    const effRotation = rotation + motion.extraRotation;

    const layer = getScratchCanvas('logo', w, h);
    const lctx = layer.getContext('2d');
    lctx.setTransform(1, 0, 0, 1, 0, 0);
    lctx.clearRect(0, 0, w, h);
    lctx.save();
    lctx.translate(effCx, effCy);
    lctx.rotate(effRotation);
    lctx.scale(motion.scale, motion.scale);
    lctx.drawImage(logoImage, -logoW / 2, -logoH / 2, logoW, logoH);
    lctx.restore();

    if (logo.loopEnabled !== false && time != null) {
      const loopSpeed = Math.max(0.3, logo.loopSpeed || 2.5);
      const phase = (((time % loopSpeed) + loopSpeed) % loopSpeed) / loopSpeed;

      const shine = getScratchCanvas('shine', w, h);
      const sctx = shine.getContext('2d');
      sctx.setTransform(1, 0, 0, 1, 0, 0);
      sctx.clearRect(0, 0, w, h);
      sctx.save();
      sctx.translate(effCx, effCy);
      sctx.rotate(effRotation);
      sctx.scale(motion.scale, motion.scale);
      drawLogoShine(sctx, logoW, logoH, phase);
      sctx.restore();

      lctx.save();
      lctx.globalCompositeOperation = 'source-atop';
      lctx.drawImage(shine, 0, 0);
      lctx.restore();
    }

    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.globalCompositeOperation = logo.blendMode || 'source-over';
    ctx.drawImage(layer, 0, 0);
    ctx.restore();
  }

  /* Rendert nur Hintergrundbild + Bild-Effekte (ohne Logo) – das ist der teure, gecachte Teil. */
  function renderBase(ctx, w, h, opts) {
    const { image, effects } = opts;
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

    ctx.restore();
  }

  /* Druckgrößen für Speichern & Teilen: feste, cm-genaue Zielgrößen statt freier
     Pixel-Auflösung, damit das gespeicherte/geteilte Bild direkt für einen echten
     Fotoabzug passt. 300 DPI ist der Branchenstandard für Fotoqualität im Druck. */
  const PRINT_DPI = 300;
  function cmToPx(cm) {
    return Math.round((cm / 2.54) * PRINT_DPI);
  }
  const PHOTO_SIZES = [
    { id: '10x15', label: '10 × 15 cm (häufigste)', widthCm: 10, heightCm: 15 },
    { id: '9x13', label: '9 × 13 cm (klassisch)', widthCm: 9, heightCm: 13 },
    { id: '13x18', label: '13 × 18 cm (beliebte)', widthCm: 13, heightCm: 18 }
  ];
  const COLLAGE_SIZES = [
    { id: '30x40', label: '30 × 40 cm', widthCm: 30, heightCm: 40 },
    { id: '40x50', label: '40 × 50 cm', widthCm: 40, heightCm: 50 },
    { id: '50x70', label: '50 × 70 cm', widthCm: 50, heightCm: 70 }
  ];

  /* Wählbare Rand-Effekte für die einzelnen Collage-Felder – zusätzlich zu den pro Bild
     einstellbaren Effekten, damit auch der Übergang zwischen den Feldern gestaltet
     werden kann (z. B. edler Gold-Rahmen oder Leucht-Rand statt einer schlichten Lücke). */
  const COLLAGE_BORDER_STYLES = [
    { value: 'none', label: 'Kein Rahmen' },
    { value: 'gold', label: 'Gold-Rahmen' },
    { value: 'glow', label: 'Leucht-Rand' },
    { value: 'shadow', label: 'Schlagschatten' },
    { value: 'chrome', label: 'Chrom-Rand' },
    { value: 'neon', label: 'Neon-Rand' },
    { value: 'flowers', label: '🌸 Blumen-Rand' },
    { value: 'hearts', label: '💕 Herzen-Rand' },
    { value: 'stars', label: '⭐ Sterne-Rand' },
    { value: 'confetti', label: '🎉 Konfetti-Ecken' },
    { value: 'polaroid', label: '📷 Polaroid-Rahmen' }
  ];

  // Deterministisch statt Math.random(): renderCollage() läuft in der laufenden
  // mainLoop() jeden Frame neu, ein echter Zufall würde die Deko bei jedem Frame
  // neu würfeln und flackern. Gleicher seed -> immer derselbe "Zufalls"-Wert.
  function seeded(seed) {
    const x = Math.sin(seed * 12.9898) * 43758.5453;
    return x - Math.floor(x);
  }

  /* Liefert einen Punkt auf dem Umfang eines Rechtecks bei Bogenlänge d (im
     Uhrzeigersinn ab oben links) – zum gleichmäßigen Verteilen von Deko-Motiven
     entlang des Rands eines Collage-Felds. */
  function pointOnRectPerimeter(x, y, w, h, d) {
    if (d < w) return { x: x + d, y, angle: 0 };
    d -= w;
    if (d < h) return { x: x + w, y: y + d, angle: Math.PI / 2 };
    d -= h;
    if (d < w) return { x: x + w - d, y: y + h, angle: Math.PI };
    d -= w;
    return { x, y: y + h - d, angle: (Math.PI * 3) / 2 };
  }

  function forEachBorderPoint(x, y, w, h, spacing, seedBase, fn) {
    const perimeter = 2 * (w + h);
    const count = Math.max(6, Math.round(perimeter / spacing));
    for (let i = 0; i < count; i++) {
      const d = (i / count) * perimeter;
      const pt = pointOnRectPerimeter(x, y, w, h, d);
      fn(pt, i, seeded(seedBase + i));
    }
  }

  function drawFlower(ctx, cx, cy, r, hue) {
    ctx.save();
    ctx.translate(cx, cy);
    for (let p = 0; p < 5; p++) {
      const angle = (p / 5) * Math.PI * 2;
      ctx.save();
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.fillStyle = `hsl(${hue}, 72%, 74%)`;
      ctx.ellipse(0, -r * 0.55, r * 0.42, r * 0.62, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.beginPath();
    ctx.fillStyle = '#ffd75e';
    ctx.arc(0, 0, r * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawHeart(ctx, cx, cy, r, color) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(r / 10, r / 10);
    ctx.beginPath();
    ctx.moveTo(0, 3);
    ctx.bezierCurveTo(0, 0, -5, -4, -8, -1);
    ctx.bezierCurveTo(-11, 2, -8, 6, 0, 10);
    ctx.bezierCurveTo(8, 6, 11, 2, 8, -1);
    ctx.bezierCurveTo(5, -4, 0, 0, 0, 3);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
  }

  function drawStar(ctx, cx, cy, r, color) {
    ctx.save();
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const angle = (Math.PI / 5) * i - Math.PI / 2;
      const rad = i % 2 === 0 ? r : r * 0.42;
      const px = cx + Math.cos(angle) * rad;
      const py = cy + Math.sin(angle) * rad;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
  }

  function drawCollageTileBorder(ctx, x, y, w, h, style) {
    if (!style || style === 'none') return;
    const short = Math.min(w, h);
    ctx.save();
    switch (style) {
      case 'gold': {
        const lw = Math.max(2, short * 0.012);
        const grad = ctx.createLinearGradient(x, y, x + w, y + h);
        grad.addColorStop(0, '#b8860b');
        grad.addColorStop(0.5, '#ffd75e');
        grad.addColorStop(1, '#b8860b');
        ctx.strokeStyle = grad;
        ctx.lineWidth = lw;
        ctx.strokeRect(x + lw / 2, y + lw / 2, w - lw, h - lw);
        break;
      }
      case 'glow': {
        const lw = Math.max(2, short * 0.008);
        ctx.shadowColor = 'rgba(255,215,94,0.9)';
        ctx.shadowBlur = Math.max(10, short * 0.05);
        ctx.strokeStyle = 'rgba(255,241,196,0.85)';
        ctx.lineWidth = lw;
        ctx.strokeRect(x + lw, y + lw, w - lw * 2, h - lw * 2);
        break;
      }
      case 'shadow': {
        ctx.shadowColor = 'rgba(0,0,0,0.75)';
        ctx.shadowBlur = Math.max(12, short * 0.06);
        ctx.shadowOffsetY = Math.max(4, short * 0.015);
        ctx.strokeStyle = 'rgba(0,0,0,0.35)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, w, h);
        break;
      }
      case 'chrome': {
        const lw = Math.max(3, short * 0.015);
        const grad = ctx.createLinearGradient(x, y, x, y + h);
        grad.addColorStop(0, 'rgba(255,255,255,0.9)');
        grad.addColorStop(0.25, 'rgba(120,120,130,0.5)');
        grad.addColorStop(0.5, 'rgba(255,255,255,0.85)');
        grad.addColorStop(0.75, 'rgba(80,80,90,0.6)');
        grad.addColorStop(1, 'rgba(255,255,255,0.9)');
        ctx.strokeStyle = grad;
        ctx.lineWidth = lw;
        ctx.strokeRect(x + lw / 2, y + lw / 2, w - lw, h - lw);
        break;
      }
      case 'neon': {
        const lw = Math.max(2, short * 0.008);
        ctx.shadowColor = 'rgba(0,234,255,0.9)';
        ctx.shadowBlur = Math.max(14, short * 0.06);
        ctx.strokeStyle = 'rgba(0,234,255,0.9)';
        ctx.lineWidth = lw;
        ctx.strokeRect(x + lw, y + lw, w - lw * 2, h - lw * 2);
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(255,215,94,0.7)';
        const lw2 = Math.max(1, short * 0.004);
        ctx.lineWidth = lw2;
        ctx.strokeRect(x + lw * 3, y + lw * 3, w - lw * 6, h - lw * 6);
        break;
      }
      case 'flowers': {
        const r = Math.max(6, short * 0.03);
        forEachBorderPoint(x, y, w, h, r * 3.4, x + y, (pt, i, rnd) => {
          drawFlower(ctx, pt.x, pt.y, r * (0.8 + rnd * 0.4), (i * 47 + x) % 360);
        });
        break;
      }
      case 'hearts': {
        const r = Math.max(6, short * 0.026);
        const colors = ['#ff6f91', '#ff9ab5', '#ff4d6d'];
        forEachBorderPoint(x, y, w, h, r * 3.2, x + y + 7, (pt, i, rnd) => {
          drawHeart(ctx, pt.x, pt.y, r * (0.8 + rnd * 0.4), colors[i % colors.length]);
        });
        break;
      }
      case 'stars': {
        const r = Math.max(5, short * 0.024);
        const colors = ['#ffd75e', '#fff2c4', '#ffe27a'];
        ctx.shadowColor = 'rgba(255,215,94,0.7)';
        ctx.shadowBlur = short * 0.02;
        forEachBorderPoint(x, y, w, h, r * 3, x + y + 13, (pt, i, rnd) => {
          drawStar(ctx, pt.x, pt.y, r * (0.75 + rnd * 0.5), colors[i % colors.length]);
        });
        break;
      }
      case 'confetti': {
        const colors = ['#ff8fab', '#8fd9c4', '#8fc1ff', '#ffd75e', '#c9a0ff'];
        const corners = [
          { cx: x, cy: y },
          { cx: x + w, cy: y },
          { cx: x, cy: y + h },
          { cx: x + w, cy: y + h }
        ];
        corners.forEach((c, ci) => {
          const tw = Math.max(22, short * 0.11);
          const th = Math.max(9, short * 0.038);
          for (let k = 0; k < 2; k++) {
            const rnd = seeded(x + y + ci * 31 + k * 7);
            ctx.save();
            ctx.translate(c.cx, c.cy);
            ctx.rotate((rnd - 0.5) * Math.PI * 0.7);
            ctx.globalAlpha = 0.85;
            ctx.fillStyle = colors[(ci + k) % colors.length];
            ctx.fillRect(-tw / 2, -th / 2, tw, th);
            ctx.restore();
          }
        });
        break;
      }
      case 'polaroid': {
        const border = Math.max(6, short * 0.022);
        const bottomExtra = border * 2.4;
        ctx.fillStyle = '#faf6ec';
        ctx.fillRect(x, y, w, border);
        ctx.fillRect(x, y, border, h);
        ctx.fillRect(x + w - border, y, border, h);
        ctx.fillRect(x, y + h - bottomExtra, w, bottomExtra);
        break;
      }
    }
    ctx.restore();
  }

  /* Rendert eine Collage: mehrere Bilder gleichzeitig in den Feldern einer Vorlage,
     jedes mit seinen eigenen (bereits pro Bild einstellbaren) Effekten, plus Logo
     obendrauf. slotImages ist parallel zu template.slots: { image, effects } oder null,
     wenn dem Feld noch kein Bild zugeordnet ist. borderStyle ist einer der
     COLLAGE_BORDER_STYLES-Werte und wird um jedes gefüllte Feld herum gezeichnet. */
  function renderCollage(ctx, w, h, opts) {
    const { template, slotImages, logoImage, logo, time, borderStyle } = opts;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, h);
    const gap = Math.max(2, Math.round(Math.min(w, h) * 0.014));
    (template.slots || []).forEach((slot, i) => {
      const sx = Math.round(slot.x * w);
      const sy = Math.round(slot.y * h);
      const sw = Math.round(slot.w * w);
      const sh = Math.round(slot.h * h);
      const ix = sx + Math.ceil(gap / 2);
      const iy = sy + Math.ceil(gap / 2);
      const iw = Math.max(2, sw - gap);
      const ih = Math.max(2, sh - gap);
      const entry = slotImages && slotImages[i];
      if (!entry || !entry.image) return;
      const tile = document.createElement('canvas');
      tile.width = iw;
      tile.height = ih;
      renderBase(tile.getContext('2d'), iw, ih, { image: entry.image, effects: entry.effects });
      ctx.drawImage(tile, ix, iy);
      drawCollageTileBorder(ctx, ix, iy, iw, ih, borderStyle);
    });
    ctx.restore();
    if (logoImage && logo) {
      compositeLogo(ctx, w, h, { logoImage, logo, time });
    }
  }

  /* Einmal-Rendering von Hintergrund + Logo in einem Zug (für Export-Einzelframes ohne
     Logo-Loop-Animation, oder als Bequemlichkeits-Wrapper). logoTime steuert die Phase
     des Glanz-Loops (0, wenn nicht angegeben). */
  function renderComposite(ctx, w, h, opts) {
    renderBase(ctx, w, h, opts);
    compositeLogo(ctx, w, h, {
      logoImage: opts.logoImage,
      logo: opts.logo,
      time: opts.logoTime != null ? opts.logoTime : 0
    });
  }

  /* Analysiert die rohen Bildpixel (unabhängig von aktuell gesetzten Effekten) auf
     mittlere Leuchtdichte, Kontrastumfang und Sättigung – an einer kleinen, herunter-
     skalierten Stichprobe, damit das schnell bleibt. */
  function analyzeImageStats(imageEl) {
    const sampleSize = 64;
    const canvas = document.createElement('canvas');
    canvas.width = sampleSize;
    canvas.height = sampleSize;
    const ctx = canvas.getContext('2d');
    drawCover(ctx, imageEl, sampleSize, sampleSize);
    const data = ctx.getImageData(0, 0, sampleSize, sampleSize).data;
    let sumLum = 0;
    let minLum = 255;
    let maxLum = 0;
    let sumSat = 0;
    let count = 0;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      sumLum += lum;
      if (lum < minLum) minLum = lum;
      if (lum > maxLum) maxLum = lum;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      sumSat += max === 0 ? 0 : (max - min) / max;
      count++;
    }
    return { meanLum: sumLum / count, range: maxLum - minLum, meanSat: sumSat / count };
  }

  /* Leitet aus der Bildstatistik konkrete Ziel-Effektwerte ab und vergleicht sie mit den
     aktuell gesetzten Werten. Die Zielwerte hängen NUR von den rohen Bildpixeln ab (nicht
     von bereits gesetzten Effekten) – wird ein Vorschlag angenommen, wird beim nächsten
     Aufruf also kein weiterer Vorschlag mehr erzeugt (kein Aufschaukeln bei Mehrfachklick). */
  function suggestImprovement(imageEl, currentEffects) {
    if (!imageEl) return null;
    const stats = analyzeImageStats(imageEl);
    const fx = Object.assign({}, DEFAULT_EFFECTS, currentEffects || {});
    const changes = {};
    const reasons = [];
    const MIN_DELTA = 8;

    const targetBrightness = clamp(Math.round(100 + (128 - stats.meanLum) * 0.55), 60, 170);
    if (Math.abs(targetBrightness - fx.brightness) >= MIN_DELTA) {
      changes.brightness = targetBrightness;
      const diff = targetBrightness - fx.brightness;
      reasons.push(`Helligkeit ${diff > 0 ? '+' : '−'}${Math.abs(diff)}%`);
    }

    const targetContrast = clamp(Math.round(100 + (140 - stats.range) * 0.35), 100, 150);
    if (targetContrast - fx.contrast >= MIN_DELTA) {
      changes.contrast = targetContrast;
      reasons.push(`Kontrast +${targetContrast - fx.contrast}%`);
    }

    const targetSaturation =
      stats.meanSat < 0.3 ? clamp(Math.round(100 + (0.34 - stats.meanSat) * 110), 105, 160) : 100;
    if (Math.abs(targetSaturation - fx.saturation) >= MIN_DELTA) {
      changes.saturation = targetSaturation;
      const diff = targetSaturation - fx.saturation;
      reasons.push(`Sättigung ${diff > 0 ? '+' : '−'}${Math.abs(diff)}%`);
    }

    if (!Object.keys(changes).length) return null;
    return { changes, description: 'Vorschlag: ' + reasons.join(', ') + '.' };
  }

  window.FotoEffects = {
    DEFAULT_EFFECTS,
    DEFAULT_LOGO,
    EFFECT_GROUPS,
    LOGO_MOTION_TYPES,
    PRESETS,
    COLLAGE_TEMPLATES,
    COLLAGE_BORDER_STYLES,
    PRINT_DPI,
    PHOTO_SIZES,
    COLLAGE_SIZES,
    cmToPx,
    renderBase,
    compositeLogo,
    renderComposite,
    renderCollage,
    suggestImprovement
  };
})();
