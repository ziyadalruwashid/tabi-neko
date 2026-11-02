// Offline copy of the notebook, for the trip itself: on a train or with no
// data in Japan, the map, the cards and My trip still open.
//
// Pages, code and data always try the network first, so a visitor online
// never sees an old version; the saved copy is only the fallback. Photos,
// art and fonts rarely change, so they come from the saved copy first and
// are saved as they're viewed, not all at once (there are ~30 MB of photos).
// Other sites (Firebase, Ask Apollo, Google Maps) are never touched.
//
// The store apps carry every file inside them and don't use this.
const CACHE="tabineko-v4";
const SHELL=["./","index.html","css/tabi.css","manifest.webmanifest",
  "data/map.js","data/places.js","data/apps.js","data/trips.js","data/crew.js","data/album.js","data/hoods.js","data/ar/ui.js","data/ar/content.js",
  "js/app.js","js/apollo.js","js/trip.js","js/share.js","js/planner.js","js/account.js","js/admin.js",
  "assets/logo.png","assets/cat.png","assets/icon-32.png","assets/app/icon-192.png",
  "assets/fonts/bagel-fat-one-400-latin.woff2","assets/fonts/inter-latin.woff2","assets/fonts/patrick-hand-latin.woff2",
  "assets/fonts/noto-sans-arabic.woff2","assets/fonts/noto-sans-arabic-800.woff2"];

self.addEventListener("install",e=>{
  // One missing file shouldn't stop the rest from being saved.
  e.waitUntil(caches.open(CACHE).then(c=>Promise.all(SHELL.map(u=>c.add(u).catch(()=>{})))).then(()=>self.skipWaiting()));
});
self.addEventListener("activate",e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});

const LASTING=/\.(png|jpe?g|webp|gif|svg|ico|woff2?)$/i;
self.addEventListener("fetch",e=>{
  const r=e.request,u=new URL(r.url);
  if(r.method!=="GET"||u.origin!==location.origin)return;
  if(LASTING.test(u.pathname)){
    e.respondWith(caches.match(r).then(hit=>hit||fetch(r).then(res=>{
      if(res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put(r,copy))}
      return res})));
    return;
  }
  e.respondWith(fetch(r).then(res=>{
    if(res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put(r,copy))}
    return res;
  }).catch(()=>caches.match(r,{ignoreSearch:true}).then(hit=>hit||(r.mode==="navigate"?caches.match("index.html"):Response.error()))));
});
