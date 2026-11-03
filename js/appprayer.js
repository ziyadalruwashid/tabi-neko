// Prayer times and Qibla (the app only), opened from its card in More.
//
// - Times are worked out on the phone (no internet needed) from the sun's
//   position for where you are, or the centre of the city you're exploring.
//   Umm al-Qura with the standard Asr, in Japan time.
// - A bell on each prayer sets a reminder (Capacitor local notifications,
//   ids 5000+, so the trip reminders in js/appremind.js leave them alone).
// - The Qibla compass turns with the phone (the device's compass). Where
//   there's no compass, it shows the direction with north at the top.
// - Prayer rooms: mosques and airport rooms checked against two sources,
//   plus every notebook restaurant whose tip mentions a prayer room.
(function(){
if(typeof IS_APP==="undefined"||!IS_APP)return;
const KEY="tabineko-prayer";
const LN=()=>window.Capacitor&&Capacitor.Plugins&&Capacitor.Plugins.LocalNotifications;

// ---- settings ----
let set={method:"uq",hanafi:false,bells:{}};
try{set={...set,...JSON.parse(store.get(KEY)||"{}")}}catch(e){}
// No settings on the page (the owner asked): always Umm al-Qura, standard Asr.
set.method="uq";set.hanafi=false;
const save=()=>{try{store.set(KEY,JSON.stringify(set))}catch(e){}};
const METHODS={uq:{n:"Umm al-Qura",fajr:18.5,isha:{min:90}},mwl:{n:"Muslim World League",fajr:18,isha:17},egypt:{n:"Egyptian",fajr:19.5,isha:17.5}};
const NAMES={fajr:"Fajr",sunrise:"Sunrise",dhuhr:"Dhuhr",asr:"Asr",maghrib:"Maghrib",isha:"Isha"};
const ICONS={fajr:"🌙",sunrise:"🌅",dhuhr:"☀️",asr:"🌤️",maghrib:"🌇",isha:"🌌"};
const ORDER=["fajr","sunrise","dhuhr","asr","maghrib","isha"];
const PRAYERS=ORDER.filter(k=>k!=="sunrise");

// ---- the sun (the usual prayer-times maths) ----
const R=Math.PI/180,sin=d=>Math.sin(d*R),cos=d=>Math.cos(d*R),tan=d=>Math.tan(d*R);
const asin=x=>Math.asin(x)/R,acos=x=>Math.acos(Math.max(-1,Math.min(1,x)))/R,atan2=(y,x)=>Math.atan2(y,x)/R,acot=x=>Math.atan(1/x)/R;
const fix=(a,b)=>{a-=b*Math.floor(a/b);return a<0?a+b:a};
function julian(y,m,d){if(m<=2){y-=1;m+=12}const A=Math.floor(y/100),B=2-A+Math.floor(A/4);return Math.floor(365.25*(y+4716))+Math.floor(30.6001*(m+1))+d+B-1524.5}
function sun(jd){const D=jd-2451545,g=fix(357.529+.98560028*D,360),q=fix(280.459+.98564736*D,360),L=fix(q+1.915*sin(g)+.02*sin(2*g),360),e=23.439-.00000036*D;
  return {decl:asin(sin(e)*sin(L)),eqt:q/15-fix(atan2(cos(e)*sin(L),cos(L))/15,24)}}
// Today's times (hours, Japan time) for a place, on a Japan date.
function times(lat,lng,y,m,d){
  const M=METHODS[set.method]||METHODS.uq,jd=julian(y,m,d)-lng/(15*24);
  const noon=t=>fix(12-sun(jd+t).eqt,24);
  const at=(a,t,before)=>{const s=sun(jd+t),h=acos((-sin(a)-sin(s.decl)*sin(lat))/(cos(s.decl)*cos(lat)))/15;return noon(t)+(before?-h:h)};
  const asr=t=>{const s=sun(jd+t);return at(-acot((set.hanafi?2:1)+tan(Math.abs(lat-s.decl))),t)};
  let t={fajr:5,sunrise:6,dhuhr:12,asr:13,maghrib:18,isha:18};
  for(let i=0;i<2;i++){const p=k=>t[k]/24;
    t={fajr:at(M.fajr,p("fajr"),true),sunrise:at(.833,p("sunrise"),true),dhuhr:noon(p("dhuhr")),asr:asr(p("asr")),maghrib:at(.833,p("maghrib")),
      isha:M.isha.min?0:at(M.isha,p("isha"))}}
  // A safety margin, as published timetables add: better a little late
  // than early for these.
  t.dhuhr+=2/60;t.asr+=2/60;t.maghrib+=2/60;
  if(M.isha.min)t.isha=t.maghrib+M.isha.min/60;
  // The hours above are Greenwich hours plus the longitude's; this gives
  // plain UTC milliseconds (shown in Japan time by hhmm).
  // Prayers round up to the next minute (never early); sunrise rounds down.
  const out={};for(const k of ORDER){const ms=Date.UTC(y,m-1,d)+(t[k]-lng/15)*3600e3;out[k]=(k==="sunrise"?Math.floor:Math.ceil)(ms/60000)*60000}
  return out;
}
const jpDay=(ms=Date.now())=>{const x=new Date(ms+9*3600e3);return [x.getUTCFullYear(),x.getUTCMonth()+1,x.getUTCDate()]};
const hhmm=ms=>{const x=new Date(ms+9*3600e3);let h=x.getUTCHours(),mi=String(x.getUTCMinutes()).padStart(2,"0");
  if(isAR())return `${h%12||12}:${mi} ${h<12?"ص":"م"}`;return `${h%12||12}:${mi} ${h<12?"am":"pm"}`};
const short=ms=>{const x=new Date(ms+9*3600e3);return `${x.getUTCHours()%12||12}:${String(x.getUTCMinutes()).padStart(2,"0")}`};

// ---- where ----
const inJapan=p=>p&&p.lat>24&&p.lat<46&&p.lng>122&&p.lng<146;
function here(){
  const me=window.tnMe;if(inJapan(me))return {lat:me.lat,lng:me.lng,name:T("Near you"),me:true};
  const c=(window.tnChatCtx&&tnChatCtx().city)||"tokyo",b=BOX[c]||BOX.tokyo;
  return {lat:(b.n+b.s)/2,lng:(b.w+b.e)/2,name:D(CITIES[c]||CITIES.tokyo,"n"),city:c};
}
function askWhere(done){if(!navigator.geolocation)return;
  navigator.geolocation.getCurrentPosition(p=>{window.tnMe={lat:p.coords.latitude,lng:p.coords.longitude};if(done)done()},()=>{toast(T("Couldn't find you. Using the city you're exploring."))},{enableHighAccuracy:false,timeout:10000,maximumAge:300000})}

// ---- Qibla ----
const KAABA={lat:21.4225,lng:39.8262};
const qibla=p=>fix(atan2(sin(KAABA.lng-p.lng)*cos(KAABA.lat),cos(p.lat)*sin(KAABA.lat)-sin(p.lat)*cos(KAABA.lat)*cos(KAABA.lng-p.lng)),360);
const km=(a,b)=>{const h=sin((b.lat-a.lat)/2)**2+cos(a.lat)*cos(b.lat)*sin((b.lng-a.lng)/2)**2;return 12742*Math.asin(Math.sqrt(h))};
const WIND=["north","north-east","east","south-east","south","south-west","west","north-west"];
const wind=d=>T(WIND[Math.round(d/45)%8]);

// ---- prayer rooms ----
// Checked against at least two sources (Nov 2026). Notebook places with a
// prayer room are added below, from their tips.
const ROOMS=[
  {c:"tokyo",n:"Asakusa Mosque",note:"Mosque · five daily prayers",lat:35.7213,lng:139.8003,q:"Asakusa Mosque Masjid Darul Arqam Tokyo"},
  {c:"tokyo",n:"Otsuka Mosque",note:"Mosque · women's area · wudu",lat:35.7303,lng:139.7282,q:"Otsuka Mosque Tokyo"},
  {c:"tokyo",n:"Haneda Airport prayer rooms",note:"Terminals 2 and 3 · wudu",lat:35.5437,lng:139.7686,q:"Haneda Airport Terminal 3 prayer room"},
  {c:"tokyo",n:"Narita Airport prayer rooms",note:"Terminals 1 and 2 · wudu",lat:35.7716,lng:140.3896,q:"Narita Airport prayer room"},
  {c:"kyoto",n:"Kyoto Mosque",note:"Mosque · Kyoto Muslim Association",q:"Kyoto Mosque Kyoto Muslim Association"},
  {c:"osaka",n:"Osaka Ibaraki Mosque",note:"Mosque · north of the city",lat:34.8296,lng:135.5444,q:"Osaka Ibaraki Mosque"},
  {c:"osaka",n:"Kansai Airport prayer rooms",note:"Terminal 1, 3rd floor and the gates · wudu",lat:34.4347,lng:135.244,q:"Kansai International Airport prayer room"},
];
function rooms(){
  const fromNotebook=(typeof P==="undefined"?[]:P).filter(p=>/prayer room|ablution|wudu|\bmosque\b|camii/i.test(p.tip||"")||/mosque|camii/i.test(p.n))
    .map(p=>({c:p.city,n:p.n,note:/mosque|camii/i.test(p.n)?"Mosque":"Restaurant · prayer room for diners",lat:p.lat,lng:p.lng,id:p.id}));
  return [...ROOMS,...fromNotebook];
}

// ---- reminders ----
let busy=false;
async function schedule(){
  const L=LN();if(!L||busy)return;busy=true;
  try{
    const pend=await L.getPending();const mine=(pend&&pend.notifications||[]).filter(n=>n.id>=5000&&n.id<6000);
    if(mine.length)await L.cancel({notifications:mine.map(n=>({id:n.id}))});
    const on=PRAYERS.filter(k=>set.bells[k]);if(!on.length)return;
    const p=await L.checkPermissions();if(p.display!=="granted")return;
    const w=here(),list=[];
    for(let i=0;i<8;i++){const [y,m,d]=jpDay(Date.now()+i*864e5),tt=times(w.lat,w.lng,y,m,d);
      for(const k of on)if(tt[k]>Date.now()+60000)list.push({k,at:tt[k]})}
    await L.schedule({notifications:list.slice(0,40).map((x,i)=>({id:5000+i,title:`${T(NAMES[x.k])} 🕌`,
      body:T("It's time for {p} in {c} ({t}).",{p:T(NAMES[x.k]),c:w.name,t:hhmm(x.at)}),schedule:{at:new Date(x.at),allowWhileIdle:true},extra:{prayer:x.k}}))});
  }catch(e){console.warn(e)}finally{busy=false}
}
async function toggleBell(k){
  const L=LN();
  if(!set.bells[k]&&L){try{let p=await L.checkPermissions();if(p.display!=="granted")p=await L.requestPermissions();
    if(p.display!=="granted"){toast(T("Turn on notifications for Tabi Neko in your phone's settings."));return}}catch(e){}}
  set.bells[k]=!set.bells[k];save();draw();schedule();
  toast(set.bells[k]?T("We'll remind you at {p} ✓",{p:T(NAMES[k])}):T("{p} reminder off",{p:T(NAMES[k])}));
}
setTimeout(schedule,3000);
// Tapping a prayer reminder opens this page.
try{const L=LN();if(L&&L.addListener)L.addListener("localNotificationActionPerformed",e=>{const x=e&&e.notification&&e.notification.extra;if(x&&x.prayer)setTimeout(()=>open(),150)})}catch(e){}
document.addEventListener("visibilitychange",()=>{if(!document.hidden)schedule()});

// ---- the page ----
const el=document.createElement("div");el.id="prayview";el.hidden=true;el.setAttribute("role","dialog");el.setAttribute("aria-modal","true");document.body.appendChild(el);
let showAll=false,tick=null;
function draw(){
  if(el.hidden)return;
  const w=here(),[y,m,d]=jpDay(),tt=times(w.lat,w.lng,y,m,d),now=Date.now();
  let nk=PRAYERS.find(k=>tt[k]>now),nat=nk?tt[nk]:0;
  if(!nk){const [y2,m2,d2]=jpDay(now+864e5);nk="fajr";nat=times(w.lat,w.lng,y2,m2,d2).fajr}
  const mins=Math.max(0,Math.round((nat-now)/60000)),left=mins>=60?T("in {h} h {m} min",{h:Math.floor(mins/60),m:mins%60}):T("in {m} min",{m:mins});
  const cur=[...PRAYERS].reverse().find(k=>tt[k]<=now);
  const qb=qibla(w),all=rooms().map(r=>({...r,dist:r.lat&&w.me?km(w,r):null}));
  let list=w.me?all.filter(r=>r.dist!==null).sort((a,b)=>a.dist-b.dist):all.filter(r=>r.c===(w.city||"tokyo"));
  const shown=showAll?list:list.slice(0,3);
  const dist=r=>r.dist===null?"":r.dist<1?T("{m} m",{m:Math.round(r.dist*100)*10}):T("{k} km",{k:r.dist<10?r.dist.toFixed(1):Math.round(r.dist)});
  el.innerHTML=`<div class="py-top"><button type="button" class="py-x" aria-label="${esc(T("Back"))}">‹</button><b>${T("Prayer times")}</b>
      <button type="button" class="py-where">📍 ${esc(w.name)}</button></div>
    <div class="py-scroll">
    <div class="py-next"><small>${T("NEXT PRAYER")}</small><b>${T(NAMES[nk])}</b><span class="py-t">${hhmm(nat)}</span><br><span class="py-cd">⏳ ${left}</span><img src="${typeof GI==="function"?GI():"assets/cat.png"}" alt=""></div>
    <div class="py-card py-list">${ORDER.map(k=>{const past=tt[k]<now&&k!==cur,bell=k!=="sunrise";
      return `<div class="py-row${k===cur?" now":""}${past?" past":""}"><i aria-hidden="true">${ICONS[k]}</i><span>${T(NAMES[k])}</span><em>${short(tt[k])}</em>${bell?`<button type="button" class="py-bell" data-k="${k}" aria-pressed="${!!set.bells[k]}" aria-label="${esc(T("Remind me at {p}",{p:T(NAMES[k])}))}">🔔</button>`:`<span class="py-bell"></span>`}</div>`}).join("")}</div>
    <button type="button" class="py-card py-qmini"><span class="py-dial"><span>N</span><i style="transform:translate(-50%,-100%) rotate(${qb}deg)"></i></span>
      <span><b>${T("Qibla · {d}° {w}",{d:Math.round(qb),w:wind(qb)})}</b><small>${T("Tap to open the compass")}</small></span><i aria-hidden="true">›</i></button>
    <h3 class="py-h">🕌 ${T(w.me?"Prayer rooms near you":"Prayer rooms in {c}",{c:w.name})}</h3>
    <div class="py-card py-rooms">${shown.length?shown.map((r,i)=>`<button type="button" class="py-room" data-i="${i}"><span class="py-ic">${/Airport/.test(r.n)?"✈️":/Mosque|Camii/.test(r.n)?"🕌":"🍽️"}</span><span><b dir="auto">${esc(r.n)}</b><small>${T(r.note)}</small></span><em>${dist(r)}</em></button>`).join("")
      :`<p class="py-none">${T("No prayer rooms in the notebook here yet.")}</p>`}
      ${list.length>3?`<button type="button" class="py-more">${T(showAll?"Show less":"See all {n}",{n:list.length})}</button>`:""}</div>
    <p class="py-foot">${T("Times are worked out on your phone for {c}, so they work offline. For Friday prayer, check the times with the mosque.",{c:w.name})}</p>
    </div>`;
  el.querySelector(".py-x").onclick=close;
  el.querySelector(".py-where").onclick=()=>askWhere(()=>{draw();schedule()});
  el.querySelectorAll(".py-bell[data-k]").forEach(b=>b.onclick=()=>toggleBell(b.dataset.k));
  el.querySelector(".py-qmini").onclick=()=>openQibla();
  el.querySelectorAll(".py-room").forEach(b=>b.onclick=()=>{const r=shown[+b.dataset.i];
    if(r.id&&typeof openPlace==="function")return openPlace(r.id);
    window.open(r.lat?`https://www.google.com/maps/search/?api=1&query=${r.lat},${r.lng}`:`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(r.q||r.n)}`,"_blank")});
  if(el.querySelector(".py-more"))el.querySelector(".py-more").onclick=()=>{showAll=!showAll;draw()};
}
function open(fromHistory){el.hidden=false;document.documentElement.classList.add("py-open");if(!fromHistory){showAll=false;history.pushState({tnPray:1},"")}
  draw();clearInterval(tick);tick=setInterval(draw,30000);
  // Use where you are when the phone already knows it.
  if(!window.tnMe&&navigator.permissions&&navigator.permissions.query)navigator.permissions.query({name:"geolocation"}).then(s=>{if(s.state==="granted")askWhere(draw)}).catch(()=>{})}
function closeNow(){el.hidden=true;clearInterval(tick);document.documentElement.classList.remove("py-open")}
function close(){if(history.state&&history.state.tnPray)history.back();else closeNow()}

// ---- the Qibla compass ----
const qv=document.createElement("div");qv.id="qiblaview";qv.hidden=true;qv.setAttribute("role","dialog");qv.setAttribute("aria-modal","true");document.body.appendChild(qv);
let heading=null,spin=0,lastSeen=0,qTimer=null;
function onTurn(e){
  let h=null;
  if(typeof e.webkitCompassHeading==="number")h=e.webkitCompassHeading;
  else if((e.absolute||e.type==="deviceorientationabsolute")&&typeof e.alpha==="number")h=360-e.alpha;
  if(h===null)return;
  h=fix(h+(screen.orientation&&screen.orientation.angle||0),360);
  // Turn the shortest way, so the dial never spins all the way round.
  const prev=fix(spin,360);let dlt=h-prev;if(dlt>180)dlt-=360;if(dlt<-180)dlt+=360;spin+=dlt;heading=h;lastSeen=Date.now();paint();
}
function listen(on){
  const f=on?addEventListener:removeEventListener;
  if("ondeviceorientationabsolute" in window)f("deviceorientationabsolute",onTurn,true);else f("deviceorientation",onTurn,true);
}
function paint(){
  const w=here(),qb=qibla(w),dial=qv.querySelector(".qb-dial");if(!dial)return;
  dial.style.transform=`rotate(${-spin}deg)`;
  const live=heading!==null&&Date.now()-lastSeen<3000;
  const off=live?Math.abs(fix(qb-heading+540,360)-180):999,ok=off<=5;
  qv.classList.toggle("on",ok);
  const st=qv.querySelector(".qb-st");
  st.innerHTML=!live?`<b>${T("{d}° from north",{d:Math.round(qb)})}</b><span>${T("Hold your phone flat. North is at the top: face the arrow.")}</span>`
    :ok?`<b>${T("You're facing the Qibla ✓")}</b><span>${T("{d}° · Makkah is {k} km away",{d:Math.round(qb),k:Math.round(km(w,KAABA)).toLocaleString("en")})}</span>`
    :`<b class="turn">${T(fix(qb-heading,360)<180?"Turn right ↻":"Turn left ↺")}</b><span>${T("{d}° · Makkah is {k} km away",{d:Math.round(qb),k:Math.round(km(w,KAABA)).toLocaleString("en")})}</span>`;
}
function drawQ(){
  const w=here(),qb=qibla(w),[y,m,d]=jpDay(),tt=times(w.lat,w.lng,y,m,d),now=Date.now(),nk=PRAYERS.find(k=>tt[k]>now);
  const needAsk=typeof DeviceOrientationEvent!=="undefined"&&typeof DeviceOrientationEvent.requestPermission==="function"&&heading===null;
  qv.innerHTML=`<div class="py-top"><button type="button" class="py-x" aria-label="${esc(T("Back"))}">‹</button><b>${T("Qibla")}</b><span class="py-where">📍 ${esc(w.name)}</span></div>
    <div class="qb-wrap"><div class="qb-dial">${["N","E","S","W"].map((x,i)=>`<span class="qb-c" style="transform:rotate(${i*90}deg)"><i style="transform:rotate(${-i*90}deg)">${T(x)}</i></span>`).join("")}
      ${Array.from({length:72},(_,i)=>`<span class="qb-tk${i%2?"":" big"}" style="transform:rotate(${i*5}deg)"></span>`).join("")}
      <span class="qb-arrow" style="transform:rotate(${qb}deg)"><i></i><b>🕋</b></span></div><span class="qb-me" aria-hidden="true"></span></div>
    <div class="qb-st" role="status" aria-live="polite"></div>
    ${needAsk?`<button type="button" class="qb-start">🧭 ${T("Start the compass")}</button>`:""}
    <h3 class="py-h">${T("Today in {c}",{c:w.name})}</h3>
    <div class="qb-strip">${PRAYERS.map(k=>`<div class="qb-pc${k===nk?" on":""}"><small>${T(NAMES[k])}</small><b>${short(tt[k])}</b></div>`).join("")}</div>`;
  qv.querySelector(".py-x").onclick=closeQ;
  const st=qv.querySelector(".qb-start");if(st)st.onclick=async()=>{try{const r=await DeviceOrientationEvent.requestPermission();if(r==="granted"){st.remove();listen(true)}}catch(e){}};
  paint();
}
function openQibla(fromHistory){qv.hidden=false;document.documentElement.classList.add("qb-open");if(!fromHistory)history.pushState({tnPray:1,tnQibla:1},"");
  heading=null;spin=0;drawQ();listen(true);clearInterval(qTimer);qTimer=setInterval(paint,1000)}
function closeQNow(){qv.hidden=true;listen(false);clearInterval(qTimer);document.documentElement.classList.remove("qb-open")}
function closeQ(){if(history.state&&history.state.tnQibla)history.back();else closeQNow()}

addEventListener("popstate",e=>{const st=e.state||{};
  if(!st.tnQibla&&!qv.hidden)closeQNow();
  if(st.tnQibla&&qv.hidden)openQibla(true);
  if(st.tnPray){if(el.hidden)open(true)}else if(!el.hidden)closeNow()});
window.tnOpenPrayer=()=>open();
})();
