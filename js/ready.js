// Ready plans (data/plans.js): the classic first trip, picked from a sheet in
// My trip and copied into it, where it can be changed like any trip. No
// login and no Claude call. Loaded after js/planner.js and uses its sheet
// styles, hasPlanned() and the trip helpers from js/trip.js.

// Each plan's place names, turned into trip keys once. A name that isn't in
// its stay's city is left out (and said in the console, for whoever edits it).
const READY=PLANS.map(r=>({...r,stays:r.stays.filter(s=>TRIP_CITIES.includes(s.city)).map(s=>({city:s.city,days:s.days.map(d=>({...d,
  ids:d.p.map(n=>{const p=BYKEY.get(s.city+"|"+n);if(!p)console.warn("plans.js: not in the notebook:",s.city,n);return p&&PKEY(p)}).filter(Boolean)}))}))}));
const readyDays=r=>r.stays.reduce((n,s)=>n+s.days.length,0);
const readyPlaces=r=>r.stays.flatMap(s=>s.days.flatMap(d=>d.ids));
// The route between cities, its arrows pointing the way the page reads.
const readyRoute=r=>r.stays.map(s=>cityName(s.city)).join(isAR()?" ← ":" → ");

let ready=null; // {pick: index of the plan being looked at, or -1 for the list}
function openReady(){
  ready={pick:-1};
  let el=$("ready");
  if(!el){el=document.createElement("div");el.id="ready";el.className="tpick acct";document.body.appendChild(el);
    el.addEventListener("click",e=>{if(e.target===el)closeReady()});
    el.addEventListener("keydown",e=>{if(e.key==="Escape")closeReady()})}
  el.hidden=false;document.documentElement.classList.add("tpick-open");
  renderReady();
}
function closeReady(){const el=$("ready");if(el)el.hidden=true;document.documentElement.classList.remove("tpick-open");ready=null}

function renderReady(){
  const el=$("ready");if(!el||!ready)return;
  const stats=r=>T("{d} days · {p} places",{d:String(readyDays(r)),p:String(readyPlaces(r).length)});
  let h;
  if(ready.pick<0){
    h=`<h2 id="ready-h">${T("Pick a ready plan")}</h2>
      <p>${T("The most famous sights, already sorted into days. Change anything you like after.")}</p>
      <div class="rd-list">${READY.map((r,i)=>`<button type="button" class="tmagic rd-plan" data-i="${i}"><span class="tmagic-s" aria-hidden="true">🗾</span>
        <span><b>${esc(D(r,"n"))}</b><small>${esc(D(r,"blurb"))}</small><em class="rd-route">${esc(readyRoute(r))} · ${esc(stats(r))}</em></span>
        <span class="tmagic-go" aria-hidden="true">→</span></button>`).join("")}</div>`;
  }else{
    const r=READY[ready.pick];let num=0;
    h=`<button type="button" class="tclear rd-back">${T("← All plans")}</button>
      <h2 id="ready-h">${esc(D(r,"n"))}</h2>
      <p class="pl-sum">${esc(readyRoute(r))} · ${esc(stats(r))}</p>
      <ol class="pl-days">${r.stays.map(s=>s.days.map(d=>{num++;return `<li><b>${esc(T("Day {n}",{n:num}))}</b> <span class="pl-dt">${esc(D(d,"t"))}</span>
        <small>${d.ids.map(k=>esc(BYKEY.get(k).n)).join(" · ")}</small></li>`}).join("")).join("")}</ol>
      ${hasPlanned()?`<p class="acct-small">${T("This replaces the days in your current trip. Your ideas and where you're staying are kept.")}</p>`:""}
      <div class="acct-two"><button type="button" class="store rd-use">✓ ${T("Use this plan")}</button></div>`;
  }
  el.innerHTML=`<div class="tpick-sheet acct-sheet pl-sheet" role="dialog" aria-modal="true" aria-labelledby="ready-h">
    <button type="button" class="tdel acct-x" aria-label="${esc(T("Close"))}">×</button>${h}</div>`;
  const q=s=>el.querySelector(s);
  q(".acct-x").onclick=closeReady;
  el.querySelectorAll(".rd-plan").forEach(b=>b.onclick=()=>{ready.pick=+b.dataset.i;renderReady();el.querySelector(".tpick-sheet").scrollTop=0});
  if(q(".rd-back"))q(".rd-back").onclick=()=>{ready.pick=-1;renderReady()};
  if(q(".rd-use"))q(".rd-use").onclick=()=>useReady(READY[ready.pick]);
}

// Same as using Apollo's plan: the days are replaced, ideas and where you're
// staying are kept. The order is kept as written (sunset views come last).
function useReady(r){
  if(hasPlanned()&&!confirm(T("Replace the days in your current trip with this plan?")))return;
  const homes=new Map();trip.stays.forEach(s=>{if(s.home&&!homes.has(s.city))homes.set(s.city,s.home)});
  const planned=new Set(readyPlaces(r));
  trip.stays=r.stays.map(s=>({city:s.city,home:homes.get(s.city)||null,days:s.days.map(d=>({t:D(d,"t"),ids:[...d.ids]}))}));
  trip.ideas=trip.ideas.filter(k=>!planned.has(k));
  if(!trip.name)trip.name=D(r,"n");
  trip=cleanTrip(trip);
  saveTrip();closeReady();renderTrip();renderList();renderMap();
  toast(T("Your trip is ready ✨ Change anything you like."));
  const t=$("tripbook").querySelector(".tstay");if(t)t.scrollIntoView({behavior:"smooth",block:"start"});
}
