// My trip in the app layout, made like a travel app:
// - The trip's cover: a photo of the first city, the name, the dates and a
//   countdown, the route from city to city, your bookings, where you're
//   staying, and every day with its weather.
// - A day: the days across the top like a calendar, then the day as a
//   timeline with times (from when the day starts and how long each place
//   takes), how to get from one stop to the next, a halal lunch from Apollo
//   around noon, and your bookings at their times. The day's map shows the
//   stops numbered along their route, with directions in Google Maps.
// - Adding to a day: a place, a halal restaurant, a flight, a hotel, a
//   train, a ticket or a note.
//
// It only draws: the buttons carry the same classes and data the website's
// My trip uses, so js/trip.js's wireTrip() does the shared work (move,
// remove, reorder, stay, picker, PDF, share, sync). Bookings, the trip's
// date and each day's start time are kept in the trip by js/trip.js too.
// A trip someone shared with you keeps the website's view.
(function(){
if(!IS_APP)return;

const SVG=(d,s=20)=>`<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const I={share:'<path d="M12 15V4m0 0-4 4m4-4 4 4M6 13v6h12v-6"/>',dots:'<circle cx="12" cy="5" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="12" cy="19" r="1.4"/>',
  map:'<path d="m9 4-5 2v14l5-2 6 2 5-2V4l-5 2-6-2zM9 4v14M15 6v14"/>',back:'<path d="m15 5-7 7 7 7"/>',plus:'<path d="M12 5v14M5 12h14"/>',x:'<path d="M6 6l12 12M18 6 6 18"/>',
  walk:'<circle cx="13" cy="4" r="2"/><path d="m9 20 3-6 3 3v4M7 12l3-4 4 1 2 4"/>',train:'<rect x="6" y="3" width="12" height="14" rx="3"/><path d="M6 11h12M9 17l-2 4M15 17l2 4"/>',
  list:'<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',cal:'<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',clock:'<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>'};
let si=0,di=0,seen=null,view="trip",compact=false,sheet=null;
try{compact=store.get("tabineko-compact")==="1"}catch(e){}
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

// ---- a day as a timeline ----
const BK={flight:["✈️","Flight"],hotel:["🏨","Hotel"],train:["🚄","Train"],ticket:["🎟️","Ticket or booking"],note:["📝","Note"]};
function bkTitle(b){
  if(b.ty==="flight"||b.ty==="train")return [b.a,b.b].filter(Boolean).join(" → ")||T(BK[b.ty][1]);
  return b.n||b.a||T(BK[b.ty][1])}
const bdis=a=>a.filter(Boolean).map(x=>`<bdi>${esc(x)}</bdi>`).join(" · ");
function bkSub(b){
  const x=[];if(b.ty==="flight"||b.ty==="train"){if(b.n)x.push(b.n);if(b.x)x.push(T("Seat {s}",{s:b.x}))}
  else if(b.ty==="hotel"){if(b.x)x.push(b.x)}else if(b.x)x.push(b.x);
  if(b.note)x.push(b.note);return x}
function timeline(s,d,ref){
  const ps=d.ids.map(k=>BYKEY.get(k)),home=s.home,items=[];
  let t=toMin(d.st);
  if(home&&ps.length)items.push({k:"home",t});
  const lunch=!ps.some(p=>p.cat==="food")&&dayIdeas(ps,home,s.city,new Set()).find(x=>x.icon==="🍜");
  let lunchDone=!lunch,prev=home;
  const go=to=>{if(prev){const h=hop(prev,to);items.push({k:"hop",h});t+=h.m}prev=to};
  ps.forEach((p,i)=>{
    // Lunch goes in once the morning's done (from about 11:45).
    if(!lunchDone&&i>0&&t>=705){go(lunch.p);items.push({k:"lunch",x:lunch,t});t+=60;lunchDone=true}
    go(p);const m=durMin(p.dur);items.push({k:"stop",p,i,t,m});t+=m});
  if(!lunchDone&&ps.length){go(lunch.p);items.push({k:"lunch",x:lunch,t});t+=60}
  // Bookings go in at their times; ones without a time open the day.
  (d.bk||[]).forEach((b,j)=>{const it={k:"bk",b,j,t:b.tm?toMin(b.tm):-1};
    const at=it.t<0?0:items.findIndex(x=>x.t!=null&&x.t>it.t&&x.k!=="hop");
    items.splice(at<0?items.length:at,0,it)});
  return {items,ps};
}
function stopCard(p,i,ref){
  const k=PKEY(p),tip=(D(p,"tip")||"").split(/(?<=[.!؟?])\s/)[0];
  return `<div class="at-tc at-stop" data-k="${esc(k)}" style="--c:var(--${p.cat})">
    ${compact?"":`<img src="${esc(p.photo||CATS[p.cat].img)}" alt="" loading="lazy"${p.photo?"":` class="art"`}>`}
    <span class="at-si"><button type="button" class="tname" data-id="${p.id}"><bdi>${esc(p.n)}</bdi></button>
      <small>${esc(D(CATS[p.cat],"n"))} · ${esc(AREA(p.area))}${p.halal?` · <em>${p.hl==="friendly"?T("Muslim-friendly"):T("✓ halal")}</em>`:""}</small>
      ${compact||!tip?"":`<i class="at-tip">🐾 ${esc(tip)}</i>`}</span>
    <button type="button" class="at-more" aria-label="${esc(T("Options"))}" aria-expanded="false">${SVG(I.dots)}</button>
    <div class="at-ctl" hidden><button type="button" class="tup" data-k="${esc(k)}">↑ ${T("Up")}</button><button type="button" class="tdown" data-k="${esc(k)}">↓ ${T("Down")}</button>
      ${moveMenu(k,ref)}<button type="button" class="tdel" data-k="${esc(k)}">× ${T("Remove")}</button></div></div>`}
function dayHTML(){
  const s=trip.stays[si],d=s.days[di],ref=si+"."+di,days=allDays(),me=days.find(x=>x.a===si&&x.b===di),date=dayAt(me.n);
  const {items,ps}=timeline(s,d,ref);
  let km=0;for(let i=1;i<ps.length;i++)km+=KM(ps[i-1],ps[i]);
  const w=date&&wxFor(s.city,iso8(date));
  let h=`<div class="at-dview">
    <header class="at-dh"><button type="button" class="at-cb at-back" aria-label="${esc(T("Back"))}">${SVG(I.back,22)}</button>
      <div><small>${esc(T("Day {n}",{n:me.n+1}))} · ${esc(date?`${wd(date)} ${md(date)}`:cityName(s.city))}</small>
        <input class="tday-t at-dt" data-day="${ref}" value="${esc(d.t)}" placeholder="${esc(T("Name this day, e.g. Asakusa & Ueno"))}" maxlength="50" aria-label="${esc(T("Day title"))}"></div>
      ${ps.length?`<button type="button" class="at-mapb" aria-label="${esc(T("The day on the map"))}">${SVG(I.map)}</button>`:""}</header>
    <div class="at-strip">${days.map(x=>{const dt=dayAt(x.n);return `<button type="button" class="at-sd${x.a===si&&x.b===di?" on":""}" data-s="${x.a}" data-d="${x.b}" style="--c:${CITY_COL[trip.stays.indexOf(x.s)%CITY_COL.length]}">
        <small>${esc(dt?wd(dt):cityName(x.s.city))}</small><b>${num(dt?dt.getUTCDate():x.n+1)}</b></button>`}).join("")}
      ${days.length<30?`<button type="button" class="taddday at-sd add" data-s="${si}" aria-label="${esc(T("Add a day in {c}",{c:cityName(s.city)}))}">＋</button>`:""}</div>
    <div class="at-chips">${w?`<span>${wxIcon(w.code)} ${num(w.t)}°</span>`:""}<span>${esc(N(ps.length,"1 place","{n} places"))}</span>${km?`<span>🚶 ${esc(T("~{n} km",{n:num(km.toFixed(1))}))}</span>`:""}
      <label class="at-st">${SVG(I.clock,15)} ${T("Starts")} <input type="time" class="at-stin" value="${esc(d.st||"09:00")}" aria-label="${esc(T("When the day starts"))}"></label>
      <button type="button" class="at-cmp${compact?" on":""}" aria-pressed="${compact}">${SVG(I.list,15)} ${T("Compact")}</button></div>
    <div class="at-tline${compact?" compact":""}">`;
  if(!items.length)h+=`<p class="at-none">${T("Nothing here yet. Add places, or move your ideas into this day.")}</p>`;
  items.forEach(it=>{
    if(it.k==="hop"){h+=`<div class="at-hop"><span>${SVG(it.h.walk?I.walk:I.train,14)}</span>${esc(isAR()?iso(it.h.t):it.h.t)}</div>`;return}
    const tm=it.t!=null&&it.t>=0?`<b>${esc(clock(it.t))}</b>${it.m?`<small>${esc(isAR()?iso(durText(it.m)):durText(it.m))}</small>`:""}`:"";
    let card="",dot="";
    if(it.k==="home"){dot="h";card=`<div class="at-tc at-hotel"><span class="at-bi">🏨</span><span class="at-si"><b>${T("Leave your stay")}</b><small>${esc(s.home.n||T("your stay"))}</small></span></div>`}
    if(it.k==="stop"){card=stopCard(it.p,it.i,ref)}
    if(it.k==="lunch"){dot="f";const p=it.x.p;card=`<div class="at-tc at-lunchc">${compact?"":`<img src="${esc(p.photo||CATS[p.cat].img)}" alt="" loading="lazy">`}
      <span class="at-si"><span class="at-hal">🍜 ${T("Halal lunch · Apollo's pick")}</span><button type="button" class="tname" data-id="${p.id}"><bdi>${esc(p.n)}</bdi></button>
      <small>${esc(D(CATS[p.cat],"n"))} · ${esc(T("{n} km",{n:num(it.x.km.toFixed(1))}))}</small></span>
      <button type="button" class="tlunch-add at-add" data-k="${esc(PKEY(p))}" data-day="${ref}" aria-label="${esc(T("＋ add"))}">＋</button></div>`}
    if(it.k==="bk"){dot="b";const b=it.b;card=`<div class="at-tc at-bk at-bk-${b.ty}"><span class="at-bi">${BK[b.ty][0]}</span><span class="at-si"><b>${esc(bkTitle(b))}</b>${bkSub(b).length?`<small>${bdis(bkSub(b))}</small>`:""}</span>
      <button type="button" class="at-bked" data-j="${it.j}" aria-label="${esc(T("Edit"))}">${SVG(I.dots)}</button></div>`}
    h+=`<div class="at-row"><div class="at-time">${it.k==="bk"&&it.b.tm?`<b>${esc(clock(toMin(it.b.tm)))}</b>`:tm}</div><i class="at-dot ${dot}"></i>${card}</div>`;
  });
  h+=`</div>`;
  const more=dayIdeas(ps,s.home,s.city,new Set()).filter(x=>x.icon!=="🍜");
  h+=more.map(x=>`<p class="at-lunch">${x.icon} ${T(x.label)} <button type="button" class="tname" data-id="${x.p.id}"><bdi>${esc(x.p.n)}</bdi></button> <span>${esc(T("{n} km",{n:num(x.km.toFixed(1))}))}</span>
    <button type="button" class="tlunch-add" data-k="${esc(PKEY(x.p))}" data-day="${ref}" aria-label="${esc(T("＋ add"))}">＋</button></p>`).join("");
  h+=`<div class="at-dact"><button type="button" class="tpickb at-btn ghost" data-day="${ref}">＋ ${T("Add places")}</button>
      ${ps.length?`<button type="button" class="tshare at-btn" data-day="${ref}">📄 ${T("Share this day as PDF")}</button>`:""}</div>
    <div class="at-foot">${s.days.length>1?`<button type="button" class="tdayx at-link" data-day="${ref}">${T("Remove this day")}</button>`:""}
      <button type="button" class="tstayx at-link" data-s="${si}">${esc(T("Remove {c} from the trip",{c:cityName(s.city)}))}</button></div>
    <button type="button" class="at-fab" aria-label="${esc(T("Add to this day"))}">${SVG(I.plus,26)}</button></div>`;
  return h;
}

// ---- the cover ----
const CITY_COL=["#F14E24","#2E8C88","#7B5EA7","#1D52A0","#E8A800","#5E9A3E"];
function coverPhoto(c){return (HOODS.find(h=>h.city===c&&h.photo)||{}).photo||(P.find(p=>p.city===c&&p.photo&&p.tier==="must")||P.find(p=>p.city===c&&p.photo)||{}).photo}
function countdown(nd){
  if(!trip.start)return `<label class="at-count set">${SVG(I.cal,15)} ${T("Set your travel date")}<input type="date" class="at-datein" aria-label="${esc(T("First day of the trip"))}"></label>`;
  const d0=dayAt(0),dl=Math.round((d0-todayJ())/864e5);
  const t=dl>1?T("✈️ {n} days to go",{n:num(dl)}):dl===1?T("✈️ Tomorrow!"):dl===0?T("🧳 Today's the day!"):-dl<nd?T("🧳 Day {n} of your trip",{n:num(1-dl)}):T("🐾 Welcome back");
  return `<label class="at-count">${esc(t)}<input type="date" class="at-datein" value="${esc(trip.start)}" aria-label="${esc(T("First day of the trip"))}"></label>`}
function bkAll(){const out=[];allDays().forEach(x=>(x.d.bk||[]).forEach((b,j)=>out.push({...x,bk:b,j})));return out}
function coverHTML(){
  const t=trip,n=tripCount(t),days=allDays(),nd=days.length,first=t.stays[0],img=first&&coverPhoto(first.city);
  const halal=allIds(t).filter(k=>BYKEY.get(k).halal).length,bks=bkAll(),d0=dayAt(0),dl=dayAt(Math.max(0,nd-1));
  const when=[d0?`${md(d0)} – ${md(dl)}`:"",N(nd,"1 day","{n} days"),N(t.stays.length,"1 city","{n} cities")].filter(Boolean).join(" · ");
  let h=`<div class="at-cover">${img?`<img src="${esc(img)}" alt="">`:""}<div class="at-shade"></div>
    <div class="at-cbtn"><button type="button" class="at-cb at-share" aria-label="${esc(T("Share"))}">${SVG(I.share)}</button></div>
    <div class="at-ctext">${countdown(nd)}
      <input class="tname-in at-title" id="tripname" value="${esc(t.name)}" placeholder="${esc(T("My Japan trip 🇯🇵"))}" maxlength="60" aria-label="${esc(T("Trip name"))}">
      <p>${esc(isAR()?iso(when):when)}</p></div></div>`;
  if(shareAsk)h+=`<div class="tshareask"><p>${T("Include where you're staying? Anyone with the link will see it.")}</p>
    <button type="button" class="store" data-home="0">${T("Share without it")}</button><button type="button" class="store" data-home="1">${T("Include it")}</button></div>`;
  h+=`<div class="at-route">${t.stays.map((x,i)=>`${i?`<i aria-hidden="true">${arrow()}</i>`:""}<button type="button" class="at-rc" data-s="${i}" style="--c:${CITY_COL[i%CITY_COL.length]}"><b>${esc(cityName(x.city))}</b><small>${esc(N(x.days.length,"1 day","{n} days"))}</small></button>`).join("")}
    ${t.stays.length<10?`<button type="button" class="tnextb at-rc add">＋<small>${T("City")}</small></button>`:""}</div>`;
  if(addingCity)h+=`<div class="tnext at-next">${cityChooser(T("Where to next?"),"")}<button type="button" class="tclear tnext-x">${T("Cancel")}</button></div>`;
  h+=`<div class="at-stats"><div><b>${num(n)}</b><small>${T(n===1?"place":"places")}</small></div><div class="h"><b>${num(halal)}</b><small>${T("halal food")}</small></div><div><b>${num(bks.length)}</b><small>${T(bks.length===1?"booking":"bookings")}</small></div></div>`;
  if(bks.length)h+=`<h2 class="at-h">${T("Bookings")}</h2>`+bks.map(x=>`<button type="button" class="at-bkrow" data-s="${x.a}" data-d="${x.b}"><span class="at-bi">${BK[x.bk.ty][0]}</span>
      <span class="at-si"><b>${esc(bkTitle(x.bk))}</b><small>${bdis([T("Day {n}",{n:x.n+1}),dayAt(x.n)?md(dayAt(x.n)):"",x.bk.tm?clock(toMin(x.bk.tm)):"",...bkSub(x.bk)])}</small></span><i aria-hidden="true">${arrow()}</i></button>`).join("");
  h+=`<h2 class="at-h">${T("Where you're staying")}</h2>`+t.stays.map((x,i)=>`<div class="at-home"><small>${esc(cityName(x.city))}</small>${homeCard(x,i,false)}</div>`).join("");
  h+=`<h2 class="at-h">${T("Your days")}</h2><div class="at-all">${days.map(x=>{const dt=dayAt(x.n),w=dt&&wxFor(x.s.city,iso8(dt));
    return `<button type="button" class="at-ov" data-s="${x.a}" data-d="${x.b}"><span class="at-dn" style="--c:${CITY_COL[x.a%CITY_COL.length]}">${num(x.n+1)}</span>
      <span><b>${esc(x.d.t||cityName(x.s.city))}</b><small>${esc([dt?`${wd(dt)} ${md(dt)}`:cityName(x.s.city),N(x.d.ids.length,"1 place","{n} places"),(x.d.bk||[]).length?BK[x.d.bk[0].ty][0]:""].filter(Boolean).join(" · "))}</small></span>
      ${w?`<em>${wxIcon(w.code)} ${num(w.t)}°</em>`:`<i aria-hidden="true">${arrow()}</i>`}</button>`}).join("")}</div>`;
  h+=ideasRow(t);
  h+=`<h2 class="at-h">${T("Do more")}</h2><div class="at-acts">
    ${typeof openPlanner==="function"?`<button type="button" class="tplanb at-act a1"><span>✨</span><b>${T("Let Apollo sort it")}</b><small>${T("From his notebook, with halal food")}</small></button>`:""}
    ${n?`<button type="button" class="at-act a2" id="tpdf"><span>📘</span><b>${T("Trip PDF")}</b><small>${T("Every day, with map links")}</small></button>`:""}
    <button type="button" class="at-act a3" id="tshare"><span>👥</span><b>${T("Share with friends")}</b><small>${T("Send them a link")}</small></button></div>
    ${typeof acctBar==="function"?`<div class="at-acct">${acctBar()}</div>`:""}
    <div class="at-foot">${typeof isShared==="function"&&isShared()&&tripOwner()!==me()?"":`<button type="button" class="tclear at-link" id="tclear">${T("Start over")}</button>`}</div>`;
  return h;
}

function emptyPage(){
  const pics=TRIP_CITIES.filter(c=>c!=="ise").map(c=>[c,coverPhoto(c)]);
  return `<div class="at-empty"><img src="assets/cat.png" alt=""><h1>${T("Your trip starts here ✈️")}</h1><p>${T("Pick your cities, and Apollo helps you sort each day, with halal food nearby.")}</p></div>
    ${typeof openPlanner==="function"?`<button type="button" class="tplanb at-big"><span aria-hidden="true">✨</span><span><b>${T("Let Apollo plan it")}</b><small>${T("Tell him where and for how long. He sorts every day in seconds.")}</small></span><i aria-hidden="true">${arrow()}</i></button>`:""}
    <h2 class="at-h">${T("Or start yourself: where to first?")}</h2>
    <div class="at-cgrid">${pics.map(([c,img])=>`<button type="button" class="tchip at-cg" data-city="${c}">${img?`<img src="${img}" alt="" loading="lazy">`:""}<b>${esc(cityName(c))}</b></button>`).join("")}</div>`;
}
function ideasRow(t){
  if(!t.ideas.length)return "";
  return `<section class="tlist-drop" data-day="ideas"><h2 class="at-h">${T("Your ideas 💡")}<small>${esc(N(t.ideas.length,"1 place you haven't sorted yet","{n} places you haven't sorted yet"))}</small></h2>
    <ul class="at-ideas">${t.ideas.map(k=>{const p=BYKEY.get(k);return `<li class="at-idea" data-k="${esc(k)}"><img src="${esc(p.photo||CATS[p.cat].img)}" alt="" loading="lazy"${p.photo?"":` class="art"`}>
      <button type="button" class="tname" data-id="${p.id}"><bdi>${esc(p.n)}</bdi></button><small>${esc(D(CATS[p.cat],"n"))}</small>
      <span class="at-iact">${moveMenu(k,"ideas")}<button type="button" class="tdel" data-k="${esc(k)}" aria-label="${esc(T("Remove"))}">×</button></span></li>`}).join("")}</ul></section>`;
}

function appTrip(){
  const box=$("tripbook");if(!box)return;
  const t=trip,now=t.stays.map(x=>x.city);
  // One city added at the end (you just picked it): show it. Anything else
  // (a plan from Apollo, a synced or shared trip): back to the cover.
  if(seen&&now.length===seen.length+1&&seen.every((c,i)=>c===now[i])){si=now.length-1;di=0}
  else if(seen&&(now.length!==seen.length||seen.some((c,i)=>c!==now[i]))){si=0;di=0;view="trip"}
  seen=now;
  if(si>=t.stays.length)si=Math.max(0,t.stays.length-1);
  const s=t.stays[si];if(s&&di>=s.days.length)di=s.days.length-1;if(di<0)di=0;
  if(!s)view="trip";
  box.classList.toggle("at-onday",view==="day");
  if(!t.stays.length&&!t.ideas.length){box.innerHTML=emptyPage()+(typeof acctBar==="function"?`<div class="at-acct">${acctBar()}</div>`:"");wire(box);return}
  box.innerHTML=view==="day"?dayHTML():coverHTML();wire(box);
}

// ---- adding to a day ----
const FORMS={flight:[["a","From","RUH"],["b","To","NRT"],["n","Flight","SV 386"],["tm","Time",""],["note","Note",""]],
  hotel:[["n","Hotel name",""],["tm","Check-in",""],["x","Confirmation number",""],["note","Note",""]],
  train:[["a","From","Tokyo"],["b","To","Kyoto"],["n","Train","Nozomi 215"],["tm","Departs",""],["x","Car / seat","7 · 12E"]],
  ticket:[["n","What","teamLab Planets"],["tm","Time",""],["x","Confirmation number",""],["note","Note",""]],
  note:[["note","Note",""],["tm","Time",""]]};
const sh=document.createElement("div");sh.id="atsheet";sh.hidden=true;document.body.appendChild(sh);
sh.addEventListener("click",e=>{if(e.target===sh)closeSheet()});
function openSheet(edit){sheet={ty:edit!=null?trip.stays[si].days[di].bk[edit].ty:null,j:edit,v:edit!=null?{...trip.stays[si].days[di].bk[edit]}:{}};drawSheet();sh.hidden=false;document.documentElement.classList.add("at-sheet-open")}
function closeSheet(){sh.hidden=true;sheet=null;document.documentElement.classList.remove("at-sheet-open")}
function fujiTip(v){const a=LOW((v.a||"")+" "+(v.b||""));return /tokyo|طوكيو|shinagawa/.test(a)&&/kyoto|كيوتو|osaka|أوساكا|اوساكا|nagoya|hiroshima|kobe|كوبي/.test(a)}
function drawSheet(){
  const me=allDays().find(x=>x.a===si&&x.b===di),ref=si+"."+di;
  let h=`<div class="at-sh" role="dialog" aria-modal="true"><i class="at-grab"></i><header><b>${esc(sheet.j!=null?T("Edit booking"):T("Add to Day {n}",{n:me.n+1}))}</b><button type="button" class="at-shx" aria-label="${esc(T("Close"))}">${SVG(I.x)}</button></header>`;
  if(sheet.j==null)h+=`<div class="at-types"><button type="button" data-ty="place"><span>📍</span><b>${T("A place from the notebook")}</b></button><button type="button" data-ty="halal"><span>🍜</span><b>${T("Halal restaurant")}</b></button>
    ${Object.keys(BK).map(k=>`<button type="button" data-ty="${k}"${sheet.ty===k?' class="on"':""}><span>${BK[k][0]}</span><b>${T(BK[k][1])}</b></button>`).join("")}</div>`;
  if(sheet.ty){const v=sheet.v;h+=`<form class="at-form"><h4>${BK[sheet.ty][0]} ${T(BK[sheet.ty][1])}</h4><div class="at-fg">${FORMS[sheet.ty].map(([k,l,ph])=>`<label class="${k==="note"?"w":""}"><small>${T(l)}</small>
      ${k==="note"?`<textarea name="note" maxlength="200" rows="2">${esc(v.note||"")}</textarea>`:`<input name="${k}" ${k==="tm"?'type="time"':'autocomplete="off"'} value="${esc(v[k]||"")}" placeholder="${esc(ph)}" maxlength="60">`}</label>`).join("")}</div>
      ${sheet.ty==="train"&&fujiTip(v)?`<p class="at-ftip">🐾 ${T("Apollo: pick seat E on the Tokaido shinkansen to see Mount Fuji 🗻")}</p>`:""}
      <button type="submit" class="at-save">${T(sheet.j!=null?"Save":"Add to the trip")}</button>${sheet.j!=null?`<button type="button" class="at-del">${T("Delete")}</button>`:""}</form>`}
  sh.innerHTML=h+`</div>`;
  sh.querySelector(".at-shx").onclick=closeSheet;
  sh.querySelectorAll(".at-types button").forEach(b=>b.onclick=()=>{const ty=b.dataset.ty;
    if(ty==="place"||ty==="halal"){closeSheet();openPicker(ref);if(ty==="halal"){pk.cat="food";pk.halal=true;renderPicker()}return}
    sheet.ty=ty;sheet.v={};drawSheet();const f=sh.querySelector(".at-form input,.at-form textarea");if(f)f.focus()});
  const f=sh.querySelector(".at-form");if(!f)return;
  f.oninput=e=>{const el=e.target;sheet.v[el.name]=el.value;if(sheet.ty==="train"&&(el.name==="a"||el.name==="b")){const has=!!sh.querySelector(".at-ftip");if(has!==fujiTip(sheet.v)){const at=el.selectionStart,nm=el.name;drawSheet();const n=sh.querySelector(`[name="${nm}"]`);n.focus();n.setSelectionRange(at,at)}}};
  f.onsubmit=e=>{e.preventDefault();const d=trip.stays[si].days[di],b=cleanBk([{...sheet.v,ty:sheet.ty}])[0];
    if(Object.keys(b).length<2){toast(T("Fill in at least one thing first."));return}
    d.bk=d.bk||[];if(sheet.j!=null)d.bk[sheet.j]=b;else{if(d.bk.length>=12){toast(T("That's the most for one day."));return}d.bk.push(b)}
    closeSheet();saveTrip();appTrip();toast(T("Added to your trip ✓"))};
  const del=sh.querySelector(".at-del");if(del)del.onclick=()=>{const d=trip.stays[si].days[di];d.bk.splice(sheet.j,1);if(!d.bk.length)delete d.bk;closeSheet();saveTrip();appTrip()};
}

// ---- opening a day: the phone's back button returns to the cover ----
function openDay(a,b,fromHistory){si=a;di=b;view="day";appTrip();window.scrollTo(0,0);if(!fromHistory&&!(history.state&&history.state.tnDay))history.pushState({tnDay:1},"")}
function closeDay(){if(history.state&&history.state.tnDay)history.back();else{view="trip";appTrip();window.scrollTo(0,0)}}
addEventListener("popstate",e=>{const st=e.state||{};if(view==="day"&&!st.tnDay&&!st.tnPlace&&!st.tnList&&!st.tnSearch){view="trip";appTrip();window.scrollTo(0,0)}});

function wire(box){
  wireTrip();
  const q=s=>box.querySelectorAll(s);
  // Places open their page, the app way.
  q(".tname").forEach(b=>b.onclick=()=>openPlace(b.dataset.id));
  q(".at-ov,.at-bkrow").forEach(b=>b.onclick=()=>openDay(+b.dataset.s,+b.dataset.d));
  q(".at-rc[data-s]").forEach(b=>b.onclick=()=>openDay(+b.dataset.s,0));
  q(".at-sd[data-d]").forEach(b=>b.onclick=()=>{si=+b.dataset.s;di=+b.dataset.d;appTrip();const on=box.querySelector(".at-sd.on");if(on)on.scrollIntoView({inline:"center",block:"nearest"})});
  q(".at-back").forEach(b=>b.onclick=closeDay);
  // A new day opens straight away.
  q(".taddday").forEach(b=>b.onclick=()=>{const s=trip.stays[+b.dataset.s];s.days.push({t:"",ids:[]});di=s.days.length-1;saveTrip();appTrip();renderList()});
  q(".at-more").forEach(b=>b.onclick=()=>{const c=b.closest(".at-stop").querySelector(".at-ctl");c.hidden=!c.hidden;b.setAttribute("aria-expanded",String(!c.hidden))});
  q(".at-share").forEach(b=>b.onclick=()=>{const x=$("tshare");if(x)x.click()});
  q(".at-fab").forEach(b=>b.onclick=()=>openSheet(null));
  q(".at-bked").forEach(b=>b.onclick=()=>openSheet(+b.dataset.j));
  q(".at-cmp").forEach(b=>b.onclick=()=>{compact=!compact;store.set("tabineko-compact",compact?"1":"0");appTrip()});
  q(".at-stin").forEach(i=>i.onchange=()=>{const d=trip.stays[si].days[di],v=goodTime(i.value);if(v&&v!=="09:00")d.st=v;else delete d.st;saveTrip();appTrip()});
  q(".at-datein").forEach(i=>{i.onchange=()=>{const v=goodDate(i.value);if(v)trip.start=v;else delete trip.start;saveTrip();appTrip()};
    i.onclick=()=>{try{i.showPicker()}catch(e){}}});
  // The whole day on the real map: numbered stops along the route.
  q(".at-mapb").forEach(b=>b.onclick=()=>{const s=trip.stays[si],d=s.days[di],ps=d.ids.map(k=>BYKEY.get(k));
    if(!ps.length||typeof mapOnly!=="function")return;mapOnly(ps,`${T("Day {n}",{n:allDays().find(x=>x.a===si&&x.b===di).n+1})}${d.t?" · "+d.t:""}`,true);goTab("map")});
}

// For the home page (js/appshell.js): the trip's countdown, and today's
// plan while you're on the trip.
window.tnTripDays=()=>({days:allDays().length,dl:trip.start?Math.round((dayAt(0)-todayJ())/864e5):null,date:i=>dayAt(i)});
window.tnToday=function(){
  if(!trip.start)return null;const dl=Math.round((dayAt(0)-todayJ())/864e5),days=allDays();
  if(dl>0||-dl>=days.length)return null;const x=days[-dl];
  return {n:x.n,a:x.a,b:x.b,s:x.s,d:x.d,items:timeline(x.s,x.d).items,clock,w:wxFor(x.s.city,iso8(dayAt(x.n)))};
};
window.tnOpenDay=(a,b)=>openDay(a,b);
// Draw the app's My trip whenever the site would draw its own.
const _render=renderTrip;
renderTrip=function(){if(shared)return _render();appTrip()};
// Tapping the My trip tab again returns to the cover.
addEventListener("click",e=>{const tb=e.target.closest&&e.target.closest('#tabbar [data-t="trip"]');if(tb&&view==="day"&&location.hash==="#trip"){view="trip";appTrip()}},true);
appTrip();
if(window.tnRenderExplore)tnRenderExplore();
})();
