import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { parse } from 'acorn';
import { html, nodes, attr, root, parseErrors } from './html.mjs';

assert.equal(parseErrors.length, 0, `HTML parse errors: ${JSON.stringify(parseErrors)}`);
const base = new URL('https://ci.invalid/ankin-drift/');
function localURL(ref, from = base) {
  const url = new URL(ref, from);
  assert.equal(url.origin, base.origin, `PWA asset must be local: ${ref}`);
  assert(url.pathname.startsWith(base.pathname), `Asset escapes GitHub Pages subpath: ${ref}`);
  return url;
}
function diskURL(url) {
  return new URL(decodeURIComponent(url.pathname.slice(base.pathname.length)), root);
}
async function asset(ref, from = base) {
  const url = localURL(ref, from);
  const path = diskURL(url);
  assert(fileURLToPath(path).startsWith(fileURLToPath(root)), `Invalid asset path: ${ref}`);
  assert((await stat(path)).isFile(), `Not a file: ${ref}`);
  return url;
}
const ids = nodes.map(n => attr(n, 'id')).filter(Boolean);
assert.equal(new Set(ids).size, ids.length, 'Duplicate HTML IDs');
for (const required of ['html', 'head', 'body', 'title', 'canvas']) assert(nodes.some(n => n.tagName === required), `Missing <${required}>`);
assert(nodes.some(n => n.tagName === 'meta' && attr(n, 'name') === 'viewport'), 'Missing mobile viewport');

const pageTitle = nodes.find(n => n.tagName === 'title')?.childNodes?.map(n => n.value ?? '').join('') ?? '';
const titleVersion = pageTitle.match(/\bV(\d+\.\d+(?:\.\d+)?)\b/i)?.[1];
const menuVersion = html.match(/<p class="eyebrow">V(\d+\.\d+(?:\.\d+)?)\s*·/)?.[1];
assert(titleVersion, 'Browser title must include game version');
assert(menuVersion, 'Title screen must include a game version');
assert.equal(menuVersion, titleVersion, 'Title screen and browser title version mismatch');
assert.equal(manifestVersionFromTitle(pageTitle), titleVersion, 'Browser title version parse error');

function manifestVersionFromTitle(title) { return title.match(/\bV(\d+\.\d+(?:\.\d+)?)\b/i)?.[1]; }

for (const node of nodes) {
  for (const name of ['src', 'href']) {
    const ref = attr(node, name);
    if (!ref || ref.startsWith('#') || /^(?:[a-z]+:|\/\/)/i.test(ref)) continue;
    await asset(ref);
  }
}
const manifestLinks = nodes.filter(n => n.tagName === 'link' && attr(n, 'rel')?.split(/\s+/).includes('manifest'));
assert.equal(manifestLinks.length, 1, 'Expected one manifest link');
const manifestURL = await asset(attr(manifestLinks[0], 'href'));
const manifest = JSON.parse(await readFile(diskURL(manifestURL), 'utf8'));
assert(manifest.name && manifest.short_name, 'Missing PWA name');
const manifestVersion = manifest.name.match(/\bV(\d+\.\d+(?:\.\d+)?)\b/i)?.[1];
assert.equal(manifestVersion, titleVersion, 'Manifest and game version mismatch');
assert(['standalone', 'fullscreen', 'minimal-ui'].includes(manifest.display), 'Invalid installable display mode');
assert(manifest.scope && manifest.start_url, 'Missing scope/start_url');
const scope = localURL(manifest.scope, manifestURL);
const start = await asset(manifest.start_url, manifestURL);
assert(start.pathname.startsWith(scope.pathname), 'start_url outside scope');
assert(Array.isArray(manifest.icons) && manifest.icons.length, 'Missing PWA icons');
const requiredAssets = new Set([start.pathname, manifestURL.pathname]);
const sizes = new Set();
for (const icon of manifest.icons) {
  const url = await asset(icon.src, manifestURL);
  requiredAssets.add(url.pathname);
  const png = await readFile(diskURL(url));
  assert.equal(icon.type, 'image/png', `Unsupported icon type: ${icon.src}`);
  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', `Invalid PNG: ${icon.src}`);
  const dimensions = `${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`;
  assert(icon.sizes.split(/\s+/).includes(dimensions), `Wrong icon sizes: ${icon.src}`);
  sizes.add(dimensions);
}
assert(sizes.has('192x192') && sizes.has('512x512'), 'PWA requires 192px and 512px icons');
for (const node of nodes.filter(n => attr(n, 'rel') === 'apple-touch-icon')) requiredAssets.add((await asset(attr(node, 'href'))).pathname);
const sw = parse(await readFile(new URL('sw.js', root), 'utf8'), { ecmaVersion: 'latest' });
const declarations = sw.body.filter(n => n.type === 'VariableDeclaration').flatMap(n => n.declarations);
const cache = declarations.find(n => n.id.name === 'CACHE_NAME')?.init;
assert.equal(typeof cache?.value, 'string', 'Missing literal CACHE_NAME');
assert(cache.value.length > 0, 'Empty cache name');
assert(cache.value.includes('v' + titleVersion.replace('.', '-')), 'Service Worker cache name version mismatch');
const shell = declarations.find(n => n.id.name === 'SHELL')?.init;
assert.equal(shell?.type, 'ArrayExpression', 'Missing static SHELL array');
const cached = new Set();
for (const entry of shell.elements) {
  assert.equal(typeof entry?.value, 'string', 'SHELL must contain literal paths');
  const url = localURL(entry.value);
  if (url.pathname === base.pathname) await asset('./index.html');
  else await asset(entry.value);
  cached.add(url.pathname);
}
for (const path of requiredAssets) assert(cached.has(path), `PWA asset missing from SHELL: ${path}`);
console.log(`PASS HTML structure, local references, manifest, PNG dimensions, scope and ${cached.size} cache entries`);
