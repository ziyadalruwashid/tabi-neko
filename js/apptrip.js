// My trips in the app, in the order a travel planner works:
// - My trips: your trips as cards (upcoming and past), and ＋ for a new one.
//   With none yet, Apollo invites you to make your first.
// - A new trip, in one sheet: a name and a cover photo, the dates on a
//   calendar, the cities in order with their nights, and whether Apollo
//   fills the days with places from the notebook.
// - A trip: its cover, then Schedule, Map, Bookings and Ideas. The schedule
//   is every day in one scroll: the hotel (check-in, then each night), your
//   places at their times (worked out from how long each takes, or a time you
//   set), how to get between them, Apollo's halal lunch, your bookings, and
//   his suggestions for an empty day.
// - Add new: a place from the notebook (or a halal restaurant, a temple,
//   coffee…), or a flight, hotel, train, taxi, ticket or note, each with its
//   own short form.
//
// The trip you have open is `trip` (js/trip.js): it syncs to your account,
// shares, and drives the home page. Your other trips wait on this phone and
// swap in when you open one. Buttons carry the classes and data the
// website's My trip uses, so js/trip.js's wireTrip() still does the shared
// work (move, remove, reorder, picker, PDF, share, sync).
// A trip someone shared with you keeps the website's view.
(function(){
if(!IS_APP)return;

const SVG=(d,s=20)=>`<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const I={share:'<path d="M12 15V4m0 0-4 4m4-4 4 4M6 13v6h12v-6"/>',dots:'<circle cx="12" cy="5" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="12" cy="19" r="1.4"/>',
  map:'<path d="m9 4-5 2v14l5-2 6 2 5-2V4l-5 2-6-2zM9 4v14M15 6v14"/>',back:'<path d="m15 5-7 7 7 7"/>',plus:'<path d="M12 5v14M5 12h14"/>',x:'<path d="M6 6l12 12M18 6 6 18"/>',
  walk:'<circle cx="13" cy="4" r="2"/><path d="m9 20 3-6 3 3v4M7 12l3-4 4 1 2 4"/>',train:'<rect x="6" y="3" width="12" height="14" rx="3"/><path d="M6 11h12M9 17l-2 4M15 17l2 4"/>',
  list:'<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',cal:'<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',clock:'<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>',img:'<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 8"/>',search:'<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',trash:'<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>'};
let view=null,tab="plan",seg="up",compact=false,sheet=null,nt=null;
const N=(n,one,many)=>T(n===1?one:many,{n});
const arrow=()=>isAR()?"←":"→";
const num=v=>isAR()?iso(String(v)):String(v);

// ---- dates and times ----
const WD_AR=["الأحد","الإثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"],WD_EN=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MO_AR=["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"],MO_EN=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const dayAt=n=>{if(!trip.start)return null;const d=new Date(trip.start+"T00:00:00Z");d.setUTCDate(d.getUTCDate()+n);return d};
const iso8=d=>d.toISOString().slice(0,10);
const wd=d=>(isAR()?WD_AR:WD_EN)[d.getUTCDay()],md=d=>`${d.getUTCDate()} ${(isAR()?MO_AR:MO_EN)[d.getUTCMonth()]}`;
const todayJ=()=>{const d=new Date(Date.now()+9*3600e3);return new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate()))};
const toMin=s=>{const[h,m]=(s||"09:00").split(":").map(Number);return h*60+m};
function clock(m){m=Math.round(m/5)*5;let h=Math.floor(m/60)%24,mm=m%60;
  if(isAR())return `${h%12||12}:${String(mm).padStart(2,"0")} ${h<12?"ص":"م"}`;
  return `${h%12||12}:${String(mm).padStart(2,"0")} ${h<12?"am":"pm"}`}
// How long a place takes, from its "45m", "1–2h", "half day"… (the middle of a range).
function durMin(s){s=String(s||"").toLowerCase().replace(/\s+/g,"");
  if(/fullday/.test(s))return 360;if(/half/.test(s))return 210;
  let m=s.match(/^(\d+(?:\.\d+)?)h(\d+)m/);if(m)return +m[1]*60+ +m[2];
  m=s.match(/^(\d+(?:\.\d+)?)(?:[–-](\d+(?:\.\d+)?))?(h|m)/);if(!m)return 60;
  const v=(+m[1]+ +(m[2]||m[1]))/2*(m[3]==="h"?60:1);
  return Math.min(300,Math.max(15,Math.round(v/5)*5))}
const durText=m=>m>=60?T("{n} h",{n:+(m/60).toFixed(1)}):T("{n} min",{n:m});
// Getting from a to b: walking for short hops, otherwise a train ride (a
// rough guess: waiting plus about 25 km/h, rounded).
function hop(a,b){const km=KM(a,b);
  if(km<=1.5){const m=Math.max(2,Math.round(km*1.25/4.8*60));return {m,walk:true,t:T("{n} min walk",{n:m})}}
  const m=Math.round((8+km*2.4)/5)*5;return {m,walk:false,t:T("Train or taxi · ~{n} min",{n:m})}}

// ---- weather for the trip's days (Open-Meteo, free, up to 16 days ahead) ----
const WX={},wxBusy={};
const wxIcon=c=>c===0?"☀️":c<=2?"🌤️":c===3?"☁️":c<=48?"🌫️":c<=67||c>=80&&c<=82?"🌧️":c<=77||c===85||c===86?"🌨️":c>=95?"⛈️":"🌦️";
function wxFor(c,date){
  const w=WX[c];if(w&&w[date])return w[date];
  if(!w&&!wxBusy[c]&&BOX[c]){wxBusy[c]=1;const b=BOX[c];
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${((b.n+b.s)/2).toFixed(3)}&longitude=${((b.w+b.e)/2).toFixed(3)}&daily=weather_code,temperature_2m_max&timezone=Asia%2FTokyo&forecast_days=16`)
      .then(r=>r.ok?r.json():null).then(j=>{const o={};if(j&&j.daily)j.daily.time.forEach((d,i)=>o[d]={code:j.daily.weather_code[i],t:Math.round(j.daily.temperature_2m_max[i])});WX[c]=o;appTrip();if(window.tnRenderExplore&&document.querySelector('.hx-today'))tnRenderExplore()}).catch(()=>{WX[c]={}})}
  return null}

// Every day of the trip in order, with where it sits.
function allDays(){const out=[];let n=0;trip.stays.forEach((s,a)=>s.days.forEach((d,b)=>out.push({s,d,a,b,n:n++})));return out}

// ---- your trips: the one you're planning, and the others kept on this phone ----
// The trip you're on is `trip` (js/trip.js), the one that syncs to your
// account and that the rest of the app uses. The others wait in a list here
// and swap in when you open them.
const LIB_KEY="tabineko-trips";
const newId=()=>Math.random().toString(36).slice(2,10)+Date.now().toString(36).slice(-4);
const hasContent=t=>!!(t&&(t.name||t.stays.length||t.ideas.length));
function lib(){try{const a=JSON.parse(store.get(LIB_KEY)||"[]");return Array.isArray(a)?a.map(cleanTrip).filter(t=>t.id&&hasContent(t)):[]}catch(e){return[]}}
function saveLib(a){store.set(LIB_KEY,JSON.stringify(a.slice(0,20)))}
function stash(){if(!hasContent(trip))return;if(!trip.id){trip.id=newId();saveTrip()}const a=lib().filter(x=>x.id!==trip.id);a.unshift(JSON.parse(JSON.stringify(trip)));saveLib(a)}
const sharedLock=()=>typeof isShared==="function"&&isShared();
const lockMsg=()=>toast(T("You're planning a shared trip. Leave it first to start or open another one."));
const tripDays=t=>t.stays.reduce((a,s)=>a+s.days.length,0);
const tStart=t=>t.start?new Date(t.start+"T00:00:00Z"):null;
const isPast=t=>{const d=tStart(t);if(!d)return false;const e=new Date(d);e.setUTCDate(e.getUTCDate()+tripDays(t)-1);return e<todayJ()};
function coverFor(t){return t.cover||(t.stays[0]&&coverPhoto(t.stays[0].city))||"assets/hoods/asakusa.jpg"}
function openTrip(id){
  if(!trip.id&&hasContent(trip)){trip.id=newId();saveTrip()}
  if(id!==trip.id){
    if(sharedLock())return lockMsg();
    const t=lib().find(x=>x.id===id);if(!t)return;
    stash();saveLib(lib().filter(x=>x.id!==id));trip=cleanTrip(t);saveTrip();renderList();renderMap();
  }
  view="trip";tab="plan";appTrip();window.scrollTo(0,0);
  if(!(history.state&&history.state.tnTrip))history.pushState({tnTrip:1},"");
}
function deleteTrip(id){
  if(!confirm(T("Delete this trip? This can't be undone.")))return;
  if(!id||id===trip.id){
    if(sharedLock())return lockMsg();
    const a=lib();trip=a.length?cleanTrip(a[0]):freshTrip();saveLib(a.slice(1));saveTrip();renderList();renderMap();
  }else saveLib(lib().filter(x=>x.id!==id));
  view="list";appTrip();window.scrollTo(0,0);
}

