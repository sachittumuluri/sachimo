const CACHE='one-line-cache-v1';const ASSETS=['/','/manifest.webmanifest','/icon-192.png','/icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(self.clients.claim())});
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);
  if(u.origin===location.origin&&(u.pathname.startsWith('/_next')||u.pathname.startsWith('/icon-'))){
    e.respondWith(caches.match(e.request).then(c=>c||fetch(e.request).then(r=>{const x=r.clone();caches.open(CACHE).then(cc=>cc.put(e.request,x));return r})));return;
  }
  e.respondWith(fetch(e.request).then(r=>{const x=r.clone();caches.open(CACHE).then(cc=>cc.put(e.request,x));return r}).catch(()=>caches.match(e.request)));
});