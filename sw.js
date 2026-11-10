/* ANKIN DRIFT v13.37 mobile - offline app shell, scoped to this install */
const CACHE_NAME = 'ankin-drift-mobile-v13-37-directed-fusion-v4';
const CACHE_PREFIX = 'ankin-drift-mobile-';
const SHELL = [
  './', './index.html', './manifest.webmanifest', './v13-archive.js', './v13-ending.js', './music-soundtrack.js', './skill-arsenal.js','./skill-tactics.js',
  './audio/neon-horizon.mp3', './audio/16-battle-beat.mp3', './audio/trinity.mp3',
  './audio/overdrive-nemesis.mp3', './audio/the-last-horizon.mp3',
  './icons/icon-192.png', './icons/icon-512.png',
  './icons/icon-maskable-512.png', './icons/apple-touch-icon.png'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL.map(url => new Request(url, {cache:'reload'})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(names => Promise.all(names.filter(name => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME).map(name => caches.delete(name)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (!url.pathname.startsWith(new URL(self.registration.scope).pathname)) return;
  // Media elements request byte ranges (206). Return correctly ranged bytes from
  // the precached whole MP3, including when the device is fully offline.
  if (url.pathname.endsWith('.mp3') && req.headers.has('range')) {
    event.respondWith((async () => {
      const cached = await caches.match(new Request(url.href));
      if (!cached) return fetch(req);
      const blob = await cached.blob(), size = blob.size;
      const match = /^bytes=(\d*)-(\d*)$/.exec(req.headers.get('range') || '');
      if (!match || (!match[1] && !match[2])) return cached;
      const start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
      const end = match[1] && match[2] ? Math.min(size - 1, Number(match[2])) : size - 1;
      if (start >= size || end < start || !Number.isSafeInteger(start) || !Number.isSafeInteger(end)) {
        return new Response(null, {status: 416, headers:{'Content-Range': 'bytes */' + size}});
      }
      const slice = blob.slice(start, end + 1);
      return new Response(slice, {status: 206, headers: {
        'Content-Type': 'audio/mpeg',
        'Accept-Ranges': 'bytes', 'Content-Range': 'bytes ' + start + '-' + end + '/' + size,
        'Content-Length': String(slice.size)
      }});
    })());
    return;
  }
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req, {cache:'no-store'}).then(response => {
      if (response.ok) { const copy = response.clone(); caches.open(CACHE_NAME).then(cache => cache.put('./index.html', copy)).catch(()=>{}); }
      return response;
    }).catch(async () => (await caches.match('./index.html')) || Response.error()));
    return;
  }
  event.respondWith(caches.match(req).then(hit => hit || fetch(req).then(response => {
    if (response.ok) { const copy = response.clone(); caches.open(CACHE_NAME).then(cache => cache.put(req, copy)).catch(()=>{}); }
    return response;
  })));
});
