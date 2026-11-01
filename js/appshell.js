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
  closePlaceNow();if(typeof closeList==="function")closeList();
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
// Japan's clock, whatever the phone's time zone: the header follows it.
const jst=()=>{const d=new Date(Date.now()+9*3600e3);return {h:d.getUTCHours(),m:d.getUTCMinutes(),mo:d.getUTCMonth(),day:Math.floor(d.getTime()/864e5)}};
const PERIODS={morning:{sky:["#9FD3EE","#FBE7C6"],far:"#A9C9DC",mid:"#86A9C2",near:"#6F93AE",sun:"#FFE7A3",greet:"Good morning",hint:"a good time for temples"},
  afternoon:{sky:["#4FA8DE","#BEE2F3"],far:"#9CC2D8",mid:"#7AA4C0",near:"#5F88A8",sun:"#FFF6D6",greet:"Hi",hint:"nice weather for a walk"},
  sunset:{sky:["#E2665A","#FBC98E"],far:"#E9A285",mid:"#C67C6E",near:"#A8605A",sun:"#FFD08A",greet:"Good evening",hint:"sunset soon"},
  night:{sky:["#121A3A","#3A3D76"],far:"#363C6E",mid:"#272B55",near:"#1D2045",sun:null,greet:"Evening",hint:"time for the night views"}};
const period=h=>h>=5&&h<11?"morning":h>=11&&h<16?"afternoon":h>=16&&h<19?"sunset":"night";
function jstText(){const {h,m}=jst(),hh=h%12||12,mm=String(m).padStart(2,"0");
  if(!isAR())return `${hh}:${mm} ${h<12?"am":"pm"} in ${cityOf(exploreCity)}`;
  const part=h>=4&&h<11?"الصبح":h<14?"الظهر":h<17?"العصر":h<19?"المغرب":"الليل";
  return `${hh}:${mm} ${part} في ${cityOf(exploreCity)}`}
