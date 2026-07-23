/*
 * Erzeugt die PWA-/App-Icons für Music Heaven als reine PNG-Dateien
 * (schwarzer Hintergrund, frisches Grün als Noten-Glyphe) – ganz ohne
 * externe Abhängigkeiten (nur Node.js "zlib" für die PNG-Kompression).
 *
 * Ausführen: node scripts/generate-icons.js
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const OUT_DIR = path.join(__dirname, '..', 'renderer', 'icons');

const BLACK = [5, 10, 7, 255];
const GREEN = [31, 219, 111, 255];

function ellipse(x, y, cx, cy, rx, ry) {
  const dx = (x - cx) / rx;
  const dy = (y - cy) / ry;
  return dx * dx + dy * dy <= 1;
}

function rect(x, y, x0, y0, x1, y1) {
  return x >= x0 && x <= x1 && y >= y0 && y <= y1;
}

// Zeichnet zwei "verbundene Achtelnoten" (Music-Heaven-Glyphe) auf einen
// W x H Puffer. `scale` staucht die Glyphe für maskable Icons (Safe-Zone).
function draw(width, height, scale) {
  const buf = Buffer.alloc(width * height * 4);
  const cx = width / 2;
  const cy = height / 2;
  const s = scale != null ? scale : 1;

  const noteR = width * 0.11 * s;
  const head1 = { x: cx - width * 0.13 * s, y: cy + height * 0.08 * s };
  const head2 = { x: cx + width * 0.15 * s, y: cy + height * 0.16 * s };
  const stemW = width * 0.035 * s;
  const beamTopY = cy - height * 0.30 * s;
  const beamBotY = beamTopY + height * 0.07 * s;
  const stem1X = head1.x + noteR * 0.82;
  const stem2X = head2.x + noteR * 0.82;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let color = BLACK;

      const inHead1 = ellipse(x, y, head1.x, head1.y, noteR, noteR * 0.78);
      const inHead2 = ellipse(x, y, head2.x, head2.y, noteR, noteR * 0.78);
      const inStem1 = rect(x, y, stem1X - stemW / 2, beamTopY, stem1X + stemW / 2, head1.y);
      const inStem2 = rect(x, y, stem2X - stemW / 2, beamTopY, stem2X + stemW / 2, head2.y);
      const inBeam = rect(x, y, stem1X - stemW / 2, beamTopY, stem2X + stemW / 2, beamBotY);

      if (inHead1 || inHead2 || inStem1 || inStem2 || inBeam) color = GREEN;

      const idx = (y * width + x) * 4;
      buf[idx] = color[0];
      buf[idx + 1] = color[1];
      buf[idx + 2] = color[2];
      buf[idx + 3] = color[3];
    }
  }
  return buf;
}

function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      table[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function encodePng(width, height, rgba) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    const rowStart = y * (width * 4 + 1);
    raw[rowStart] = 0; // Filter: none
    rgba.copy(raw, rowStart + 1, y * width * 4, (y + 1) * width * 4);
  }
  const idat = zlib.deflateSync(raw);

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

function writeIcon(filename, size, scale) {
  const rgba = draw(size, size, scale);
  const png = encodePng(size, size, rgba);
  fs.writeFileSync(path.join(OUT_DIR, filename), png);
  console.log(`geschrieben: ${filename} (${size}x${size})`);
}

fs.mkdirSync(OUT_DIR, { recursive: true });
writeIcon('icon-192.png', 192, 1);
writeIcon('icon-512.png', 512, 1);
writeIcon('icon-maskable-512.png', 512, 0.6); // Safe-Zone für adaptive Icons
writeIcon('apple-touch-icon.png', 180, 1);
