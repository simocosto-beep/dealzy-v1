const CACHE='dealzy-v6-escape-20261013-1';
const CORE=['/dealzy-experience.css?v=20261013-escape1','/dealzy-experience.js?v=20261013-escape1','/assets/experience/escape-horizon.webp','/','/index.html','/dealzy-tools.js?v=20261013-escape1','/dealzy-providers.js','/dealzy-i18n.js?v=20261013-escape1','/dealzy-live.js?v=20261013-escape1','/dealzy-assistant.js','/manifest.webmanifest?v=20261013-escape1','/icon.svg?v=20261013-escape1','/icon-192.png?v=20261013-escape1','/icon-512.png?v=20261013-escape1','/icon-180.png?v=20261013-escape1'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  const url=new URL(e.request.url);
  if(e.request.method!=='GET' || url.origin!==self.location.origin || url.pathname.startsWith('/api/')) return;
  e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;}).catch(()=>caches.match(e.request).then(r=>r||caches.match('/index.html'))));
});
