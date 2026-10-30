// notes — offline app shell. nothing leaves this browser.
const CACHE = 'notes-v1.2';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(
    ks.filter(k => k.startsWith('notes-') && k !== CACHE).map(k => caches.delete(k))
  )).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  const fallback = req.mode === 'navigate' ? caches.match('./index.html') : caches.match(req);
  e.respondWith(fetch(req, { cache: 'no-cache' }).then(res => {
    if (!res.ok) throw new Error('http ' + res.status);
    const copy = res.clone();
    caches.open(CACHE).then(c => c.put(req, copy));
    return res;
  }).catch(() => fallback.then(hit => hit || new Response('offline', { status: 503, headers: { 'Content-Type': 'text/plain' } }))));
});
