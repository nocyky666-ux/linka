/* LINKA Service Worker v2.0 */
const CACHE_NAME   = 'linka-v2.0.0';
const FONT_CACHE   = 'linka-fonts-v2';
const STATIC_CACHE = 'linka-static-v2';

const CORE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/logo/logo.png',
  '/assets/fonts/800.ttf',
  '/assets/fonts/iOS18_4.ttf',
];

const FONT_ASSETS = [
  'https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,500,1,0',
];

/* ── Install ── */
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME).then(c => c.addAll(CORE_ASSETS).catch(err => console.warn('Cache miss:', err))),
      caches.open(FONT_CACHE).then(c => c.addAll(FONT_ASSETS).catch(() => {})),
    ])
  );
});

/* ── Activate ── */
self.addEventListener('activate', e => {
  const keep = [CACHE_NAME, FONT_CACHE, STATIC_CACHE];
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => !keep.includes(k)).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* ── Fetch Strategy ── */
self.addEventListener('fetch', e => {
  const { request } = e;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  /* Fonts: cache-first */
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(cacheFirst(request, FONT_CACHE));
    return;
  }

  /* Google APIs/CDN: stale-while-revalidate */
  if (url.hostname.includes('googleapis') || url.hostname.includes('gstatic') || url.hostname.includes('cdnjs')) {
    e.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
    return;
  }

  /* App shell & assets: network-first with fallback */
  if (url.origin === self.location.origin) {
    e.respondWith(networkFirst(request, CACHE_NAME));
    return;
  }
});

/* ── Strategies ── */
async function cacheFirst(req, cacheName) {
  const cached = await caches.match(req);
  if (cached) return cached;
  const net = await fetch(req);
  if (net.ok) {
    const c = await caches.open(cacheName);
    c.put(req, net.clone());
  }
  return net;
}

async function networkFirst(req, cacheName) {
  try {
    const net = await fetch(req);
    if (net.ok) {
      const c = await caches.open(cacheName);
      c.put(req, net.clone());
    }
    return net;
  } catch {
    const cached = await caches.match(req);
    return cached || new Response('<h1>LINKA – Offline</h1><p>Koneksi tidak tersedia. App berjalan dalam mode offline.</p>', {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }
}

async function staleWhileRevalidate(req, cacheName) {
  const cached = await caches.match(req);
  const fetchPromise = fetch(req).then(net => {
    if (net.ok) caches.open(cacheName).then(c => c.put(req, net.clone()));
    return net;
  }).catch(() => null);
  return cached || fetchPromise;
}

/* ── Push Notifications ── */
self.addEventListener('push', e => {
  const data = e.data?.json() || { title: 'LINKA', body: 'Pesan baru', icon: '/assets/logo/logo.png' };
  e.waitUntil(self.registration.showNotification(data.title, {
    body:    data.body,
    icon:    data.icon || '/assets/logo/logo.png',
    badge:   '/assets/logo/logo.png',
    vibrate: [80, 40, 80],
    tag:     data.tag || 'linka-msg',
    data:    { url: data.url || '/' },
    actions: [
      { action: 'reply',  title: 'Balas' },
      { action: 'dismiss',title: 'Tutup' },
    ],
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  if (e.action !== 'dismiss') {
    e.waitUntil(clients.openWindow(e.notification.data?.url || '/'));
  }
});

/* ── Background Sync ── */
self.addEventListener('sync', e => {
  if (e.tag === 'linka-sync') {
    e.waitUntil(syncPendingMessages());
  }
});

async function syncPendingMessages() {
  // Placeholder: sync queued offline messages when connection returns
  console.log('[LINKA SW] Background sync triggered');
}
