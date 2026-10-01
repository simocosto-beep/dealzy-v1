const CACHE='dealzy-v4.3-halloween-card-20261001';
const CORE=['/','/index.html','/dealzy-tools.js?v=20261001-seasonal2','/dealzy-providers.js','/dealzy-i18n.js?v=20261001-seasonal1','/dealzy-live.js?v=20261001-seasonal2','/dealzy-assistant.js','/manifest.webmanifest','/icon.svg','/icon-192.png','/icon-512.png','/icon-180.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  const url=new URL(e.request.url);
  if(e.request.method!=='GET' || url.origin!==self.location.origin || url.pathname.startsWith('/api/')) return;
  e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;}).catch(()=>caches.match(e.request).then(r=>r||caches.match('/index.html'))));
});
