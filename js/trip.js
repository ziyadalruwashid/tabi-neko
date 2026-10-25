// My Trip: a plan built from places in the notebook. Loaded after js/app.js
// and js/apollo.js, and uses their helpers ($, esc, T, D, AREA, KM, isAR,
// store, goPlace, show, APOLLO_API) and the map's state (city, zoomTo, MAPP).
//
// A trip is a list of stays: a city, where you're sleeping there, and the
// days you spend in it. Places you add from the map wait in "ideas" until
// they're sorted into a day.
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
const TRIP_CITIES=Object.keys(CITIES).filter(k=>P.some(p=>p.city===k));
const freshTrip=()=>({name:"",ideas:[],stays:[]});
// Roughly Japan, so a typo or a pasted link to somewhere else is caught.
const inJapan=(lat,lng)=>lat>24&&lat<46&&lng>122&&lng<154;

// A saved or shared trip is untrusted input: keep only places that still
// exist, drop duplicates, and cap the sizes so a bad link can't do much.
function cleanHome(h){
  if(!h)return null;const lat=+h.lat,lng=+h.lng;
  if(!isFinite(lat)||!isFinite(lng)||!inJapan(lat,lng))return null;
  return {n:String(h.n||"").slice(0,60),lat:+lat.toFixed(5),lng:+lng.toFixed(5)};
}
function cleanTrip(t){
  const seen=new Set(),keep=a=>(Array.isArray(a)?a:[]).filter(k=>typeof k==="string"&&BYKEY.has(k)&&!seen.has(k)&&seen.add(k)).slice(0,60);
  const out={name:String(t&&t.name||"").slice(0,60),ideas:[],stays:[]};
  let stays=Array.isArray(t&&t.stays)?t.stays:null;
  // Trips saved before stays existed were a plain list of days. They become
  // one stay, in the city most of their places are in.
  if(!stays&&Array.isArray(t&&t.days)){
    const cnt={};t.days.forEach(d=>(d&&Array.isArray(d.ids)?d.ids:[]).forEach(k=>{const p=BYKEY.get(k);if(p)cnt[p.city]=(cnt[p.city]||0)+1}));
    const c=Object.keys(cnt).sort((a,b)=>cnt[b]-cnt[a])[0];
    stays=c?[{city:c,days:t.days}]:[];
  }
  let nd=0;
  (stays||[]).slice(0,10).forEach(s=>{
    if(!s||!TRIP_CITIES.includes(s.city))return;
    const o={city:s.city,home:cleanHome(s.home),days:[]};
    (Array.isArray(s.days)?s.days:[]).forEach(d=>{if(nd<30){nd++;o.days.push({t:String(d&&d.t||"").slice(0,50),ids:keep(d&&d.ids)})}});
    if(!o.days.length){if(nd>=30)return;nd++;o.days.push({t:"",ids:[]})}
    out.stays.push(o);
  });
  out.ideas=keep(t&&t.ideas);
  return out;
}
let trip=freshTrip();
try{const s=store.get(TRIP_KEY);if(s)trip=cleanTrip(JSON.parse(s))}catch(e){}
let shared=null; // a trip opened from someone's link, shown read-only until saved
const saveTrip=()=>{store.set(TRIP_KEY,JSON.stringify(trip));tripBadge();homeBtn()};
const allIds=t=>[...t.ideas,...t.stays.flatMap(s=>s.days.flatMap(d=>d.ids))];
const inTrip=k=>allIds(trip).includes(k);
const tripCount=t=>allIds(t).length;
function removeKey(k){trip.ideas=trip.ideas.filter(x=>x!==k);trip.stays.forEach(s=>s.days.forEach(d=>d.ids=d.ids.filter(x=>x!==k)))}
// Days are addressed as "stay.day", and the ideas tray as "ideas".
const dayList=r=>r==="ideas"?trip.ideas:trip.stays[+r.split(".")[0]].days[+r.split(".")[1]].ids;
// The places where you're staying in one city, for the map's 🏠 pins.
const tripHomes=c=>trip.stays.filter(s=>s.home&&s.city===c).map(s=>({...s.home,city:s.city}));

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

// "Near my stay" beside "Near me" on the map: sorts the list by distance from
// where you're sleeping, which works while you're still planning at home.
// It uses your stay in the city on screen, or else the first one you set.
function homeBtn(){
  const b=$("homeb");if(!b)return;
  b.hidden=!trip.stays.some(s=>s.home);
  b.setAttribute("aria-pressed",!!near&&nearKind==="home");
  b.innerHTML=`<span aria-hidden="true">🏠</span> ${T("Near my stay")}`;
  // Which stay is decided on the tap, since the city on screen can change.
  b.onclick=()=>{if(near&&nearKind==="home")return stopNear();
    const hs=trip.stays.filter(s=>s.home),s=hs.find(x=>x.city===city)||hs[0];if(s)startHome({...s.home,city:s.city})};
}

