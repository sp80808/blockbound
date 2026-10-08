// Generates Blockbound's original app icons as PNGs — no external assets.
// Renders at 2x with a box downsample for smooth edges, encodes PNG manually
// with node's built-in zlib (no image dependencies). Re-run: `npm run icons`.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');

const NAVY = [15, 23, 42];
const NAVY_LIGHT = [30, 41, 59];
const GOLD_TOP = [253, 230, 138];
const GOLD_BOTTOM = [217, 119, 6];
const IVORY = [255, 249, 229];
const PIP = [23, 32, 51];

function lerp(a, b, t) {
  return [0, 1, 2].map(i => Math.round(a[i] + (b[i] - a[i]) * t));
}

function makeCanvas(size) {
  return { size, data: Buffer.alloc(size * size * 3, 0) };
}

function setPixel(canvas, x, y, color) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  if (xi < 0 || yi < 0 || xi >= canvas.size || yi >= canvas.size) return;
  const offset = (yi * canvas.size + xi) * 3;
  canvas.data[offset] = color[0];
  canvas.data[offset + 1] = color[1];
  canvas.data[offset + 2] = color[2];
}

function fillRect(canvas, x0, y0, w, h, color) {
  for (let y = Math.floor(y0); y < Math.ceil(y0 + h); y++) {
    for (let x = Math.floor(x0); x < Math.ceil(x0 + w); x++) {
      setPixel(canvas, x, y, color);
    }
  }
}

function inRoundedRect(x, y, x0, y0, w, h, r) {
  const cx = Math.min(Math.max(x, x0 + r), x0 + w - r);
  const cy = Math.min(Math.max(y, y0 + r), y0 + h - r);
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
}

function fillRoundedRect(canvas, x0, y0, w, h, r, color, verticalGradient) {
  for (let y = Math.floor(y0); y < Math.ceil(y0 + h); y++) {
    for (let x = Math.floor(x0); x < Math.ceil(x0 + w); x++) {
      if (!inRoundedRect(x + 0.5, y + 0.5, x0, y0, w, h, r)) continue;
      const c = verticalGradient
        ? lerp(verticalGradient[0], verticalGradient[1], (y - y0) / h)
        : color;
      setPixel(canvas, x, y, c);
    }
  }
}

function fillCircle(canvas, cx, cy, r, color) {
  for (let y = Math.floor(cy - r); y < Math.ceil(cy + r); y++) {
    for (let x = Math.floor(cx - r); x < Math.ceil(cx + r); x++) {
      if ((x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r) setPixel(canvas, x, y, color);
    }
  }
}

/** Toy die showing five, centered in a [0..1] box scaled to the canvas. */
function drawDie(canvas, scale, cx, cy) {
  const s = canvas.size * scale;
  const x0 = cx - s / 2;
  const y0 = cy - s / 2;
  // Soft drop shadow.
  fillRoundedRect(canvas, x0 + s * 0.03, y0 + s * 0.05, s, s, s * 0.22, [2, 6, 23]);
  // Ivory face with a warm gold base edge.
  fillRoundedRect(canvas, x0, y0, s, s, s * 0.22, IVORY, [IVORY, [238, 214, 160]]);
  const pip = (dx, dy) => fillCircle(canvas, cx + dx * s, cy + dy * s, s * 0.075, PIP);
  pip(-0.26, -0.26);
  pip(0.26, -0.26);
  pip(0, 0);
  pip(-0.26, 0.26);
  pip(0.26, 0.26);
}

/** Full icon at 2x, then a box downsample to the target size. */
function render(size, maskable) {
  const SS = 2;
  const big = makeCanvas(size * SS);
  fillRect(big, 0, 0, big.size, big.size, NAVY);
  if (maskable) {
    // Keep all artwork inside the 80% safe circle/zone.
    const m = big.size * 0.1;
    fillRoundedRect(big, m, m, big.size - m * 2, big.size - m * 2, big.size * 0.09, NAVY_LIGHT);
    fillRoundedRect(
      big, m * 1.6, m * 1.6, big.size - m * 3.2, big.size - m * 3.2,
      big.size * 0.07, GOLD_TOP, [GOLD_TOP, GOLD_BOTTOM]
    );
    drawDie(big, 0.42, big.size / 2, big.size / 2);
  } else {
    fillRoundedRect(big, 0, 0, big.size, big.size, big.size * 0.24, NAVY_LIGHT);
    const ring = big.size * 0.045;
    fillRoundedRect(big, ring, ring, big.size - ring * 2, big.size - ring * 2, big.size * 0.2, GOLD_TOP, [GOLD_TOP, GOLD_BOTTOM]);
    const inner = ring * 2.1;
    fillRoundedRect(big, inner, inner, big.size - inner * 2, big.size - inner * 2, big.size * 0.17, NAVY);
    drawDie(big, 0.5, big.size / 2, big.size / 2);
  }
  // Box downsample.
  const out = Buffer.alloc(size * size * 3);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      for (let dy = 0; dy < SS; dy++) {
        for (let dx = 0; dx < SS; dx++) {
          const o = (((y * SS + dy) * big.size + (x * SS + dx)) * 3);
          r += big.data[o];
          g += big.data[o + 1];
          b += big.data[o + 2];
        }
      }
      const o = (y * size + x) * 3;
      const n = SS * SS;
      out[o] = Math.round(r / n);
      out[o + 1] = Math.round(g / n);
      out[o + 2] = Math.round(b / n);
    }
  }
  return { size, data: out };
}

const crcTable = new Int32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  crcTable[n] = c;
}

function crc(bytes) {
  let c = -1;
  for (let i = 0; i < bytes.length; i++) c = crcTable[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const header = Buffer.alloc(8);
  header.writeUInt32BE(data.length, 0);
  header.write(type, 4, 'ascii');
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc(Buffer.concat([Buffer.from(type, 'ascii'), data])), 0);
  return Buffer.concat([header, data, checksum]);
}

/** Minimal truecolour PNG: 8-bit RGB, filter 0 per scanline. */
function encodePNG(image) {
  const { size, data } = image;
  const raw = Buffer.alloc(size * (1 + size * 3));
  for (let y = 0; y < size; y++) {
    raw[y * (1 + size * 3)] = 0;
    data.copy(raw, y * (1 + size * 3) + 1, y * size * 3, (y + 1) * size * 3);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

mkdirSync(root, { recursive: true });
const targets = [
  ['icon-192.png', 192, false],
  ['icon-512.png', 512, false],
  ['icon-maskable-512.png', 512, true],
  ['apple-touch-icon.png', 180, false]
];
for (const [file, size, maskable] of targets) {
  writeFileSync(join(root, file), encodePNG(render(size, maskable)));
  console.log('wrote', file, size + 'x' + size);
}
