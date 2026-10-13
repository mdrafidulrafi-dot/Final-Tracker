/* Service worker — keeps the app itself available with no connection.
 * Strategy: try the network first (so new versions show up as soon as you are online),
 * fall back to the saved copy when the network is missing or slow.
 * Bump CACHE when you change app files and want everyone to refresh at once. */
const CACHE = 'mmt-shell-v3';
const SHELL = ['./', 'index.html', 'style.css', 'config.js', 'seed.js', 'app.js', 'manifest.json', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;   // Google Apps Script calls go straight to the network
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const net = await Promise.race([
        fetch(req),
        new Promise((_, rej) => setTimeout(() => rej(new Error('slow')), 5000))
      ]);
      if (net && net.ok) cache.put(req, net.clone());
      return net;
    } catch (err) {
      const hit = await cache.match(req, { ignoreSearch: true });
      if (hit) return hit;
      if (req.mode === 'navigate') { const home = await cache.match('index.html') || await cache.match('./'); if (home) return home; }
      return Response.error();
    }
  })());
});
