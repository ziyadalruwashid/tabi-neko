// New places, areas and day trips without a new app (the app only). The
// app carries a copy of data/ inside it; this keeps three lists fresh from
// the website, which acts as a plain data host:
//
//   places     data/places.js   P       (+ their Arabic, AR.places)
//   areas      data/hoods.js    HOODS   (+ AR.hoods)
//   day trips  data/trips.js    TRIPS   (+ AR.trips)
//
// - Each time the app opens, it quietly downloads those files and the
//   Arabic (data/ar/content.js) from tabi-neko.vercel.app, reads them as
//   data (JSON, never run as code) and keeps them on the phone.
// - The next time the app opens, that copy is used instead of the one
//   inside the app, before anything else reads the lists. So what you add
//   shows up for everyone the next time they open the app.
// - Photos the app doesn't carry load from the website.
// - A new app version (a new APK) brings its own newer lists, so a copy
//   saved under the old version is dropped.
//
// Loaded after the data files and before js/app.js.
(function(){
if(!document.documentElement.classList.contains("tn-app"))return;
const BASE="https://tabi-neko.vercel.app/",KEY="tabineko-live";

// Plain text only (no markup), in nested lists and objects too.
const plain=v=>typeof v==="string"?v.replace(/[<>]/g,""):Array.isArray(v)?v.map(plain):v&&typeof v==="object"?Object.fromEntries(Object.entries(v).map(([k,x])=>[k,plain(x)])):v;
const isStr=v=>typeof v==="string"&&v.length>0;
const strs=(o,ks)=>ks.every(k=>typeof o[k]==="string");
const list=v=>Array.isArray(v)&&v.every(x=>typeof x==="string");
// Each list: the file, the name it has there, the array in the app, the
// Arabic for it, what a good entry looks like, and how few is too few
// (a broken download shouldn't empty the app).
const LISTS=[
  {k:"places",file:"data/places.js",name:"const P=",arr:P,ar:"places",min:50,
    ok:p=>isStr(p.n)&&!!CITIES[p.city]&&!!CATS[p.cat]&&typeof p.lat==="number"&&typeof p.lng==="number"&&strs(p,["area","tip"])},
  {k:"hoods",file:"data/hoods.js",name:"const HOODS=",arr:typeof HOODS!=="undefined"?HOODS:null,ar:"hoods",min:10,
    ok:h=>isStr(h.n)&&isStr(h.area)&&!!CITIES[h.city]&&strs(h,["photo","vibe","best","tip","story"])&&!!h.stats&&typeof h.stats==="object"&&list(h.miss)},
  {k:"trips",file:"data/trips.js",name:"const TRIPS=",arr:typeof TRIPS!=="undefined"?TRIPS:null,ar:"trips",min:5,
    ok:t=>isStr(t.n)&&typeof TGROUPS!=="undefined"&&TGROUPS.some(g=>g.k===t.h)&&strs(t,["best","go","time","cost","day","halal","tip","q"])&&list(t.see)}
].filter(L=>L.arr);

// Which lists are inside this version of the app.
const built=LISTS.map(L=>L.arr.length+"|"+(L.arr[L.arr.length-1]||{}).n).join(";");
const photos=new Set(LISTS.flatMap(L=>L.arr.map(x=>x.photo).filter(Boolean)));
const good=(L,a)=>Array.isArray(a)?a.filter(x=>x&&typeof x==="object"&&L.ok(x)).map(plain):[];
// The array after "const X=" in a data file, read as JSON.
function readList(txt,name){
  const i=txt.indexOf(name);if(i<0)return null;
  const s=txt.indexOf("[",i),e=txt.indexOf("];",s);
  return JSON.parse(txt.slice(s,(e<0?txt.lastIndexOf("]"):e)+1));
}
// The object after "AR.x=" in the Arabic content file.
function readAR(txt,k){const i=txt.indexOf("AR."+k+"={"),j=txt.indexOf("\n};",i);if(i<0||j<i)return null;return plain(JSON.parse(txt.slice(i+k.length+4,j+2)))}

// ---- use the copy saved last time ----
let saved=null;try{saved=JSON.parse(localStorage.getItem(KEY)||"null")}catch(e){}
if(saved&&saved.built===built){
  for(const L of LISTS){
    const list=good(L,saved[L.k]);if(list.length<L.min)continue;
    L.arr.length=0;
    list.forEach(x=>{if(x.photo&&!photos.has(x.photo)&&!/^https:/.test(x.photo))x.photo=BASE+x.photo;L.arr.push(x)});
    const ar=saved.ar&&saved.ar[L.ar];
    if(ar&&typeof AR!=="undefined"){AR[L.ar]=AR[L.ar]||{};Object.assign(AR[L.ar],ar)}
  }
}else if(saved){try{localStorage.removeItem(KEY)}catch(e){}}

// ---- fetch the latest for next time ----
const get=u=>fetch(BASE+u,{cache:"no-cache"}).then(r=>r.ok?r.text():Promise.reject(r.status));
function refresh(){
  if(navigator.onLine===false)return;
  const keep=saved&&saved.built===built?saved:{};
  Promise.all([...LISTS.map(L=>get(L.file).catch(()=>"")),get("data/ar/content.js").catch(()=>"")]).then(txts=>{
    const out={built,at:Date.now(),ar:{...(keep.ar||{})}},c=txts[LISTS.length];
    LISTS.forEach((L,i)=>{
      let list=[];try{list=good(L,readList(txts[i],L.name))}catch(e){}
      out[L.k]=list.length>=L.min?list:keep[L.k];
      if(c)try{const a=readAR(c,L.ar);if(a)out.ar[L.ar]=a}catch(e){}
    });
    if(LISTS.some(L=>out[L.k]))localStorage.setItem(KEY,JSON.stringify(out));
  }).catch(()=>{});
}
// After the app has drawn itself, so it never slows the start.
addEventListener("load",()=>setTimeout(refresh,4000));
})();