// ---- distances between stops ----
// Straight-line distance, with walking time only for short hops; anything
// longer is a train or taxi ride, and saying "~95 min walk" would mislead.
function legText(a,b){
  const km=KM(a,b),d=km<1?T("{n} m",{n:Math.max(10,Math.round(km*100)*10)}):T("{n} km",{n:km<10?km.toFixed(1):Math.round(km)});
  const t=km<=1.5?T("~{n} min walk",{n:Math.max(1,Math.round(km*1.25/4.8*60))}):km<=40?T("train or taxi 🚃"):T("long ride, plan the transport 🚄");
  const s=d+" · "+t;return isAR()?iso(s):s;
}

// A hand-drawn route doodle for one day: the stops plotted by their real
// positions, joined in order by a dashed pencil line. With a stay set, the
// line leaves from the 🏠 and comes back to it.
function routeDoodle(ps,home){
  if(!ps.length)return"";
  const all=home?[home,...ps]:ps,W=320,H=150,pad=22;
  const lat=all.map(p=>p.lat),lng=all.map(p=>p.lng),k=Math.cos(((Math.max(...lat)+Math.min(...lat))/2)*Math.PI/180);
  let x0=Math.min(...lng)*k,x1=Math.max(...lng)*k,y0=Math.min(...lat),y1=Math.max(...lat);
  const span=Math.max(x1-x0,(y1-y0)*(W/H),.004),cx=(x0+x1)/2,cy=(y0+y1)/2,sc=(W-2*pad)/span;
  const pt=p=>[W/2+(p.lng*k-cx)*sc,H/2-(p.lat-cy)*sc];
  const xy=all.map(pt);
  // Pins that land on top of each other get nudged apart so both numbers show.
  xy.forEach((a,i)=>{for(let j=0;j<i;j++){const b=xy[j];if(Math.hypot(a[0]-b[0],a[1]-b[1])<20){a[0]+=16;a[1]+=6}}});
  const route=home?[...xy,xy[0]]:xy;
  const path=route.map((a,i)=>(i?"L":"M")+a[0].toFixed(1)+" "+a[1].toFixed(1)).join(" ");
  const off=home?1:0,at=a=>`translate(${a[0].toFixed(1)},${a[1].toFixed(1)})`;
  return `<svg class="tdoodle" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(T("Route sketch for this day"))}">
    <path d="${path}" fill="none" stroke="var(--ink)" stroke-width="2" stroke-dasharray="4 6" stroke-linecap="round" opacity=".55"/>
    ${home?`<g transform="${at(xy[0])}"><rect x="-12" y="-12" width="24" height="24" rx="7" fill="var(--sheet)" stroke="var(--ink)" stroke-width="2"/><text y="5" text-anchor="middle" font-size="13">🏠</text></g>`:""}
    ${ps.map((p,i)=>`<g transform="${at(xy[i+off])}"><circle r="11" fill="var(--${p.cat})" stroke="var(--sheet)" stroke-width="2.5"/><text y="4" text-anchor="middle" font-family="var(--body)" font-weight="700" font-size="11" fill="#fff">${i+1}</text></g>`).join("")}
  </svg>`;
}

// The nearest halal food spot to a day's stops (or, on an empty day, to where
// you're staying) that isn't already planned.
function halalIdea(ps,home){
  const c=ps.length?{lat:ps.reduce((s,p)=>s+p.lat,0)/ps.length,lng:ps.reduce((s,p)=>s+p.lng,0)/ps.length}:home;
  if(!c)return null;
  let best=null,bd=3;
  P.forEach(p=>{if(!p.halal||p.cat!=="food"||inTrip(PKEY(p)))return;const d=KM(c,p);if(d<bd){bd=d;best=p}});
  return best&&{p:best,km:bd};
}

// ---- the page ----
const cityName=c=>D(CITIES[c],"n");
function moveMenu(k,here){
  let h=`<select class="tmove" data-k="${esc(k)}" aria-label="${esc(T("Move to"))}"><option value="">${T("Move to…")}</option>`,n=0;
  trip.stays.forEach((s,si)=>{h+=`<optgroup label="${esc(cityName(s.city))}">`+s.days.map((d,di)=>{n++;const r=si+"."+di;
    return r===here?"":`<option value="${r}">${esc(T("Day {n}",{n}))}${d.t?" · "+esc(d.t):""}</option>`}).join("")+`</optgroup>`});
  if(here!=="ideas")h+=`<option value="ideas">${T("Back to ideas")}</option>`;
  return h+`</select>`;
}
function stopRow(p,i,ref,ro){
  const C=CATS[p.cat],k=PKEY(p),idea=ref==="ideas";
  return `<li class="tstop" data-k="${esc(k)}" style="--c:var(--${p.cat})"${ro?"":` draggable="true"`}>
    <span class="tnum">${idea?"♡":i+1}</span>
    <img class="tthumb" src="${esc(p.photo||C.img)}" alt="" loading="lazy">
    <div class="tinfo"><button type="button" class="tname" data-id="${p.id}" dir="auto">${esc(p.n)}</button>
      <small>${esc(cityName(p.city))} · ${esc(AREA(p.area))}${p.halal?` · <b class="thalal">${p.hl==="friendly"?T("Muslim-friendly"):T("✓ halal")}</b>`:""}</small></div>
    ${ro?"":`<div class="tctl">${idea?"":`<button type="button" class="tup" data-k="${esc(k)}" aria-label="${esc(T("Move up"))}">↑</button><button type="button" class="tdown" data-k="${esc(k)}" aria-label="${esc(T("Move down"))}">↓</button>`}${moveMenu(k,ref)}<button type="button" class="tdel" data-k="${esc(k)}" aria-label="${esc(T("Remove"))}">×</button></div>`}
  </li>`;
}
function cityChooser(title,sub){
  return `<div class="tcitypick"><h2>${title}</h2>${sub?`<p>${sub}</p>`:""}<div class="tchips">${TRIP_CITIES.map(c=>
    `<button type="button" class="tchip" data-city="${c}"><b lang="ja">${CITIES[c].jp}</b>${esc(cityName(c))}</button>`).join("")}</div></div>`;
}

