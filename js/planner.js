// "Apollo, plan my trip": you say which cities and for how long, who's
// going, what you love and how busy the days should be; Claude, through the
// Ask Apollo Worker (APOLLO_API, js/apollo.js), builds a day-by-day plan
// from the notebook. Loaded after js/trip.js and uses its trip helpers.
//
// The answer is checked before it touches your trip: only places that are
// really in the notebook are kept, each one once, and each day is put in
// walking order (from where you're staying, when you've set it).
const PLAN_PARTY=[["solo","Just me","🧳"],["couple","Couple","💑"],["family","Family with kids","👨‍👩‍👧"],["friends","Friends","👯"]];
const PLAN_LOVES=[["food","Food","🍜"],["coffee","Coffee & sweets","☕"],["shrines","Temples & shrines","⛩️"],["views","Views","🌅"],
  ["shopping","Shopping","🛍️"],["anime","Anime & games","🎮"],["experiences","Experiences","🥋"],["gems","Hidden gems","💎"]];
const PLAN_PACE=[["relaxed","Relaxed","3 stops a day"],["balanced","Balanced","4 stops a day"],["packed","Packed","5–6 stops a day"]];

let planner=null; // {cities:[{city,days}], party, loves:Set, pace, halal, note, step:"form"|"busy"|"result", plan, msg}
function openPlanner(){
  const own=trip.stays.map(s=>({city:s.city,days:s.days.length}));
  planner={cities:own.length?own:[],party:"couple",loves:new Set(["food"]),pace:"balanced",halal:true,note:"",step:"form",msg:""};
  let el=$("planner");
  if(!el){el=document.createElement("div");el.id="planner";el.className="tpick acct";document.body.appendChild(el);
    el.addEventListener("click",e=>{if(e.target===el&&planner.step!=="busy")closePlanner()});
    el.addEventListener("keydown",e=>{if(e.key==="Escape"&&planner.step!=="busy")closePlanner()})}
  el.hidden=false;document.documentElement.classList.add("tpick-open");
  renderPlanner();
}
function closePlanner(){const el=$("planner");if(el)el.hidden=true;document.documentElement.classList.remove("tpick-open");planner=null}

// While Apollo thinks, the cat says what he's up to.
const PLAN_STEPS=["Opening my notebook…","Grouping places by neighbourhood…","Finding halal lunch spots…","Putting each day in walking order…","Almost there…"];
let planTick=null;

