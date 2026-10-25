// My Trip: a day-by-day plan built from places in the notebook. Loaded after
// js/app.js and js/apollo.js, and uses their helpers ($, esc, T, D, AREA, KM,
// isAR, store, goPlace).
//
// No account and no server: the plan is kept in this browser's localStorage,
// and sharing packs the whole plan into the link itself (#trip=...), so a
// friend who opens it sees the same plan and can save their own copy.
//
// Places are stored as "city|name" rather than their pin id, because pin ids
// are numbered by position in data/places.js and shift when a place is added.

const TRIP_KEY="tabineko-trip";
const PKEY=p=>p.city+"|"+p.n;
const BYKEY=new Map(P.map(p=>[PKEY(p),p]));
const freshTrip=()=>({name:"",ideas:[],days:[{t:"",ids:[]}]});

// A saved or shared trip is untrusted input: keep only places that still
// exist, drop duplicates, and cap the sizes so a bad link can't do much.
function cleanTrip(t){
  const seen=new Set(),keep=a=>(Array.isArray(a)?a:[]).filter(k=>typeof k==="string"&&BYKEY.has(k)&&!seen.has(k)&&seen.add(k)).slice(0,60);
  const out={name:String(t&&t.name||"").slice(0,60),days:[],ideas:[]};
  (Array.isArray(t&&t.days)?t.days:[]).slice(0,30).forEach(d=>out.days.push({t:String(d&&d.t||"").slice(0,50),ids:keep(d&&d.ids)}));
  out.ideas=keep(t&&t.ideas);
  if(!out.days.length)out.days.push({t:"",ids:[]});
  return out;
}
let trip=freshTrip();
try{const s=store.get(TRIP_KEY);if(s)trip=cleanTrip(JSON.parse(s))}catch(e){}
let shared=null; // a trip opened from someone's link, shown read-only until saved
const saveTrip=()=>{store.set(TRIP_KEY,JSON.stringify(trip));tripBadge()};
const inTrip=k=>trip.ideas.includes(k)||trip.days.some(d=>d.ids.includes(k));
const tripCount=t=>t.ideas.length+t.days.reduce((n,d)=>n+d.ids.length,0);
function removeKey(k){trip.ideas=trip.ideas.filter(x=>x!==k);trip.days.forEach(d=>d.ids=d.ids.filter(x=>x!==k))}

// ---- the button on every place card ----
function tripBtn(p){
  const on=inTrip(PKEY(p));
  return `<button type="button" class="addtrip${on?" on":""}" data-k="${esc(PKEY(p))}" aria-pressed="${on}">${on?T("✓ In my trip"):T("＋ Add to my trip")}</button>`;
}
document.addEventListener("click",e=>{
  const b=e.target.closest(".addtrip");if(!b)return;
  e.stopPropagation();
  const k=b.dataset.k;
  if(inTrip(k))removeKey(k);else{trip.ideas.push(k);toast(T("Added to your trip ✓"),T("Open my trip"),()=>{show("trip");history.replaceState(null,"","#trip")})}
  saveTrip();
  document.querySelectorAll(`.addtrip[data-k="${CSS.escape(k)}"]`).forEach(x=>x.outerHTML=tripBtn(BYKEY.get(k)));
  if(!$("trip").hidden)renderTrip();
},true);

// A small paper note that slides up from the bottom for a few seconds.
let toastT;
function toast(msg,act,fn){
  let el=$("ttoast");
  if(!el){el=document.createElement("div");el.id="ttoast";el.className="ttoast";el.setAttribute("role","status");document.body.appendChild(el)}
  el.innerHTML=`<span>${esc(msg)}</span>${act?`<button type="button">${esc(act)}</button>`:""}`;
  if(act)el.querySelector("button").onclick=()=>{el.classList.remove("show");fn()};
  el.classList.add("show");clearTimeout(toastT);toastT=setTimeout(()=>el.classList.remove("show"),3600);
}
function tripBadge(){const a=document.querySelectorAll('a[href="#trip"]'),n=tripCount(trip);a.forEach(x=>x.dataset.n=n)}

// ---- distances between stops ----
// Straight-line distance, with walking time only for short hops; anything
// longer is a train or taxi ride, and saying "~95 min walk" would mislead.
function legText(a,b){
  const km=KM(a,b),d=km<1?T("{n} m",{n:Math.max(10,Math.round(km*100)*10)}):T("{n} km",{n:km<10?km.toFixed(1):Math.round(km)});
  const t=km<=1.5?T("~{n} min walk",{n:Math.max(1,Math.round(km*1.25/4.8*60))}):km<=40?T("train or taxi 🚃"):T("long ride, plan the transport 🚄");
  const s=d+" · "+t;return isAR()?iso(s):s;
}