// The scene behind the greeting: sky for the hour, Fuji, and the city's
// own skyline (Tokyo Tower and Skytree, Kyoto's pagoda, Osaka Castle).
function scene(k,c){
  const t=PERIODS[k],W=390,H=300;let s=`<svg class="xs-sky" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax slice" aria-hidden="true"><defs>
    <linearGradient id="xs-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${t.sky[0]}"/><stop offset="1" stop-color="${t.sky[1]}"/></linearGradient>
    <radialGradient id="xs-s"><stop offset="0" stop-color="${t.sun||"#fff"}" stop-opacity=".95"/><stop offset=".35" stop-color="${t.sun||"#fff"}" stop-opacity=".55"/><stop offset="1" stop-color="${t.sun||"#fff"}" stop-opacity="0"/></radialGradient>
    <linearGradient id="xs-f" x1="0" y1="0" x2="0" y2="1"><stop offset=".7" stop-color="#FAF4E8" stop-opacity="0"/><stop offset="1" stop-color="#FAF4E8"/></linearGradient></defs>
    <rect width="${W}" height="${H}" fill="url(#xs-g)"/>`;
  if(k==="night"){for(let i=0;i<40;i++)s+=`<circle class="xs-star" style="animation-delay:${(i%7)*.6}s" cx="${(i*97)%W}" cy="${(i*53)%150+10}" r="${(i%3)*.4+.6}" fill="#fff" opacity="${.4+(i%4)*.15}"/>`;
    s+=`<circle cx="236" cy="132" r="18" fill="#FFF3C9"/><circle cx="244" cy="125" r="16" fill="${t.sky[0]}"/>`}
  else{const sx={morning:78,afternoon:110,sunset:300}[k],sy={morning:120,afternoon:62,sunset:170}[k];
    s+=`<circle cx="${sx}" cy="${sy}" r="80" fill="url(#xs-s)"/><circle cx="${sx}" cy="${sy}" r="${k==="sunset"?26:20}" fill="${t.sun}"/>
    <g class="xs-cloud" fill="#fff" opacity=".55"><ellipse cx="250" cy="70" rx="46" ry="11"/><ellipse cx="275" cy="62" rx="24" ry="10"/><ellipse cx="60" cy="150" rx="38" ry="8"/></g>`}
  s+=`<path d="M-10 250 L120 150 Q132 141 144 150 L300 250 Z" fill="${t.far}"/>
    <path d="M108 160 L120 150 Q132 141 144 150 L157 160 L150 157 L142 164 L133 156 L124 164 L116 157 Z" fill="#fff" opacity="${k==="night"?.35:.85}"/>`;
  const b=[[150,200,22],[174,212,18],[194,190,16],[212,206,24],[238,184,14],[254,198,20],[276,214,16],[330,196,18],[350,208,22],[374,190,20],[20,214,24],[46,202,18],[66,218,22],[90,206,16]];
  let m=b.map(([x,y,w])=>`<rect x="${x}" y="${y}" width="${w}" height="${260-y}" rx="1.5"/>`).join("");
  if(c==="tokyo")m+=`<path d="M296 260 L304 196 L306 176 L308 160 L310 176 L312 196 L320 260 Z"/><rect x="302" y="196" width="12" height="4"/><rect x="304" y="176" width="8" height="3"/>
    <path d="M118 260 L121 150 L122 112 L123 150 L126 260 Z"/><rect x="118.5" y="150" width="7" height="4" rx="1"/><rect x="119.5" y="132" width="5" height="3" rx="1"/>`;
  else if(c==="kyoto"||c==="nara")m+=`<g transform="translate(300 260)">${[0,1,2,3,4].map(i=>`<path d="M${-26+i*4} ${-14-i*16} L${26-i*4} ${-14-i*16} L${18-i*4} ${-20-i*16} L${-18+i*4} ${-20-i*16} Z"/><rect x="${-12+i*3}" y="${-14-i*16}" width="${24-i*6}" height="16"/>`).join("")}<rect x="-1" y="-112" width="2" height="22"/></g>`;
  else if(c==="osaka")m+=`<g transform="translate(296 260)"><rect x="-40" y="-26" width="80" height="26"/><path d="M-34 -26 L34 -26 L26 -34 L-26 -34 Z"/><rect x="-24" y="-56" width="48" height="22"/><path d="M-30 -56 L30 -56 L20 -66 L-20 -66 Z"/><rect x="-14" y="-82" width="28" height="16"/><path d="M-20 -82 L20 -82 L10 -94 L-10 -94 Z"/></g>`;
  else if(c==="kobe")m+=`<path d="M300 260 Q306 200 302 170 L314 170 Q310 200 316 260 Z"/>`;
  s+=`<g fill="${t.mid}">${m}</g>`;
  if(k==="night")for(let i=0;i<46;i++){const [x,y,w]=b[i%b.length];s+=`<rect x="${x+3+(i*7)%Math.max(4,w-6)}" y="${y+6+(i*11)%40}" width="2.4" height="3" fill="#FFD98A" opacity="${.5+(i%3)*.2}"/>`}
  return s+`<path d="M0 262 Q90 236 190 252 T390 246 L390 300 L0 300 Z" fill="${t.near}" opacity=".9"/><rect width="${W}" height="${H}" fill="url(#xs-f)"/></svg>`;
}

// Apollo's lists: the stories, the moods and the season all open one.
const inCity=()=>P.filter(p=>p.city===exploreCity);
const photoFirst=a=>[...a].sort((x,y)=>(y.photo?1:0)-(x.photo?1:0));
const halalHere=()=>{const a=inCity().filter(p=>p.cat==="food"&&p.halal);
  return near?a.sort((x,y)=>KM(near,x)-KM(near,y)):a.sort((x,y)=>(y.hl==="certified")-(x.hl==="certified")||(y.photo?1:0)-(x.photo?1:0))};
const STORIES=[["halal","Halal","ramen",()=>halalHere()],["gems","Hidden","c-gem",()=>photoFirst(inCity().filter(p=>p.gem))],
  ["shrine","Temples","torii",()=>photoFirst(inCity().filter(p=>p.cat==="shrine"))],["views","Views","fuji",()=>photoFirst(inCity().filter(p=>p.cat==="views"))],
  ["coffee","Coffee","coffee",()=>photoFirst(inCity().filter(p=>p.cat==="coffee"))],["photos","Photo spots","camera",()=>inCity().filter(p=>p.photo&&["views","streets","shrine","nature"].includes(p.cat)&&p.tier!=="time")],
  ["trips","Day trips","train",null]];
