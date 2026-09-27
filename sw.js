const CACHE='dealzy-v3.2-mobile-click-hotfix';
const CORE=['/','/index.html','/dealzy-tools.js','/dealzy-providers.js','/dealzy-i18n.js','/dealzy-live.js','/manifest.webmanifest','/icon.svg'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET' || new URL(e.request.url).pathname.startsWith('/api/')) return;
  e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;}).catch(()=>caches.match(e.request).then(r=>r||caches.match('/index.html'))));
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const target=(event.notification.data&&event.notification.data.url)||'/';
  event.waitUntil(
    self.clients.matchAll({type:'window',includeUncontrolled:true}).then(clients=>{
      for(const client of clients){
        if('focus' in client){
          client.postMessage({type:'dealzy-notification-click',payload:event.notification.data&&event.notification.data.payload||{}});
          return client.focus();
        }
      }
      return self.clients.openWindow?self.clients.openWindow(target):null;
    })
  );
});
