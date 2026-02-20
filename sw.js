// ══════════════════════════════════════════════
//  WORSHIP PADS — SERVICE WORKER (Offline First)
// ══════════════════════════════════════════════

const CACHE_NAME = 'worship-pads-v1';

// Arquivos essenciais (sempre em cache)
const CORE_FILES = [
  './',
  './index.html',
];

// Arquivos de áudio — serão cacheados quando carregados pela primeira vez
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

// ── INSTALL: cacheia os arquivos principais ──
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Cacheia arquivos principais (obrigatórios)
      return cache.addAll(CORE_FILES).then(() => {
        // Tenta cachear áudios, mas ignora erros individuais
        return Promise.allSettled(
          AUDIO_FILES.map(url =>
            fetch(url).then(resp => {
              if (resp.ok) return cache.put(url, resp);
            }).catch(() => {/* arquivo não existe ainda, tudo bem */})
          )
        );
      });
    }).then(() => self.skipWaiting())
  );
});

// ── ACTIVATE: limpa caches antigos ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── FETCH: Cache First para tudo ──
self.addEventListener('fetch', event => {
  // Ignora requisições não-GET
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Estratégia: Cache First → Network → Fallback
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      // Não está no cache, busca na rede e salva
      return fetch(event.request).then(response => {
        // Só cacheia respostas válidas
        if (!response || response.status !== 200 || response.type === 'error') {
          return response;
        }

        const toCache = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, toCache);
        });

        return response;
      }).catch(() => {
        // Offline e não está no cache
        // Para arquivos de áudio, retorna 404 silencioso
        if (event.request.url.match(/\.mp3$/i)) {
          return new Response('', { status: 404, statusText: 'Offline - arquivo de áudio não cacheado' });
        }
        // Para HTML, retorna o index do cache
        if (event.request.headers.get('accept')?.includes('text/html')) {
          return caches.match('./index.html');
        }
        return new Response('Offline', { status: 503 });
      });
    })
  );
});

// ── MESSAGE: permite forçar atualização do cache ──
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