// While you're choosing where you're staying, the box keeps what you typed
// and what came back, so a re-render (or a language switch) doesn't lose it.
let homeUI=null; // {si, q, msg, res, busy}
function homeCard(s,si,ro){
  const h=s.home;
  if(h)return `<div class="thome set"><span class="ticon" aria-hidden="true">🏠</span>
    <div class="thome-b"><small>${T("Staying at")}</small>
      <input class="thome-n" dir="auto" data-s="${si}" value="${esc(h.n)}" maxlength="60"${ro?" readonly":""} aria-label="${esc(T("Name of your stay"))}">
      <span class="thome-l"><a href="https://www.google.com/maps/search/?api=1&query=${h.lat},${h.lng}" target="_blank" rel="noopener">${T("Open in Google Maps ↗")}</a>${ro?"":`<button type="button" class="thome-edit" data-s="${si}">${T("Change")}</button>`}</span></div>
    ${ro?"":`<button type="button" class="tdel thome-x" data-s="${si}" aria-label="${esc(T("Remove"))}">×</button>`}</div>`;
  if(ro)return "";
  if(!homeUI||homeUI.si!==si)return `<button type="button" class="thome-add" data-s="${si}"><span aria-hidden="true">🏠</span> ${T("Where are you staying?")} <small>${T("hotel, Airbnb, a friend's place")}</small></button>`;
  const u=homeUI;
  return `<div class="thome-ed"><h3><span aria-hidden="true">🏠</span> ${T("Where are you staying?")}</h3>
    <form class="thome-f" data-s="${si}"><input class="thome-q" value="${esc(u.q||"")}" placeholder="${esc(T("Name, address or a Google Maps link"))}" aria-label="${esc(T("Where are you staying?"))}" autocomplete="off" dir="auto">
      <button type="submit" class="store"${u.busy?" disabled":""}>${u.busy?T("Looking…"):T("Find")}</button></form>
    ${u.msg?`<p class="thome-msg" role="status">${esc(u.msg)}</p>`:""}
    ${u.res&&u.res.length?`<ul class="thome-res">${u.res.map((r,i)=>`<li><button type="button" class="thome-r" data-i="${i}"><b>${esc(r.n)}</b><small>${esc(r.addr)}</small></button></li>`).join("")}</ul><p class="thome-osm">${T("Search by OpenStreetMap")}</p>`:""}
    <div class="thome-alt"><button type="button" class="thome-pin" data-s="${si}">📍 ${T("Drop a pin on the map instead")}</button><button type="button" class="tclear thome-skip">${T("Skip for now")}</button></div>
    <p class="thome-tip">${T("Airbnb? In the Airbnb app, tap Get directions, share the Google Maps link, and paste it here.")}</p></div>`;
}