// A hand-drawn route doodle for one day: the stops plotted by their real
// positions, joined in order by a dashed pencil line.
function routeDoodle(ps){
  if(!ps.length)return"";
  const W=320,H=150,pad=22;
  const lat=ps.map(p=>p.lat),lng=ps.map(p=>p.lng),k=Math.cos(((Math.max(...lat)+Math.min(...lat))/2)*Math.PI/180);
  let x0=Math.min(...lng)*k,x1=Math.max(...lng)*k,y0=Math.min(...lat),y1=Math.max(...lat);
  const span=Math.max(x1-x0,(y1-y0)*(W/H),.004),cx=(x0+x1)/2,cy=(y0+y1)/2,sc=(W-2*pad)/span;
  const pt=p=>[W/2+(p.lng*k-cx)*sc,H/2-(p.lat-cy)*sc];
  const xy=ps.map(pt);
  // Pins that land on top of each other get nudged apart so both numbers show.
  xy.forEach((a,i)=>{for(let j=0;j<i;j++){const b=xy[j];if(Math.hypot(a[0]-b[0],a[1]-b[1])<20){a[0]+=16;a[1]+=6}}});
  const path=xy.map((a,i)=>(i?"L":"M")+a[0].toFixed(1)+" "+a[1].toFixed(1)).join(" ");
  return `<svg class="tdoodle" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(T("Route sketch for this day"))}">
    <path d="${path}" fill="none" stroke="var(--ink)" stroke-width="2" stroke-dasharray="4 6" stroke-linecap="round" opacity=".55"/>
    ${xy.map((a,i)=>`<g transform="translate(${a[0].toFixed(1)},${a[1].toFixed(1)})"><circle r="11" fill="var(--${ps[i].cat})" stroke="var(--sheet)" stroke-width="2.5"/><text y="4" text-anchor="middle" font-family="var(--body)" font-weight="700" font-size="11" fill="#fff">${i+1}</text></g>`).join("")}
  </svg>`;
}

// The nearest halal food spot to a day's stops that isn't already planned.
function halalIdea(ps){
  if(!ps.length)return null;
  const c={lat:ps.reduce((s,p)=>s+p.lat,0)/ps.length,lng:ps.reduce((s,p)=>s+p.lng,0)/ps.length};
  let best=null,bd=3;
  P.forEach(p=>{if(!p.halal||p.cat!=="food"||inTrip(PKEY(p)))return;const d=KM(c,p);if(d<bd){bd=d;best=p}});
  return best&&{p:best,km:bd};
}

// ---- the page ----
function stopRow(p,i,di,ro){
  const C=CATS[p.cat],k=PKEY(p);
  const moveOpts=ro?"":`<select class="tmove" data-k="${esc(k)}" aria-label="${esc(T("Move to"))}"><option value="">${T("Move to…")}</option>${trip.days.map((d,j)=>j===di?"":`<option value="${j}">${esc(T("Day {n}",{n:j+1}))}${d.t?" · "+esc(d.t):""}</option>`).join("")}${di>=0?`<option value="ideas">${T("Back to ideas")}</option>`:""}</select>`;
  return `<li class="tstop" data-k="${esc(k)}" style="--c:var(--${p.cat})"${ro?"":` draggable="true"`}>
    <span class="tnum">${di>=0?i+1:"♡"}</span>
    <img class="tthumb" src="${esc(p.photo||C.img)}" alt="" loading="lazy">
    <div class="tinfo"><button type="button" class="tname" data-id="${p.id}">${esc(p.n)}</button>
      <small>${esc(D(CITIES[p.city],"n"))} · ${esc(AREA(p.area))}${p.halal?` · <b class="thalal">${p.hl==="friendly"?T("Muslim-friendly"):T("✓ halal")}</b>`:""}</small></div>
    ${ro?"":`<div class="tctl">${di>=0?`<button type="button" class="tup" data-k="${esc(k)}" aria-label="${esc(T("Move up"))}">↑</button><button type="button" class="tdown" data-k="${esc(k)}" aria-label="${esc(T("Move down"))}">↓</button>`:""}${moveOpts}<button type="button" class="tdel" data-k="${esc(k)}" aria-label="${esc(T("Remove"))}">×</button></div>`}
  </li>`;
}

