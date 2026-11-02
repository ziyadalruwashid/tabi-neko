// The crew, as a character select (the app only): one big character on a
// sunburst stage, the others peeking in from the sides. Swipe, tap the arrows
// or the dots for the next one. Below: who they are, their quote in a speech
// bubble and a few live numbers. Everyone in data/crew.js shows up here.
(function(){
const el=document.createElement("div");el.id="crewcs";el.hidden=true;el.setAttribute("role","dialog");el.setAttribute("aria-modal","true");document.body.appendChild(el);
let i=0,dir=0;
const n=()=>CREW.length,at=k=>CREW[(k%n()+n())%n()];
// The live numbers a character can show (the `stats` field in data/crew.js).
const STAT={
  places:()=>[P.length,T("places")],
  cities:()=>[new Set(P.map(p=>p.city)).size,T("cities")],
  trips:()=>[typeof TRIPS!=="undefined"?TRIPS.length:0,T("day trips")],
  stamps:()=>[typeof STAMPS!=="undefined"?STAMPS.length:0,T("stamps")],
  halal:()=>[P.filter(p=>p.halal).length,T("halal spots")]
};
function draw(){
  if(el.hidden||!n())return;
  const m=at(i),l=at(i-1),r=at(i+1),many=n()>1;
  const st=(m.stats||[]).filter(k=>STAT[k]).slice(0,2).map(k=>STAT[k]());
  el.style.setProperty("--c",`var(${m.c||"--lantern"})`);
  el.innerHTML=`<div class="cs-bg"></div><div class="cs-ray" aria-hidden="true"></div>
    <div class="cs-top"><button type="button" class="cs-x" aria-label="${esc(T("Back"))}">‹</button><b>${T("The crew")}</b><span>${T("{n} so far",{n:n()})}</span></div>
    <div class="cs-stage">
      ${many?`<img class="cs-side l" src="${esc(l.art||"")}" alt="" data-d="-1"><img class="cs-side r" src="${esc(r.art||"")}" alt="" data-d="1">`:""}
      <div class="cs-plat"></div>
      <img class="cs-hero${dir?(dir>0?" in-r":" in-l"):""}" src="${esc(m.art||m.photo||"")}" alt="${esc(D(m,"n"))}">
      ${many?`<button type="button" class="cs-arr prev" data-d="-1" aria-label="${esc(T("Previous"))}"><span dir="ltr">${isAR()?"›":"‹"}</span></button><button type="button" class="cs-arr next" data-d="1" aria-label="${esc(T("Next"))}"><span dir="ltr">${isAR()?"‹":"›"}</span></button>`:""}
    </div>
    <div class="cs-panel" aria-live="polite">
      <div class="cs-nm"><b>${esc(D(m,"n"))}</b>${m.jp?`<span class="cs-jp">${esc(m.jp)}</span>`:""}${m.role?`<span class="cs-pill">${esc(D(m,"role"))}</span>`:""}</div>
      <p>${esc(D(m,"what"))}</p>
      ${m.tip?`<div class="cs-bub">“${esc(D(m,"tip"))}” 🐾</div>`:""}
      <div class="cs-stats">${st.map(([v,t])=>`<div><b>${v}</b>${esc(t)}</div>`).join("")}${m.cap?`<div><b>${m.e||"🐾"}</b>${esc(D(m,"cap"))}</div>`:""}</div>
      ${m.links&&m.links.length?`<div class="cs-links">${m.links.map(x=>`<a href="${esc(x[1])}" target="_blank" rel="noopener noreferrer">${esc(x[0])} ↗</a>`).join("")}</div>`:""}
      ${many?`<div class="cs-dots">${CREW.map((c,k)=>`<button type="button" class="${k===i?"on":""}" data-k="${k}" aria-label="${esc(D(c,"n"))}"></button>`).join("")}</div>`:""}
    </div>`;
  el.querySelector(".cs-x").onclick=close;
  el.querySelectorAll("[data-d]").forEach(b=>b.onclick=()=>step(+b.dataset.d));
  el.querySelectorAll(".cs-dots button").forEach(b=>b.onclick=()=>{const k=+b.dataset.k;if(k!==i){dir=k>i?1:-1;i=k;draw()}});
}
// In Arabic the line runs right to left, so "next" is on the left.
function step(d){if(n()<2)return;dir=d;i=((i+d)%n()+n())%n();try{navigator.vibrate&&navigator.vibrate(8)}catch(e){}draw()}
let x0=null,y0=0;
el.addEventListener("pointerdown",e=>{if(e.target.closest(".cs-panel"))return;x0=e.clientX;y0=e.clientY});
el.addEventListener("pointerup",e=>{if(x0===null)return;const dx=e.clientX-x0,dy=e.clientY-y0;x0=null;
  if(Math.abs(dx)>40&&Math.abs(dx)>Math.abs(dy))step((dx<0)!==isAR()?1:-1)});
el.addEventListener("pointercancel",()=>{x0=null});
addEventListener("keydown",e=>{if(el.hidden)return;if(e.key==="ArrowRight"||e.key==="ArrowLeft"){e.preventDefault();step((e.key==="ArrowRight")!==isAR()?1:-1)}});

function open(fromHistory){el.hidden=false;document.documentElement.classList.add("cs-open");if(!fromHistory){i=0;history.pushState({tnCrew:1},"")}dir=0;draw();el.scrollTop=0}
function closeNow(){el.hidden=true;document.documentElement.classList.remove("cs-open")}
function close(){if(WEB){if(navd)history.back();else location.hash="";return}if(history.state&&history.state.tnCrew)history.back();else closeNow()}
addEventListener("popstate",e=>{const st=e.state||{};if(st.tnCrew){if(el.hidden)open(true)}else if(!el.hidden)closeNow()});
window.tnOpenCrew=()=>open();
// On the website the same page shows at #crew: opened by the address, and the
// back button returns to where you came from (or the landing page).
const WEB=typeof IS_APP==="undefined"||!IS_APP;
let navd=false;
if(WEB){const sync=()=>{if(location.hash==="#crew"){if(el.hidden)open(true)}else if(!el.hidden)closeNow()};
  addEventListener("hashchange",()=>{navd=true;sync()});sync()}
})();