// ---- a day as a timeline ----
const BK={flight:["✈️","Flight"],hotel:["🏨","Hotel"],train:["🚄","Train"],ticket:["🎟️","Ticket or tour"],note:["📝","Note"],move:["🚕","Getting around"]};
const MODE={taxi:["🚕","Taxi or bus"],bus:["🚌","Bus"],walk:["🚶","Walk"],ferry:["⛴️","Ferry"],airport:["🛫","Airport"],car:["🚗","Car"]};
const bkIcon=b=>b.ty==="move"&&MODE[b.m]?MODE[b.m][0]:(BK[b.ty]||BK.note)[0];
function bkTitle(b){
  if(b.ty==="flight"||b.ty==="train"||b.ty==="move")return [b.a,b.b].filter(Boolean).join(isAR()&&/[\u0600-\u06FF]/.test((b.a||"")+(b.b||""))?" ← ":" → ")||b.n||T(b.ty==="move"&&MODE[b.m]?MODE[b.m][1]:BK[b.ty][1]);
  return b.n||b.a||(b.ty==="note"&&b.note)||T((BK[b.ty]||BK.note)[1])}
const bdis=a=>a.filter(Boolean).map(x=>`<bdi>${esc(x)}</bdi>`).join(" · ");
function bkSub(b){
  const x=[];
  if(b.ty==="flight"||b.ty==="train"){if(b.n)x.push(b.n);if(b.tm&&b.tm2)x.push(T("{a} → {b}",{a:clock(toMin(b.tm)),b:clock(toMin(b.tm2))}));if(b.x)x.push(T("Seat {s}",{s:b.x}))}
  else if(b.ty!=="note"&&b.x)x.push(b.x);
  if(b.c)x.push("#"+b.c);if(b.note&&!(b.ty==="note"&&!b.n))x.push(b.note);return x}
// Flights and trains sit at their arrival time on the day; the rest at their time.
const bkTime=b=>b.ty==="flight"&&b.tm2?b.tm2:b.tm;
function timeline(s,d){
  const ps=d.ids.map(k=>BYKEY.get(k)),home=s.home,items=[];
  let t=toMin(d.st);
  if(home&&ps.length)items.push({k:"home",t});
  const lunch=!ps.some(p=>p.cat==="food")&&dayIdeas(ps,home,s.city,new Set()).find(x=>x.icon==="🍜");
  let lunchDone=!lunch,prev=home;
  const go=to=>{if(prev){const h=hop(prev,to);items.push({k:"hop",h});t+=h.m}prev=to};
  ps.forEach((p,i)=>{
    // Lunch goes in once the morning's done (from about 11:45).
    if(!lunchDone&&i>0&&t>=705){go(lunch.p);items.push({k:"lunch",x:lunch,t});t+=60;lunchDone=true}
    go(p);const own=d.at&&d.at[PKEY(p)];if(own)t=toMin(own);
    const m=durMin(p.dur);items.push({k:"stop",p,i,t,m,own:!!own});t+=m});
  if(!lunchDone&&ps.length){go(lunch.p);items.push({k:"lunch",x:lunch,t});t+=60}
  // Bookings go in at their times; ones without a time open the day.
  (d.bk||[]).forEach((b,j)=>{const tm=bkTime(b),it={k:"bk",b,j,t:tm?toMin(tm):-1};
    const at=it.t<0?0:items.findIndex(x=>x.t!=null&&x.t>it.t&&x.k!=="hop");
    items.splice(at<0?items.length:at,0,it)});
  return {items,ps};
}
function stopCard(p,ref,own){
  const k=PKEY(p),tip=(D(p,"tip")||"").split(/(?<=[.!؟?])\s/)[0],[a,b]=ref.split(".");
  return `<div class="at-tc at-stop" data-k="${esc(k)}" style="--c:var(--${p.cat})">
    ${compact?"":`<img src="${esc(p.photo||CATS[p.cat].img)}" alt="" loading="lazy"${p.photo?"":` class="art"`}>`}
    <span class="at-si"><button type="button" class="tname" data-id="${p.id}"><bdi>${esc(p.n)}</bdi></button>
      <small>${esc(D(CATS[p.cat],"n"))} · ${esc(AREA(p.area))}${p.halal?` · <em>${p.hl==="friendly"?T("Muslim-friendly"):T("✓ halal")}</em>`:""}</small>
      ${compact||!tip?"":`<i class="at-tip">🐾 ${esc(tip)}</i>`}${stampTag(k)}</span>
    <button type="button" class="at-more" aria-label="${esc(T("Options"))}" aria-expanded="false">${SVG(I.dots)}</button>
    <div class="at-ctl" hidden><label class="at-attl">🕘 <input type="time" class="at-attime" data-s="${a}" data-d="${b}" data-k="${esc(k)}" value="${esc(own||"")}" aria-label="${esc(T("Set a time"))}"></label>
      <button type="button" class="tup" data-k="${esc(k)}">↑ ${T("Up")}</button><button type="button" class="tdown" data-k="${esc(k)}">↓ ${T("Down")}</button>
      ${moveMenu(k,ref)}<button type="button" class="tdel" data-k="${esc(k)}">× ${T("Remove")}</button></div></div>`}

// A stop with a stamp in Apollo's stamp book says so (js/stamps.js).
function stampTag(k){const s=window.tnStampInfo&&tnStampInfo(k);if(!s)return "";
  return s.got?`<span class="at-stag got">✓ ${T("Stamped {d}",{d:s.date})}</span>`:`<span class="at-stag">🐾 ${T("Stamp waiting")}</span>`}

// ---- the list of trips ----
const CITY_COL=["#F14E24","#2E8C88","#7B5EA7","#1D52A0","#E8A800","#5E9A3E"];
function coverPhoto(c){return (HOODS.find(h=>h.city===c&&h.photo)||{}).photo||(P.find(p=>p.city===c&&p.photo&&p.tier==="must")||P.find(p=>p.city===c&&p.photo)||{}).photo}
function tripCard(t){
  const d0=tStart(t),n=tripDays(t),dz=d0&&new Date(d0.getTime()+(n-1)*864e5),dl=d0?Math.round((d0-todayJ())/864e5):null;
  const sub=[d0?`${md(d0)} – ${md(dz)}`:N(n,"1 day","{n} days"),t.stays.map(s=>cityName(s.city)).join(isAR()?"، ":", ")].filter(Boolean).join(" · ");
  const chip=dl==null?"":dl>1?T("✈️ {n} days to go",{n:num(dl)}):dl===1?T("✈️ Tomorrow!"):-dl<n?T("🧳 Day {n} of your trip",{n:num(1-dl)}):"";
  return `<button type="button" class="tv-card" data-id="${esc(t.id||"")}"><img src="${esc(coverFor(t))}" alt="" loading="lazy"><span class="tv-sh"></span>
    ${chip?`<span class="tv-cd">${esc(chip)}</span>`:""}<span class="tv-ct"><b>${esc(t.name||T("My Japan trip"))}</b><small>${esc(isAR()?iso(sub):sub)}</small></span></button>`}
