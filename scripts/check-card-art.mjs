#!/usr/bin/env node
/**
 * Card art checker — deterministic quality gate for generated card art.
 * Dependency-free: uses macOS `sips` to decode pixels into BMP, then inspects
 * dimensions, colour density, blankness and residual AI card-frame rings.
 *
 * Usage:
 *   node scripts/check-card-art.mjs --webp <file.jpg> ...     # check files
 *   node scripts/check-card-art.mjs --fix <file.jpg> ...      # tighten crop when a frame ring is detected
 *   node scripts/check-card-art.mjs --manifest <cardId> <file> <model>
 *
 * Exit code 0 = all files pass, 1 = at least one rejection.
 */
import { readFileSync, statSync, existsSync, renameSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST = resolve(ROOT, 'scripts/card-art-manifest.json');

const TARGET_ASPECT = 3 / 4;
const ASPECT_TOLERANCE = 0.03;
const MIN_LUMA_STDDEV = 14;      // flat/blank art has near-zero variance
const MIN_MEAN_SATURATION = 8;   // greyscale art fails the "voxel cartoon" look
const RING_BAND = 0.035;         // outer 3.5% band on each edge
const RING_UNIFORMITY = 6.5;     // max per-channel spread inside the band
const MIN_BYTES = 24 * 1024;
const MAX_BYTES = 900 * 1024;

/** Decodes an image to raw RGB via sips → BMP. Returns null when undecodable. */
function decodeRgb(file) {
  const scratch = `/tmp/bb-check-${process.pid}.bmp`;
  try {
    execFileSync('sips', ['-s', 'format', 'bmp', file, '--out', scratch], { stdio: 'pipe' });
    const data = readFileSync(scratch);
    if (data.length < 60 || data.readUInt16LE(0) !== 0x4d42) return null;
    const width = data.readInt32LE(18);
    const height = data.readInt32LE(22);
    const bpp = data.readUInt16LE(28);
    if (bpp !== 24 || width < 8 || height < 8) return null;
    const stride = width * 3;
    const rows = [];
    for (let y = 0; y < height; y++) {
      const start = 54 + (height - 1 - y) * stride;
      rows.push(data.subarray(start, start + stride));
    }
    return { width, height, rows };
  } catch {
    return null;
  } finally {
    rmSync(scratch, { force: true });
  }
}

function channelStats(rows, x0, y0, x1, y1) {
  let rMin = 255, rMax = 0, gMin = 255, gMax = 0, bMin = 255, bMax = 0;
  let rSum = 0, gSum = 0, bSum = 0, n = 0;
  for (let y = y0; y < y1; y += Math.max(1, Math.floor((y1 - y0) / 40))) {
    const row = rows[y];
    for (let x = x0; x < x1; x += Math.max(1, Math.floor((x1 - x0) / 40))) {
      const b = row[x * 3], g = row[x * 3 + 1], r = row[x * 3 + 2];
      rMin = Math.min(rMin, r); rMax = Math.max(rMax, r);
      gMin = Math.min(gMin, g); gMax = Math.max(gMax, g);
      bMin = Math.min(bMin, b); bMax = Math.max(bMax, b);
      rSum += r; gSum += g; bSum += b; n++;
    }
  }
  const mean = n ? (rSum + gSum + bSum) / (3 * n) : 0;
  return {
    spread: Math.max(rMax - rMin, gMax - gMin, bMax - bMax === 0 ? bMax - bMin : bMax - bMin),
    mean,
    rMean: rSum / Math.max(1, n), gMean: gSum / Math.max(1, n), bMean: bSum / Math.max(1, n)
  };
}

function variances(rows, width, height) {
  // Global luma + colour variance to reject flat/blanks.
  let sum = 0, sumSq = 0, satSum = 0, n = 0;
  for (let y = 0; y < height; y += Math.max(1, Math.floor(height / 64))) {
    const row = rows[y];
    for (let x = 0; x < width; x += Math.max(1, Math.floor(width / 64))) {
      const r = row[x * 3], g = row[x * 3 + 1], b = row[x * 3 + 2];
      const luma = 0.299 * r + 0.587 * g + 0.114 * b;
      sum += luma; sumSq += luma * luma;
      satSum += Math.max(r, g, b) - Math.min(r, g, b);
      n++;
    }
  }
  const mean = sum / n;
  return {
    lumaStddev: Math.sqrt(Math.max(0, sumSq / n - mean * mean)),
    meanSaturation: satSum / n
  };
}

/** Edge rings: uniform bright bands betray a leftover AI frame. */
function detectFrameRing(rows, width, height) {
  const band = Math.floor(Math.min(width, height) * RING_BAND);
  const edges = {
    top: channelStats(rows, 0, 0, width, band),
    bottom: channelStats(rows, 0, height - band, width, height),
    left: channelStats(rows, 0, 0, band, height),
    right: channelStats(rows, width - band, 0, width, height)
  };
  const suspects = [];
  for (const [name, stats] of Object.entries(edges)) {
    const flat = stats.spread <= RING_UNIFORMITY;
    const bright = stats.mean > 205; // white/cream AI card frame
    if (flat && bright) suspects.push(name);
  }
  return suspects;
}

/** One full check pass; returns { ok, reasons[], dims }. */
export function checkArt(file) {
  const reasons = [];
  if (!existsSync(file)) return { ok: false, reasons: ['missing file'], dims: null };
  const size = statSync(file).size;
  if (size < MIN_BYTES) reasons.push(`too small (${(size / 1024).toFixed(0)}KB < ${MIN_BYTES / 1024}KB)`);
  if (size > MAX_BYTES) reasons.push(`too large (${(size / 1024).toFixed(0)}KB > ${MAX_BYTES / 1024}KB)`);

  const image = decodeRgb(file);
  if (!image) return { ok: false, reasons: [...reasons, 'undecodable image'], dims: null };
  const { width, height, rows } = image;
  const aspect = width / height;
  const dims = { width, height };
  if (Math.abs(aspect - TARGET_ASPECT) / TARGET_ASPECT > ASPECT_TOLERANCE) {
    reasons.push(`aspect ${aspect.toFixed(3)} not within 3:4 ±3%`);
  }
  if (Math.min(width, height) < 320) reasons.push(`resolution too low (${width}x${height})`);

  const { lumaStddev, meanSaturation } = variances(rows, width, height);
  if (lumaStddev < MIN_LUMA_STDDEV) reasons.push(`flat or blank art (luma σ=${lumaStddev.toFixed(1)})`);
  if (meanSaturation < MIN_MEAN_SATURATION) reasons.push(`desaturated (σ=${meanSaturation.toFixed(1)}) — not voxel-cartoon colour`);

  const ringSuspects = detectFrameRing(rows, width, height);
  if (ringSuspects.length > 0) {
    reasons.push(`residual card frame ring on: ${ringSuspects.join(', ')}`);
  }
  return { ok: reasons.length === 0, reasons, dims };
}

/** Tightens the centre crop (75% → 66% → 58%) to burn off a frame ring. */
export function tightenCrop(file) {
  const { width, height } = checkArt(file).dims ?? decodeRgb(file) ?? {};
  if (!width || !height) return false;
  const target = decodeRgb(file);
  const keepFactor = 0.88; // multiply each dimension by 88%, centre-anchored
  const newW = Math.round(width * keepFactor);
  const newH = Math.round(height * keepFactor);
  const scratch = `/tmp/bb-tighten-${process.pid}.jpg`;
  try {
    execFileSync('sips', ['-c', String(newH), String(newW), file, '--out', scratch], { stdio: 'pipe' });
    renameSync(scratch, file);
    return true;
  } catch {
    rmSync(scratch, { force: true });
    return false;
  }
}

function readManifest() {
  try { return JSON.parse(readFileSync(MANIFEST, 'utf8')); } catch { return {}; }
}
function writeManifest(entry, cardId, file, model) {
  const manifest = readManifest();
  manifest[cardId] = { file: basename(file), model, checkedAt: new Date().toISOString(), ...entry };
  const { writeFileSync } = require$nodeFs();
  writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
}
// Node has no require in ESM; lazily import instead.
let fsCache;
function require$nodeFs() {
  return fsCache ??= { writeFileSync: (...args) => import('node:fs').then(m => m.writeFileSync(...args)) };
}

// ---- CLI ----
const args = process.argv.slice(2);
const mode = args[0];
const files = args.slice(1).filter(a => !a.startsWith('--'));

if (mode === '--manifest') {
  const [cardId, file, model] = files;
  const result = checkArt(file);
  writeManifest({ ok: result.ok, reasons: result.reasons }, cardId, file, model);
  console.log(JSON.stringify(result));
  process.exit(result.ok ? 0 : 1);
} else if (mode === '--fix') {
  let failures = 0;
  for (const file of files) {
    let result = checkArt(file);
    let attempts = 0;
    while (!result.ok && attempts < 3) {
      attempts++;
      if (!tightenCrop(file)) break;
      result = checkArt(file);
    }
    console.log(`${basename(file)}: ${result.ok ? 'PASS' : 'FAIL'} ${result.reasons.join('; ')}${attempts ? ` (after ${attempts} tighten${attempts > 1 ? 's' : ''})` : ''}`);
    if (!result.ok) failures++;
  }
  process.exit(failures ? 1 : 0);
} else {
  let failures = 0;
  const filesToCheck = files.length ? files : [];
  for (const file of filesToCheck) {
    const result = checkArt(file);
    console.log(`${basename(file)}: ${result.ok ? 'PASS' : 'FAIL'} ${result.reasons.join('; ')}`);
    if (!result.ok) failures++;
  }
  process.exit(failures ? 1 : 0);
}
