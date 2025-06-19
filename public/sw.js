const CACHE_NAME = 'handbok-pwa-v1';
const urlsToCache = [
  '/',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/apple-touch-icon.png'
];

// Installera service worker och cacha viktiga resurser
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(async (cache) => {
        console.log('PWA: Cachar grundläggande resurser');
        
        // Cacha resurser en i taget för bättre felhantering
        for (const url of urlsToCache) {
          try {
            await cache.add(url);
            console.log(`PWA: Cachade ${url}`);
          } catch (error) {
            console.log(`PWA: Kunde inte cacha ${url}:`, error.message);
            // Fortsätt med nästa resurs även om en misslyckas
          }
        }
      })
      .catch((error) => {
        console.log('PWA: Fel vid öppning av cache:', error);
      })
  );
  // Aktivera omedelbart utan att vänta
  self.skipWaiting();
});

// Aktivera service worker och rensa gamla cachar
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('PWA: Rensar gammal cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Ta kontroll över alla klienter omedelbart
      return self.clients.claim();
    })
  );
});

// Hantera nätverksförfrågningar med cache-first strategi för statiska resurser
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skippa cross-origin requests och vissa API-anrop
  if (url.origin !== location.origin || 
      request.url.includes('/api/auth/') ||
      request.url.includes('/_next/static/')) {
    return;
  }

  event.respondWith(
    caches.match(request)
      .then((response) => {
        // Returnera cachad version om den finns
        if (response) {
          console.log('PWA: Hämtar från cache:', request.url);
          return response;
        }

        // Annars hämta från nätverk och cacha resultatet
        return fetch(request)
          .then((response) => {
            // Kontrollera att svaret är giltigt
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Cacha endast GET-requests
            if (request.method === 'GET') {
              const responseToCache = response.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(request, responseToCache);
                });
            }

            return response;
          })
          .catch(() => {
            // Om nätverket misslyckas, försök returnera huvudsidan
            if (request.mode === 'navigate') {
              return caches.match('/');
            }
          });
      })
  );
});

// Hantera meddelanden från huvudtråden
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

// Background sync för offline actions (om du vill ha det senare)
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('Background sync triggered');
    // Implementera background sync logik här
  }
});

// Push notifications (för framtida funktionalitet)
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