let addingCity=false,shareAsk=false;
function renderTrip(){
  const box=$("tripbook");if(!box)return;
  const t=shared||trip,ro=!!shared,n=tripCount(t);
  let h="";
  if(shared)h+=`<div class="tshared"><p>${esc(T("Someone shared a trip with you:"))} <b>${esc(shared.name||T("My Japan trip"))}</b></p>
    <button type="button" class="store tsave">${T("Save it as my trip")}</button><button type="button" class="tcancel">${T("Close")}</button>
    ${tripCount(trip)||trip.stays.length?`<small>${T("Saving replaces the trip you have now.")}</small>`:""}</div>`;
  h+=`<div class="ttop">
    <input class="tname-in" id="tripname" value="${esc(t.name)}" placeholder="${esc(T(ro?"My Japan trip":"Name your trip…"))}" maxlength="60"${ro?" readonly":""} aria-label="${esc(T("Trip name"))}">
    ${ro||!(n||t.stays.length)?"":`<div class="tbtns"><button type="button" class="store" id="tshare">${T("Share")} ↗</button><button type="button" class="tclear" id="tclear">${T("Start over")}</button></div>`}
  </div>`;
  if(shareAsk&&!ro)h+=`<div class="tshareask"><p>${T("Include where you're staying? Anyone with the link will see it.")}</p>
    <button type="button" class="store" data-home="0">${T("Share without it")}</button><button type="button" class="store" data-home="1">${T("Include it")}</button></div>`;
  if(!t.stays.length&&!ro){
    h+=`<div class="tempty"><img src="assets/cat.png" alt=""><div>${cityChooser(T("Where are you headed first?"),T("Pick a city, tell Apollo where you're staying, then fill your days."))}</div></div>`;
  }
  if(t.ideas.length||(!ro&&n)){
    h+=`<section class="tideas tlist-drop" data-day="ideas"><h2>${T("Ideas")}<small>${t.ideas.length?T("sort these into your days ↓"):T("places you add from the map land here first")}</small></h2>
      <ul class="tlist">${t.ideas.map(k=>stopRow(BYKEY.get(k),0,"ideas",ro)).join("")}</ul></section>`;
  }
  let num=0;
  t.stays.forEach((s,si)=>{
    const first=num+1,last=num+s.days.length;
    h+=`<section class="tstay"><header class="tstay-h"><span class="tstamp" lang="ja" aria-hidden="true">${CITIES[s.city].jp}</span>
      <div><h2>${esc(cityName(s.city))}</h2><small>${esc(first===last?T("Day {n}",{n:first}):T("Days {a}–{b}",{a:first,b:last}))}</small></div>
      ${ro?"":`<button type="button" class="tdayx tstayx" data-s="${si}" aria-label="${esc(T("Remove {c} from the trip",{c:cityName(s.city)}))}">×</button>`}</header>
      ${homeCard(s,si,ro)}
      <div class="tdays">`+s.days.map((d,di)=>{
        num++;const ref=si+"."+di,ps=d.ids.map(k=>BYKEY.get(k)),home=s.home,idea=ro?null:halalIdea(ps,home);
        let km=0;for(let i=1;i<ps.length;i++)km+=KM(ps[i-1],ps[i]);
        if(home&&ps.length)km+=KM(home,ps[0])+KM(ps[ps.length-1],home);
        const halal=ps.filter(p=>p.halal).length;
        const stats=ps.length?[T(ps.length===1?"1 stop":"{n} stops",{n:ps.length}),km?T("~{n} km",{n:km.toFixed(1)}):"",halal?T("{n} halal",{n:halal}):""].filter(Boolean).join(" · "):"";
        let rows="";
        if(home&&ps.length)rows+=`<li class="tleg thomeleg">🏠 ${esc(home.n||T("your stay"))} ↓ ${esc(legText(home,ps[0]))}</li>`;
        ps.forEach((p,i)=>{if(i)rows+=`<li class="tleg">↓ ${esc(legText(ps[i-1],p))}</li>`;rows+=stopRow(p,i,ref,ro)});
        if(home&&ps.length)rows+=`<li class="tleg thomeleg">↓ ${esc(legText(ps[ps.length-1],home))} · ${T("back to 🏠")}</li>`;
        return `<article class="tday tlist-drop" data-day="${ref}" style="--r:${[-.8,.6,-.4,.9][num%4]}deg"><span class="tape${num%2?"":" pink"}"></span>
          <header><h2>${T("Day {n}",{n:num})}</h2>
            <input class="tday-t" data-day="${ref}" value="${esc(d.t)}" placeholder="${ro?"":esc(T("e.g. Asakusa & Ueno"))}" maxlength="50"${ro?" readonly":""} aria-label="${esc(T("Day title"))}">
            ${ro||s.days.length<2?"":`<button type="button" class="tdayx" data-day="${ref}" aria-label="${esc(T("Remove this day"))}">×</button>`}</header>
          ${stats?`<p class="tstats">${esc(isAR()?iso(stats):stats)}</p>`:""}
          ${routeDoodle(ps,home)}
          <ul class="tlist">${rows||`<li class="tnone">${T(ro?"Nothing planned for this day.":"Nothing here yet. Add places, or move ideas into this day.")}</li>`}</ul>
          ${ro?"":`<button type="button" class="tpickb" data-day="${ref}">＋ ${T("Add places")}</button>`}
          ${idea?`<p class="tlunch">🍜 ${T(ps.length?"Halal food near this day:":"Halal food near your stay:")} <button type="button" class="tname" data-id="${idea.p.id}">${esc(idea.p.n)}</button> <span>${esc(T("{n} km",{n:idea.km.toFixed(1)}))}</span> <button type="button" class="tlunch-add" data-k="${esc(PKEY(idea.p))}" data-day="${ref}">＋ ${T("add")}</button></p>`:""}
        </article>`}).join("")+
      (ro||num>=30?"":`<button type="button" class="taddday" data-s="${si}">＋ ${T("Add a day in {c}",{c:cityName(s.city)})}</button>`)+`</div></section>`;
  });
  if(!ro&&t.stays.length&&t.stays.length<10)h+=addingCity?`<div class="tnext">${cityChooser(T("Where to next?"),"")}<button type="button" class="tclear tnext-x">${T("Cancel")}</button></div>`
    :`<button type="button" class="tnextb">＋ ${T("Add another city")}</button>`;
  box.innerHTML=h;wireTrip();
}

