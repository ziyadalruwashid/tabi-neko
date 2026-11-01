// The app layout: what the page looks like inside the iPhone and Android
// apps (and in a browser tab opened with ?app=1). The website itself is
// untouched; everything here only runs when <html> has the "tn-app" class,
// which index.html sets before the first paint.
//
// - A bottom tab bar: Explore · Map · Apollo · My trip · More.
// - Explore: city chips, search, categories and swipeable rows of places.
// - A full place page, opened from anywhere a place is picked (a row, the
//   list, a map pin, a search result, a name in Apollo's answer). The phone's
//   back button closes it.
// - More: the account, the other pages and the settings.
// Loaded last, after js/admin.js, and uses the helpers from js/app.js and
// js/trip.js.
(function(){
if(!IS_APP)return;

const SVG=(d,fill)=>`<svg viewBox="0 0 24 24" width="25" height="25" fill="${fill?"currentColor":"none"}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const I={
  explore:'<path d="M4 11.5 12 5l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z"/>',
  map:'<path d="m9 4-5 2v14l5-2 6 2 5-2V4l-5 2-6-2zM9 4v14M15 6v14"/>',
  trip:'<path d="M7 4h10a1 1 0 0 1 1 1v15l-6-3-6 3V5a1 1 0 0 1 1-1z"/>',
  menu:'<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
  search:'<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
  back:'<path d="m15 5-7 7 7 7"/>',
  share:'<path d="M12 15V4m0 0-4 4m4-4 4 4M6 13v6h12v-6"/>',
  pin:'<path d="M12 21s-6-5.4-6-11a6 6 0 1 1 12 0c0 5.6-6 11-6 11z"/><circle cx="12" cy="10" r="2.2"/>',
};
const cityOf=c=>D(CITIES[c],"n");
const placeById=id=>P.find(p=>p.id===id);
// A place as a photo card. Places without a photo show their category art.
const pcard=p=>`<button type="button" class="pc" data-id="${p.id}" style="--c:var(--${p.cat})">
  <span class="pimg${p.photo?"":" art"}"><img src="${p.photo||CATS[p.cat].img}" alt="" loading="lazy">${p.halal?`<i class="hb">${p.hl==="friendly"?T("Muslim-friendly"):T("halal ✓")}</i>`:""}${p.gem?`<i class="gb">⭐</i>`:""}</span>
  <b><bdi>${esc(p.n)}</bdi></b><small><i></i>${esc(D(CATS[p.cat],"n"))} · ${esc(AREA(p.area))}</small></button>`;
const wireCards=box=>box.querySelectorAll(".pc").forEach(b=>b.onclick=()=>openPlace(b.dataset.id));

// ---- the tab bar ----
const TABS=[["explore","Explore"],["map","Map"],["apollo","Apollo"],["trip","My trip"],["menu","More"]];
const bar=document.createElement("nav");bar.id="tabbar";document.body.appendChild(bar);
function renderTabs(){
  bar.setAttribute("aria-label",T("Main"));
  bar.innerHTML=TABS.map(([k,l])=>k==="apollo"
    ?`<button type="button" class="tb tb-apo" data-t="apollo"><span class="tb-cat"><img src="assets/cat.png" alt=""></span><b>${T(l)}</b></button>`
    :`<a class="tb" href="#${k}" data-t="${k}">${SVG(I[k])}<b>${T(l)}</b></a>`).join("");
  bar.querySelectorAll("a.tb").forEach(a=>a.onclick=e=>{e.preventDefault();go(a.dataset.t)});
  bar.querySelector(".tb-apo").onclick=()=>openApollo();
  if(typeof tripBadge==="function")tripBadge();
  syncTabs();
}
// Tabs swap in place (no history), like any app; pages opened from More
// and place pages are added to history, so the back button returns.
function go(t,keep){
  closePlaceNow();
  try{history.replaceState(null,"","#"+t)}catch(_){}show(t,true);
  if(!keep)window.scrollTo(0,0);
}
const SUB=["hoods","apps","trips","memories","crew","privacy","admin"];
function current(){const h=location.hash.slice(1);
  if(h==="explore"||h==="trip"||h==="menu")return h;if(SUB.includes(h))return "menu";
  return $("home").hidden?"explore":"map"}
function syncTabs(){const c=current();bar.querySelectorAll(".tb").forEach(b=>b.classList.toggle("on",b.dataset.t===c))}
const _show=show;show=function(t,q){_show(t,q);syncTabs()};

// ---- Explore ----
let exploreCity=city;
function rows(){
  const here=P.filter(p=>p.city===exploreCity),withPhoto=a=>[...a].sort((x,y)=>(y.photo?1:0)-(x.photo?1:0));
  const halal=here.filter(p=>p.cat==="food"&&p.halal);
  if(near)halal.sort((a,b)=>KM(near,a)-KM(near,b));else halal.sort((a,b)=>(b.hl==="certified")-(a.hl==="certified")||(b.photo?1:0)-(a.photo?1:0));
  return [
    {t:"Don't miss 🔥",s:T("Apollo's first picks in {c}",{c:cityOf(exploreCity)}),ps:withPhoto(here.filter(p=>p.tier==="must"))},
    {t:near?"Halal near you 🍜":"Halal food 🍜",ps:halal,all:"halal"},
    {t:"Hidden gems ⭐",s:T("Even locals don't know these"),ps:withPhoto(here.filter(p=>p.gem))},
    {t:"Famous sights 📸",ps:here.filter(p=>p.src===""&&p.photo&&!["food","coffee"].includes(p.cat)&&!p.gem)},
    {t:"Coffee & sweets ☕",ps:withPhoto(here.filter(p=>p.cat==="coffee")),all:"coffee"},
  ].filter(r=>r.ps.length);
}
function renderExplore(){
  const el=$("explore");if(!el)return;
  const who=typeof auth!=="undefined"&&auth&&auth.email?auth.email.split("@")[0]:"";
  const cities=TRIP_CITIES.filter(c=>c!=="ise");
  el.innerHTML=`<header class="ax-h"><div><small>${esc(who?T("Hi {n} 👋",{n:who}):T("Hi 👋"))}</small><h1>${T("Where are we going today?")}</h1></div>
      <button type="button" class="ax-av" aria-label="${esc(T("More"))}"><img src="assets/cat.png" alt=""></button></header>
    <div class="ax-cities" role="tablist">${cities.map(c=>`<button type="button" role="tab" class="ax-city${c===exploreCity?" on":""}" data-c="${c}" aria-selected="${c===exploreCity}">${esc(cityOf(c))} <small>${P.filter(p=>p.city===c).length}</small></button>`).join("")}</div>
    <button type="button" class="ax-search">${SVG(I.search)}<span>${T("Search places, areas, dishes…")}</span></button>
    <div class="ax-cats">${Object.keys(CATS).map(k=>`<button type="button" class="ax-cat" data-k="${k}"><img src="assets/icons/${k}.png" alt="">${esc(D(CATS[k],"n"))}</button>`).join("")}</div>
    ${rows().map(r=>`<section class="ax-row"><header><h2>${T(r.t)}</h2>${r.all?`<button type="button" class="ax-all" data-all="${r.all}">${T("See all")}</button>`:""}</header>
      ${r.s?`<p class="ax-sub">${esc(r.s)}</p>`:""}<div class="ax-hs">${r.ps.slice(0,12).map(pcard).join("")}</div></section>`).join("")}`;
  wireCards(el);
  el.querySelector(".ax-av").onclick=()=>go("menu");
  el.querySelectorAll(".ax-city").forEach(b=>b.onclick=()=>{exploreCity=b.dataset.c;renderExplore()});
  // Picking a city here also sets the map's city, so the Map tab follows.
  const toMap=(cats,halal)=>{city=exploreCity;store.set("tabineko-city",city);active=new Set(cats);halalOnly=!!halal;area=null;zoomTo=null;selected=null;renderAll();go("map")};
  el.querySelector(".ax-search").onclick=()=>{toMap(Object.keys(CATS));setTimeout(()=>{const q=$("q");if(q){q.scrollIntoView({block:"center"});q.focus()}},60)};
  el.querySelectorAll(".ax-cat").forEach(b=>b.onclick=()=>toMap([b.dataset.k]));
  el.querySelectorAll(".ax-all").forEach(b=>b.onclick=()=>b.dataset.all==="halal"?toMap(["food"],true):toMap([b.dataset.all]));
}

// ---- the place page ----
const pv=document.createElement("div");pv.id="pview";pv.hidden=true;pv.setAttribute("role","dialog");pv.setAttribute("aria-modal","true");document.body.appendChild(pv);
let pvId=null;
function renderPlace(){
  const p=placeById(pvId);if(!p)return;
  const C=CATS[p.cat],maps=p.url||"https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(`${p.n} ${CITIES[p.city].n} Japan`);
  const nearby=P.filter(x=>x.city===p.city&&x.id!==p.id).map(x=>[x,KM(p,x)]).sort((a,b)=>a[1]-b[1]).slice(0,8).map(a=>a[0]);
  const fact=(l,v)=>v?`<div><small>${T(l)}</small><b>${esc(v)}</b></div>`:"";
  pv.setAttribute("aria-label",p.n);
  pv.innerHTML=`<div class="pv-scroll">
    <div class="pv-hero${p.photo?"":" art"}" style="--c:var(--${p.cat})"><img src="${p.photo||C.img}" alt="">
      <div class="pv-btns"><button type="button" class="pv-cb pv-back" aria-label="${esc(T("Back"))}">${SVG(I.back)}</button><span></span>
        <button type="button" class="pv-cb pv-share" aria-label="${esc(T("Share"))}">${SVG(I.share)}</button></div></div>
    <div class="pv-body">
      <div class="pv-chips">${p.halal?`<span class="pv-ch hal">${p.hl==="friendly"?T("Muslim-friendly"):p.hl==="certified"?T("✓ Halal certified"):T("✓ halal")}</span>`:""}
        <span class="pv-ch" style="--c:var(--${p.cat})"><i></i>${esc(D(C,"n"))}</span><span class="pv-ch">${esc(AREA(p.area))}</span>
        ${p.tier==="must"?`<span class="pv-ch must">🔥 ${T("don't skip this")}</span>`:""}${p.gem?`<span class="pv-ch gem">${T("⭐ hidden gem")}</span>`:""}</div>
      <h1><bdi>${esc(p.n)}</bdi></h1>${p.jp?`<p class="pv-jp" lang="ja">${esc(p.jp)}</p>`:""}
      <div class="pv-facts">${fact("When",D(p,"t"))}${fact("Cost",D(p,"cost"))}${fact("How long",D(p,"dur"))}</div>
      <div class="pv-note"><img src="assets/cat.png" alt=""><p>${D(p,"tip")}</p></div>
      ${p.book?`<a class="pv-book" href="${p.book}" target="_blank" rel="noopener">${T("Book it ↗")}</a>`:""}
      ${nearby.length?`<section class="ax-row pv-near"><header><h2>${T("Nearby")}</h2></header><div class="ax-hs">${nearby.map(pcard).join("")}</div></section>`:""}
    </div></div>
    <div class="pv-cta"><a class="pv-maps" href="${maps}" target="_blank" rel="noopener">${SVG(I.pin)}${T("Google Maps")}</a>${tripBtn(p)}</div>`;
  pv.querySelector(".pv-back").onclick=closePlace;
  pv.querySelector(".pv-share").onclick=()=>{const url="https://tabi-neko.vercel.app/",text=`${p.n} · Tabi Neko 🐾`;
    if(navigator.share)navigator.share({title:p.n,text,url}).catch(()=>{});else{try{navigator.clipboard.writeText(`${text} ${url}`);toast(T("Link copied. Paste it to a friend ✓"))}catch(e){}}};
  wireCards(pv);
}
function openPlace(id,fromHistory){
  if(!placeById(id))return;
  pvId=id;renderPlace();pv.hidden=false;document.documentElement.classList.add("pv-open");
  pv.querySelector(".pv-scroll").scrollTop=0;
  if(!fromHistory)history.pushState({tnPlace:id},"");
}
function closePlaceNow(){pv.hidden=true;pvId=null;document.documentElement.classList.remove("pv-open")}
function closePlace(){if(history.state&&history.state.tnPlace)history.back();else closePlaceNow()}
addEventListener("popstate",e=>{if(e.state&&e.state.tnPlace)openPlace(e.state.tnPlace,true);else closePlaceNow()});
// Every way of picking a place opens its page instead of unfolding the card.
const _select=select;select=function(id){if(!id)return;if(typeof closeApollo==="function")closeApollo();openPlace(id)};

// ---- More ----
const MORE=[["Discover",[["🏘️","Areas","hoods"],["🚆","Day trips","trips"],["📱","Apps to download","apps"],["📸","Memories","memories"]]],
  ["Settings",[["🌐","Language","lang"],["🔒","Privacy","privacy"],["🐾","Contributors","crew"]]]];
function renderMore(){
  const el=$("menu");if(!el)return;
  const me=typeof auth!=="undefined"&&auth;
  el.innerHTML=`<header class="ax-h"><div><h1>${T("More")}</h1></div></header>
    <button type="button" class="am-prof"><img src="assets/cat.png" alt=""><div><b>${esc(me?me.email.split("@")[0]:T("Your account"))}</b>
      <small>${esc(me?me.email:T("Log in or create a free account"))}</small></div><i aria-hidden="true">‹</i></button>
    ${MORE.map(([h,items])=>`<h2 class="am-h">${T(h)}</h2><div class="am-list">${items.map(([ic,l,k])=>`<button type="button" class="am-li" data-k="${k}"><span aria-hidden="true">${ic}</span><b>${T(l)}</b>
      ${k==="lang"?`<small>${isAR()?"العربية":"English"}</small>`:""}<i aria-hidden="true">‹</i></button>`).join("")}</div>`).join("")}
    <p class="am-foot">Tabi Neko · ${T("made in Riyadh")} 🐾</p>`;
  el.querySelector(".am-prof").onclick=()=>{if(typeof openAcct==="function")openAcct(me?"me":"login")};
  el.querySelectorAll(".am-li").forEach(b=>b.onclick=()=>{const k=b.dataset.k;
    if(k==="lang"){setLang(isAR()?"en":"ar");return}
    location.hash="#"+k;window.scrollTo(0,0)});
}

// ---- a back bar on the pages opened from More ----
const TITLES={hoods:"Areas",trips:"Day trips",apps:"Apps to download",memories:"Memories",crew:"Contributors",privacy:"Privacy",admin:"Admin"};
function renderBars(){
  Object.keys(TITLES).forEach(k=>{const sec=$(k);if(!sec)return;
    let b=sec.querySelector(":scope > .apbar");
    if(!b){b=document.createElement("div");b.className="apbar";sec.prepend(b)}
    b.innerHTML=`<button type="button" class="pv-cb" aria-label="${esc(T("Back"))}">${SVG(I.back)}</button><b>${T(TITLES[k])}</b>`;
    b.querySelector("button").onclick=()=>{if(history.length>1)history.back();else go("menu")};
  });
}

// ---- keep everything in step ----
function renderShell(){renderTabs();renderExplore();renderMore();renderBars();if(pvId)renderPlace()}
const _setLang=setLang;setLang=function(l){_setLang(l);if(l==="ar"&&!AR_ON())return;renderShell()};
if(typeof userBtn==="function"){const _u=userBtn;userBtn=function(){_u();renderExplore();renderMore()}}
renderShell();
// The app opens on Explore unless a page was asked for.
const h=location.hash.slice(1);
if(!h||h==="top")go("explore");else syncTabs();
})();
