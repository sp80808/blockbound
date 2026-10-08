// Static PWA contract tests: manifest, generated icons, service worker,
// registration and portable base path. No browser or build required.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const web = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = relative => readFileSync(join(web, relative), 'utf8');

function pngSize(relative) {
  const bytes = readFileSync(join(web, relative));
  assert.deepEqual(
    Array.from(bytes.subarray(0, 8)),
    [137, 80, 78, 71, 13, 10, 26, 10],
    relative + ' must start with the PNG signature'
  );
  assert.equal(bytes.subarray(12, 16).toString('ascii'), 'IHDR');
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), bytes: bytes.length };
}

test('manifest declares an installable portrait game', () => {
  const manifest = JSON.parse(read('public/manifest.webmanifest'));
  assert.ok(manifest.name.length > 0);
  assert.ok(manifest.short_name.length > 0);
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.orientation, 'portrait');
  assert.equal(manifest.start_url, './');
  assert.equal(manifest.scope, './');
  for (const colour of [manifest.theme_color, manifest.background_color]) {
    assert.match(colour, /^#[0-9a-f]{6}$/i);
  }
  const sizes = manifest.icons.map(i => i.sizes);
  assert.ok(sizes.includes('192x192'), 'needs a 192px icon');
  assert.ok(sizes.includes('512x512'), 'needs a 512px icon');
  assert.ok(
    manifest.icons.some(i => (i.purpose ?? 'any').split(' ').includes('maskable')),
    'needs a maskable icon'
  );
  for (const icon of manifest.icons) {
    assert.ok(icon.src.startsWith('./'), 'icon URLs stay relative: ' + icon.src);
    assert.ok(existsSync(join(web, 'public', icon.src.slice(2))), 'missing ' + icon.src);
  }
});

test('generated icons match their declared sizes', () => {
  assert.deepEqual(
    [pngSize('public/icons/icon-192.png').width, pngSize('public/icons/icon-192.png').height],
    [192, 192]
  );
  assert.deepEqual(
    [pngSize('public/icons/icon-512.png').width, pngSize('public/icons/icon-512.png').height],
    [512, 512]
  );
  assert.deepEqual(
    [pngSize('public/icons/icon-maskable-512.png').width, pngSize('public/icons/icon-maskable-512.png').height],
    [512, 512]
  );
  assert.deepEqual(
    [pngSize('public/icons/apple-touch-icon.png').width, pngSize('public/icons/apple-touch-icon.png').height],
    [180, 180]
  );
  for (const file of ['icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png']) {
    assert.ok(statSync(join(web, 'public', 'icons', file)).size > 512, file + ' looks truncated');
  }
});

test('index.html wires manifest, theme and touch icon relatively', () => {
  const html = read('index.html');
  assert.ok(html.includes('rel="manifest"'));
  assert.ok(html.includes('manifest.webmanifest'));
  assert.ok(html.includes('name="theme-color"'));
  assert.ok(html.includes('apple-touch-icon'));
  assert.ok(html.includes('viewport-fit=cover'));
});

test('service worker caches the shell and never touches cross-origin traffic', () => {
  const sw = read('public/sw.js');
  assert.ok(sw.includes('CACHE_VERSION'), 'versioned caches are required for clean updates');
  assert.ok(sw.includes('skipWaiting'), 'updates must activate without a second visit');
  assert.ok(sw.includes('clients.claim'), 'activated worker takes control of open pages');
  assert.ok(sw.includes("request.method !== 'GET'"), 'only GETs are cacheable');
  assert.ok(sw.includes('self.location.origin'), 'cross-origin requests bypass the worker');
  assert.ok(sw.includes('index.html'), 'navigations fall back to the cached shell offline');
});

test('worker registration is production-only and failure-safe', () => {
  const main = read('src/main.tsx');
  assert.ok(main.includes("import.meta.env.PROD"), 'dev must always serve fresh modules');
  assert.ok(main.includes("'serviceWorker' in navigator"), 'feature-detect before registering');
  assert.ok(main.includes('./sw.js'), 'worker URL stays relative to the deployment base');
});

test('build uses relative asset URLs for subpath and WebView hosting', () => {
  const config = read('vite.config.ts');
  assert.ok(config.includes("base: './'"), 'absolute asset URLs break non-root hosting');
});
