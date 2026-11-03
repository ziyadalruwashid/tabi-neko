// Reminders (the app only). Two kinds:
//
// 1. Phone notifications from your trip plan, set ahead on the phone with
//    Capacitor's local notifications (no server, no location): a morning
//    summary of the day, a reminder before each stop (with its stamp if it
//    has one), an evening wrap-up, the flight the day before, and hotel
//    check-in. They're set again whenever you leave the app, so they follow
//    your latest plan.
// 2. A banner while the app is open, when you're inside a stamp place's
//    circle: "You're 120 m from Senso-ji! Get the stamp". This only uses
//    your location while the app is open, and only once you've allowed it.
//
// Settings live on this phone (Reminders, in More). Your buddy writes the
// messages (T() swaps Apollo's name, see js/app.js).
(function(){
if(typeof IS_APP==="undefined"||!IS_APP)return;
const LN=()=>window.Capacitor&&Capacitor.Plugins&&Capacitor.Plugins.LocalNotifications;
const KEY="tabineko-remind",DONE="tabineko-near-done";
const DEF={morning:"07:30",before:15,banner:true,evening:false,flight:true,hotel:true};
let set={...DEF};try{set={...DEF,...JSON.parse(store.get(KEY)||"{}")}}catch(e){}
const save=()=>{try{store.set(KEY,JSON.stringify(set))}catch(e){}};
const toMin=s=>{const[h,m]=String(s||"07:30").split(":").map(Number);return h*60+(m||0)};
const hhmm=m=>{m=((m%1440)+1440)%1440;return `${Math.floor(m/60)}:${String(m%60).padStart(2,"0")}`};
// A day ("2026-11-10") and minutes after midnight in Japan, as a moment.
const at=(date,min)=>{const [y,mo,d]=date.split("-").map(Number);return new Date(Date.UTC(y,mo-1,d,0,0)+(min-540)*60000)};
const city=c=>D(CITIES[c]||{n:c},"n");
const list=a=>a.slice(0,3).join(isAR()?"، ":", ")+(a.length>3?"…":"");
const stamp=k=>{const s=window.tnStampInfo&&tnStampInfo(k);return s&&!s.got};

// ---- 1. the notifications ----
function plan(){
  const days=window.tnTripPlan?tnTripPlan():[],out=[];
  days.forEach((d,i)=>{
    const names=d.stops.map(s=>s.n),waiting=d.stops.filter(s=>stamp(s.key)).length,dayN=isAR()?iso(String(d.n+1)):d.n+1;
    if(set.morning&&d.stops.length)out.push({when:at(d.date,toMin(set.morning)),title:T("Day {n} in {c} ☀️",{n:dayN,c:city(d.city)}),
      body:T("{list} today.",{list:list(names)})+(waiting?" "+(waiting===1?T("1 stamp waiting for you 🐾"):T("{n} stamps waiting for you 🐾",{n:waiting})):""),a:d.a,b:d.b});
    if(set.before)d.stops.forEach(s=>out.push({when:at(d.date,s.t-set.before),title:T("{p} at {t}",{p:s.n,t:hhmm(s.t)}),
      body:stamp(s.key)?T("Your next stop. Don't forget its stamp! 🐾"):T("Your next stop. Tap to see the day."),a:d.a,b:d.b}));
    if(set.evening&&d.stops.length){const nx=days[i+1];
      out.push({when:at(d.date,20*60),title:T("Day {n} done 🌙",{n:dayN}),body:nx&&nx.stops.length?T("Tomorrow: {list}.",{list:list(nx.stops.map(s=>s.n))}):T("Rest well. See you tomorrow 🐾"),a:d.a,b:d.b})}
    if(set.flight)d.bk.filter(b=>b.ty==="flight"&&b.t>=0).forEach(b=>out.push({when:at(d.date,b.t-1440),title:T("Flight tomorrow ✈️"),
      body:T("{from} → {to} at {t}. Passport, charger, and a halal snack for the plane.",{from:b.a||"?",to:b.b||"?",t:hhmm(b.t)}),a:d.a,b:d.b}));
    if(set.hotel&&d.hotel)out.push({when:at(d.date,Math.max(8*60,d.hotel.t-120)),title:T("Check-in today 🏨"),body:T("{h} from {t}.",{h:d.hotel.n,t:hhmm(d.hotel.t)}),a:d.a,b:d.b});
  });
  const soon=Date.now()+60000;
  return out.filter(x=>x.when.getTime()>soon).sort((x,y)=>x.when-y.when).slice(0,60);
}
let busy=false;
async function schedule(ask){
  const L=LN();if(!L||busy)return;busy=true;
  try{
    // Only its own (ids under 5000): prayer reminders (js/appprayer.js) are 5000+.
    const pend=await L.getPending(),own=(pend&&pend.notifications||[]).filter(n=>n.id<5000);if(own.length)await L.cancel({notifications:own.map(n=>({id:n.id}))});
    const list=plan();if(!list.length)return;
    let p=await L.checkPermissions();
    // Asking is the shrine bell's job (js/appbell.js); this only sets them.
    if(p.display!=="granted")return;
    await L.schedule({notifications:list.map((x,i)=>({id:1000+i,title:x.title,body:x.body,schedule:{at:x.when,allowWhileIdle:true},extra:{a:x.a,b:x.b}}))});
  }catch(e){console.warn(e)}finally{busy=false}
}
// Tapping one opens that day in My trip.
try{const L=LN();if(L&&L.addListener)L.addListener("localNotificationActionPerformed",e=>{const x=e&&e.notification&&e.notification.extra;
  if(x&&x.a!==undefined&&typeof window.tnOpenDay==="function"){const tb=document.querySelector('#tabbar [data-t="trip"]');if(tb)tb.click();setTimeout(()=>tnOpenDay(x.a,x.b),150)}})}catch(e){}
// Set them when the app opens and again when you leave it (your plan may have changed).
setTimeout(()=>schedule(false),2500);
window.tnRemindNow=()=>schedule(false);
document.addEventListener("visibilitychange",()=>{if(document.hidden)schedule(false);else{schedule(false);watch()}});

// ---- 2. the "you're nearby" banner ----
let wid=null,ban=null;
const today=()=>new Date(Date.now()+9*3600e3).toISOString().slice(0,10);
const done=()=>{try{const d=JSON.parse(store.get(DONE)||"{}");return d.day===today()?d:{day:today(),k:[]}}catch(e){return {day:today(),k:[]}}};
const markDone=k=>{const d=done();d.k.push(k);try{store.set(DONE,JSON.stringify(d))}catch(e){}};
function stopWatch(){if(wid!==null){navigator.geolocation.clearWatch(wid);wid=null}}
async function watch(){
  stopWatch();
  if(!set.banner||document.hidden||!navigator.geolocation||typeof auth==="undefined"||!auth||!window.tnStampNear)return;
  // Only when location is already allowed: this never asks on its own.
  try{const p=await navigator.permissions.query({name:"geolocation"});if(p.state!=="granted")return}catch(e){return}
  wid=navigator.geolocation.watchPosition(pos=>{
    const me={lat:pos.coords.latitude,lng:pos.coords.longitude},acc=pos.coords.accuracy,skip=done().k;
    const hit=tnStampNear().map(s=>({s,m:KM(me,s.p)*1000})).filter(x=>x.m<=x.s.r&&acc<=Math.max(150,x.s.r)&&!skip.includes(x.s.c+"|"+x.s.n)).sort((a,b)=>a.m-b.m)[0];
    if(hit)show(hit);
  },()=>{},{enableHighAccuracy:true,maximumAge:60000,timeout:30000});
}
function show({s,m}){
  if(ban)return;const k=s.c+"|"+s.n;
  ban=document.createElement("div");ban.className="rm-ban";ban.setAttribute("role","alert");
  ban.innerHTML=`<img src="${GI()}" alt=""><div><b>${esc(T("You're {d} from {p}! 🐾",{d:T("{n} m",{n:Math.max(10,Math.round(m/10)*10)}),p:s.p.n}))}</b><small>${T("Its stamp is waiting for you.")}</small>
    <span><button type="button" class="rm-go">${T("Get the stamp")}</button><button type="button" class="rm-no">${T("Later")}</button></span></div>`;
  document.body.appendChild(ban);requestAnimationFrame(()=>ban&&ban.classList.add("on"));
  const close=()=>{markDone(k);if(ban){ban.remove();ban=null}};
  ban.querySelector(".rm-go").onclick=()=>{close();window.tnStampGive&&tnStampGive(k)};
  ban.querySelector(".rm-no").onclick=close;
}
setTimeout(watch,3000);
if(typeof userBtn==="function"){const _u=userBtn;userBtn=function(){_u();watch()}}

// ---- the Reminders page (from More) ----
const pg=document.createElement("div");pg.id="rmview";pg.hidden=true;pg.setAttribute("role","dialog");pg.setAttribute("aria-modal","true");document.body.appendChild(pg);
function draw(){
  if(pg.hidden)return;
  const tg=(k,ic,l,sub)=>`<div class="pf-row rm-row"><span class="pf-ic">${ic}</span><span class="rm-t"><b>${l}</b><small>${sub}</small></span>
    <button type="button" class="rm-tg${set[k]?" on":""}" role="switch" aria-checked="${!!set[k]}" data-k="${k}" aria-label="${esc(l)}"></button></div>`;
  const sel=(k,ic,l,sub,opts)=>`<div class="pf-row rm-row"><span class="pf-ic">${ic}</span><span class="rm-t"><b>${l}</b><small>${sub}</small></span>
    <select class="rm-sel" data-k="${k}" aria-label="${esc(l)}">${opts.map(([v,t])=>`<option value="${v}"${String(set[k])===String(v)?" selected":""}>${t}</option>`).join("")}</select></div>`;
  const times=[["",T("Off")],...["06:30","07:00","07:30","08:00","08:30","09:00"].map(t=>[t,t])];
  pg.innerHTML=`<div class="pf-scroll"><div class="apbar"><button type="button" class="pv-cb rm-back" aria-label="${esc(T("Back"))}"><svg viewBox="0 0 24 24" width="25" height="25" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${document.documentElement.dir==="rtl"?"M9 18l6-6-6-6":"M15 18l-6-6 6-6"}"/></svg></button><b>${T("Reminders")}</b></div>
    <div class="rm-hero"><img src="${GI()}" alt=""><span><b>${T("Apollo keeps you on track")}</b><small>${T("Reminders come from your trip plan. Your location is only used while the app is open.")}</small></span></div>
    ${window.tnTripPlan&&tnTripPlan().length?"":`<p class="rm-note">📅 ${T("Add your travel date in My trip, and the reminders follow your days.")}</p>`}
    <button type="button" class="rm-on" hidden>🔔 ${T("Turn on reminders")}</button>
    <h2 class="pf-h">${T("During your trip")}</h2>
    <div class="pf-list">${sel("morning","☀️",T("Morning plan"),T("Today's stops and stamps"),times)}
      ${sel("before","⏰",T("Before each stop"),T("With a stamp reminder"),[["0",T("Off")],["10","10 min"],["15","15 min"],["30","30 min"],["60","1 h"]])}
      ${tg("banner","🐾",T("Stamp nearby banner"),T("When the app is open"))}${tg("evening","🌙",T("Evening wrap-up"),T("Your day and tomorrow"))}</div>
    <h2 class="pf-h">${T("Before your trip")}</h2>
    <div class="pf-list">${tg("flight","✈️",T("Flight tomorrow"),T("24 h before, with a packing nudge"))}${tg("hotel","🏨",T("Hotel check-in"),T("On the day"))}</div>
    <p class="rm-note">${T("The first time, your phone asks to allow notifications. You can change it later in the phone's settings.")}</p></div>`;
  pg.querySelector(".rm-back").onclick=close;
  // While notifications aren't allowed yet, the bell is one tap away.
  const on=pg.querySelector(".rm-on"),L=LN();
  if(L)L.checkPermissions().then(p=>{if(p.display!=="granted")on.hidden=false}).catch(()=>{});
  on.onclick=()=>window.tnBellAsk&&tnBellAsk("settings",()=>{draw()});
  pg.querySelectorAll(".rm-tg").forEach(b=>b.onclick=()=>{set[b.dataset.k]=!set[b.dataset.k];save();draw();schedule(false);watch()});
  pg.querySelectorAll(".rm-sel").forEach(s=>s.onchange=()=>{const k=s.dataset.k;set[k]=k==="before"?+s.value:s.value;save();schedule(false)});
}
function open(fromHistory){pg.hidden=false;document.documentElement.classList.add("pf-open");draw();if(!fromHistory)history.pushState({tnRemind:1},"")}
function closeNow(){pg.hidden=true;document.documentElement.classList.remove("pf-open")}
function close(){if(history.state&&history.state.tnRemind)history.back();else closeNow()}
addEventListener("popstate",e=>{const st=e.state||{};if(st.tnRemind)open(true);else if(!pg.hidden)closeNow()});
window.tnOpenReminders=()=>open();
// For tests: what would be scheduled now.
window.tnRemindPlan=plan;
if(typeof window.tnRenderMore==="function")tnRenderMore();
})();
