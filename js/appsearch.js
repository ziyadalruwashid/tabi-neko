// The app's search screen, like a maps app: tap search anywhere (Explore or
// the Map tab) and a full page opens with the keyboard up.
//
// - Before typing: quick categories, what you searched before, and what's
//   near you (or popular in the city, until you share your location).
// - While typing: areas and cities first, then places with a photo, the
//   matched letters marked, the category, the area and how far away it is.
// - "Show all on the map" puts just the results on the Map tab.
//
// Only in the app layout. Loaded after js/appshell.js and js/appmap.js, and
// uses the search index (IDX, score, hl) from js/app.js.
(function(){
if(!IS_APP)return;

const SVG=(d,s=22)=>`<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const I={search:'<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',back:'<path d="m15 5-7 7 7 7"/>',x:'<path d="M6 6l12 12M18 6 6 18"/>',
  clock:'<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>',pin:'<path d="M12 21s-6-5.4-6-11a6 6 0 1 1 12 0c0 5.6-6 11-6 11z"/><circle cx="12" cy="10" r="2.2"/>',
  map:'<path d="m9 4-5 2v14l5-2 6 2 5-2V4l-5 2-6-2zM9 4v14M15 6v14"/>',go:'<path d="M7 17 17 7M9 7h8v8"/>',loc:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="7"/>'};

const sv=document.createElement("div");sv.id="sview";sv.hidden=true;sv.setAttribute("role","dialog");sv.setAttribute("aria-modal","true");document.body.appendChild(sv);
sv.innerHTML=`<div class="sv-bar"><button type="button" class="pv-cb sv-back"></button>
  <label class="sv-in">${SVG(I.search,20)}<input type="search" id="sv-q" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="search"><button type="button" class="sv-x" hidden>${SVG(I.x,18)}</button></label></div>
  <div class="sv-body"></div>`;
const box=sv.querySelector("#sv-q"),body=sv.querySelector(".sv-body"),clr=sv.querySelector(".sv-x");

// ---- where you are: from the map, from "Near me", or asked for here ----
let me=null,asking=false;
const here=()=>window.tnMe||(near&&nearKind==="me"?near:null)||me;
function askLocation(quiet){
  if(!navigator.geolocation||asking)return;asking=true;
  navigator.geolocation.getCurrentPosition(pos=>{asking=false;me={lat:pos.coords.latitude,lng:pos.coords.longitude};window.tnMe=me;if(!sv.hidden)draw()},
    ()=>{asking=false;if(!quiet)toast(T("Couldn't find where you are."))},{enableHighAccuracy:false,timeout:10000,maximumAge:300000});
}
// Ask quietly only when the phone already said yes before; otherwise wait for a tap.
function maybeLocate(){
  if(here())return;
  try{navigator.permissions.query({name:"geolocation"}).then(r=>{if(r.state==="granted")askLocation(true)},()=>{})}catch(e){}
}
const short=km=>{const t=km<1?T("{n} m",{n:Math.max(10,Math.round(km*100)*10)}):T("{n} km",{n:km<10?km.toFixed(1):Math.round(km)});return isAR()?iso(t):t};

// ---- what you searched before, on this phone only ----
const RKEY="tabineko-recent";
const recent=()=>{try{const a=JSON.parse(store.get(RKEY)||"[]");return Array.isArray(a)?a:[]}catch(e){return[]}};
function remember(k,v,id){const a=recent().filter(r=>!(r.k===k&&r.v===v));a.unshift({k,v,id});store.set(RKEY,JSON.stringify(a.slice(0,6)))}
function forget(i){const a=recent();a.splice(i,1);store.set(RKEY,JSON.stringify(a))}

// ---- the lists behind the quick chips, in the city you're looking at ----
const inCity=()=>P.filter(p=>p.city===city);
const byNear=a=>{const h=here();return h?[...a].sort((x,y)=>KM(h,x)-KM(h,y)):[...a].sort((x,y)=>(y.photo?1:0)-(x.photo?1:0))};
const QUICK=[["halal","🍜","Halal",()=>byNear(inCity().filter(p=>p.cat==="food"&&p.halal))],["coffee","☕","Coffee",()=>byNear(inCity().filter(p=>p.cat==="coffee"))],
  ["shrine","⛩️","Temples",()=>byNear(inCity().filter(p=>p.cat==="shrine"))],["views","🌅","Views",()=>byNear(inCity().filter(p=>p.cat==="views"))],
  ["shop","🛍️","Shopping",()=>byNear(inCity().filter(p=>p.cat==="shop"))],["gems","⭐","Hidden",()=>byNear(inCity().filter(p=>p.gem))]];

// ---- matching ----
const terms=s=>LOW(s).trim().split(/\s+/).filter(Boolean);
function places(s){
  const ws=terms(s);if(!ws.length)return[];const out=[];
  IDX.forEach(e=>{let sc=0;for(const w of ws){const x=score(e,w);if(!x)return;sc+=x}
    // The city you're in comes first, unless the name only fits elsewhere
    // or the word only turns up in a tip.
    if(e.p.city===city&&sc>=30*ws.length)sc+=35;out.push({p:e.p,sc})});
  const h=here();
  return out.sort((a,b)=>b.sc-a.sc||(h?KM(h,a.p)-KM(h,b.p):0)||a.p.n.localeCompare(b.p.n)).map(o=>o.p);
}
// Areas from the Areas page, and whole cities, whose name starts a word you type.
function areas(s){
  const w=LOW(s.trim());if(w.length<2)return[];
  const hit=t=>t&&LOW(t).split(/[\s&·,-]+/).some(x=>x.startsWith(w))||LOW(t||"").startsWith(w);
  const hs=HOODS.filter(h=>[h.n,h.area,h._ar&&h._ar.n,h.jp].some(hit)).map(h=>({h,ps:P.filter(p=>p.city===h.city&&p.area===h.area)}));
  const cs=Object.keys(CITIES).filter(c=>[CITIES[c].n,CITIES[c]._ar&&CITIES[c]._ar.n].some(hit)).map(c=>({c,ps:P.filter(p=>p.city===c)})).filter(o=>o.ps.length);
  return [...cs,...hs].filter(o=>o.ps.length).slice(0,3);
}

// ---- drawing ----
const meta=p=>`${esc(D(CATS[p.cat],"n"))} · ${esc(AREA(p.area))}${p.city!==city?` · ${esc(D(CITIES[p.city],"n"))}`:""}`;
function row(p,ws){const h=here();
  return `<button type="button" class="sv-r" data-id="${p.id}"><span class="sv-img${p.photo?"":" art"}" style="--c:var(--${p.cat})"><img src="${p.photo||CATS[p.cat].img}" alt="" loading="lazy"></span>
    <span class="sv-t"><b><bdi>${ws?hl(p.n,ws):esc(p.n)}</bdi></b><small>${meta(p)}</small>${p.halal?`<em>${p.hl==="friendly"?T("Muslim-friendly"):T("halal ✓")}</em>`:""}</span>
    ${h&&KM(h,p)<60?`<span class="sv-d">${esc(short(KM(h,p)))}</span>`:""}</button>`}
const head=t=>`<h3 class="sv-h">${t}</h3>`;
let hits=[],found=[];
function draw(){
  const s=box.value;clr.hidden=!s;
  if(!s.trim())return drawEmpty();
  const ws=terms(s);hits=places(s);found=areas(s);
  let h="";
  if(found.length)h+=head(T("Areas"))+found.map((o,i)=>{const img=o.h?o.h.photo:(o.ps.find(p=>p.photo)||{}).photo;
    const name=o.h?D(o.h,"n"):D(CITIES[o.c],"n"),sub=o.h?`${D(CITIES[o.h.city],"n")} · ${T(o.ps.length===1?"1 place":"{n} places",{n:o.ps.length})} · ${D(o.h,"vibe")}`:T(o.ps.length===1?"1 place":"{n} places",{n:o.ps.length});
    return `<button type="button" class="sv-card sv-area" data-a="${i}">${img?`<img src="${img}" alt="" loading="lazy">`:`<span class="sv-ic">${SVG(I.pin,20)}</span>`}
      <span class="sv-t"><b>${hl(name,ws)}</b><small>${esc(sub)}</small></span><i class="sv-go">${SVG(I.go,18)}</i></button>`}).join("");
  if(hits.length>3)h+=`<button type="button" class="sv-card sv-all"><span class="sv-ic">${SVG(I.search,20)}</span><span class="sv-t"><b>${esc(T("All results for “{q}”",{q:s.trim()}))}</b>
    <small>${esc(T(hits.length===1?"1 place":"{n} places",{n:hits.length}))}${hits.some(p=>p.halal)?" · "+esc(T("halal first")):""}</small></span><i class="sv-go">${SVG(I.go,18)}</i></button>`;
  if(hits.length)h+=head(T("Places"))+hits.slice(0,25).map(p=>row(p,ws)).join("")
    +`<button type="button" class="sv-map">${SVG(I.map,20)}${esc(T("Show all on the map"))}</button>`;
  if(!hits.length&&!found.length)h+=`<div class="sv-none"><img src="assets/cat.png" alt=""><b>${esc(T("Apollo hasn't been there yet."))}</b><small>${esc(T("Try another word, or a place name in English."))}</small></div>`;
  body.innerHTML=h;wire();
}
function drawEmpty(){
  const rs=recent(),h=here();
  const list=h?inCity().map(p=>[p,KM(h,p)]).sort((a,b)=>a[1]-b[1]).slice(0,8).map(a=>a[0])
    :inCity().filter(p=>p.photo&&(p.tier==="must"||p.gem)).slice(0,8);
  body.innerHTML=`<div class="sv-quick">${QUICK.map(([k,e,l])=>`<button type="button" data-q="${k}"><i>${e}</i>${esc(T(l))}</button>`).join("")}</div>
    ${rs.length?head("🕘 "+T("Searched before"))+`<div class="sv-rec">${rs.map((r,i)=>{const p=r.id&&P.find(x=>x.id===r.id);
      return `<div class="sv-rc"><button type="button" class="sv-rgo" data-i="${i}">${p&&p.photo?`<img src="${p.photo}" alt="">`:`<span class="sv-ic">${SVG(r.k==="area"?I.pin:I.clock,18)}</span>`}<b><bdi>${esc(r.v)}</bdi></b></button>
        <button type="button" class="sv-rx" data-i="${i}" aria-label="${esc(T("Remove"))}">${SVG(I.x,16)}</button></div>`}).join("")}</div>`:""}
    ${h?head("📍 "+T("Near you")):head(T("Popular in {c}",{c:D(CITIES[city],"n")}))+`<button type="button" class="sv-loc">${SVG(I.loc,18)}${esc(T("Show what's near me"))}</button>`}
    ${list.map(p=>row(p)).join("")}`;
  wire();
}
function wire(){
  body.querySelectorAll(".sv-r").forEach(b=>b.onclick=()=>{const p=P.find(x=>x.id===b.dataset.id);remember("place",p.n,p.id);openPlace(p.id)});
  body.querySelectorAll(".sv-area").forEach(b=>b.onclick=()=>{const o=found[+b.dataset.a],name=o.h?D(o.h,"n"):D(CITIES[o.c],"n");remember("area",name);
    openListPage(name,o.h?D(o.h,"vibe"):"",o.ps.sort((x,y)=>(y.photo?1:0)-(x.photo?1:0)))});
  const all=body.querySelector(".sv-all");if(all)all.onclick=()=>{const s=box.value.trim();remember("word",s);openListPage(`“${s}”`,T("Search"),[...hits].sort((a,b)=>(b.halal?1:0)-(a.halal?1:0)))};
  const m=body.querySelector(".sv-map");if(m)m.onclick=()=>{const s=box.value.trim();remember("word",s);toMap(hits,s)};
  body.querySelectorAll(".sv-quick button").forEach(b=>b.onclick=()=>{const k=QUICK.find(x=>x[0]===b.dataset.q);openListPage(`${k[1]} ${T(k[2])}`,D(CITIES[city],"n"),k[3]())});
  body.querySelectorAll(".sv-rgo").forEach(b=>b.onclick=()=>{const r=recent()[+b.dataset.i];
    if(r.k==="place"&&r.id&&P.find(x=>x.id===r.id)){remember(r.k,r.v,r.id);openPlace(r.id)}else{box.value=r.v;draw()}});
  body.querySelectorAll(".sv-rx").forEach(b=>b.onclick=()=>{forget(+b.dataset.i);drawEmpty()});
  const l=body.querySelector(".sv-loc");if(l)l.onclick=()=>{l.disabled=true;l.lastChild.textContent=T("finding you…");askLocation(false)};
}
function toMap(ps,title){if(!ps.length)return;closeSearchNow(true);mapOnly(ps,title);goTab("map")}

// ---- opening and closing: the phone's back button closes it ----
function openSearch(s){
  sv.querySelector(".sv-back").innerHTML=SVG(I.back);sv.querySelector(".sv-back").setAttribute("aria-label",T("Back"));
  box.placeholder=T("Search places, areas, food…");clr.setAttribute("aria-label",T("Clear search"));
  box.value=s||"";sv.hidden=false;document.documentElement.classList.add("sv-open");
  if(!(history.state&&history.state.tnSearch))history.pushState({tnSearch:1},"");
  maybeLocate();draw();body.scrollTop=0;
  setTimeout(()=>box.focus(),60);
}
function closeSearchNow(dropHistory){
  if(sv.hidden)return;sv.hidden=true;box.blur();document.documentElement.classList.remove("sv-open");
  if(dropHistory&&history.state&&history.state.tnSearch)try{history.replaceState(null,"")}catch(e){}
}
sv.querySelector(".sv-back").onclick=()=>{if(history.state&&history.state.tnSearch)history.back();else closeSearchNow()};
addEventListener("popstate",e=>{const st=e.state||{};if(!st.tnSearch&&!st.tnPlace&&!st.tnList)closeSearchNow()});
box.oninput=draw;
box.onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();box.blur();if(box.value.trim())remember("word",box.value.trim())}else if(e.key==="Escape")sv.querySelector(".sv-back").click()};
clr.onclick=()=>{box.value="";draw();box.focus()};
// Scrolling the results puts the keyboard away, as in any maps app.
body.addEventListener("touchstart",()=>box.blur(),{passive:true});
window.openSearch=openSearch;window.closeSearchNow=closeSearchNow;
const _setLang=setLang;setLang=function(l){_setLang(l);if(!sv.hidden)draw()};
})();
