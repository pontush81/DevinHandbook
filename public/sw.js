const CACHE_NAME = 'handbok-pwa-v2';
const STATIC_CACHE = 'handbok-static-v2';
const DYNAMIC_CACHE = 'handbok-dynamic-v2';

const urlsToCache = [
  '/',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/apple-touch-icon.png',
  '/favicon.ico'
];

// Installera service worker och cacha viktiga resurser
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(async (cache) => {
        console.log('PWA: Cachar grundläggande resurser');
        
        // Cacha resurser en i taget för bättre felhantering
        for (const url of urlsToCache) {
          try {
            await cache.add(url);
            console.log(`PWA: Cachade ${url}`);
          } catch (error) {
            console.log(`PWA: Kunde inte cacha ${url}:`, error.message);
          }
        }
      })
      .catch((error) => {
        console.log('PWA: Fel vid öppning av cache:', error);
      })
  );
  // Aktivera omedelbart
  self.skipWaiting();
});

// Aktivera service worker och rensa gamla cachar
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // Rensa gamla cachar
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && 
                cacheName !== DYNAMIC_CACHE && 
                cacheName !== CACHE_NAME) {
              console.log('PWA: Rensar gammal cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Ta kontroll över alla klienter
      self.clients.claim()
    ])
  );
});

// Hantera nätverksförfrågningar
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skippa cross-origin requests och vissa API-anrop
  if (url.origin !== location.origin) {
    return;
  }

  // Skippa auth-relaterade API-anrop
  if (request.url.includes('/api/auth/') || 
      request.url.includes('/api/stripe/') ||
      request.url.includes('/api/admin/')) {
    return;
  }

  event.respondWith(handleRequest(request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  
  try {
    // Hantera Next.js statiska filer med network-first strategi
    if (url.pathname.startsWith('/_next/static/')) {
      return await networkFirstStrategy(request, STATIC_CACHE);
    }
    
    // Hantera API-anrop med network-only
    if (url.pathname.startsWith('/api/')) {
      return await fetch(request);
    }
    
    // Hantera sidor med network-first, fallback till cache
    if (request.mode === 'navigate') {
      return await networkFirstStrategy(request, DYNAMIC_CACHE);
    }
    
    // Hantera andra resurser med cache-first
    return await cacheFirstStrategy(request, DYNAMIC_CACHE);
    
  } catch (error) {
    console.log('PWA: Fetch error:', error);
    
    // Fallback för navigation requests
    if (request.mode === 'navigate') {
      const cachedResponse = await caches.match('/');
      if (cachedResponse) {
        return cachedResponse;
      }
    }
    
    // Returnera ett enkelt fel-svar
    return new Response('Offline - resursen är inte tillgänglig', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

// Network-first strategi: försök nätverk först, fallback till cache
async function networkFirstStrategy(request, cacheName) {
  try {
    // Försök hämta från nätverk först
    const networkResponse = await fetch(request);
    
    // Om framgångsrik, uppdatera cache
    if (networkResponse.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
      console.log('PWA: Uppdaterade cache från nätverk:', request.url);
      return networkResponse;
    }
    
    // Om 404 eller annat fel, försök cache
    throw new Error(`Network response status: ${networkResponse.status}`);
    
  } catch (error) {
    // Fallback till cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('PWA: Hämtar från cache (network misslyckades):', request.url);
      return cachedResponse;
    }
    
    // Om varken nätverk eller cache fungerar
    throw error;
  }
}

// Cache-first strategi: försök cache först, fallback till nätverk
async function cacheFirstStrategy(request, cacheName) {
  // Försök cache först
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    console.log('PWA: Hämtar från cache:', request.url);
    return cachedResponse;
  }
  
  // Fallback till nätverk
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.status === 200 && request.method === 'GET') {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
      console.log('PWA: Cachade från nätverk:', request.url);
    }
    
    return networkResponse;
  } catch (error) {
    throw error;
  }
}

// Hantera meddelanden från huvudtråden
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
  
  // Lägg till möjlighet att rensa cache
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            console.log('PWA: Rensar cache:', cacheName);
            return caches.delete(cacheName);
          })
        );
      })
    );
  }
});

// Background sync för offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('Background sync triggered');
  }
});

// Push notifications
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      data: data.data || {}
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Hantera notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  );
}); 