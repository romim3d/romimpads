// ══════════════════════════════════════════════
//  WORSHIP PADS — SERVICE WORKER (Offline First)
// ══════════════════════════════════════════════

const CACHE_NAME = 'worship-pads-v3'; // ← versão incrementada para forçar atualização

const AUDIO_FILES = [
  'audio/ambiente1.mp3',
  'audio/ambiente2.mp3',
  'audio/anjo.mp3',
  'audio/atimosfera.mp3',
  'audio/chorim.mp3',
  'audio/grave.mp3',
  'audio/guitar.mp3',
  'audio/hard.mp3',
  'audio/hillsong.mp3',
  'audio/motion1.mp3',
  'audio/motion2.mp3',
  'audio/piano.mp3',
  'audio/reverse.mp3',
  'audio/shimmer.mp3',
  'audio/shiny.mp3',
  'audio/syntevoice.mp3',
  'audio/vovoder.mp3',
  'audio/warm.mp3',
  'audio/worship.mp3',
];

// ── INSTALL ──
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.allSettled(
        AUDIO_FILES.map(url =>
          fetch(url).then(resp => {
            if (resp.ok) return cache.put(url, resp);
          }).catch(() => {})
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// ── ACTIVATE: apaga todos os caches antigos ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ── FETCH ──
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  const isHTML = event.request.headers.get('accept')?.includes('text/html') || url.pathname.endsWith('.html') || url.pathname.endsWith('/');
  const isAudio = url.pathname.endsWith('.mp3');

  if (isHTML) {
    // HTML: Network First → sempre pega versão mais recente
    event.respondWith(
      fetch(event.request).catch(() => caches.match('./index.html'))
    );
    return;
  }

  if (isAudio) {
    // Áudio: Cache First (economiza banda)
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response && response.status === 200) {
            const toCache = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, toCache));
          }
          return response;
        }).catch(() => new Response('', { status: 404 }));
      })
    );
    return;
  }

  // Outros arquivos: Network First
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

// ── MESSAGE ──
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
