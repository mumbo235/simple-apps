// focus — offline app shell and session notifications.
const CACHE = 'focus-v1.0';
const SHELL = ['./', './index.html', './base.css', './base.js', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(
    ks.filter(k => k.startsWith('focus-') && k !== CACHE).map(k => caches.delete(k))
  )).then(() => self.clients.claim()));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
    for (const c of cs) if (c.url.startsWith(self.registration.scope)) return c.focus();
    return clients.openWindow('./');
  }));
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
