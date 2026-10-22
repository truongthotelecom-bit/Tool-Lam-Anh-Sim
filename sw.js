// Service Worker cho Tool Bảng Số VIP (PWA Standalone)
const CACHE_NAME = 'bang-so-vip-v62';
const STATIC_ASSETS = [
  './index.html',
  'index.html',
  './css/style.css',
  './js/main.js',
  './js/configs.js',
  './js/template-manager.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const asset of STATIC_ASSETS) {
        try {
          await cache.add(asset);
        } catch (err) {
          console.warn('Lỗi nạp cache asset:', asset, err);
        }
      }
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('SW: Wiping old cache:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Không cache các API Google Apps Script hoặc external API request
  if (url.origin !== location.origin || event.request.method !== 'GET') {
    return;
  }

  // Khi đang chạy local dev / localhost, LUÔN LUÔN fetch tươi mới từ máy chủ
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' }).catch(() => caches.match(event.request))
    );
    return;
  }

  // Chiến lược Network-First: Luôn tải file mới nhất từ mạng/máy, chỉ fallback sang cache khi mất mạng
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const resClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then(async (cached) => {
          if (cached) return cached;
          if (event.request.mode === 'navigate') {
            return (await caches.match('./index.html')) || (await caches.match('index.html'));
          }
        });
      })
  );
});