function listHTML(){
  const all=[...(hasContent(trip)?[trip]:[]),...lib()];
  let h=`<header class="tv-lh"><h1>${T("My trips")}</h1><button type="button" class="tv-plus" aria-label="${esc(T("New trip"))}">${SVG(I.plus,24)}</button></header>`;
  if(!all.length)return h+`<div class="tv-empty"><img src="${GI()}" alt=""><h2>${T("No trips yet ✈️")}</h2><p>${T("Apollo's ready with his backpack! Make your first trip to Japan and he'll help with every day.")}</p>
      <button type="button" class="tv-big tv-new">${SVG(I.plus,20)} ${T("Make your first trip")}</button>
      ${typeof openPlanner==="function"?`<button type="button" class="tv-ghost tplanb"><img src="${GI()}" alt=""><span><b>✨ ${T("Let Apollo plan it for you")}</b><small>${T("Tell him the cities and how long, he sorts everything in seconds")}</small></span></button>`:""}</div>
    <div class="tv-how"><b>${T("How it works")}</b><ol><li>${T("Pick a name, dates and cities")}</li><li>${T("Add your flight and hotel")}</li><li>${T("Fill your days with places from the notebook 🐾")}</li></ol></div>`;
  const up=all.filter(t=>!isPast(t)),past=all.filter(isPast),show=seg==="past"?past:up;
  h+=`<div class="tv-seg" role="tablist"><button type="button" role="tab" data-seg="up" class="${seg==="up"?"on":""}">${T("Upcoming")}</button><button type="button" role="tab" data-seg="past" class="${seg==="past"?"on":""}">${T("Past")}</button></div>`;
  h+=show.map(tripCard).join("")||`<p class="tv-none">${esc(T(seg==="past"?"No past trips yet.":"No upcoming trips."))}</p>`;
  return h+`<button type="button" class="tv-newt tv-new">${SVG(I.plus,20)} ${T("New trip")}</button>${typeof acctBar==="function"?`<div class="at-acct">${acctBar()}</div>`:""}`;
}

// ---- one trip: the schedule, the map, bookings and ideas ----
function countdown(nd){
  if(!trip.start)return `<label class="at-count set">${SVG(I.cal,15)} ${T("Set your travel date")}<input type="date" class="at-datein" aria-label="${esc(T("First day of the trip"))}"></label>`;
  const d0=dayAt(0),dl=Math.round((d0-todayJ())/864e5);
  const t=dl>1?T("✈️ {n} days to go",{n:num(dl)}):dl===1?T("✈️ Tomorrow!"):dl===0?T("🧳 Today's the day!"):-dl<nd?T("🧳 Day {n} of your trip",{n:num(1-dl)}):T("🐾 Welcome back");
  return `<label class="at-count">${esc(t)}<input type="date" class="at-datein" value="${esc(trip.start)}" aria-label="${esc(T("First day of the trip"))}"></label>`}