function wireTrip(){
  const box=$("tripbook"),q=s=>box.querySelectorAll(s);
  const redo=()=>{saveTrip();renderTrip();renderList()};
  q(".tname").forEach(b=>b.onclick=()=>{show("map",true);history.replaceState(null,"","#map");goPlace(b.dataset.id)});
  if(shared){
    box.querySelector(".tsave").onclick=()=>{trip=cleanTrip(shared);shared=null;saveTrip();renderTrip();renderList();renderMap();toast(T("Saved as your trip ✓"))};
    box.querySelector(".tcancel").onclick=()=>{shared=null;renderTrip()};
    return;
  }
  const nm=$("tripname");if(nm)nm.oninput=()=>{trip.name=nm.value.slice(0,60);saveTrip()};
  q(".tday-t").forEach(i=>i.oninput=()=>{const[a,b]=i.dataset.day.split(".");trip.stays[+a].days[+b].t=i.value.slice(0,50);saveTrip()});
  q(".thome-n").forEach(i=>i.oninput=()=>{trip.stays[+i.dataset.s].home.n=i.value.slice(0,60);saveTrip()});
  q(".tchip").forEach(b=>b.onclick=()=>{
    trip.stays.push({city:b.dataset.city,home:null,days:[{t:"",ids:[]}]});
    addingCity=false;homeUI={si:trip.stays.length-1,q:""};redo();
    const f=box.querySelector(".thome-q");if(f)f.focus({preventScroll:true});
    box.querySelector(".thome-ed").scrollIntoView({block:"center",behavior:"smooth"})});
  if(box.querySelector(".tnextb"))box.querySelector(".tnextb").onclick=()=>{addingCity=true;renderTrip()};
  if(box.querySelector(".tnext-x"))box.querySelector(".tnext-x").onclick=()=>{addingCity=false;renderTrip()};
  q(".taddday").forEach(b=>b.onclick=()=>{trip.stays[+b.dataset.s].days.push({t:"",ids:[]});redo()});
  q(".tstayx").forEach(b=>b.onclick=()=>{const s=trip.stays[+b.dataset.s];
    if(s.days.some(d=>d.ids.length)||s.home){if(!confirm(T("Remove {c} from the trip? Its places go back to your ideas.",{c:cityName(s.city)})))return}
    s.days.forEach(d=>trip.ideas.push(...d.ids));trip.stays.splice(+b.dataset.s,1);homeUI=null;redo();renderMap()});
  if($("tclear"))$("tclear").onclick=()=>{if(confirm(T("Clear the whole trip? This can't be undone."))){trip=freshTrip();homeUI=null;shareAsk=false;redo();renderMap()}};
  if($("tshare"))$("tshare").onclick=()=>{if(trip.stays.some(s=>s.home)){shareAsk=!shareAsk;renderTrip()}else shareTrip(false)};
  q(".tshareask .store").forEach(b=>b.onclick=()=>{shareAsk=false;renderTrip();shareTrip(b.dataset.home==="1")});
  q(".tdayx[data-day]").forEach(b=>b.onclick=()=>{const[a,i]=b.dataset.day.split(".").map(Number),s=trip.stays[a];trip.ideas.push(...s.days[i].ids);s.days.splice(i,1);redo()});
  q(".tdel[data-k]").forEach(b=>b.onclick=()=>{removeKey(b.dataset.k);redo()});
  const shift=(k,d)=>{for(const l of trip.stays.flatMap(s=>s.days.map(x=>x.ids))){const i=l.indexOf(k);if(i>-1){const j=i+d;if(j>=0&&j<l.length){l.splice(i,1);l.splice(j,0,k)}return}}};
  q(".tup").forEach(b=>b.onclick=()=>{shift(b.dataset.k,-1);redo()});
  q(".tdown").forEach(b=>b.onclick=()=>{shift(b.dataset.k,1);redo()});
  q(".tmove").forEach(s=>s.onchange=()=>{if(!s.value)return;const k=s.dataset.k;removeKey(k);dayList(s.value).push(k);redo()});
  q(".tlunch-add").forEach(b=>b.onclick=()=>{const k=b.dataset.k;removeKey(k);dayList(b.dataset.day).push(k);redo()});
  q(".tpickb").forEach(b=>b.onclick=()=>openPicker(b.dataset.day));
  // where you're staying
  q(".thome-add").forEach(b=>b.onclick=()=>{homeUI={si:+b.dataset.s,q:""};renderTrip();const f=box.querySelector(".thome-q");if(f)f.focus()});
  q(".thome-edit").forEach(b=>b.onclick=()=>{const si=+b.dataset.s;trip.stays[si].home=null;homeUI={si,q:""};saveTrip();renderTrip();renderMap();const f=box.querySelector(".thome-q");if(f)f.focus()});
  q(".thome-x").forEach(b=>b.onclick=()=>{trip.stays[+b.dataset.s].home=null;redo();renderMap()});
  q(".thome-skip").forEach(b=>b.onclick=()=>{homeUI=null;renderTrip()});
  q(".thome-pin").forEach(b=>b.onclick=()=>startPick(+b.dataset.s));
  q(".thome-q").forEach(i=>i.oninput=()=>{if(homeUI)homeUI.q=i.value});
  q(".thome-f").forEach(f=>f.onsubmit=e=>{e.preventDefault();findHome(+f.dataset.s,f.querySelector(".thome-q").value)});
  q(".thome-r").forEach(b=>b.onclick=()=>{const r=homeUI.res[+b.dataset.i];setHome(homeUI.si,r)});
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
      removeKey(k);const l=dayList(z.dataset.day),i=before?l.indexOf(before.dataset.k):-1;
      if(i>-1)l.splice(i,0,k);else l.push(k);redo()};
  });
}

