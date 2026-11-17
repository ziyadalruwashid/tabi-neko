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
// - Photos: the app carries none of the place, area or album photos (it
//   would weigh ~60 MB more). Each loads from the website the first time
//   it shows, and the phone's web cache keeps it. Photos of the places in
//   My trip (and its cover) are also saved on the phone, so the trip has
//   its photos offline, and saved again when the website's photo changes.
//   No connection and not saved: the category drawing.
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

// ---- photos from the website ----
const REMOTE=/^assets\/(?:photos|hoods|album)\/[\w.-]+$/,PICS="tabineko-pics";
let pics={};try{pics=JSON.parse(localStorage.getItem(PICS)||"{}")||{}}catch(e){}
// "assets/photos/x.jpg" from a src (relative, the app's own address or the website's).
function relOf(src){if(typeof src!=="string")return null;
  let r=src.startsWith(BASE)?src.slice(BASE.length):src;
  try{const u=new URL(r,location.href);if(u.origin===location.origin)r=u.pathname.replace(/^\//,"")}catch(e){}
  return REMOTE.test(r)?r:null}
// The address to show a photo by (for background images, which can't
// fall back by themselves): saved on the phone, or the website's.
window.tnPic=src=>{const r=relOf(src);return r?pics[r]||BASE+r:src};
const artFor=r=>{const p=P.find(x=>x.photo===r||x.photo===BASE+r);return p&&CATS[p.cat]?CATS[p.cat].img:"assets/c-views.png"};
// An <img> whose photo isn't in the app: the saved copy, then the
// website, then the drawing.
// A photo shimmers (css/tabi.css, "Loading photos") until it has loaded.
document.addEventListener("load",e=>{const im=e.target;if(im&&im.tagName==="IMG")im.classList.add("tn-ok")},true); // (image load events never reach window)
addEventListener("error",e=>{const im=e.target;if(!im||im.tagName!=="IMG")return;
  const st=im.dataset.tnp||"",r=relOf(st?im.dataset.tnr:im.getAttribute("src"));if(!r||st==="x")return;
  im.dataset.tnr=r;
  if(!st&&pics[r]){im.dataset.tnp="s";im.src=pics[r]}
  else if(st!=="w"&&!(st===""&&im.getAttribute("src")===BASE+r)){im.dataset.tnp="w";im.src=BASE+r}
  else{im.dataset.tnp="x";im.classList.add("tn-ok");im.src=artFor(r)}},true);

// Save My trip's photos on the phone (Capacitor's Filesystem), and drop
// the ones no longer in it. A photo replaced on the website under the
// same name is noticed by its size and date (checked once per launch,
// when online) and downloaded again.
const FS=()=>{const C=window.Capacitor;return C&&C.Plugins&&C.Plugins.Filesystem};
const TAGS="tabineko-pic-tags";
let tags={};try{tags=JSON.parse(localStorage.getItem(TAGS)||"{}")||{}}catch(e){}
const checked=new Set();
const tagOf=res=>(res.headers.get("content-length")||"")+"/"+(res.headers.get("last-modified")||"");
// The file for a photo: a new name for each version, so the phone never
// shows an old copy of the same file.
const fileOf=(r,t)=>"pics/"+r.replace(/\//g,"_")+(t?"."+[...t].reduce((h,c)=>(h*31+c.charCodeAt(0))>>>0,7).toString(36):"");
const saveTags=()=>{try{localStorage.setItem(TAGS,JSON.stringify(tags))}catch(e){}};
let busy=false,again=false,timer=0;
function wanted(){const w=new Set();if(typeof trip==="undefined"||!trip)return w;
  const by=new Map(P.map(p=>[p.city+"|"+p.n,p]));
  const ks=[...(trip.ideas||[]),...(trip.stays||[]).flatMap(s=>(s.days||[]).flatMap(d=>d.ids||[]))];
  ks.forEach(k=>{const p=by.get(k),r=p&&relOf(p.photo);if(r)w.add(r)});
  const c=relOf(trip.cover);if(c)w.add(c);
  return w}
const b64=blob=>new Promise((ok,no)=>{const f=new FileReader();f.onload=()=>ok(String(f.result).split(",")[1]);f.onerror=no;f.readAsDataURL(blob)});
async function savePics(){
  const fs=FS(),C=window.Capacitor;if(!fs||!C||!C.convertFileSrc)return;
  if(busy){again=true;return}busy=true;
  try{
    const w=wanted(),drop=async r=>{try{await fs.deleteFile({path:(tags[r]&&tags[r].f)||fileOf(r),directory:"DATA"})}catch(e){}};
    for(const r of Object.keys(pics))if(!w.has(r)){await drop(r);delete pics[r];delete tags[r]}
    localStorage.setItem(PICS,JSON.stringify(pics));saveTags();
    if(navigator.onLine===false)return;
    for(const r of w){
      try{
        if(pics[r]){
          if(checked.has(r))continue;
          const h=await fetch(BASE+r,{method:"HEAD",cache:"no-cache"});if(!h.ok)continue;
          checked.add(r);
          if(tags[r]&&tags[r].t===tagOf(h))continue;  // still the same photo
        }
        const res=await fetch(BASE+r,{cache:"no-cache"});if(!res.ok)continue;
        const t=tagOf(res),f=fileOf(r,t);
        const {uri}=await fs.writeFile({path:f,data:await b64(await res.blob()),directory:"DATA",recursive:true});
        if(pics[r]&&(!tags[r]||tags[r].f!==f))await drop(r);
        checked.add(r);pics[r]=C.convertFileSrc(uri);tags[r]={t,f};
        localStorage.setItem(PICS,JSON.stringify(pics));saveTags();
        document.querySelectorAll('img[data-tnr="'+r+'"][data-tnp="s"]').forEach(im=>{im.src=pics[r]});
      }catch(e){}}
  }catch(e){}finally{busy=false;if(again){again=false;savePics()}}
}
window.tnSavePics=()=>{clearTimeout(timer);timer=setTimeout(savePics,1500)};
addEventListener("load",()=>setTimeout(savePics,6000));
})();
