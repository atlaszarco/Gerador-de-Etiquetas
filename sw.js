/* Service Worker — Gerador de Etiquetas */
const CACHE_VERSION = 'v7';
const CACHE_NAME = `etq-cache-${CACHE_VERSION}`;

/* Recursos que fazem parte do "app shell". Tudo que você precisa para abrir offline. */
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png',
  'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
  'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js',
  'https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js'
];

/* Instalação — baixa tudo e guarda no cache */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.all(
        APP_SHELL.map(url =>
          cache.add(url).catch(err => console.warn('Falha ao cachear:', url, err))
        )
      );
    })
  );
});

/* Ativação — limpa versões antigas */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

/* Fetch — serve do cache primeiro; se não houver, vai para a rede */
self.addEventListener('fetch', event => {
  const req = event.request;

  // Só lida com GET
  if (req.method !== 'GET') return;

  // Não intercepta requisições de outras origens (exceto as que já estão no shell)
  const url = new URL(req.url);

  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;

      // Não estava no cache — busca da rede
      return fetch(req).then(res => {
        // Guarda uma cópia só de respostas válidas
        if (res && res.status === 200 && (res.type === 'basic' || res.type === 'cors')) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
        }
        return res;
      }).catch(() => {
        // Sem rede e sem cache: se for navegação, devolve o index
        if (req.mode === 'navigate') return caches.match('./index.html');
        return new Response('', { status: 408, statusText: 'Offline' });
      });
    })
  );
});

/* Permite que o app peça para o SW em waiting assumir na hora */
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