function bkAll(){const out=[];allDays().forEach(x=>(x.d.bk||[]).forEach((b,j)=>out.push({...x,bk:b,j})));return out}
function hotelName(s){return s.hotel&&s.hotel.n||s.home&&s.home.n||""}
function ideasRow(t){
  return `<section class="tlist-drop" data-day="ideas"><ul class="at-ideas">${t.ideas.map(k=>{const p=BYKEY.get(k);return `<li class="at-idea" data-k="${esc(k)}"><img src="${esc(p.photo||CATS[p.cat].img)}" alt="" loading="lazy"${p.photo?"":` class="art"`}>
      <button type="button" class="tname" data-id="${p.id}"><bdi>${esc(p.n)}</bdi></button><small>${esc(D(CATS[p.cat],"n"))}</small>
      <span class="at-iact">${moveMenu(k,"ideas")}<button type="button" class="tdel" data-k="${esc(k)}" aria-label="${esc(T("Remove"))}">×</button></span></li>`}).join("")}</ul></section>`;
}
function dayHTML(x,used){
  const {s,d,a,b,n}=x,ref=a+"."+b,dt=dayAt(n),w=dt&&wxFor(s.city,iso8(dt)),{items,ps}=timeline(s,d);
  let h=`<section class="tv-day" id="tvd-${n}"><header class="tv-dh"><div><b>${esc(T("Day {n}",{n:num(n+1)}))}${d.t?` · <bdi>${esc(d.t)}</bdi>`:""}</b><small>${esc([dt?`${wd(dt)} ${md(dt)}`:"",cityName(s.city)].filter(Boolean).join(" · "))}</small></div>
    ${w?`<span class="tv-wx">${wxIcon(w.code)} ${num(w.t)}°</span>`:""}<button type="button" class="tv-dadd" data-s="${a}" data-d="${b}" aria-label="${esc(T("Add to Day {n}",{n:n+1}))}">${SVG(I.plus,18)}</button></header>`;
  const row=(time,card,dot)=>`<div class="at-row"><div class="at-time">${time}</div><i class="at-dot ${dot||""}"></i>${card}</div>`;
  // Where you're sleeping: checking in on the first day, then each night.
  const hn=hotelName(s);
  // On the first day it sits at check-in time; on the others it opens the day.
  if(hn){const first=b===0,t0=toMin(s.hotel&&s.hotel.in||"15:00"),it={k:"hotel",first,t:first?t0:null};
    if(first){const at=items.findIndex(z=>z.t!=null&&z.t>t0&&z.k!=="hop");items.splice(at<0?items.length:at,0,it)}else items.unshift(it)}
  const nights=s.days.length-(a===trip.stays.length-1?1:0)||1;
  items.forEach(it=>{
    if(it.k==="hotel"){h+=row(it.first?`<b>${esc(clock(it.t))}</b>`:"",`<button type="button" class="at-tc at-hotel tv-hot${it.first?"":" night"}" data-s="${a}"><span class="at-bi">🏨</span><span class="at-si"><b><bdi>${esc(hn)}</bdi></b><small>${esc(it.first?T("Check in · {n} nights",{n:num(nights)}):T("Night {a} of {b}",{a:num(b+1),b:num(nights)}))}</small></span></button>`,"h");return}
    if(it.k==="home")return;
    if(it.k==="hop"){h+=`<div class="at-hop"><span>${SVG(it.h.walk?I.walk:I.train,14)}</span>${esc(isAR()?iso(it.h.t):it.h.t)}</div>`;return}
    const tm=it.t!=null&&it.t>=0?`<b>${esc(clock(it.t))}</b>${it.m?`<small>${esc(isAR()?iso(durText(it.m)):durText(it.m))}</small>`:""}`:"";
    if(it.k==="stop")h+=row(tm,stopCard(it.p,ref,d.at&&d.at[PKEY(it.p)]));
    if(it.k==="lunch"){const p=it.x.p;h+=row(tm,`<div class="at-tc at-lunchc">${compact?"":`<img src="${esc(p.photo||CATS[p.cat].img)}" alt="" loading="lazy">`}
      <span class="at-si"><span class="at-hal">🍜 ${T("Halal lunch · Apollo's pick")}</span><button type="button" class="tname" data-id="${p.id}"><bdi>${esc(p.n)}</bdi></button>
      <small>${esc(D(CATS[p.cat],"n"))} · ${esc(T("{n} km",{n:num(it.x.km.toFixed(1))}))}</small></span>
      <button type="button" class="tlunch-add at-add" data-k="${esc(PKEY(p))}" data-day="${ref}" aria-label="${esc(T("＋ add"))}">＋</button></div>`,"f")}
    if(it.k==="bk"){const bk=it.b;h+=row(bk.tm||bk.tm2?`<b>${esc(clock(toMin(bkTime(bk))))}</b>`:"",`<button type="button" class="at-tc at-bk at-bk-${bk.ty} tv-bked" data-s="${a}" data-d="${b}" data-j="${it.j}"><span class="at-bi">${bkIcon(bk)}</span><span class="at-si"><b><bdi>${esc(bkTitle(bk))}</bdi></b>${bkSub(bk).length?`<small>${bdis(bkSub(bk))}</small>`:""}</span></button>`,"b")}
  });
  if(!ps.length){
    const noBk=!(d.bk||[]).length;
    if(noBk||!hn)h+=`<button type="button" class="tv-slot tv-dadd" data-s="${a}" data-d="${b}">${SVG(I.plus,18)} ${esc(T(n===0&&noBk&&!bkAll().length?"Start with the basics: how are you getting there?":"A free day. What do you feel like doing?"))}</button>`;
    if(n===0&&!bkAll().some(z=>z.bk.ty==="flight"))h+=`<div class="tv-quick"><button type="button" class="tv-q" data-ty="flight" data-s="${a}" data-d="${b}">✈️ ${T("Your flight")}</button>${hn?"":`<button type="button" class="tv-q" data-ty="hotel" data-s="${a}" data-d="${b}">🏨 ${T("Your hotel")}</button>`}</div>`;
    else if(!hn&&b===0)h+=`<div class="tv-quick"><button type="button" class="tv-q" data-ty="hotel" data-s="${a}" data-d="${b}">🏨 ${T("Where are you staying in {c}?",{c:cityName(s.city)})}</button></div>`;
  }
  // Apollo's suggestions for what comes next, nearby.
  dayIdeas(ps,s.home,s.city,used).filter(z=>!(ps.length&&z.icon==="🍜")).forEach(z=>{const p=z.p;
    h+=`<div class="tv-sugg"><img src="${esc(p.photo||CATS[p.cat].img)}" alt=""${p.photo?"":` class="art"`}><span><small>${z.icon} ${esc(T(z.label))}</small><button type="button" class="tname" data-id="${p.id}"><bdi>${esc(p.n)}</bdi></button></span>
      <button type="button" class="tlunch-add tv-sadd" data-k="${esc(PKEY(p))}" data-day="${ref}" aria-label="${esc(T("＋ add"))}">＋</button></div>`});
  return h+`</section>`;
}
function bookingsHTML(){
  const hs=trip.stays.map((s,a)=>({s,a})).filter(o=>hotelName(o.s)),bs=bkAll();
  if(!hs.length&&!bs.length)return `<div class="tv-bk0"><div class="tv-bkic">✈️🏨🚄</div><h3>${T("No bookings yet")}</h3><p>${T("Add your flight, hotel and tickets here. They show in your schedule at their times, and you'll find them fast at the airport.")}</p>
    <div class="tv-bkb">${[["flight","✈️","Flight"],["hotel","🏨","Hotel"],["train","🚄","Train"],["ticket","🎟️","Ticket or tour"]].map(([k,e,l])=>`<button type="button" class="tv-q" data-ty="${k}" data-s="0" data-d="0">${e} ${T(l)}</button>`).join("")}</div></div>`;
  let h="";
  hs.forEach(({s,a})=>{const ho=s.hotel||{},first=allDays().find(x=>x.a===a),d0=first&&dayAt(first.n),dz=d0&&dayAt(first.n+s.days.length-(a===trip.stays.length-1?1:0));
    h+=`<button type="button" class="tv-bkrow tv-hot" data-s="${a}"><span class="at-bi">🏨</span><span class="at-si"><b><bdi>${esc(hotelName(s))}</bdi></b><small>${bdis([cityName(s.city),d0?`${md(d0)} – ${md(dz)}`:"",ho.in?T("Check in {t}",{t:clock(toMin(ho.in))}):"",ho.c?"#"+ho.c:""])}</small></span></button>`});
  bs.forEach(x=>{const dt=dayAt(x.n);h+=`<button type="button" class="tv-bkrow tv-bked" data-s="${x.a}" data-d="${x.b}" data-j="${x.j}"><span class="at-bi">${bkIcon(x.bk)}</span><span class="at-si"><b><bdi>${esc(bkTitle(x.bk))}</bdi></b><small>${bdis([T("Day {n}",{n:x.n+1}),dt?md(dt):"",bkTime(x.bk)&&!(x.bk.tm&&x.bk.tm2)?clock(toMin(bkTime(x.bk))):"",...bkSub(x.bk)])}</small></span></button>`});
  return h+`<button type="button" class="tv-newt tv-addany">${SVG(I.plus,20)} ${T("Add a booking")}</button>`;
}
function tripHTML(){
  const t=trip,nd=tripDays(t),d0=dayAt(0),dz=dayAt(Math.max(0,nd-1));
  const when=[d0?`${md(d0)} – ${md(dz)}`:"",N(nd,"1 day","{n} days")].filter(Boolean).join(" · ");
  let h=`<div class="at-cover tv-hdr"><img src="${esc(coverFor(t))}" alt=""><div class="at-shade"></div>
    <div class="at-cbtn tv-cbtn"><button type="button" class="at-cb tv-back" aria-label="${esc(T("My trips"))}">${SVG(I.back)}</button><span></span><button type="button" class="at-cb at-share" aria-label="${esc(T("Share"))}">${SVG(I.share)}</button></div>
    <div class="at-ctext">${countdown(nd)}<input class="tname-in at-title" id="tripname" value="${esc(t.name)}" placeholder="${esc(T("My Japan trip 🇯🇵"))}" maxlength="60" aria-label="${esc(T("Trip name"))}"><p>${esc(isAR()?iso(when):when)}</p></div></div>`;
  if(shareAsk)h+=`<div class="tshareask"><p>${T("Include where you're staying? Anyone with the link will see it.")}</p><button type="button" class="store" data-home="0">${T("Share without it")}</button><button type="button" class="store" data-home="1">${T("Include it")}</button></div>`;
  h+=`<div class="tv-pills" role="tablist">${[["plan","Schedule"],["map","Map"],["bk","Bookings"]].map(([k,l])=>`<button type="button" role="tab" data-tab="${k}" class="${tab===k?"on":""}">${T(l)}</button>`).join("")}</div>`;
  if(tab==="bk")h+=`<div class="tv-pad">${bookingsHTML()}</div>`;
  else{const used=new Set();
    // Places saved with ＋ wait at the top of the schedule until they're sorted into a day.
    if(t.ideas.length)h+=`<div class="tv-pad"><h2 class="at-h">${T("Saved places")} <i class="tv-n">${num(t.ideas.length)}</i></h2>${ideasRow(t)}</div>`;
    h+=`<div class="tv-pad tv-plan${compact?" compact":""}">${allDays().map(x=>dayHTML(x,used)).join("")}</div>`}
  h+=`<div class="tv-pad"><h2 class="at-h">${T("Do more")}</h2><div class="at-acts">
    ${typeof openPlanner==="function"?`<button type="button" class="tplanb at-act a1"><span>✨</span><b>${T("Let Apollo sort it")}</b><small>${T("From his notebook, with halal food")}</small></button>`:""}
    ${tripCount(t)?`<button type="button" class="at-act a2" id="tpdf"><span>📘</span><b>${T("Trip PDF")}</b><small>${T("Every day, with map links")}</small></button>`:""}
    <button type="button" class="at-act a3" id="tshare"><span>👥</span><b>${T("Share with friends")}</b><small>${T("Send them a link")}</small></button></div>
    ${typeof acctBar==="function"?`<div class="at-acct">${acctBar()}</div>`:""}
    <div class="at-foot"><button type="button" class="at-link tv-del">${T("Delete this trip")}</button></div></div>
    <button type="button" class="at-fab tv-fab">${SVG(I.plus,22)} <span>${T("Add new")}</span></button>`;
  return h;
}
function appTrip(){
  const box=$("tripbook");if(!box)return;
  if(view==null)view=hasContent(trip)?"trip":"list";
  if(view==="trip"&&!hasContent(trip))view="list";
  box.classList.toggle("tv-on",view==="trip");box.classList.remove("at-onday");
  box.innerHTML=view==="trip"?tripHTML():listHTML();wire(box);
}

// ---- the sheet: a new trip, adding to a day, and the booking forms ----
const sh=document.createElement("div");sh.id="atsheet";sh.hidden=true;document.body.appendChild(sh);
sh.addEventListener("click",e=>{if(e.target===sh)closeSheet()});
function showSheet(){sh.hidden=false;document.documentElement.classList.add("at-sheet-open")}
function closeSheet(){sh.hidden=true;sheet=null;nt=null;document.documentElement.classList.remove("at-sheet-open")}
const shHead=(title,btn,cls)=>`<i class="at-grab"></i><header class="tv-shh"><button type="button" class="at-shx" aria-label="${esc(T("Close"))}">${SVG(I.x)}</button><b>${esc(title)}</b>${btn?`<button type="button" class="tv-go ${cls||""}">${esc(btn)}</button>`:"<span></span>"}</header>`;

