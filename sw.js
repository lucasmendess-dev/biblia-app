// Service worker: guarda a "casca" do app para funcionar offline
const CACHE = 'biblia-shell-v4';
const SHELL = [
  './', './index.html', './css/styles.css', './manifest.webmanifest', './icons/icon.svg',
  './js/app.js', './js/books.js', './js/store.js', './js/api.js', './js/icons.js', './js/versions.js', './js/headings/index.js', './js/headings/at.js', './js/headings/nt.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  // rede primeiro, cache como reserva (assim atualizações aparecem logo)
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match('./index.html')))
  );
});