// ---- finding where you're staying ----
// One box takes a name, an address, a Google Maps link or bare coordinates
// (what Google Maps copies when you long-press a spot).
function linkCoords(s){
  try{s=decodeURIComponent(s)}catch(e){}
  const m=s.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/)||s.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)
    ||s.match(/[?&](?:q|query|ll|sll|center|destination|daddr)=(-?\d+\.\d+)\s*,\s*\+?(-?\d+\.\d+)/i)
    ||s.match(/\/(?:place|search|dir)\/(-?\d+\.\d+),\s*\+?(-?\d+\.\d+)/)
    ||s.match(/^\s*(-?\d{2}\.\d+)\s*,\s*(-?\d{3}\.\d+)\s*$/);
  return m?{lat:+m[1],lng:+m[2]}:null;
}
// The place's name, or the search text, that a Google Maps link carries.
function linkName(s){
  try{const u=new URL(s),m=u.pathname.match(/\/place\/([^/@]+)/);
    const v=m?m[1]:u.searchParams.get("q")||u.searchParams.get("query");
    return v&&!linkCoords(v)?decodeURIComponent(v.replace(/\+/g," ")).trim():""}catch(e){return""}
}
const homeMsg=m=>{homeUI.busy=false;homeUI.msg=m;renderTrip()};
async function findHome(si,v){
  v=(v||"").trim();if(!v||(homeUI&&homeUI.busy))return;
  homeUI={si,q:v,busy:true,res:[]};renderTrip();
  const c=linkCoords(v);
  if(c&&!/^https?:/i.test(v))return setHome(si,{n:"",...c});
  if(/^https?:/i.test(v)){
    if(/airbnb\./i.test(v))return homeMsg(T("Airbnb links don't show the exact spot. In the Airbnb app, tap Get directions, then share the Google Maps link and paste it here."));
    let url=v;
    // Short share links (maps.app.goo.gl) only say where they lead when
    // opened, and a browser can't peek at that, so the Ask Apollo Worker does.
    if(/^https?:\/\/(maps\.app\.goo\.gl|goo\.gl|g\.co)\//i.test(v)){
      try{const r=await fetch(APOLLO_API,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({resolve:v})});
        if(!r.ok)throw 0;url=(await r.json()).url||""}
      catch(e){return homeMsg(T("Couldn't open that short link. Open it in your browser, copy the long link from the address bar, and paste that here."))}
    }
    const at=linkCoords(url),n=linkName(url);
    if(at)return setHome(si,{n,...at});
    if(n)return searchHome(si,n);
    return homeMsg(T("That link doesn't say where the place is. Try searching the name instead."));
  }
  searchHome(si,v);
}
// OpenStreetMap's free search, nudged towards the stay's city. It's only
// asked when you press Find, never on every keystroke, as its rules ask.
async function searchHome(si,q){
  const b=BOX[trip.stays[si].city],pad=.15;
  const url=`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&countrycodes=jp&accept-language=en&viewbox=${b.w-pad},${b.n+pad},${b.e+pad},${b.s-pad}&q=${encodeURIComponent(q)}`;
  try{
    const r=await fetch(url);if(!r.ok)throw 0;
    const res=(await r.json()).filter(x=>inJapan(+x.lat,+x.lon)).map(x=>{const parts=String(x.display_name||"").split(", ");
      return {n:x.name||parts[0],addr:parts.slice(1,5).join(", "),lat:+x.lat,lng:+x.lon}});
    if(!homeUI||homeUI.si!==si)return;
    homeUI.busy=false;homeUI.res=res;
    homeUI.msg=res.length?T("Which one is it?"):T("Couldn't find that. Try the address, or paste a Google Maps link.");
    renderTrip();
  }catch(e){if(homeUI&&homeUI.si===si)homeMsg(T("The search isn't answering right now. Paste a Google Maps link, or drop a pin on the map."))}
}
function setHome(si,h){
  const home=cleanHome({...h,n:h.n||T("My stay")});
  if(!home){if(homeUI)homeMsg(T("That spot isn't in Japan. Check the link and try again."));return}
  trip.stays[si].home=home;homeUI=null;saveTrip();renderTrip();renderMap();
  toast(T("Saved where you're staying ✓"));
}