// A new trip: the name and a cover, the dates, the cities and their nights.
const ymd=d=>d.toISOString().slice(0,10),addD=(s,n)=>{const d=new Date(s+"T00:00:00Z");d.setUTCDate(d.getUTCDate()+n);return ymd(d)};
const nightsBetween=(a,b)=>a&&b?Math.round((new Date(b)-new Date(a))/864e5):0;
function openNew(first){
  if(sharedLock())return lockMsg();
  const t=todayJ();nt={name:"",start:"",end:"",cities:first&&TRIP_CITIES.includes(first)?[{c:first,n:3}]:[],cover:"",fill:false,step:"main",m:ymd(t).slice(0,7)};drawNew();showSheet();
  setTimeout(()=>{const i=sh.querySelector(".nt-name");if(i)i.focus()},250);
}
function ntCover(){return nt.cover||(nt.cities[0]&&coverPhoto(nt.cities[0].c))||"assets/hoods/tokyo-tower.jpg"}
function drawNew(){
  let h=`<div class="at-sh tv-sheet" role="dialog" aria-modal="true">`;
  const total=nt.cities.reduce((a,c)=>a+c.n,0),want=nightsBetween(nt.start,nt.end);
  if(nt.step==="cal"){
    const [y,mo]=nt.m.split("-").map(Number),first=new Date(Date.UTC(y,mo-1,1)),days=new Date(Date.UTC(y,mo,0)).getUTCDate(),pad=first.getUTCDay(),today=ymd(todayJ());
    let g="";for(let i=0;i<pad;i++)g+="<i></i>";
    for(let d=1;d<=days;d++){const v=`${nt.m}-${String(d).padStart(2,"0")}`,cls=v===nt.start||v===nt.end?"end":nt.start&&nt.end&&v>nt.start&&v<nt.end?"in":"",off=v<today;
      g+=`<button type="button" class="nt-d ${cls}" data-v="${v}"${off?" disabled":""}>${num(d)}</button>`}
    h+=shHead(T("When's your trip?"),T("OK"),"nt-back")+`<div class="nt-cal"><div class="nt-calh"><button type="button" class="nt-m" data-m="-1" aria-label="${esc(T("Previous month"))}">‹</button><b>${esc((isAR()?MO_AR:MO_EN)[mo-1]+" "+num(y))}</b><button type="button" class="nt-m" data-m="1" aria-label="${esc(T("Next month"))}">›</button></div>
      <div class="nt-g">${(isAR()?["ح","ن","ث","ر","خ","ج","س"]:["S","M","T","W","T","F","S"]).map(x=>`<em>${x}</em>`).join("")}${g}</div></div>
      <p class="nt-sum">${nt.start?esc(nt.end?`${md(new Date(nt.start))} – ${md(new Date(nt.end))} · `+T("{d} days, {n} nights",{d:num(want+1),n:num(want)}):T("Now pick the last day")):esc(T("Tap the first day of your trip"))}</p>`;
  }else if(nt.step==="cities"){
    const left=TRIP_CITIES.filter(c=>c!=="ise"&&!nt.cities.some(x=>x.c===c));
    h+=shHead(T("Where are you going?"),T("OK"),"nt-back")+`<div class="nt-cities">${nt.cities.map((c,i)=>`<div class="nt-cr" style="--c:${CITY_COL[i%CITY_COL.length]}"><span class="nt-ord">${num(i+1)}</span><b>${esc(cityName(c.c))}</b>
      ${i?`<button type="button" class="nt-up" data-i="${i}" aria-label="${esc(T("Move up"))}">↑</button>`:""}<span class="nt-stp"><button type="button" class="nt-mn" data-i="${i}">−</button><em>${num(c.n)}</em><button type="button" class="nt-pl" data-i="${i}">＋</button></span><small>${T(c.n===1?"night":"nights")}</small>
      <button type="button" class="nt-rm" data-i="${i}" aria-label="${esc(T("Remove"))}">×</button></div>`).join("")}</div>
      ${nt.start&&nt.end&&nt.cities.length?`<p class="nt-ok${total===want?"":" bad"}">${esc(total===want?T("✓ {a} of {b} nights, all set",{a:num(total),b:num(want)}):T("{a} of {b} nights",{a:num(total),b:num(want)}))}</p>`:""}
      <h4 class="nt-h4">${T("Add a city")}</h4><div class="nt-add">${left.map(c=>`<button type="button" data-c="${c}"><img src="${esc(coverPhoto(c)||"")}" alt=""><b>${esc(cityName(c))}</b></button>`).join("")}</div>`;
  }else{
    h+=shHead(T("New trip"),T("Create"),"nt-make"+(nt.cities.length?"":" off"))+`<div class="nt-cov"><img src="${esc(ntCover())}" alt=""><button type="button" class="nt-pic">${SVG(I.img,16)} ${T("Change photo")}</button></div>
      <label class="nt-f"><small>${T("Trip name")}</small><input class="nt-name" value="${esc(nt.name)}" placeholder="${esc(T("My Japan trip 🇯🇵"))}" maxlength="60"></label>
      <button type="button" class="nt-f nt-when${nt.start?"":" emp"}"><small>${T("When?")}</small><b>${SVG(I.cal,16)} ${esc(nt.start?(nt.end?`${md(new Date(nt.start))} – ${md(new Date(nt.end))}`:md(new Date(nt.start))):T("Pick the dates"))}</b></button>
      <button type="button" class="nt-f nt-where${nt.cities.length?"":" emp"}"><small>${T("Where?")}</small><b>🗾 ${esc(nt.cities.length?nt.cities.map(c=>`${cityName(c.c)} ${num(c.n)}`).join(isAR()?" ← ":" → "):T("Pick the cities"))}</b></button>
      <button type="button" class="nt-apo"><img src="${GI()}" alt=""><span><b>✨ ${T("Let Apollo fill the days")}</b><small>${T("Places from the notebook and halal food nearby. You can change them after.")}</small></span><i class="nt-tg${nt.fill?" on":""}" role="switch" aria-checked="${nt.fill}"><i></i></i></button>`;
  }
  sh.innerHTML=h+`</div>`;
  const $$=s=>sh.querySelectorAll(s);
  sh.querySelector(".at-shx").onclick=()=>{if(nt.step!=="main"){nt.step="main";drawNew()}else closeSheet()};
  $$(".nt-back").forEach(b=>b.onclick=()=>{nt.step="main";drawNew()});
  $$(".nt-name").forEach(i=>i.oninput=()=>{nt.name=i.value});
  $$(".nt-when").forEach(b=>b.onclick=()=>{nt.step="cal";drawNew()});
  $$(".nt-where").forEach(b=>b.onclick=()=>{nt.step="cities";drawNew()});
  $$(".nt-apo").forEach(b=>b.onclick=()=>{nt.fill=!nt.fill;drawNew()});
  $$(".nt-pic").forEach(b=>b.onclick=()=>{const cs=nt.cities.length?nt.cities.map(c=>c.c):["tokyo","kyoto","osaka"];
    const pics=[...new Set([...HOODS.filter(h=>cs.includes(h.city)&&h.photo).map(h=>h.photo),...P.filter(p=>cs.includes(p.city)&&p.photo&&p.tier==="must").map(p=>p.photo)])].filter(x=>/^assets\/(hoods|photos)\//.test(x));
    const i=pics.indexOf(ntCover());nt.cover=pics[(i+1)%pics.length]||"";drawNew()});
  $$(".nt-m").forEach(b=>b.onclick=()=>{const [y,m]=nt.m.split("-").map(Number),d=new Date(Date.UTC(y,m-1+ +b.dataset.m,1));nt.m=ymd(d).slice(0,7);drawNew()});
  $$(".nt-d").forEach(b=>b.onclick=()=>{const v=b.dataset.v;if(!nt.start||nt.end||v<nt.start){nt.start=v;nt.end=""}else nt.end=v===nt.start?"":v;
    // The nights follow the dates: the last city takes what's left.
    if(nt.start&&nt.end&&nt.cities.length){const want=nightsBetween(nt.start,nt.end),rest=nt.cities.slice(0,-1).reduce((a,c)=>a+c.n,0);nt.cities[nt.cities.length-1].n=Math.max(1,want-rest)}
    drawNew()});
  // A new city takes the nights still free, or a couple from the longest stay.
  $$(".nt-add button").forEach(b=>b.onclick=()=>{const want=nightsBetween(nt.start,nt.end),used=nt.cities.reduce((a,c)=>a+c.n,0);
    let n=2;if(want){if(want>used)n=want-used;else{const big=nt.cities.reduce((m,c)=>c.n>m.n?c:m,{n:0});n=Math.min(2,Math.max(1,big.n-1));if(big.n>n)big.n-=n;else n=1}}
    nt.cities.push({c:b.dataset.c,n});drawNew()});
  $$(".nt-pl").forEach(b=>b.onclick=()=>{const c=nt.cities[+b.dataset.i];c.n=Math.min(30,c.n+1);drawNew()});
  $$(".nt-mn").forEach(b=>b.onclick=()=>{const c=nt.cities[+b.dataset.i];c.n=Math.max(1,c.n-1);drawNew()});
  $$(".nt-rm").forEach(b=>b.onclick=()=>{nt.cities.splice(+b.dataset.i,1);drawNew()});
  $$(".nt-up").forEach(b=>b.onclick=()=>{const i=+b.dataset.i,a=nt.cities;[a[i-1],a[i]]=[a[i],a[i-1]];drawNew()});
  $$(".nt-make").forEach(b=>b.onclick=()=>{if(!nt.cities.length){nt.step="cities";drawNew();return}makeTrip()});
}
// Apollo's quick fill: each day takes up to three sights from one area,
// the area's best first (must-sees, then hidden gems), never the same place
// twice. Lunch is suggested by the schedule itself.
function autofill(t){
  const used=new Set(),w=p=>(p.tier==="must"?3:p.tier==="worth"?1:0)+(p.gem?1:0)+(p.photo?.5:0);
  t.stays.forEach((s,si)=>{
    const by={};P.filter(p=>p.city===s.city&&!p.nomap&&!["food","coffee"].includes(p.cat)).forEach(p=>(by[p.area]=by[p.area]||[]).push(p));
    const areas=Object.entries(by).map(([a,l])=>({a,l:l.sort((x,y)=>w(y)-w(x)),s:l.reduce((n,p)=>n+w(p),0)})).sort((x,y)=>y.s-x.s);
    s.days.forEach((d,i)=>{const ar=areas[i%Math.max(1,areas.length)];if(!ar)return;
      const max=si===0&&i===0?2:3,pick=ar.l.filter(p=>!used.has(p)).slice(0,max);pick.forEach(p=>used.add(p));
      d.ids=pick.map(PKEY);if(pick.length)d.t=AREA(ar.a)});
  });
}
function makeTrip(){
  const want=nightsBetween(nt.start,nt.end),stays=nt.cities.map((c,i)=>({city:c.c,home:null,days:Array.from({length:Math.max(1,c.n+(i===nt.cities.length-1?1:0))},()=>({t:"",ids:[]}))}));
  // With dates, the days add up to the dates exactly.
  if(want){let n=stays.reduce((a,s)=>a+s.days.length,0),last=stays[stays.length-1].days;while(n<want+1){last.push({t:"",ids:[]});n++}while(n>want+1&&last.length>1){last.pop();n--}}
  const t={id:newId(),name:nt.name.trim()||T("My Japan trip 🇯🇵"),...(nt.start?{start:nt.start}:{}),...(nt.cover?{cover:nt.cover}:{}),ideas:[],stays};
  if(nt.fill)autofill(t);
  stash();trip=cleanTrip(t);saveTrip();renderList();renderMap();
  closeSheet();view="trip";tab="plan";appTrip();window.scrollTo(0,0);
  if(!(history.state&&history.state.tnTrip))history.pushState({tnTrip:1},"");
  toast(T("Your trip is ready ✓"));
}

// Adding to a day: places from the notebook, or a booking.
const ADD=[["place","📍","A place from the notebook"],["halal","🍜","Halal restaurant"],["shrine","⛩️","Temple"],["coffee","☕","Coffee"],["shop","🛍️","Shopping"],["views","🌅","View"],
  ["flight","✈️","Flight"],["hotel","🏨","Hotel"],["train","🚄","Train"],["taxi","🚕","Taxi or bus"],["walk","🚶","Walk"],["ticket","🎟️","Ticket or tour"],
  ["onsen","♨️","Onsen"],["note","📝","Note"],["airport","🛫","Airport"],["ferry","⛴️","Ferry"]];
const FORMS={flight:[["a","From","RUH"],["b","To","NRT"],["n","Flight","SV 386"],["x","Seat","32A"],["tm","Departs",""],["tm2","Arrives",""],["c","Booking number",""],["note","Note",""]],
  train:[["a","From","Tokyo"],["b","To","Kyoto"],["n","Train","Nozomi 215"],["x","Car / seat","7 · 12E"],["tm","Departs",""],["tm2","Arrives",""],["c","Booking number",""]],
  move:[["a","From",""],["b","To",""],["tm","Time",""],["note","Note",""]],
  ticket:[["n","What","teamLab Planets"],["tm","Time",""],["c","Booking number",""],["note","Note",""]],
  note:[["note","Note",""],["tm","Time",""]]};
function fujiTip(v){const a=LOW((v.a||"")+" "+(v.b||""));return /tokyo|طوكيو|shinagawa/.test(a)&&/kyoto|كيوتو|osaka|أوساكا|اوساكا|nagoya|hiroshima|kobe|كوبي/.test(a)}
function daySelect(){return `<label class="w"><small>${T("Day")}</small><select class="tv-daysel">${allDays().map(x=>{const dt=dayAt(x.n);
  return `<option value="${x.a}.${x.b}"${x.a===sheet.a&&x.b===sheet.b?" selected":""}>${esc([T("Day {n}",{n:x.n+1}),dt?`${wd(dt)} ${md(dt)}`:"",cityName(x.s.city)].filter(Boolean).join(" · "))}</option>`}).join("")}</select></label>`}
function openAdd(a,b,ty,j){
  sheet={a:+a||0,b:+b||0,ty:ty||null,j:j==null?null:+j,v:{}};
  if(sheet.j!=null){const bk=trip.stays[sheet.a].days[sheet.b].bk[sheet.j];sheet.ty=bk.ty;sheet.v={...bk}}
  if(ty==="hotel")return openHotel(sheet.a);
  drawAdd();showSheet();
}
function drawAdd(){
  const x=allDays().find(z=>z.a===sheet.a&&z.b===sheet.b)||{n:0},ref=sheet.a+"."+sheet.b;
  let h=`<div class="at-sh tv-sheet" role="dialog" aria-modal="true">`;
  if(!sheet.ty){
    h+=shHead(T("Add to Day {n}",{n:num(x.n+1)}),"")+`<button type="button" class="tv-srch">${SVG(I.search,18)} ${T("Search for a place, or pick a type")}</button>
      <div class="at-types tv-types">${ADD.map(([k,e,l])=>`<button type="button" data-ty="${k}"><span>${e}</span><b>${T(l)}</b></button>`).join("")}</div>`;
  }else{
    const ty=sheet.ty,v=sheet.v,form=FORMS[ty]||FORMS.note,mode=ty==="move"&&MODE[v.m]?MODE[v.m]:null;
    h+=shHead(`${mode?mode[0]:BK[ty][0]} ${T(mode?mode[1]:BK[ty][1])}`,T("Save"),"tv-save")+`<form class="at-form tv-form"><div class="at-fg">${daySelect()}${form.map(([k,l,ph])=>`<label class="${k==="note"?"w":""}"><small>${T(l)}</small>
      ${k==="note"?`<textarea name="note" maxlength="200" rows="2" placeholder="${esc(T("Optional"))}">${esc(v.note||"")}</textarea>`:`<input name="${k}" ${k==="tm"||k==="tm2"?'type="time"':'autocomplete="off"'} value="${esc(v[k]||"")}" placeholder="${esc(ph)}" maxlength="60">`}</label>`).join("")}</div>
      ${ty==="train"&&fujiTip(v)?`<p class="at-ftip">🐾 ${T("Apollo: pick seat E on the Tokaido shinkansen to see Mount Fuji 🗻")}</p>`:""}
      ${ty==="flight"&&/nrt|narita|ناريتا/i.test(v.b||"")?`<p class="at-ftip">🐾 ${T("Apollo: from Narita to Asakusa or Ueno, the Keisei line takes about an hour with no changes.")}</p>`:""}
      ${ty==="flight"&&/hnd|haneda|هانيدا/i.test(v.b||"")?`<p class="at-ftip">🐾 ${T("Apollo: from Haneda the Keikyu line or the monorail gets you into Tokyo in 20 to 40 minutes.")}</p>`:""}
      ${sheet.j!=null?`<button type="button" class="at-del">${T("Delete")}</button>`:""}</form>`;
  }
  sh.innerHTML=h+`</div>`;
  sh.querySelector(".at-shx").onclick=()=>{if(sheet&&sheet.ty&&sheet.j==null){sheet.ty=null;sheet.v={};drawAdd()}else closeSheet()};
  const srch=sh.querySelector(".tv-srch");if(srch)srch.onclick=()=>{closeSheet();openPicker(ref);setTimeout(()=>{const q=document.querySelector("#tpick .tpick-q");if(q)q.focus()},80)};
  sh.querySelectorAll(".tv-types button").forEach(b=>b.onclick=()=>{const k=b.dataset.ty;
    const pick={place:[],halal:["food",1],shrine:["shrine"],coffee:["coffee"],shop:["shop"],views:["views"],onsen:["",0,"onsen"]}[k];
    if(pick){closeSheet();openPicker(ref);pk.cat=pick[0]||"";pk.halal=!!pick[1];if(pick[2])pk.q=pick[2];renderPicker();return}
    if(k==="hotel")return openHotel(sheet.a);
    const mv={taxi:"taxi",walk:"walk",airport:"airport",ferry:"ferry"}[k];
    sheet.ty=mv?"move":k;sheet.v=mv?{m:mv}:{};drawAdd();const f=sh.querySelector(".tv-form input:not([type=time])");if(f)f.focus()});
  const f=sh.querySelector(".tv-form");if(!f)return;
  const ds=f.querySelector(".tv-daysel");if(ds)ds.onchange=()=>{const [a,b]=ds.value.split(".").map(Number);sheet.a=a;sheet.b=b};
  // Apollo's tips follow what you type (Fuji on the shinkansen, the airport trains).
  f.oninput=e=>{const el=e.target;if(!el.name)return;sheet.v[el.name]=el.value;
    if((sheet.ty==="train"||sheet.ty==="flight")&&(el.name==="a"||el.name==="b")){const at=el.selectionStart,nm=el.name,orig=sheet.orig,a=sheet.a,b=sheet.b;
      drawAdd();sheet.orig=orig;sheet.a=a;sheet.b=b;const n=sh.querySelector(`[name="${nm}"]`);if(n){n.focus();try{n.setSelectionRange(at,at)}catch(e){}}}};
  const save=()=>{const b=cleanBk([{...sheet.v,ty:sheet.ty}])[0];
    if(!b||Object.keys(b).filter(k=>k!=="ty"&&k!=="m").length<1){toast(T("Fill in at least one thing first."));return}
    if(sheet.j!=null&&sheet.orig){const od=trip.stays[sheet.orig[0]].days[sheet.orig[1]];od.bk.splice(sheet.j,1);if(!od.bk.length)delete od.bk}
    const d=trip.stays[sheet.a].days[sheet.b];d.bk=d.bk||[];
    if(sheet.j!=null&&!sheet.orig)d.bk[sheet.j]=b;else{if(d.bk.length>=12){toast(T("That's the most for one day."));return}d.bk.push(b)}
    closeSheet();saveTrip();appTrip();toast(T("Added to your trip ✓"))};
  f.onsubmit=e=>{e.preventDefault();save()};
  sh.querySelector(".tv-save").onclick=save;
  const del=sh.querySelector(".at-del");if(del)del.onclick=()=>{const [a,b]=sheet.orig||[sheet.a,sheet.b],d=trip.stays[a].days[b];d.bk.splice(sheet.j,1);if(!d.bk.length)delete d.bk;closeSheet();saveTrip();appTrip()};
}
// Editing a booking that moves to another day: remember where it was.
function editBk(a,b,j){openAdd(a,b,null,j);if(sheet){sheet.orig=[+a,+b];const ds=sh.querySelector(".tv-daysel");if(ds)ds.onchange=()=>{const [x,y]=ds.value.split(".").map(Number);sheet.a=x;sheet.b=y}}}

// The hotel: its name and where it is (a Google Maps link, an address or
// just the name), check-in and check-out, and the booking number. It
// becomes where you're staying in that city, so the days start from it.
function openHotel(a){
  const s=trip.stays[a]||trip.stays[0];if(!s)return;
  sheet={hotel:true,a:trip.stays.indexOf(s),v:{n:hotelName(s),q:"",in:s.hotel&&s.hotel.in||"15:00",out:s.hotel&&s.hotel.out||"11:00",c:s.hotel&&s.hotel.c||""},busy:false};
  drawHotel();showSheet();
}
function drawHotel(){
  const s=trip.stays[sheet.a],v=sheet.v;
  sh.innerHTML=`<div class="at-sh tv-sheet" role="dialog" aria-modal="true">${shHead(`🏨 ${T("Hotel")}`,sheet.busy?T("Looking…"):T("Save"),"tv-save")}
    <form class="at-form tv-form"><div class="at-fg">
      ${trip.stays.length>1?`<label class="w"><small>${T("City")}</small><select class="tv-staysel">${trip.stays.map((x,i)=>`<option value="${i}"${i===sheet.a?" selected":""}>${esc(cityName(x.city))}</option>`).join("")}</select></label>`:""}
      <label class="w"><small>${T("Hotel name")}</small><input name="n" value="${esc(v.n)}" placeholder="Asakusa View Hotel" maxlength="60" autocomplete="off"></label>
      <label class="w"><small>${T("Where is it? A Google Maps link or the address (optional)")}</small><input name="q" value="${esc(v.q)}" placeholder="${esc(T("Paste a Google Maps link"))}" autocomplete="off"></label>
      <label><small>${T("Check-in")}</small><input name="in" type="time" value="${esc(v.in)}"></label><label><small>${T("Check-out")}</small><input name="out" type="time" value="${esc(v.out)}"></label>
      <label class="w"><small>${T("Booking number")}</small><input name="c" value="${esc(v.c)}" maxlength="40" autocomplete="off" placeholder="${esc(T("Optional"))}"></label></div>
      ${s.home?`<p class="at-ftip">📍 ${T("On the map: {n}",{n:s.home.n||T("your stay")})}</p>`:""}
      <p class="at-ftip">🐾 ${T("Apollo: most hotels keep your bags before check-in, so you can go out exploring straight away.")}</p>
      ${hotelName(s)?`<button type="button" class="at-del">${T("Remove the hotel")}</button>`:""}</form></div>`;
  sh.querySelector(".at-shx").onclick=closeSheet;
  const f=sh.querySelector(".tv-form");f.oninput=e=>{if(e.target.name)sheet.v[e.target.name]=e.target.value};
  const ss=sh.querySelector(".tv-staysel");if(ss)ss.onchange=()=>{sheet.a=+ss.value;const x=trip.stays[sheet.a];sheet.v={n:hotelName(x),q:"",in:x.hotel&&x.hotel.in||"15:00",out:x.hotel&&x.hotel.out||"11:00",c:x.hotel&&x.hotel.c||""};drawHotel()};
  const save=async()=>{if(sheet.busy)return;const v=sheet.v,s=trip.stays[sheet.a],n=v.n.trim();
    if(!n&&!v.q.trim()){toast(T("Fill in at least one thing first."));return}
    let at=null,q=v.q.trim();
    if(q){sheet.busy=true;drawHotel();at=await locate(q,s.city,n);if(!sheet){return}sheet.busy=false}
    else if(n&&!s.home){sheet.busy=true;drawHotel();at=await locate(n,s.city,n);if(!sheet)return;sheet.busy=false}
    if(at)s.home=cleanHome({n:n||at.n||T("My stay"),lat:at.lat,lng:at.lng});else if(s.home&&n)s.home.n=n.slice(0,60);
    s.hotel={...(n?{n}:{}),...(goodTime(v.in)?{in:v.in}:{}),...(goodTime(v.out)?{out:v.out}:{}),...(v.c.trim()?{c:v.c.trim().slice(0,40)}:{})};
    closeSheet();saveTrip();renderMap();appTrip();
    const nights=s.days.length-(trip.stays.indexOf(s)===trip.stays.length-1?1:0)||1;
    toast(at||s.home?T("✓ Hotel added for {n} nights",{n:num(nights)}):T("Saved. Add a Google Maps link to put it on the map."))};
  f.onsubmit=e=>{e.preventDefault();save()};sh.querySelector(".tv-save").onclick=save;
  const del=sh.querySelector(".at-del");if(del)del.onclick=()=>{const s=trip.stays[sheet.a];delete s.hotel;s.home=null;closeSheet();saveTrip();renderMap();appTrip()};
}
// Where a hotel is: coordinates in a link, or OpenStreetMap's search near the city.
async function locate(q,c,n){
  const at=linkCoords(q);if(at)return {...at,n:linkName(q)||n};
  let term=q;if(/^https?:/i.test(q)){const nm=linkName(q);if(!nm)return null;term=nm}
  const b=BOX[c],pad=.15;
  try{const r=await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=jp&accept-language=en&viewbox=${b.w-pad},${b.n+pad},${b.e+pad},${b.s-pad}&q=${encodeURIComponent(term)}`);
    if(!r.ok)return null;const x=(await r.json())[0];return x&&inJapan(+x.lat,+x.lon)?{lat:+x.lat,lng:+x.lon,n:x.name||n}:null}catch(e){return null}
}

// ---- the phone's back button: from a trip to the list ----
addEventListener("popstate",e=>{const st=e.state||{};if(view==="trip"&&!st.tnTrip&&!st.tnPlace&&!st.tnList&&!st.tnSearch&&location.hash==="#trip"){view="list";appTrip();window.scrollTo(0,0)}});

function wire(box){
  wireTrip();
  const q=s=>box.querySelectorAll(s);
  // Places open their page, the app way.
  q(".tname").forEach(b=>b.onclick=()=>openPlace(b.dataset.id));
  q(".tv-new,.tv-plus").forEach(b=>b.onclick=openNew);
  q(".tv-card").forEach(b=>b.onclick=()=>openTrip(b.dataset.id||trip.id));
  q(".tv-seg button").forEach(b=>b.onclick=()=>{seg=b.dataset.seg;appTrip()});
  q(".tv-back").forEach(b=>b.onclick=()=>{if(history.state&&history.state.tnTrip)history.back();else{view="list";appTrip();window.scrollTo(0,0)}});
  q(".tv-pills [data-tab]").forEach(b=>b.onclick=()=>{const k=b.dataset.tab;
    if(k==="map"){const ps=allIds(trip).map(x=>BYKEY.get(x)).filter(Boolean);if(!ps.length){toast(T("Add some places first."));return}if(typeof mapOnly==="function"){mapOnly(ps,trip.name||T("My Japan trip"));goTab("map")}return}
    tab=k;appTrip();const p=box.querySelector(".tv-pills");if(p)p.scrollIntoView({block:"start"})});
  q(".tv-dadd").forEach(b=>b.onclick=()=>openAdd(b.dataset.s,b.dataset.d));
  q(".tv-q").forEach(b=>b.onclick=()=>{const ty=b.dataset.ty;if(ty==="hotel")return openHotel(+b.dataset.s);openAdd(b.dataset.s,b.dataset.d,null);sheet.ty=ty;drawAdd()});
  q(".tv-fab,.tv-addany").forEach(b=>b.onclick=()=>{
    // The first day that's still empty, or today's day while you're on the trip.
    const days=allDays(),t=window.tnToday&&tnToday(),x=t?days[t.n]:days.find(z=>!z.d.ids.length&&!(z.d.bk||[]).length)||days[0];if(x)openAdd(x.a,x.b)});
  q(".tv-bked").forEach(b=>b.onclick=()=>editBk(b.dataset.s,b.dataset.d,b.dataset.j));
  q(".tv-hot").forEach(b=>b.onclick=()=>openHotel(+b.dataset.s));
  q(".tv-del").forEach(b=>b.onclick=()=>deleteTrip(trip.id));
  q(".at-more").forEach(b=>b.onclick=()=>{const c=b.closest(".at-stop").querySelector(".at-ctl");c.hidden=!c.hidden;b.setAttribute("aria-expanded",String(!c.hidden))});
  q(".at-attime").forEach(i=>i.onchange=()=>{const d=trip.stays[+i.dataset.s].days[+i.dataset.d],v=goodTime(i.value);d.at=d.at||{};if(v)d.at[i.dataset.k]=v;else delete d.at[i.dataset.k];if(!Object.keys(d.at).length)delete d.at;saveTrip();appTrip()});
  q(".at-share").forEach(b=>b.onclick=()=>{const x=$("tshare");if(x)x.click()});
  q(".at-datein").forEach(i=>{i.onchange=()=>{const v=goodDate(i.value);if(v)trip.start=v;else delete trip.start;saveTrip();appTrip()};
    i.onclick=()=>{try{i.showPicker()}catch(e){}}});
}

// ---- for the home page (js/appshell.js) and the rest of the app ----
window.tnTripDays=()=>({days:allDays().length,dl:trip.start?Math.round((dayAt(0)-todayJ())/864e5):null,date:i=>dayAt(i)});
window.tnToday=function(){
  if(!trip.start)return null;const dl=Math.round((dayAt(0)-todayJ())/864e5),days=allDays();
  if(dl>0||-dl>=days.length)return null;const x=days[-dl];
  return {n:x.n,a:x.a,b:x.b,s:x.s,d:x.d,items:timeline(x.s,x.d).items,clock,w:wxFor(x.s.city,iso8(dayAt(x.n)))};
};
// Open the trip on a given day (the home page's Today card).
window.tnOpenDay=(a,b)=>{view="trip";tab="plan";appTrip();const x=allDays().find(z=>z.a===+a&&z.b===+b);
  setTimeout(()=>{const el=x&&document.getElementById("tvd-"+x.n);if(el)el.scrollIntoView({block:"start"})},30)};
window.tnNewTrip=openNew;
// The trip's days with their dates, stops and bookings, for the reminders
// (js/appremind.js). Times are minutes after midnight in Japan.
window.tnTripPlan=()=>!trip.start?[]:allDays().map(x=>{const tl=timeline(x.s,x.d);
  return {n:x.n,a:x.a,b:x.b,date:iso8(dayAt(x.n)),city:x.s.city,
    stops:tl.items.filter(i=>i.k==="stop").map(i=>({key:PKEY(i.p),n:i.p.n,t:i.t})),
    bk:tl.items.filter(i=>i.k==="bk").map(i=>({ty:i.b.ty,t:i.t,a:i.b.a||"",b:i.b.b||"",n:i.b.n||""})),
    hotel:x.b===0&&x.s.hotel&&x.s.hotel.n?{n:x.s.hotel.n,t:x.s.hotel.in?toMin(x.s.hotel.in):900}:null}});
// Draw the app's My trip whenever the site would draw its own.
const _render=renderTrip;
renderTrip=function(){if(shared)return _render();appTrip()};
// Tapping the My trip tab again goes back to the list of trips.
addEventListener("click",e=>{const tb=e.target.closest&&e.target.closest('#tabbar [data-t="trip"]');if(tb&&view==="trip"&&location.hash==="#trip"){view="list";appTrip();window.scrollTo(0,0)}},true);
appTrip();
if(window.tnRenderExplore)tnRenderExplore();
})();