const STORY_COL={halal:"#2E8B3E",gems:"#E8A800",shrine:"#F14E24",views:"#1D52A0",coffee:"#9A6233",photos:"#7B5EA7",trips:"#2E8C88"};
const MOODS=[["hungry","😋","Hungry",()=>halalHere()],["photos","📸","Photos",()=>photoFirst(inCity().filter(p=>["views","streets"].includes(p.cat)))],
  ["shop","🛍️","Shopping",()=>photoFirst(inCity().filter(p=>p.cat==="shop"))],["calm","🌿","Something calm",()=>photoFirst(inCity().filter(p=>p.cat==="nature"||p.cat==="coffee"))],
  ["night","🌙","Night out",()=>photoFirst(inCity().filter(p=>p.cat==="views"||(p.cat==="streets"&&/night|evening|neon|lantern|dark/i.test(p.t+" "+p.tip))))],
  ["kids","🧒","With kids",()=>photoFirst(inCity().filter(p=>p.cat==="experience"))]];
// What's good this month, by Japan's calendar.
function season(){const mo=jst().mo;
  const S=mo<=1||mo===11?["Winter lights ✨","Illuminations and night views, the best season for city lights.",["views","streets"]]
    :mo<=3?["Cherry blossom season 🌸","Parks and shrines turn pink, go early in the morning.",["nature","shrine"]]
    :mo<=5?["Green season 🌿","Fresh gardens and long days, hydrangeas in June.",["nature","shrine"]]
    :mo<=7?["Summer festivals 🎆","Fireworks, festivals and evenings by the river.",["streets","views"]]
    :mo<=8?["Late summer 🍧","Shaved ice, river walks and cooler evenings.",["coffee","nature"]]
    :["Autumn leaves 🍁","The best time for gardens, trees turn red and gold.",["nature","shrine"]];
  return {t:S[0],s:S[1],ps:photoFirst(inCity().filter(p=>S[2].includes(p.cat)&&p.photo))}}
