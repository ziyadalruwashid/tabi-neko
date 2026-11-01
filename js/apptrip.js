// My trip in the app layout: one day at a time instead of one long page.
// A header with the trip's numbers, city tabs, day tabs, and the day as a
// timeline (photos, how to get from one stop to the next, a halal lunch
// nearby), then your ideas, the whole trip at a glance and the actions.
//
// It only draws: every button carries the same class and data the website's
// My trip uses, so js/trip.js's wireTrip() does the work (move, remove,
// reorder, stay, picker, PDF, share, sync) exactly as it does on the site.
// A trip someone shared with you keeps the website's view.
(function(){
if(!IS_APP)return;

const SVG=d=>`<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const I_SHARE='<path d="M12 15V4m0 0-4 4m4-4 4 4M6 13v6h12v-6"/>',I_DOTS='<circle cx="12" cy="5" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="12" cy="19" r="1.4"/>',I_MAP='<path d="m9 4-5 2v14l5-2 6 2 5-2V4l-5 2-6-2zM9 4v14M15 6v14"/>';
let si=0,di=0,seen=null; // the cities last drawn, to tell "a city was added" from "a new trip"
const N=(n,one,many)=>T(n===1?one:many,{n});
const arrow=()=>isAR()?"←":"→";

function legLine(a,b){const km=KM(a,b);return `${km<=1.5?"🚶":"🚃"} ${esc(legText(a,b))}`}
function stop(p,i,ref){
  const k=PKEY(p);
  return `<li class="at-stop" data-k="${esc(k)}" style="--c:var(--${p.cat})">
    <span class="at-num">${i+1}</span>
    <div class="at-sc"><img src="${esc(p.photo||CATS[p.cat].img)}" alt="" loading="lazy"${p.photo?"":` class="art"`}>
      <span class="at-si"><button type="button" class="tname" data-id="${p.id}"><bdi>${esc(p.n)}</bdi></button>
        <small>${esc(D(CATS[p.cat],"n"))} · ${esc(AREA(p.area))}</small>${p.halal?`<em>${p.hl==="friendly"?T("Muslim-friendly"):T("✓ halal")}</em>`:""}</span>
      <button type="button" class="at-more" aria-label="${esc(T("Options"))}" aria-expanded="false">${SVG(I_DOTS)}</button></div>
    <div class="at-ctl" hidden><button type="button" class="tup" data-k="${esc(k)}">↑ ${T("Up")}</button><button type="button" class="tdown" data-k="${esc(k)}">↓ ${T("Down")}</button>
      ${moveMenu(k,ref)}<button type="button" class="tdel" data-k="${esc(k)}">× ${T("Remove")}</button></div></li>`;
}

function emptyPage(box){
  const pics=TRIP_CITIES.filter(c=>c!=="ise").map(c=>[c,(HOODS.find(h=>h.city===c&&h.photo)||{}).photo||(P.find(p=>p.city===c&&p.photo)||{}).photo]);
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
  const t=trip,n=tripCount(t);
  const now=t.stays.map(x=>x.city);
  // One city added at the end (you just picked it): show it. Anything else
  // (a plan from Apollo, a synced or shared trip): start from the first.
  if(seen&&now.length===seen.length+1&&seen.every((c,i)=>c===now[i])){si=now.length-1;di=0}
  else if(seen&&(now.length!==seen.length||seen.some((c,i)=>c!==now[i]))){si=0;di=0}
  seen=now;
  if(si>=t.stays.length)si=Math.max(0,t.stays.length-1);
  const s=t.stays[si];if(s&&di>=s.days.length)di=s.days.length-1;if(di<0)di=0;
  let h="";
  if(!t.stays.length&&!t.ideas.length){
    h=emptyPage(box)+(typeof acctBar==="function"?`<div class="at-acct">${acctBar()}</div>`:"");
    box.innerHTML=h;wire(box);return;
  }
  const days=t.stays.reduce((a,x)=>a+x.days.length,0),halal=allIds(t).filter(k=>BYKEY.get(k).halal).length;
  h+=`<header class="at-top"><div><small>${T("My trip")} 🧳</small><input class="tname-in at-title" id="tripname" value="${esc(t.name)}" placeholder="${esc(T("Name your trip…"))}" maxlength="60" aria-label="${esc(T("Trip name"))}"></div>
      <button type="button" class="at-cb at-share" aria-label="${esc(T("Share"))}">${SVG(I_SHARE)}</button></header>`;
  if(shareAsk)h+=`<div class="tshareask"><p>${T("Include where you're staying? Anyone with the link will see it.")}</p>
    <button type="button" class="store" data-home="0">${T("Share without it")}</button><button type="button" class="store" data-home="1">${T("Include it")}</button></div>`;
  h+=`<div class="at-stats"><div><b>${t.stays.length}</b><small>${T(t.stays.length===1?"city":"cities")}</small></div><div><b>${days}</b><small>${T(days===1?"day":"days")}</small></div>
    <div><b>${n}</b><small>${T(n===1?"place":"places")}</small></div><div class="h"><b>${halal}</b><small>${T("halal food")}</small></div></div>`;
  // the cities
  h+=`<div class="at-cities">${t.stays.map((x,i)=>`<button type="button" class="at-city${i===si?" on":""}" data-s="${i}">${esc(cityName(x.city))} <small>${esc(N(x.days.length,"1 day","{n} days"))}</small></button>`).join("")}
    ${t.stays.length<10?`<button type="button" class="tnextb at-city add">＋ ${T("City")}</button>`:""}</div>`;
  if(addingCity)h+=`<div class="tnext at-next">${cityChooser(T("Where to next?"),"")}<button type="button" class="tclear tnext-x">${T("Cancel")}</button></div>`;
  if(s){
    h+=`<div class="at-home">${homeCard(s,si,false)}</div>`;
    // the days of this city
    let first=1;for(let i=0;i<si;i++)first+=t.stays[i].days.length;
    h+=`<div class="at-days">${s.days.map((d,i)=>`<button type="button" class="at-day${i===di?" on":""}" data-d="${i}">${esc(T("Day {n}",{n:first+i}))}</button>`).join("")}
      ${days<30?`<button type="button" class="taddday at-day add" data-s="${si}" aria-label="${esc(T("Add a day in {c}",{c:cityName(s.city)}))}">＋</button>`:""}</div>`;
    const d=s.days[di],ref=si+"."+di,ps=d.ids.map(k=>BYKEY.get(k)),home=s.home;
    let km=0;for(let i=1;i<ps.length;i++)km+=KM(ps[i-1],ps[i]);if(home&&ps.length)km+=KM(home,ps[0])+KM(ps[ps.length-1],home);
    const hal=ps.filter(p=>p.halal).length,stats=[N(ps.length,"1 place","{n} places"),km?T("~{n} km",{n:km.toFixed(1)}):"",hal?T("{n} halal",{n:hal}):""].filter(Boolean).join(" · ");
    const ideas=dayIdeas(ps,home,s.city,new Set());
    h+=`<article class="at-daycard tlist-drop" data-day="${ref}">
      <header><input class="tday-t at-dt" data-day="${ref}" value="${esc(d.t)}" placeholder="${esc(T("Name this day, e.g. Asakusa & Ueno"))}" maxlength="50" aria-label="${esc(T("Day title"))}">
        ${s.days.length>1?`<button type="button" class="tdayx at-x" data-day="${ref}" aria-label="${esc(T("Remove this day"))}">×</button>`:""}</header>
      ${stats?`<p class="at-dsum">${esc(isAR()?iso(stats):stats)}</p>`:""}
      ${ps.length?`<div class="at-mm">${routeDoodle(ps,home)}<button type="button" class="at-mapb">${SVG(I_MAP)} ${T("Open the map")}</button></div>`:""}
      <ul class="tlist at-tl">${home&&ps.length?`<li class="at-leg home">🏠 ${esc(home.n||T("your stay"))} · ${legLine(home,ps[0])}</li>`:""}
        ${ps.map((p,i)=>(i?`<li class="at-leg">${legLine(ps[i-1],p)}</li>`:"")+stop(p,i,ref)).join("")||`<li class="tnone at-none">${T("Nothing here yet. Add places, or move your ideas into this day.")}</li>`}
        ${home&&ps.length?`<li class="at-leg home">${legLine(ps[ps.length-1],home)} · ${T("back to 🏠")}</li>`:""}</ul>
      ${ideas.map(x=>`<p class="at-lunch">${x.icon} ${T(x.label)} <button type="button" class="tname" data-id="${x.p.id}"><bdi>${esc(x.p.n)}</bdi></button> <span>${esc(T("{n} km",{n:x.km.toFixed(1)}))}</span>
        <button type="button" class="tlunch-add" data-k="${esc(PKEY(x.p))}" data-day="${ref}" aria-label="${esc(T("＋ add"))}">＋</button></p>`).join("")}
      <div class="at-dact"><button type="button" class="tpickb at-btn ghost" data-day="${ref}">＋ ${T("Add places")}</button>
        ${ps.length?`<button type="button" class="tshare at-btn" data-day="${ref}">📄 ${T("Share this day as PDF")}</button>`:""}</div></article>`;
  }
  h+=ideasRow(t);
  // the whole trip at a glance
  let num=0;
  h+=`<h2 class="at-h">${T("Your whole trip")}</h2><div class="at-all">${t.stays.map((x,a)=>x.days.map((d,b)=>{num++;
    return `<button type="button" class="at-ov${a===si&&b===di?" on":""}" data-s="${a}" data-d="${b}"><span>${esc(T("Day {n}",{n:num}))}</span>
      <span><b>${esc(d.t||cityName(x.city))}</b><small>${esc(cityName(x.city))} · ${esc(N(d.ids.length,"1 place","{n} places"))}</small></span><i aria-hidden="true">${arrow()}</i></button>`}).join("")).join("")}</div>`;
  h+=`<h2 class="at-h">${T("Do more")}</h2><div class="at-acts">
    ${typeof openPlanner==="function"?`<button type="button" class="tplanb at-act a1"><span>✨</span><b>${T("Let Apollo sort it")}</b><small>${T("From his notebook, with halal food")}</small></button>`:""}
    ${n?`<button type="button" class="at-act a2" id="tpdf"><span>📘</span><b>${T("Trip PDF")}</b><small>${T("Every day, with map links")}</small></button>`:""}
    <button type="button" class="at-act a3" id="tshare"><span>👥</span><b>${T("Share with friends")}</b><small>${T("Send them a link")}</small></button></div>
    ${typeof acctBar==="function"?`<div class="at-acct">${acctBar()}</div>`:""}
    <div class="at-foot">${s?`<button type="button" class="tstayx at-link" data-s="${si}">${esc(T("Remove {c} from the trip",{c:cityName(s.city)}))}</button>`:""}
      ${typeof isShared==="function"&&isShared()&&tripOwner()!==me()?"":`<button type="button" class="tclear at-link" id="tclear">${T("Start over")}</button>`}</div>`;
  box.innerHTML=h;wire(box);
}

function wire(box){
  wireTrip();
  const q=s=>box.querySelectorAll(s);
  // Places open their page, the app way.
  q(".tname").forEach(b=>b.onclick=()=>openPlace(b.dataset.id));
  q(".at-city[data-s]").forEach(b=>b.onclick=()=>{si=+b.dataset.s;di=0;appTrip()});
  q(".at-day[data-d]").forEach(b=>b.onclick=()=>{di=+b.dataset.d;appTrip()});
  q(".at-ov").forEach(b=>b.onclick=()=>{si=+b.dataset.s;di=+b.dataset.d;appTrip();box.querySelector(".at-days").scrollIntoView({behavior:"smooth",block:"center"})});
  // A new day opens straight away.
  q(".taddday").forEach(b=>b.onclick=()=>{const s=trip.stays[+b.dataset.s];s.days.push({t:"",ids:[]});di=s.days.length-1;saveTrip();appTrip();renderList()});
  q(".at-more").forEach(b=>b.onclick=()=>{const c=b.closest(".at-stop").querySelector(".at-ctl");c.hidden=!c.hidden;b.setAttribute("aria-expanded",String(!c.hidden))});
  q(".at-share").forEach(b=>b.onclick=()=>{const x=$("tshare");if(x)x.click()});
  q(".at-mapb").forEach(b=>b.onclick=()=>{const s=trip.stays[si];city=s.city;store.set("tabineko-city",city);active=new Set(Object.keys(CATS));halalOnly=false;renderAll();
    try{history.replaceState(null,"","#map")}catch(e){}show("map",true);window.scrollTo(0,0)});
}

// Draw the app's My trip whenever the site would draw its own.
const _render=renderTrip;
renderTrip=function(){if(shared)return _render();appTrip()};
appTrip();
})();