function renderPlanner(){
  const el=$("planner"),p=planner;if(!el||!p)return;
  const total=p.cities.reduce((n,c)=>n+c.days,0);
  let h="";
  if(p.step==="form"){
    const unused=TRIP_CITIES.filter(c=>!p.cities.some(x=>x.city===c));
    h=`<h2 id="plan-h">✨ ${T("Let Apollo plan it")}</h2>
      <p>${T("Pick your cities and days. Apollo builds the whole trip from places he's been to.")}</p>
      <h3 class="acct-h3">${T("Where, and for how long?")}</h3>
      ${p.cities.length?`<ul class="pl-cities">${p.cities.map((c,i)=>`<li><span lang="ja" aria-hidden="true">${CITIES[c.city].jp}</span><b>${esc(cityName(c.city))}</b>
        <span class="pl-step"><button type="button" class="pl-minus" data-i="${i}" aria-label="${esc(T("Fewer days"))}">−</button><output>${esc(T(c.days===1?"1 day":"{n} days",{n:c.days}))}</output><button type="button" class="pl-plus" data-i="${i}" aria-label="${esc(T("More days"))}"${total>=21?" disabled":""}>+</button></span>
        <button type="button" class="tdel pl-x" data-i="${i}" aria-label="${esc(T("Remove"))}">×</button></li>`).join("")}</ul>`:""}
      ${unused.length&&p.cities.length<6?`<div class="pl-add">${unused.map(c=>`<button type="button" class="tchip2 pl-city" data-c="${c}">＋ ${esc(cityName(c))}</button>`).join("")}</div>`:""}
      <h3 class="acct-h3">${T("Who's going?")}</h3>
      <div class="pl-pick">${PLAN_PARTY.map(([k,l,e])=>`<button type="button" class="tchip2 pl-party${p.party===k?" on":""}" data-k="${k}" aria-pressed="${p.party===k}">${e} ${esc(T(l))}</button>`).join("")}</div>
      <h3 class="acct-h3">${T("What do you love?")}</h3>
      <div class="pl-pick">${PLAN_LOVES.map(([k,l,e])=>`<button type="button" class="tchip2 pl-love${p.loves.has(k)?" on":""}" data-k="${k}" aria-pressed="${p.loves.has(k)}">${e} ${esc(T(l))}</button>`).join("")}</div>
      <h3 class="acct-h3">${T("How busy?")}</h3>
      <div class="pl-pick">${PLAN_PACE.map(([k,l,d])=>`<button type="button" class="tchip2 pl-pace${p.pace===k?" on":""}" data-k="${k}" aria-pressed="${p.pace===k}">${esc(T(l))} <small>${esc(T(d))}</small></button>`).join("")}</div>
      <label class="pl-halal"><input type="checkbox" id="pl-halal"${p.halal?" checked":""}> ${T("Halal food only")}</label>
      <textarea id="pl-note" class="thome-q" rows="2" maxlength="300" dir="auto" placeholder="${esc(T("Anything else? e.g. we love ramen, no early mornings, it's our honeymoon"))}">${esc(p.note)}</textarea>
      ${p.msg?`<p class="thome-msg" role="alert">${esc(p.msg)}</p>`:""}
      <div class="acct-f"><button type="button" class="store pl-go"${p.cities.length?"":" disabled"}>✨ ${T(p.cities.length?"Plan my {n}-day trip":"Pick at least one city",{n:total})}</button></div>
      <p class="acct-small">${T("Apollo can make mistakes. Check opening times and halal status before you go.")}</p>`;
  }else if(p.step==="busy"){
    h=`<div class="pl-busy"><img src="assets/cat.png" alt="" class="pl-cat"><h2 id="plan-h">${T("Apollo is planning…")}</h2>
      <p class="pl-say" role="status">${esc(T(PLAN_STEPS[0]))}</p><div class="pl-dots" aria-hidden="true"><i></i><i></i><i></i></div></div>`;
  }else{
    const r=p.plan,n=r.stays.reduce((a,s)=>a+s.days.length,0),places=r.stays.flatMap(s=>s.days.flatMap(d=>d.ids)),halal=places.filter(k=>BYKEY.get(k).halal).length;
    let num=0;
    h=`<h2 id="plan-h">${esc(r.name||T("My Japan trip"))}</h2>
      ${r.note?`<p class="pl-note">🐾 ${esc(r.note)}</p>`:""}
      <p class="pl-sum">${esc(T("{d} days · {p} places · {h} halal food spots",{d:String(n),p:String(places.length),h:String(halal)}))}</p>
      <ol class="pl-days">${r.stays.map(s=>s.days.map(d=>{num++;return `<li><b>${esc(T("Day {n}",{n:num}))}</b> <span class="pl-dt">${esc(d.t)}</span>
        <small>${d.ids.map(k=>esc(BYKEY.get(k).n)).join(" · ")||esc(T("a free day"))}</small></li>`}).join("")).join("")}</ol>
      ${hasPlanned()?`<p class="acct-small">${T("This replaces the days in your current trip. Your ideas and where you're staying are kept.")}</p>`:""}
      <div class="acct-two"><button type="button" class="store pl-use">✓ ${T("Use this plan")}</button><button type="button" class="store pl-again">↺ ${T("Change my answers")}</button></div>`;
  }
  el.innerHTML=`<div class="tpick-sheet acct-sheet pl-sheet" role="dialog" aria-modal="true" aria-labelledby="plan-h">
    ${p.step==="busy"?"":`<button type="button" class="tdel acct-x" aria-label="${esc(T("Close"))}">×</button>`}${h}</div>`;
  const q=s=>el.querySelector(s),qa=s=>el.querySelectorAll(s);
  if(q(".acct-x"))q(".acct-x").onclick=closePlanner;
  if(p.step==="form"){
    const keep=()=>{p.note=q("#pl-note").value;p.halal=q("#pl-halal").checked};
    qa(".pl-city").forEach(b=>b.onclick=()=>{keep();if(total<21)p.cities.push({city:b.dataset.c,days:Math.min(3,21-total)});renderPlanner()});
    qa(".pl-minus").forEach(b=>b.onclick=()=>{keep();const c=p.cities[+b.dataset.i];if(c.days>1)c.days--;renderPlanner()});
    qa(".pl-plus").forEach(b=>b.onclick=()=>{keep();if(total<21)p.cities[+b.dataset.i].days++;renderPlanner()});
    qa(".pl-x").forEach(b=>b.onclick=()=>{keep();p.cities.splice(+b.dataset.i,1);renderPlanner()});
    qa(".pl-party").forEach(b=>b.onclick=()=>{keep();p.party=b.dataset.k;renderPlanner()});
    qa(".pl-love").forEach(b=>b.onclick=()=>{keep();p.loves.has(b.dataset.k)?p.loves.delete(b.dataset.k):p.loves.add(b.dataset.k);renderPlanner()});
    qa(".pl-pace").forEach(b=>b.onclick=()=>{keep();p.pace=b.dataset.k;renderPlanner()});
    q(".pl-go").onclick=()=>{keep();askApollo()};
  }
  if(p.step==="result"){q(".pl-use").onclick=usePlan;q(".pl-again").onclick=()=>{p.step="form";renderPlanner()}}
}
const hasPlanned=()=>trip.stays.some(s=>s.days.some(d=>d.ids.length||d.t));

