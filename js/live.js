// New places without a new app (the app only). The app carries a copy of
// data/places.js inside it; this keeps that list fresh from the website,
// which acts as a plain data host:
//
// - Each time the app opens, it quietly downloads the latest
//   data/places.js and the Arabic for the places (data/ar/content.js) from
//   tabi-neko.vercel.app, reads them as data (JSON, never run as code) and
//   keeps them on the phone.
// - The next time the app opens, that copy is used instead of the one
//   inside the app, before anything else reads the places. So a place you
//   add shows up for everyone the next time they open the app.
// - Photos of places that aren't inside the app load from the website.
// - A new app version (a new APK) brings its own newer list, so a copy
//   saved under the old version is dropped.
//
// Loaded right after data/places.js and before js/app.js.
(function(){
if(!document.documentElement.classList.contains("tn-app"))return;
const BASE="https://tabi-neko.vercel.app/",KEY="tabineko-live";
// Which list is inside this version of the app.
const built=P.length+"|"+(P[P.length-1]||{}).n;
const photos=new Set(P.map(p=>p.photo).filter(Boolean));

// Only well-formed places, as plain text (no markup), in cities and kinds the app knows.
const str=v=>typeof v==="string"?v.replace(/[<>]/g,""):v;
function cleanPlace(p){
  if(!p||typeof p!=="object"||typeof p.n!=="string"||!CITIES[p.city]||!CATS[p.cat]||typeof p.lat!=="number"||typeof p.lng!=="number")return null;
  const o={};for(const k in p)o[k]=str(p[k]);return o;
}
function cleanAR(o){const out={};if(o&&typeof o==="object")for(const k in o){const e=o[k];if(e&&typeof e==="object"){out[k]={};for(const f in e)out[k][f]=str(e[f])}}return out}

// ---- use the copy saved last time ----
let saved=null;try{saved=JSON.parse(localStorage.getItem(KEY)||"null")}catch(e){}
if(saved&&saved.built===built&&Array.isArray(saved.p)&&saved.p.length>50){
  const list=saved.p.map(cleanPlace).filter(Boolean);
  if(list.length>50){
    P.length=0;
    list.forEach(p=>{if(p.photo&&!photos.has(p.photo)&&!/^https:/.test(p.photo))p.photo=BASE+p.photo;P.push(p)});
    if(typeof AR!=="undefined"&&AR.places&&saved.ar)Object.assign(AR.places,cleanAR(saved.ar));
  }
}else if(saved){try{localStorage.removeItem(KEY)}catch(e){}}

// ---- fetch the latest for next time ----
const get=u=>fetch(BASE+u,{cache:"no-cache"}).then(r=>r.ok?r.text():Promise.reject(r.status));
function refresh(){
  if(navigator.onLine===false)return;
  Promise.all([get("data/places.js"),get("data/ar/content.js").catch(()=>"")]).then(([t,c])=>{
    const a=JSON.parse(t.slice(t.indexOf("[",t.indexOf("const P=")),t.lastIndexOf("]")+1));
    const list=Array.isArray(a)?a.map(cleanPlace).filter(Boolean):[];
    if(list.length<=50)return;
    let ar=saved&&saved.built===built?saved.ar:null;
    if(c){const i=c.indexOf("AR.places={"),j=c.indexOf("\n};",i);if(i>=0&&j>i)try{ar=cleanAR(JSON.parse(c.slice(i+10,j+2)))}catch(e){}}
    localStorage.setItem(KEY,JSON.stringify({built,p:list,ar,at:Date.now()}));
  }).catch(()=>{});
}
// After the app has drawn itself, so it never slows the start.
addEventListener("load",()=>setTimeout(refresh,4000));
})();
