// Day trips as "How far?" (the app only). Kenbo stands in your city and each
// day trip is a pin around him: in its real direction (`ll` in data/trips.js),
// and as far out as the train ride is long, on rings for 30 minutes, 1 hour
// and 2 hours. Tap a pin for its card; tap the card for the whole trip.
(function(){
const el=document.createElement("div");el.id="trview";el.hidden=true;el.setAttribute("role","dialog");el.setAttribute("aria-modal","true");document.body.appendChild(el);
// Where "your city" is, for the directions.
const BASE={tokyo:[35.69,139.70],kansai:[34.85,135.62]};
let grp="tokyo",sel=null,full=false;
// "about 1h50" → 110, "35–45 min" → 40, "1–1.5h" → 75. A range counts as its middle.
function mins(s){s=String(s||"").replace(/(\d+(?:\.\d+)?)\s*[–-]\s*(\d+(?:\.\d+)?)/,(m,a,b)=>String((+a+ +b)/2));
  const h=s.match(/(\d+(?:\.\d+)?)\s*h\s*(\d+)?/);if(h)return Math.round(+h[1]*60+(+h[2]||0));
  const m=s.match(/(\d+(?:\.\d+)?)\s*min/);return m?Math.round(+m[1]):60}
const short=t=>D(t,"n").split(/ & | و(?=\S)/)[0];
const list=()=>TRIPS.filter(t=>t.h===grp);
// Pin positions in % of the map, from the centre. Distance is the square root
// of the minutes, so the short trips don't all crowd in the middle.
function layout(ts){
  const b=BASE[grp]||BASE.tokyo;
  const pts=ts.map((t,i)=>{const r=.47*Math.min(1,Math.max(.3,Math.sqrt(mins(t.time)/120)));
    const a=t.ll?Math.atan2(-(t.ll[0]-b[0]),(t.ll[1]-b[1])*Math.cos(b[0]*Math.PI/180)):i*2.4;return {t,r,a}});
  // Nudge pins apart when two would sit on top of each other.
  for(let k=0;k<40;k++)for(let i=0;i<pts.length;i++)for(let j=i+1;j<pts.length;j++){const p=pts[i],q=pts[j];
    const dx=p.r*Math.cos(p.a)-q.r*Math.cos(q.a),dy=p.r*Math.sin(p.a)-q.r*Math.sin(q.a);
    if(Math.hypot(dx,dy)<.15){const s=p.a<=q.a?-1:1;p.a+=s*.04;q.a-=s*.04}}
  // Kept a little inside the edges so the names fit.
  const cl=v=>Math.min(91,Math.max(9,v));
  return pts.map(p=>({t:p.t,x:cl(50+p.r*100*Math.cos(p.a)),y:cl(50+p.r*100*Math.sin(p.a))}));
}
const pic=t=>{if(t.img)return t.img;const p=t.city&&P.find(p=>p.city===t.city&&p.photo);return p?p.photo:""};
const halalChip=t=>/^No /.test(t.halal||"")?`<span class="tr-h no">🍱 ${T("bring food")}</span>`:`<span class="tr-h">🥩 ${T("halal food")}</span>`;
const first=s=>String(s||"").split(" · ")[0];
function draw(){
  if(el.hidden)return;
  const ts=list();if(!sel||sel.h!==grp)sel=ts.slice().sort((a,b)=>mins(a.time)-mins(b.time))[0]||null;
  const pins=layout(ts),G=TGROUPS.find(g=>g.k===grp)||{};
  el.innerHTML=`<div class="tr-top"><button type="button" class="tr-x" aria-label="${esc(T("Back"))}">‹</button><b>${T("How far?")}</b></div>
  <div class="tr-seg">${TGROUPS.map(g=>`<button type="button" data-g="${g.k}" class="${g.k===grp?"on":""}">${esc(D(g,"t"))}</button>`).join("")}</div>
  <p class="tr-why">${esc(D(G,"why"))}</p>
  <div class="tr-map" dir="ltr">
    ${[[.5,"30 min"],[.707,"1 hour"],[1,"2 hours"]].map(([f,l])=>`<div class="tr-ring" style="--f:${f*.94}"><i>${T(l)}</i></div>`).join("")}
    <div class="tr-me"><img src="assets/crew/kenbo.png" alt=""></div>
    ${pins.map((p,i)=>`<button type="button" class="tr-pin${p.t===sel?" on":""}" data-i="${TRIPS.indexOf(p.t)}" style="left:${p.x.toFixed(1)}%;top:${p.y.toFixed(1)}%;--d:${i*40}ms"><span>${p.t.e||"🚆"}</span><b>${esc(short(p.t))}</b></button>`).join("")}
  </div>
  ${sel?card(sel):""}${sel&&full?sheet(sel):""}`;
  el.querySelector(".tr-x").onclick=close;
  el.querySelectorAll(".tr-seg button").forEach(b=>b.onclick=()=>{if(b.dataset.g!==grp){grp=b.dataset.g;sel=null;draw()}});
  el.querySelectorAll(".tr-pin").forEach(b=>b.onclick=()=>{const t=TRIPS[+b.dataset.i];if(t===sel){full=true}else sel=t;draw()});
  const c=el.querySelector(".tr-card");if(c)c.onclick=()=>{full=true;draw()};
  const sc=el.querySelector(".tr-scrim");if(sc)sc.onclick=e=>{if(e.target===sc||e.target.closest(".tr-close")){full=false;draw()}};
  el.querySelectorAll(".tr-city").forEach(b=>b.onclick=()=>{const k=b.dataset.c;close();setTimeout(()=>{if(window.tnExploreCity)tnExploreCity(k);if(window.goTab)goTab("explore");window.scrollTo(0,0)},60)});
}
function card(t){const im=pic(t);
  return `<button type="button" class="tr-card">${im?`<span class="tr-im" style="background-image:url('${esc(window.tnPic?tnPic(im):im)}')"></span>`:`<span class="tr-im tr-emo">${t.e||"🚆"}</span>`}
    <span class="tr-cx"><b>${esc(D(t,"n"))}</b>${t.jp?`<small class="tr-jp">${esc(t.jp)}</small>`:""}<span class="tr-best">${esc(D(t,"best"))}</span>
    <span class="tr-mini"><span>⏱ ${esc(D(t,"time"))}</span><span>💴 ${esc(first(D(t,"cost")))}</span>${halalChip(t)}</span>
    <span class="tr-go">${T("See the full trip →")}</span></span></button>`}
function sheet(t){const c=!WEB&&t.city&&CITIES[t.city]&&P.some(p=>p.city===t.city);
  return `<div class="tr-scrim"><div class="tr-sheet"><span class="tr-grab"></span><button type="button" class="tr-close" aria-label="${esc(T("Close"))}">✕</button>
    <div class="tr-sh"><span class="tr-pe">${t.e||"🚆"}</span><div><b>${esc(D(t,"n"))}</b>${t.jp?`<small>${esc(t.jp)}</small>`:""}</div></div>
    <p class="tr-sbest">${esc(D(t,"best"))}</p>
    <div class="tr-facts"><div><b>${esc(D(t,"time"))}</b>${T("one way")}</div><div><b>${esc(first(D(t,"cost")))}</b>${T("ticket")}</div><div><b>${esc(first(D(t,"day")))}</b>${T("plan for")}</div></div>
    <h4>${T("getting there")}</h4><p>${esc(D(t,"go"))}. ${esc(D(t,"day"))}.</p>
    ${D(t,"ps")?`<h4>${T("Pass?")}</h4><p>${esc(D(t,"ps"))}</p>`:""}
    <h4>${T("Don't miss:")}</h4><div class="tr-see">${(D(t,"see")||[]).map(s=>`<span>${esc(s)}</span>`).join("")}</div>
    <h4>${T("Halal food:")}</h4><p class="tr-hal">${esc(D(t,"halal"))}</p>
    ${t.tip?`<div class="tr-tip"><img src="assets/crew/kenbo.png" alt=""><span>${esc(D(t,"tip"))}</span></div>`:""}
    <div class="tr-btns"><a class="p" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(t.q)}" target="_blank" rel="noopener">📍 ${T("Google Maps")}</a>
      ${t.book?`<a href="${esc(t.book)}" target="_blank" rel="noopener">🎟️ ${T("Tours")}</a>`:""}
      ${c?`<button type="button" class="tr-city" data-c="${t.city}">${T("Places in {c} →",{c:D(CITIES[t.city],"n")})}</button>`:""}</div>
  </div></div>`}
function open(fromHistory){el.hidden=false;document.documentElement.classList.add("tr-open");full=false;
  if(!fromHistory){let ec="tokyo";try{ec=store.get("tabineko-city")||"tokyo"}catch(e){}grp=ec==="tokyo"?"tokyo":"kansai";if(!TRIPS.some(t=>t.h===grp))grp=(TGROUPS[0]||{}).k;sel=null;history.pushState({tnTrips:1},"")}
  draw();el.scrollTop=0}
function closeNow(){el.hidden=true;document.documentElement.classList.remove("tr-open")}
function close(){if(WEB){if(navd)history.back();else location.hash="";return}if(history.state&&history.state.tnTrips)history.back();else closeNow()}
addEventListener("popstate",e=>{const st=e.state||{};if(st.tnTrips){if(el.hidden)open(true)}else if(!el.hidden)closeNow()});
window.tnOpenTrips=()=>open();
window.tnTripsBack=()=>{if(el.hidden||!full)return false;full=false;draw();return true};
// On the website the same page shows at #trips: opened by the address, and the
// back button returns to where you came from (or the landing page).
const WEB=typeof IS_APP==="undefined"||!IS_APP;
let navd=false;
if(WEB){const sync=()=>{if(location.hash==="#trips"){if(el.hidden)open(true)}else if(!el.hidden)closeNow()};
  addEventListener("hashchange",()=>{navd=true;sync()});sync()}
})();