async function askApollo(){
  const p=planner;p.step="busy";p.msg="";renderPlanner();
  let i=0;clearInterval(planTick);
  planTick=setInterval(()=>{const s=$("planner")&&$("planner").querySelector(".pl-say");if(s)s.textContent=T(PLAN_STEPS[Math.min(++i,PLAN_STEPS.length-1)])},4000);
  try{
    const r=await fetch(APOLLO_API,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({plan:{
      cities:p.cities,party:p.party,interests:[...p.loves],pace:p.pace,halal:p.halal,note:p.note,lang:isAR()?"ar":"en"}})});
    if(!r.ok)throw {status:r.status};
    const plan=checkPlan((await r.json()).plan);
    if(!plan)throw {status:0};
    p.plan=plan;p.step="result";
  }catch(e){
    p.step="form";
    p.msg=e&&e.status===429?T("You're asking faster than I can walk! Give me a minute, then try again."):T("Apollo couldn't plan that just now. Try again in a moment.");
  }
  clearInterval(planTick);
  if(planner===p)renderPlanner();
}

// Claude's answer, turned into the trip's own shape: notebook places only,
// matched by name within that stay's city (a place from another city would
// mean a day of travel, so it's dropped), each place once, notebook cities only.
function checkPlan(r){
  if(!r||!Array.isArray(r.stays))return null;
  const LOWN=new Map();P.forEach(x=>LOWN.set(LOW(x.city+"|"+x.n),x));
  const seen=new Set();
  const stays=r.stays.filter(s=>s&&TRIP_CITIES.includes(s.city)&&Array.isArray(s.days)).slice(0,6).map(s=>({city:s.city,
    days:s.days.slice(0,14).map(d=>{
      const ids=(Array.isArray(d&&d.places)?d.places:[]).map(n=>{const x=LOWN.get(LOW(s.city+"|"+String(n).trim()));return x&&PKEY(x)})
        .filter(k=>k&&!seen.has(k)&&seen.add(k)).slice(0,8);
      return {t:String(d&&d.title||"").slice(0,50),ids};
    })})).filter(s=>s.days.length);
  if(!stays.length||!seen.size)return null;
  return {name:String(r.name||"").slice(0,60),note:String(r.note||"").slice(0,300),stays};
}

// Shortest-looking loop: from where you're staying (or the day's first stop),
// always walk to the nearest place not yet visited.
function walkOrder(ids,home){
  const left=ids.map(k=>BYKEY.get(k)),out=[];let at=home||left[0];
  while(left.length){let bi=0,bd=Infinity;left.forEach((x,i)=>{const d=KM(at,x);if(d<bd){bd=d;bi=i}});at=left.splice(bi,1)[0];out.push(PKEY(at))}
  return out;
}

function usePlan(){
  const r=planner.plan;
  if(hasPlanned()&&!confirm(T("Replace the days in your current trip with Apollo's plan?")))return;
  const homes=new Map();trip.stays.forEach(s=>{if(s.home&&!homes.has(s.city))homes.set(s.city,s.home)});
  const planned=new Set(r.stays.flatMap(s=>s.days.flatMap(d=>d.ids)));
  trip.stays=r.stays.map(s=>{const home=homes.get(s.city)||null;
    return {city:s.city,home,days:s.days.map(d=>({t:d.t,ids:walkOrder(d.ids,home)}))}});
  // Ideas Apollo used are now in a day, so they leave the ideas tray.
  trip.ideas=trip.ideas.filter(k=>!planned.has(k));
  if(!trip.name)trip.name=r.name;
  trip=cleanTrip(trip);
  saveTrip();closePlanner();renderTrip();renderList();renderMap();
  toast(T("Your trip is ready ✨ Change anything you like."));
  const t=$("tripbook").querySelector(".tstay");if(t)t.scrollIntoView({behavior:"smooth",block:"start"});
}