// Dropping a pin: the map page opens on the stay's city with a note at the
// bottom. The first tap zooms in around the spot, the second places the pin.
let picking=null;
function startPick(si){
  picking=si;homeUI=null;
  const c=trip.stays[si].city;
  if(c!==city){city=c;store.set("tabineko-city",city)}
  area=null;active=new Set(Object.keys(CATS));halalOnly=false;selected=null;zoomTo=null;stopNear();
  show("map",true);history.replaceState(null,"","#map");renderAll();
  let bar=$("tpickbar");
  if(!bar){bar=document.createElement("div");bar.id="tpickbar";bar.className="ttoast show tpickbar";bar.setAttribute("role","status");document.body.appendChild(bar)}
  pickNote(T("Tap the map near where you're staying"));
  document.documentElement.classList.add("picking");
  document.querySelector(".mapwrap").scrollIntoView({block:"start",behavior:"smooth"});
}
function pickNote(msg){const bar=$("tpickbar");bar.innerHTML=`<span>📍 ${esc(msg)}</span><button type="button">${esc(T("Cancel"))}</button>`;bar.querySelector("button").onclick=()=>endPick(true)}
function endPick(back){
  picking=null;const bar=$("tpickbar");if(bar)bar.remove();
  document.documentElement.classList.remove("picking");zoomTo=null;renderMap();
  if(back){show("trip");history.replaceState(null,"","#trip");renderTrip()}
}
$("mapsvg").addEventListener("click",e=>{
  if(picking===null||!MAPP)return;
  e.stopPropagation();e.preventDefault();
  const svg=$("mapsvg"),pt=svg.createSVGPoint();pt.x=e.clientX;pt.y=e.clientY;
  const p=pt.matrixTransform(svg.getScreenCTM().inverse()),{B,k,s,ox,oy}=MAPP;
  const at={lat:B.n-(p.y-oy)/s,lng:B.w+(p.x-ox)/(k*s)};
  if(B.n-B.s>.02){zoomTo=fitBox([at],600,480,.012);renderMap();pickNote(T("Now tap the exact spot"));return}
  const si=picking;endPick(false);
  setHome(si,{n:"",...at});
  show("trip");history.replaceState(null,"","#trip");
  const f=$("tripbook").querySelectorAll(".thome-n")[trip.stays.slice(0,si).filter(s=>s.home).length];
  if(f){f.scrollIntoView({block:"center"});f.select()}
},true);
addEventListener("hashchange",()=>{if(picking!==null&&location.hash!=="#map")endPick(false)});