function renderTrip(){
  const box=$("tripbook");if(!box)return;
  const t=shared||trip,ro=!!shared,n=tripCount(t);
  let h="";
  if(shared)h+=`<div class="tshared"><p>${esc(T("Someone shared a trip with you:"))} <b>${esc(shared.name||T("My Japan trip"))}</b></p>
    <button type="button" class="store tsave">${T("Save it as my trip")}</button><button type="button" class="tcancel">${T("Close")}</button>
    ${tripCount(trip)?`<small>${T("Saving replaces the trip you have now.")}</small>`:""}</div>`;
  h+=`<div class="ttop">
    <input class="tname-in" id="tripname" value="${esc(t.name)}" placeholder="${esc(T(ro?"My Japan trip":"Name your trip…"))}" maxlength="60"${ro?" readonly":""} aria-label="${esc(T("Trip name"))}">
    ${ro?"":`<div class="tbtns"><button type="button" class="store" id="tadd">＋ ${T("Add a day")}</button><button type="button" class="store" id="tshare"${n?"":" disabled"}>${T("Share")} ↗</button>${n?`<button type="button" class="tclear" id="tclear">${T("Start over")}</button>`:""}</div>`}
  </div>`;
  if(!n&&!ro){
    h+=`<div class="tempty"><img src="assets/cat.png" alt=""><div><h2>${T("Your trip is empty… for now")}</h2>
      <p>${T("Tap ＋ Add to my trip on any place in the notebook. It lands here in your ideas, then you sort it into days.")}</p>
      <a class="store" href="#map">${T("Browse the map →")}</a></div></div>`;
    box.innerHTML=h;wireTrip();return;
  }
  if(t.ideas.length||!ro){
    h+=`<section class="tideas tlist-drop" data-day="ideas"><h2>${T("Ideas")}<small>${t.ideas.length?T("sort these into your days ↓"):T("places you add land here first")}</small></h2>
      <ul class="tlist">${t.ideas.map(k=>stopRow(BYKEY.get(k),0,-1,ro)).join("")}</ul></section>`;
  }
  h+=`<div class="tdays">`+t.days.map((d,di)=>{
    const ps=d.ids.map(k=>BYKEY.get(k)),idea=ro?null:halalIdea(ps);
    let km=0;for(let i=1;i<ps.length;i++)km+=KM(ps[i-1],ps[i]);
    const halal=ps.filter(p=>p.halal).length;
    const stats=ps.length?[T(ps.length===1?"1 stop":"{n} stops",{n:ps.length}),ps.length>1?T("~{n} km",{n:km.toFixed(1)}):"",halal?T("{n} halal",{n:halal}):""].filter(Boolean).join(" · "):"";
    let rows="";ps.forEach((p,i)=>{if(i)rows+=`<li class="tleg">↓ ${esc(legText(ps[i-1],p))}</li>`;rows+=stopRow(p,i,di,ro)});
    return `<article class="tday tlist-drop" data-day="${di}" style="--r:${[-.8,.6,-.4,.9][di%4]}deg"><span class="tape${di%2?" pink":""}"></span>
      <header><h2>${T("Day {n}",{n:di+1})}</h2>
        <input class="tday-t" data-day="${di}" value="${esc(d.t)}" placeholder="${ro?"":esc(T("e.g. Asakusa & Ueno"))}" maxlength="50"${ro?" readonly":""} aria-label="${esc(T("Day title"))}">
        ${ro||t.days.length<2?"":`<button type="button" class="tdayx" data-day="${di}" aria-label="${esc(T("Remove this day"))}">×</button>`}</header>
      ${stats?`<p class="tstats">${esc(isAR()?iso(stats):stats)}</p>`:""}
      ${routeDoodle(ps)}
      <ul class="tlist">${rows||`<li class="tnone">${T(ro?"Nothing planned for this day.":"Nothing here yet. Move ideas into this day.")}</li>`}</ul>
      ${idea?`<p class="tlunch">🍜 ${T("Halal food near this day:")} <button type="button" class="tname" data-id="${idea.p.id}">${esc(idea.p.n)}</button> <span>${esc(T("{n} km",{n:idea.km.toFixed(1)}))}</span> <button type="button" class="tlunch-add" data-k="${esc(PKEY(idea.p))}" data-day="${di}">＋ ${T("add")}</button></p>`:""}
    </article>`}).join("")+`</div>`;
  box.innerHTML=h;wireTrip();
}