// Apollo's pick of the day: the same all day, a new one tomorrow.
function dailyPick(){const a=inCity().filter(p=>p.photo&&(p.gem||p.tier==="must"));if(!a.length)return null;return a[jst().day%a.length]}
const MONTHS_AR=["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
const MONTHS_EN=["January","February","March","April","May","June","July","August","September","October","November","December"];

// Your trip at a glance, or an invitation to start one.
function tripCard(){
  const n=tripCount(trip),days=trip.stays.reduce((a,s)=>a+s.days.length,0),cs=trip.stays.length;
  if(!n&&!cs)return `<button type="button" class="xs-trip empty"><span class="xs-tr-ic">🧳</span><span><b>${T("Plan your trip with Apollo ✨")}</b><small>${T("Add places as you browse, then sort them into days.")}</small></span><i aria-hidden="true">←</i></button>`;
  return `<button type="button" class="xs-trip"><span class="xs-tr-ic">🧳</span><span><b>${esc(trip.name||T("My Japan trip"))}</b>
    <small>${esc([T(cs===1?"1 city":"{n} cities",{n:cs}),T(n===1?"1 place":"{n} places",{n}),days?T(days===1?"1 day":"{n} days",{n:days}):""].filter(Boolean).join(" · "))}</small></span><i aria-hidden="true">←</i></button>`;
}
// A practical tip a day: the things first-timers wish they had known.
const TIPS=["Put a Suica or PASMO card in your phone's wallet: tap it on trains, buses and at convenience stores.",
  "Bins are rare on the street. Keep a small bag for your rubbish until you find one at a konbini.",
  "On escalators, stand on the left in Tokyo and on the right in Osaka.",
  "Trains are quiet: no phone calls, and keep your voice low.",
  "There's no tipping in Japan. Leaving money on the table can confuse the staff.",
  "Many small restaurants take cash only. 7-Eleven ATMs accept foreign cards.",
  "In a konbini, check snack labels for pork (豚・ポーク) and alcohol (アルコール・みりん).",
  "Big stations and both Tokyo airports have prayer rooms. Ask at the information desk.",
  "Coin lockers at stations fit a cabin bag, so you can explore before check-in.",
  "Send big suitcases to your next hotel with takkyubin, from the hotel desk or a konbini.",
  "Google Maps is great for trains in Japan: it shows the platform, the car and the fare.",
  "Tap water is safe to drink everywhere.",
  "Take your shoes off where you see a step up or slippers at the door.",
  "In Nara, the deer bow before you feed them. Show empty hands when you're out of crackers."];
function tipCard(){const t=TIPS[jst().day%TIPS.length];
  return `<div class="xs-tip"><img src="assets/cat.png" alt=""><span><small>${T("Apollo's tip of the day 💡")}</small><b>${esc(T(t))}</b></span></div>`}
// The city's neighbourhoods, from the Areas page, as wide photo cards.
function areasRow(){const hs=HOODS.filter(h=>h.city===exploreCity&&h.photo);if(!hs.length)return "";
  return `<section class="ax-row"><header><h2>${T("Areas to explore 🏘️")}</h2></header><div class="ax-hs">${hs.map(h=>`<button type="button" class="xs-area" data-h="${esc(h.n)}">
    <img src="${h.photo}" alt="" loading="lazy" style="object-position:${h.pos||"50% 50%"}"><span><b>${esc(D(h,"n"))}</b><small>${esc(D(h,"vibe"))}</small></span></button>`).join("")}</div></section>`}
// The weather now in the city, from Open-Meteo (free, no key). No answer, no chip.
const WX={};
const wxIcon=c=>c===0?"☀️":c<=2?"🌤️":c===3?"☁️":c<=48?"🌫️":c<=67||c>=80&&c<=82?"🌧️":c<=77||c===85||c===86?"🌨️":c>=95?"⛈️":"🌦️";
function weather(){
  const c=exploreCity,b=BOX[c],show=w=>{const el=$("explore").querySelector(".xs-wx");if(el&&c===exploreCity)el.textContent=w?` · ${wxIcon(w.code)} ${Math.round(w.t)}°`:""};
  if(!b)return;const hit=WX[c];if(hit&&Date.now()-hit.at<30*60e3)return show(hit);
  fetch(`https://api.open-meteo.com/v1/forecast?latitude=${((b.n+b.s)/2).toFixed(3)}&longitude=${((b.w+b.e)/2).toFixed(3)}&current=temperature_2m,weather_code&timezone=Asia%2FTokyo`)
    .then(r=>r.ok?r.json():null).then(j=>{if(!j||!j.current)return;WX[c]={t:j.current.temperature_2m,code:j.current.weather_code,at:Date.now()};show(WX[c])}).catch(()=>{});
}
function renderExplore(){
  const el=$("explore");if(!el)return;
  const who=typeof auth!=="undefined"&&auth&&auth.email?auth.email.split("@")[0]:"";
  const cities=["tokyo","kyoto","osaka","nara","kobe","kamakura"].filter(c=>TRIP_CITIES.includes(c)),k=period(jst().h),P0=PERIODS[k];
  const must=photoFirst(inCity().filter(p=>p.tier==="must")),pick=dailyPick(),sea=season();
  const big=p=>`<button type="button" class="pc bigc" data-id="${p.id}" style="--c:var(--${p.cat})"><span class="pimg${p.photo?"":" art"}"><img src="${p.photo||CATS[p.cat].img}" alt="" loading="lazy"></span>
    <span class="bigc-badge">🔥 ${T("don't skip this")}</span>${p.halal?`<i class="hb">${p.hl==="friendly"?T("Muslim-friendly"):T("halal ✓")}</i>`:""}
    <span class="bigc-t"><b><bdi>${esc(p.n)}</bdi></b><small>${esc(D(CATS[p.cat],"n"))} · ${esc(AREA(p.area))}</small></span></button>`;
  const row=(t,s,ps,key)=>ps.length?`<section class="ax-row"><header><h2>${T(t)}</h2>${key?`<button type="button" class="ax-all" data-list="${key}">${T("See all")}</button>`:""}</header>
    ${s?`<p class="ax-sub">${esc(s)}</p>`:""}<div class="ax-hs">${ps.slice(0,12).map(pcard).join("")}</div></section>`:"";
  el.innerHTML=`<div class="xs xs-${k}">${scene(k,exploreCity)}
      <div class="xs-hi"><div><b>${esc(who?T(P0.greet+", {n}!",{n:who}):T(P0.greet+"!"))} ${{morning:"☀️",afternoon:"🌤️",sunset:"🌇",night:"🌙"}[k]}</b><small><span class="xs-time">${esc(jstText())}</span><span class="xs-wx"></span></small><p class="xs-hint">${esc(T(P0.hint))}</p></div>
        <button type="button" class="xs-cat" aria-label="${esc(T("More"))}"><img src="assets/cat.png" alt=""></button></div></div>
    <button type="button" class="ax-search xs-search">${SVG(I.search)}<span>${T("Search places, areas, food…")}</span></button>
    <div class="ax-cities" role="tablist">${cities.map(c=>`<button type="button" role="tab" class="ax-city${c===exploreCity?" on":""}" data-c="${c}" aria-selected="${c===exploreCity}">${esc(cityOf(c))}</button>`).join("")}</div>
    <div class="xs-stories">${STORIES.map(([key,l,img])=>`<button type="button" class="xs-st" data-story="${key}"><span class="xs-ring" style="--c:${STORY_COL[key]}"><span><img src="assets/${img}.png" alt=""></span></span><b>${T(l)}</b></button>`).join("")}</div>
    ${tripCard()}
    ${pick?`<button type="button" class="xs-pick" data-id="${pick.id}"><span class="xs-tape"></span><span class="xs-pola"><img src="${pick.photo}" alt=""><small>${esc(D(pick,"cap"))}</small></span>
      <span class="xs-pt"><small>${T("Apollo's pick for today 🐾")}</small><b><bdi>${esc(pick.n)}</bdi></b><i>${esc((D(pick,"tip")||"").split(/(?<=[.!؟?])\s/)[0])}</i><em>${T("See the place")} ${isAR()?"←":"→"}</em></span></button>`:""}
    ${tipCard()}
    ${must.length?`<section class="ax-row ax-must"><header><h2>${T("Don't miss 🔥")}</h2></header><p class="ax-sub">${esc(T("Apollo's first picks in {c}",{c:cityOf(exploreCity)}))}</p><div class="ax-hs">${must.slice(0,10).map(big).join("")}</div></section>`:""}
    ${areasRow()}
    <h2 class="xs-h">${T("What's your mood today?")}</h2>
    <div class="xs-moods">${MOODS.map(([key,e,l])=>`<button type="button" class="xs-md" data-mood="${key}"><i>${e}</i>${T(l)}</button>`).join("")}</div>
    ${sea.ps.length?`<button type="button" class="xs-season"><small>${esc(T("{m} in Japan",{m:(isAR()?MONTHS_AR:MONTHS_EN)[jst().mo]}))}</small><b>${T(sea.t)}</b><p>${T(sea.s)}</p>
      <span class="xs-sp">${sea.ps.slice(0,3).map(p=>`<span><img src="${p.photo}" alt=""><b><bdi>${esc(p.n)}</bdi></b></span>`).join("")}</span></button>`:""}
    ${row(near?"Halal near you 🍜":"Halal food 🍜","",halalHere(),"halal")}
    ${row("Hidden gems ⭐",T("Even locals don't know these"),photoFirst(inCity().filter(p=>p.gem)),"gems")}
    ${row("Famous sights 📸","",inCity().filter(p=>p.src===""&&p.photo&&!["food","coffee"].includes(p.cat)&&!p.gem),"")}
    ${row("Coffee & sweets ☕","",photoFirst(inCity().filter(p=>p.cat==="coffee")),"coffee")}`;
  wireCards(el);
  el.querySelector(".xs-cat").onclick=()=>go("menu");
  if(el.querySelector(".xs-trip"))el.querySelector(".xs-trip").onclick=()=>go("trip");
  el.querySelectorAll(".xs-area").forEach(b=>b.onclick=()=>{const h=HOODS.find(x=>x.city===exploreCity&&x.n===b.dataset.h);
    openList(D(h,"n"),D(h,"vibe"),photoFirst(P.filter(p=>p.city===h.city&&p.area===h.area)))});
  weather();
  el.querySelectorAll(".ax-city").forEach(b=>b.onclick=()=>{exploreCity=b.dataset.c;city=exploreCity;store.set("tabineko-city",city);renderExplore()});
  el.querySelector(".xs-search").onclick=()=>{city=exploreCity;store.set("tabineko-city",city);active=new Set(Object.keys(CATS));halalOnly=false;renderAll();go("map");
    setTimeout(()=>{const q=$("mp-q")&&!$("amap").hidden?$("mp-q"):$("q");if(q)q.focus()},80)};
  if(el.querySelector(".xs-pick"))el.querySelector(".xs-pick").onclick=()=>openPlace(pick.id);
  el.querySelectorAll(".xs-st").forEach(b=>b.onclick=()=>{const s=STORIES.find(x=>x[0]===b.dataset.story);
    if(!s[3]){location.hash="#trips";return}openList(T(s[1]),cityOf(exploreCity),s[3]())});
  el.querySelectorAll(".xs-md").forEach(b=>b.onclick=()=>{const m=MOODS.find(x=>x[0]===b.dataset.mood);openList(`${m[1]} ${T(m[2])}`,cityOf(exploreCity),m[3]())});
  if(el.querySelector(".xs-season"))el.querySelector(".xs-season").onclick=()=>openList(T(sea.t),T(sea.s),sea.ps);
  el.querySelectorAll(".ax-all").forEach(b=>b.onclick=()=>{const k2=b.dataset.list,L={halal:["Halal food 🍜",halalHere()],gems:["Hidden gems ⭐",photoFirst(inCity().filter(p=>p.gem))],coffee:["Coffee & sweets ☕",photoFirst(inCity().filter(p=>p.cat==="coffee"))]}[k2];
    openList(T(L[0]),cityOf(exploreCity),L[1])});
}
// The clock in the header ticks with Japan's time, and the sky changes with it.
let lastPeriod=period(jst().h);
setInterval(()=>{if($("explore").hidden)return;const k=period(jst().h);
  if(k!==lastPeriod){lastPeriod=k;renderExplore()}else{const t=$("explore").querySelector(".xs-time");if(t)t.textContent=jstText()}},30000);


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
function closePlaceNow(){pv.hidden=true;pvId=null;if(lv.hidden)document.documentElement.classList.remove("pv-open")}
function closePlace(){if(history.state&&history.state.tnPlace)history.back();else closePlaceNow()}
addEventListener("popstate",e=>{const st=e.state||{};
  if(st.tnPlace)openPlace(st.tnPlace,true);else closePlaceNow();
  if(!st.tnPlace&&!st.tnList&&typeof closeList==="function")closeList()});
window.openPlace=openPlace; // the real map (js/appmap.js) opens places too
// Every way of picking a place opens its page instead of unfolding the card.
const _select=select;select=function(id){if(!id)return;if(typeof closeApollo==="function")closeApollo();openPlace(id)};

// ---- a list page: a story, a mood, the season or "See all" ----
const lv=document.createElement("div");lv.id="lview";lv.hidden=true;lv.setAttribute("role","dialog");lv.setAttribute("aria-modal","true");document.body.appendChild(lv);
function openList(title,sub,ps,fromHistory){
  lv.innerHTML=`<div class="lv-bar"><button type="button" class="pv-cb lv-back" aria-label="${esc(T("Back"))}">${SVG(I.back)}</button><div><b>${esc(title)}</b><small>${esc(sub)} · ${esc(T(ps.length===1?"1 place":"{n} places",{n:ps.length}))}</small></div></div>
    <div class="lv-grid">${ps.map(pcard).join("")||`<p class="lv-none">${esc(T("Nothing here yet in this city. Try another city."))}</p>`}</div>`;
  lv.querySelector(".lv-back").onclick=()=>history.back();
  wireCards(lv);lv.hidden=false;lv.scrollTop=0;document.documentElement.classList.add("pv-open");
  if(!fromHistory)history.pushState({tnList:1},"");
}
function closeList(){lv.hidden=true;if(pv.hidden)document.documentElement.classList.remove("pv-open")}

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
