// Restaurants (the app only): every restaurant in the city you're
// exploring, opened from the card under the moods on Explore and from
// More → Discover.
//
// - "Halal only" is off by default. Off, every restaurant shows, each with
//   a clear badge: ✅ Halal certified, 🟢 Halal, 🟡 Muslim-friendly, or
//   "Not halal" (with "pork on the menu" / "alcohol served" when the tip
//   says so). On, only the halal ones stay, with a row to pick the level.
// - Kind chips (ramen, wagyu, sushi…), worked out from each place's name,
//   caption and tip; a kind shows only when the list has one.
// - 📍 switches the city (the same sheet as Explore); ＋ adds to My trip.
(function(){
if(typeof IS_APP==="undefined"||!IS_APP)return;
const KINDS=[["ramen","🍜","Ramen & noodles",/ramen|mazemen|tsukemen|noodle|udon|soba/i],
  ["wagyu","🥩","Wagyu & grill",/wagyu|yakiniku|beef|steak|shabu|sukiyaki|bbq|grill/i],
  ["sushi","🍣","Sushi & seafood",/sushi|seafood|kaisen|tuna|fish|market/i],
  ["tempura","🍤","Tempura & katsu",/tempura|tendon|katsu/i],
  ["kebab","🥙","Kebab & curry",/kebab|curry|biryani|turkish|indian|pakistani|uyghur|lamb|arab|malaysian|indonesian/i],
  ["pizza","🍕","Pizza",/pizza|pizzeria/i],
  ["burger","🍔","Burgers & sandwiches",/burger|sando|sandwich|taco|tex-?mex/i],
  ["sweets","🍰","Sweets & bakery",/sweet|cake|donut|pancake|crepe|bakery|bread|maritozzo|ice cream|parfait|dessert|brioche|mochi|pudding|candy/i]];
const LEVELS=[["","All halal"],["certified","✅ Certified"],["halal","🟢 Halal"],["friendly","🟡 Muslim-friendly"]];
const lvl=p=>p.halal?(p.hl==="certified"?"certified":p.hl==="friendly"?"friendly":"halal"):"";
const kindsOf=p=>{const s=`${p.n} ${p.cap||""} ${p.tip||""}`;return KINDS.filter(k=>k[3].test(s)).map(k=>k[0])};
// What the tip says about a place that isn't halal, in two words.
function warn(p){const s=String(p.tip||"").replace(/\bno pork\b/ig,"");
  const pork=/\b(?:pork|tonkotsu|prosciutto|salami|salumi|chashu|nduja|lard|bacon|ham)\b/i.test(s),
    alc=/alcohol is served|alcohol on the menu|serves? alcohol|\bwine\b|\bbeer\b|\bsake\b(?![-\s](?:lees|kasu|in\b))|drinking|(?<!mocktail )\bbar\b/i.test(s);
  return pork&&alc?T("Pork & alcohol on the menu"):pork?T("Pork on the menu"):alc?T("Alcohol served"):""}
const BADGE={certified:["c","✅ Halal certified"],halal:["h","🟢 Halal"],friendly:["f","🟡 Muslim-friendly"]};
let halalOnly=false,level="",kind="";
const el=document.createElement("div");el.id="restview";el.hidden=true;el.setAttribute("role","dialog");el.setAttribute("aria-modal","true");document.body.appendChild(el);
const city=()=>(window.tnChatCtx&&tnChatCtx().city)||"tokyo";
const num=n=>isAR()?iso(String(n)):String(n);
function draw(){
  if(el.hidden)return;
  const c=city(),all=P.filter(p=>p.city===c&&p.cat==="food");
  const base=halalOnly?all.filter(p=>p.halal&&(!level||lvl(p)===level)):all;
  const ks=KINDS.filter(k=>base.some(p=>kindsOf(p).includes(k[0])));if(kind&&!ks.some(k=>k[0]===kind))kind="";
  // The ones with a photo first, then the notebook's order; with "Halal
  // only" on, certified first, then halal, then Muslim-friendly.
  const rank=p=>(halalOnly?({certified:0,halal:1,friendly:2}[lvl(p)]??3)*2:0)+(p.photo?0:1);
  const list=base.filter(p=>!kind||kindsOf(p).includes(kind)).map((p,i)=>[p,i]).sort((a,b)=>rank(a[0])-rank(b[0])||a[1]-b[1]).map(x=>x[0]);
  const nh=all.filter(p=>p.halal).length,cn=D(CITIES[c],"n");
  el.innerHTML=`<div class="py-top"><button type="button" class="py-x" aria-label="${esc(T("Back"))}">‹</button><b>${T("Restaurants")} 🍜</b>
      <button type="button" class="rs-city" aria-label="${esc(T("Change city"))}">📍 <bdi>${esc(cn)}</bdi> ⌄</button></div>
    <p class="rs-cnt">${esc(halalOnly?T("{n} halal in {c}",{n:num(level?base.length:nh),c:cn}):T("{n} in {c}",{n:num(all.length),c:cn}))}</p>
    <div class="py-scroll">
    <button type="button" class="rs-sw" role="switch" aria-checked="${halalOnly}"><span class="rs-e" aria-hidden="true">🕌</span>
      <span><b>${T("Halal only")}</b><small>${T("Show only halal and Muslim-friendly")}</small></span><i class="rs-tg${halalOnly?" on":""}" aria-hidden="true"></i></button>
    ${halalOnly?`<div class="rs-chips rs-lv">${LEVELS.map(([v,l])=>{const n=v?all.filter(p=>lvl(p)===v).length:nh;
      return n?`<button type="button" data-l="${v}" class="${v===level?"on":""}">${T(l)}${v?" "+num(n):""}</button>`:""}).join("")}</div>`:""}
    ${ks.length>1?`<div class="rs-chips rs-kd"><button type="button" data-k="" class="${kind?"":"on"}">${T("All")}</button>${ks.map(k=>`<button type="button" data-k="${k[0]}" class="${k[0]===kind?"on":""}">${k[1]} ${T(k[2])}</button>`).join("")}</div>`:""}
    <div class="rs-list">${list.map(p=>{const k=PKEY(p),on=inTrip(k),b=BADGE[lvl(p)],w=b?"":warn(p);
      return `<div class="rs-row"><button type="button" class="rs-go" data-id="${p.id}"><span class="rs-t${p.photo?"":" art"}" style="--c2:var(--${p.cat})"><img src="${esc(p.photo||CATS[p.cat].img)}" alt="" loading="lazy"></span>
        <span class="rs-tx"><b><bdi>${esc(p.n)}</bdi></b><small>${esc(AREA(p.area))}${D(p,"cost")?" · "+esc(D(p,"cost")):""}</small>
        <span class="rs-bl">${b?`<i class="rs-bd ${b[0]}">${T(b[1])}</i>`:`<i class="rs-bd n">${T("Not halal")}</i>${w?`<em>${esc(w)}</em>`:""}`}</span></span></button>
        <button type="button" class="rs-add${on?" on":""}" data-k="${esc(k)}" aria-pressed="${on}" aria-label="${esc(T("＋ Add to my trip"))}">${on?"✓":"＋"}</button></div>`}).join("")
      ||`<p class="rs-none">${T("Nothing here yet. Try another kind or city.")}</p>`}</div>
    </div>`;
  el.querySelector(".py-x").onclick=close;
  el.querySelector(".rs-city").onclick=()=>{if(window.tnOpenCityPicker)tnOpenCityPicker()};
  el.querySelector(".rs-sw").onclick=()=>{halalOnly=!halalOnly;level="";keep(draw)};
  el.querySelectorAll(".rs-lv button").forEach(b=>b.onclick=()=>{level=b.dataset.l;keep(draw)});
  el.querySelectorAll(".rs-kd button").forEach(b=>b.onclick=()=>{kind=b.dataset.k;keep(draw)});
  el.querySelectorAll(".rs-go").forEach(b=>b.onclick=()=>openPlace(b.dataset.id));
  el.querySelectorAll(".rs-add").forEach(b=>b.onclick=()=>{const k=b.dataset.k;if(inTrip(k))removeKey(k);else{trip.ideas.push(k);toast(T("Added to your trip ✓"))}
    saveTrip();const on=inTrip(k);b.classList.toggle("on",on);b.textContent=on?"✓":"＋";b.setAttribute("aria-pressed",String(on))});
}
// Redraw without losing the scroll position (of the page and the chip rows).
function keep(f){const s=el.querySelector(".py-scroll"),y=s?s.scrollTop:0,x=[...el.querySelectorAll(".rs-chips")].map(c=>c.scrollLeft);
  f();const s2=el.querySelector(".py-scroll");if(s2)s2.scrollTop=y;el.querySelectorAll(".rs-chips").forEach((c,i)=>{if(x[i])c.scrollLeft=x[i]})}
function open(fromHistory){el.hidden=false;document.documentElement.classList.add("py-open");if(!fromHistory)history.pushState({tnRest:1},"");draw();
  const s=el.querySelector(".py-scroll");if(s&&!fromHistory)s.scrollTop=0}
function closeNow(){el.hidden=true;document.documentElement.classList.remove("py-open")}
function close(){if(history.state&&history.state.tnRest)history.back();else closeNow()}
// Back from a place opened here: redraw, so a ＋ added there shows ✓.
addEventListener("popstate",e=>{const st=e.state||{};if(st.tnRest){if(el.hidden)open(true);else keep(draw)}else if(!el.hidden&&!st.tnPlace)closeNow()});
// The city changed (from this page's 📍 or Explore): show its restaurants.
addEventListener("tncity",()=>{kind="";level="";keep(draw)});
window.tnOpenRest=()=>open();
})();