function wireTrip(){
  const box=$("tripbook"),q=s=>box.querySelectorAll(s),day=x=>x==="ideas"?trip.ideas:trip.days[+x].ids;
  const redo=()=>{saveTrip();renderTrip();renderList()};
  q(".tname").forEach(b=>b.onclick=()=>{show("map",true);history.replaceState(null,"","#map");goPlace(b.dataset.id)});
  if(shared){
    box.querySelector(".tsave").onclick=()=>{trip=cleanTrip(shared);shared=null;saveTrip();renderTrip();renderList();toast(T("Saved as your trip ✓"))};
    box.querySelector(".tcancel").onclick=()=>{shared=null;renderTrip()};
    return;
  }
  const nm=$("tripname");if(nm)nm.oninput=()=>{trip.name=nm.value.slice(0,60);saveTrip()};
  q(".tday-t").forEach(i=>i.oninput=()=>{trip.days[+i.dataset.day].t=i.value.slice(0,50);saveTrip()});
  if($("tadd"))$("tadd").onclick=()=>{if(trip.days.length<30){trip.days.push({t:"",ids:[]});redo()}};
  if($("tclear"))$("tclear").onclick=()=>{if(confirm(T("Clear the whole trip? This can't be undone.")))(trip=freshTrip(),redo())};
  if($("tshare"))$("tshare").onclick=shareTrip;
  q(".tdayx").forEach(b=>b.onclick=()=>{const i=+b.dataset.day;trip.ideas.push(...trip.days[i].ids);trip.days.splice(i,1);redo()});
  q(".tdel").forEach(b=>b.onclick=()=>{removeKey(b.dataset.k);redo()});
  const shift=(k,d)=>{for(const l of [trip.ideas,...trip.days.map(x=>x.ids)]){const i=l.indexOf(k);if(i>-1){const j=i+d;if(j>=0&&j<l.length){l.splice(i,1);l.splice(j,0,k)}return}}};
  q(".tup").forEach(b=>b.onclick=()=>{shift(b.dataset.k,-1);redo()});
  q(".tdown").forEach(b=>b.onclick=()=>{shift(b.dataset.k,1);redo()});
  q(".tmove").forEach(s=>s.onchange=()=>{if(!s.value)return;const k=s.dataset.k;removeKey(k);day(s.value).push(k);redo()});
  q(".tlunch-add").forEach(b=>b.onclick=()=>{const k=b.dataset.k;removeKey(k);trip.days[+b.dataset.day].ids.push(k);redo()});
  // Drag and drop on desktop: drop a stop onto another stop to land before
  // it, or onto a day's empty space to land at the end. Phones use the arrows
  // and the Move to… menu instead.
  let drag=null;
  q(".tstop[draggable]").forEach(li=>{
    li.ondragstart=e=>{drag=li.dataset.k;li.classList.add("dragging");e.dataTransfer.effectAllowed="move";e.dataTransfer.setData("text/plain",drag)};
    li.ondragend=()=>{li.classList.remove("dragging");q(".over").forEach(x=>x.classList.remove("over"))};
  });
  q(".tlist-drop").forEach(z=>{
    z.ondragover=e=>{if(!drag)return;e.preventDefault();q(".over").forEach(x=>x.classList.remove("over"));(e.target.closest(".tstop")||z).classList.add("over")};
    z.ondrop=e=>{if(!drag)return;e.preventDefault();const before=e.target.closest(".tstop"),k=drag;drag=null;
      if(before&&before.dataset.k===k)return renderTrip();
      removeKey(k);const l=day(z.dataset.day),i=before?l.indexOf(before.dataset.k):-1;
      if(i>-1)l.splice(i,0,k);else l.push(k);redo()};
  });
}

// ---- sharing ----
// The plan rides in the link as base64 JSON. Day titles may be Arabic, so it
// is UTF-8 encoded first; the characters + and / are swapped for URL-safe ones.
const b64e=s=>btoa(unescape(encodeURIComponent(s))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
const b64d=s=>decodeURIComponent(escape(atob(s.replace(/-/g,"+").replace(/_/g,"/"))));
async function shareTrip(){
  const url=location.origin+location.pathname+"#trip="+b64e(JSON.stringify({name:trip.name,days:trip.days,ideas:trip.ideas}));
  const title=trip.name||T("My Japan trip");
  try{if(navigator.share){await navigator.share({title,text:T("My trip plan on Tabi Neko 🐾"),url});return}}catch(e){if(e&&e.name==="AbortError")return}
  try{await navigator.clipboard.writeText(url);toast(T("Link copied. Paste it to a friend ✓"))}
  catch(e){prompt(T("Copy this link:"),url)}
}
function openShared(){
  const m=location.hash.match(/^#trip=([A-Za-z0-9_-]+)$/);if(!m)return false;
  try{shared=cleanTrip(JSON.parse(b64d(m[1])))}catch(e){shared=null}
  history.replaceState(null,"","#trip");show("trip");renderTrip();
  if(!shared)toast(T("That trip link looks broken, sorry."));
  return true;
}
addEventListener("hashchange",openShared);

// renderList ran in app.js before this file loaded, so run it again to give
// every card its button, then pick up a shared link if there is one.
renderList();renderTrip();tripBadge();openShared();
