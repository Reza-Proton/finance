// Cache-first service worker. Bump CACHE when you change any file.
const CACHE = 'fin-v12';
const OPTIONAL = ['fonts/Vazirmatn-Variable.woff2']; // cached if present; a missing font must not break install
const FILES = ['./', 'index.html', 'jalali.js', 'util.js', 'xlsx.js', 'categories.js', 'manifest.json', 'icon-192.png', 'icon-512.png'];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES).then(() => Promise.all(OPTIONAL.map(f => c.add(f).catch(() => {}))))).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(res => {
    if (res.ok && new URL(e.request.url).pathname.includes('/fonts/')) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
    return res;
  })));
});