// ---- adding places to a day ----
// A sheet that lists the stay's city, nearest first: to the day's last stop
// once it has one, else to where you're staying. Tapping adds or removes.
// The order holds while it's open, so rows don't jump under your thumb.
let pk=null; // {ref, cat, halal, q, max, from, city}
function openPicker(ref){
  const[a,b]=ref.split(".").map(Number),s=trip.stays[a],ids=s.days[b].ids;
  const last=ids.length?BYKEY.get(ids[ids.length-1]):null;
  pk={ref,cat:"",halal:false,q:"",max:20,from:last?{p:last,n:last.n}:s.home?{p:s.home,n:T("your stay")}:null,city:s.city};
  let el=$("tpick");
  if(!el){el=document.createElement("div");el.id="tpick";el.className="tpick";document.body.appendChild(el);
    el.addEventListener("click",e=>{if(e.target===el)closePicker()});
    el.addEventListener("keydown",e=>{if(e.key==="Escape")closePicker()})}
  el.hidden=false;document.documentElement.classList.add("tpick-open");
  renderPicker();el.querySelector(".tpick-x").focus();
}
function closePicker(){const el=$("tpick");if(el)el.hidden=true;document.documentElement.classList.remove("tpick-open");pk=null;renderTrip()}
function renderPicker(keepScroll){
  const el=$("tpick"),[a,b]=pk.ref.split(".").map(Number);
  const num=trip.stays.slice(0,a).reduce((n,s)=>n+s.days.length,0)+b+1;
  const here=trip.stays[a].days[b].ids;
  // The search uses the same index and scoring as the main search box, so
  // names, Japanese, areas, dishes and Arabic all match; every word must hit.
  const words=LOW(pk.q).trim().split(/\s+/).filter(Boolean),hit=new Set(IDX.filter(e=>words.every(w=>score(e,w))).map(e=>e.p));
  let ps=P.filter(p=>p.city===pk.city&&(!pk.cat||p.cat===pk.cat)&&(!pk.halal||p.halal)&&(!words.length||hit.has(p)));
  ps=pk.from?ps.map(p=>[p,KM(pk.from.p,p)]).sort((x,y)=>x[1]-y[1]):ps.map(p=>[p,null]).sort((x,y)=>(y[0].tier==="must")-(x[0].tier==="must"));
  const total=ps.length,cats=Object.keys(CATS).filter(c=>P.some(p=>p.city===pk.city&&p.cat===c));
  const sc=keepScroll&&el.querySelector(".tpick-list")?el.querySelector(".tpick-list").scrollTop:0;
  el.innerHTML=`<div class="tpick-sheet" role="dialog" aria-modal="true" aria-labelledby="tpick-h">
    <header><div><h2 id="tpick-h">${T("Add places to Day {n}",{n:num})}</h2>
      <small>${esc(cityName(pk.city))} · ${esc(pk.from?T("nearest to {p} first",{p:pk.from.n}):T("Apollo's must-sees first"))}</small></div>
      <button type="button" class="store tpick-x">${T("Done")}</button></header>
    <div class="tpick-s"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M15.8 15.8 21 21" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      <input type="search" class="tpick-q" value="${esc(pk.q)}" placeholder="${esc(T("Search {c}: a name, an area, a dish…",{c:cityName(pk.city)}))}" aria-label="${esc(T("Search places"))}" autocomplete="off" spellcheck="false" dir="auto"></div>
    <div class="tpick-f"><button type="button" class="tchip2${pk.cat?"":" on"}" data-c="">${T("All")}</button>${cats.map(c=>`<button type="button" class="tchip2${pk.cat===c?" on":""}" data-c="${c}" style="--c:var(--${c})"><i></i>${esc(D(CATS[c],"n"))}</button>`).join("")}
      <button type="button" class="tchip2 thal${pk.halal?" on":""}" aria-pressed="${pk.halal}">✓ ${T("halal only")}</button></div>
    <ul class="tpick-list">${ps.slice(0,pk.max).map(([p,km])=>{const k=PKEY(p),on=here.includes(k),other=!on&&inTrip(k);
      return `<li><button type="button" class="tprow${on?" on":""}" data-k="${esc(k)}" aria-pressed="${on}" style="--c:var(--${p.cat})">
        <img src="${esc(p.photo||CATS[p.cat].img)}" alt="" loading="lazy">
        <span class="tpinfo"><b dir="auto">${esc(p.n)}</b><small>${esc(D(CATS[p.cat],"n"))} · ${esc(AREA(p.area))}${p.halal?` · <em>${p.hl==="friendly"?T("Muslim-friendly"):T("✓ halal")}</em>`:""}${other?` · ${T("already in your trip")}`:""}</small></span>
        ${km!==null?`<span class="tpdist">${esc(distText(km))}</span>`:""}
        <span class="tpadd" aria-hidden="true">${on?"✓":"＋"}</span></button></li>`}).join("")}
      ${total>pk.max?`<li><button type="button" class="more tpick-more">${T("Show more")}<small>${esc(T("{n} more places",{n:total-pk.max}))}</small></button></li>`:""}
      ${total?"":`<li class="tnone">${T(words.length?"Nothing matches that search.":"Nothing here with those filters.")}</li>`}</ul></div>`;
  if(sc)el.querySelector(".tpick-list").scrollTop=sc;
  el.querySelector(".tpick-x").onclick=closePicker;
  el.querySelectorAll(".tchip2[data-c]").forEach(x=>x.onclick=()=>{pk.cat=x.dataset.c;pk.max=20;renderPicker()});
  el.querySelector(".thal").onclick=()=>{pk.halal=!pk.halal;pk.max=20;renderPicker()};
  // The sheet is redrawn as you type, so the box takes its focus and caret back.
  const qi=el.querySelector(".tpick-q");
  qi.oninput=()=>{pk.q=qi.value.slice(0,60);pk.max=20;const at=qi.selectionStart;renderPicker();
    const n=$("tpick").querySelector(".tpick-q");n.focus();n.setSelectionRange(at,at)};
  if(el.querySelector(".tpick-more"))el.querySelector(".tpick-more").onclick=()=>{pk.max+=20;renderPicker(true)};
  // removeKey swaps in new arrays, so the day's list is looked up after it.
  el.querySelectorAll(".tprow").forEach(x=>x.onclick=()=>{const k=x.dataset.k,had=dayList(pk.ref).includes(k);
    removeKey(k);if(!had)dayList(pk.ref).push(k);
    saveTrip();renderList();renderPicker(true);
    const again=$("tpick").querySelector(`.tprow[data-k="${CSS.escape(k)}"]`);if(again)again.focus()});
}

// ---- sharing ----
// The plan rides in the link as base64 JSON. Day titles may be Arabic, so it
// is UTF-8 encoded first; the characters + and / are swapped for URL-safe ones.
// Where you're staying is left out unless you say to include it.
const b64e=s=>btoa(unescape(encodeURIComponent(s))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
const b64d=s=>decodeURIComponent(escape(atob(s.replace(/-/g,"+").replace(/_/g,"/"))));
async function shareTrip(withHome){
  const data={name:trip.name,ideas:trip.ideas,stays:trip.stays.map(s=>({city:s.city,days:s.days,...(withHome&&s.home?{home:s.home}:{})}))};
  const url=location.origin+location.pathname+"#trip="+b64e(JSON.stringify(data));
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

// renderList and renderMap ran in app.js before this file loaded, so run them
// again to give every card its button and draw any 🏠, then pick up a shared
// link if there is one.
renderList();renderMap();renderTrip();tripBadge();homeBtn();openShared();
