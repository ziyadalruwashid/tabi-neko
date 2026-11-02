// The owner's dashboard on the website (#admin), drawn like the app's
// (js/appadmin.js) but for a big screen: a sidebar with Today, People, Places
// and Scout, and the page beside it. It covers the whole window while open.
// App opens and website visits are counted side by side, and the
// Both / App / Web switch picks which of them the numbers show.
//
// Totals only: never anyone's trip, hotel or plan.
(function(){
if(typeof IS_APP!=="undefined"&&IS_APP)return;
const box=()=>$("adminbox");
let tab="today",mode="both",q="",data=null,err="",busy=false;
try{tab=localStorage.getItem("tabineko-wa-tab")||"today";mode=localStorage.getItem("tabineko-wa-mode")||"both"}catch(e){}
const n=v=>Number(v||0).toLocaleString("en");
const pct=(a,b)=>!b?(a?"new":""):(a>=b?"▲ ":"▼ ")+Math.abs(Math.round((a-b)/b*100))+"%";
const sumDays=(m,from,k)=>{if(!m)return 0;let s=0;for(let i=0;i<k;i++)s+=m.get(riyadhDay(new Date(Date.now()-(from+i)*DAY)))||0;return s};
const todayJ=()=>new Date(Date.now()+9*3600e3).toISOString().slice(0,10);

// ---- reading ----
async function days(coll){
  const m=new Map();let next="";
  do{const r=await call(`${FS}/${coll}?pageSize=300${next?"&pageToken="+encodeURIComponent(next):""}`,{token:await token()});
    (r.documents||[]).forEach(d=>m.set(d.name.split("/").pop(),+(d.fields&&d.fields.n&&d.fields.n.integerValue||0)));next=r.nextPageToken||""}while(next);
  return m;
}
async function allStamps(){
  const out=[];let next="";
  do{const r=await call(`${FS}/stamps?pageSize=300${next?"&pageToken="+encodeURIComponent(next):""}`,{token:await token()});
    (r.documents||[]).forEach(d=>{let s={};try{s=JSON.parse(d.fields&&d.fields.data&&d.fields.data.stringValue||"{}")}catch(e){}out.push({uid:d.name.split("/").pop(),s})});
    next=r.nextPageToken||""}while(next);
  return out;
}
async function load(){
  busy=true;err="";draw();
  const safe=p=>p.catch(e=>{console.warn(e);return null});
  const [trips,opens,visits,stamps]=await Promise.all([safe(allTrips()),safe(days("opens")),safe(visitDays()),safe(allStamps()),safe(loadScout())]);
  busy=false;
  if(!trips){err="Couldn't load the trips. Check your connection, or that the latest firestore.rules are published.";draw();return}
  data={trips,opens,visits,stamps,at:new Date()};draw();
}
// ---- trips by their dates (counts only) ----
function tripWhen(c){
  if(!hasTrip(c))return "";if(!c.start)return "nodate";
  const now=todayJ(),in30=new Date(Date.now()+9*3600e3+30*DAY).toISOString().slice(0,10);
  const len=c.stays.reduce((a,s)=>a+s.days.length,0)||1,end=new Date(new Date(c.start+"T12:00:00").getTime()+(len-1)*DAY).toISOString().slice(0,10);
  return c.start<=now&&now<=end?"there":c.start>now&&c.start<=in30?"soon":c.start>now?"later":"past";
}
// ---- pieces ----
const tile=(v,l,s,{dn,tag,go}={})=>`<div class="wa-t${go?" wa-go":""}"${go?` data-t="${go}" role="button" tabindex="0"`:""}>${tag?`<span class="wa-tag ${tag}">${tag==="app"?"APP":"WEB"}</span>`:""}<b>${v}</b><span>${l}</span>${s?`<i${dn?' class="dn"':""}>${s}</i>`:""}</div>`;
const card=(h,small,body,cls="")=>`<section class="wa-c ${cls}"><h3>${h}${small?`<small>${small}</small>`:""}</h3>${body}</section>`;
const muted=t=>`<p class="wa-muted">${t}</p>`;
function hbars(rows){const top=Math.max(1,...rows.map(r=>r.v));
  return `<ul class="wa-bars">${rows.map(r=>`<li><span>${r.label}</span><span class="wa-tr"><i style="width:${Math.max(r.v?3:0,r.v/top*100).toFixed(1)}%"></i></span><b>${r.v}</b></li>`).join("")}</ul>`}
// Opens and visits per day, last 30 days, as paired columns.
function chart(){
  const {opens,visits}=data,app=mode!=="web"&&opens,web=mode!=="app"&&visits;
  const ds=[...Array(30)].map((_,i)=>{const d=new Date(Date.now()-(29-i)*DAY),k=riyadhDay(d);return {d,a:app?app.get(k)||0:0,w:web?web.get(k)||0:0}});
  const top=Math.max(1,...ds.map(x=>Math.max(x.a,x.w)));
  const tip=x=>[fmtDay(x.d),app?x.a+" app":"",web?x.w+" web":""].filter(Boolean).join(" · ");
  const h=v=>Math.max(v?2:0,v/top*100).toFixed(1);
  return `<div class="wa-leg">${app?`<span><i class="a"></i>App opens</span>`:""}${web?`<span><i class="w"></i>Website visits</span>`:""}<em class="wa-cap" aria-live="polite">${esc(tip(ds[29]))}</em></div>
    <div class="wa-chart" role="img" aria-label="App opens and website visits per day, last 30 days">${ds.map(x=>`<button type="button" data-tip="${esc(tip(x))}">${app?`<i class="a" style="height:${h(x.a)}%"></i>`:""}${web?`<i class="w" style="height:${h(x.w)}%"></i>`:""}</button>`).join("")}</div>
    <div class="wa-axis"><span>${fmtDay(ds[0].d)}</span><span>${fmtDay(ds[15].d)}</span><span>today</span></div>
    <details class="wa-table"><summary>Show as a table</summary><table><tr><th>Day</th>${app?"<th>App opens</th>":""}${web?"<th>Website visits</th>":""}</tr>${[...ds].reverse().map(x=>`<tr><td>${fmtDay(x.d)}</td>${app?`<td>${x.a}</td>`:""}${web?`<td>${x.w}</td>`:""}</tr>`).join("")}</table></details>`;
}
const thumb=p=>`<img src="${esc(p.photo||CATS[p.cat].img)}" alt="" loading="lazy"${p.photo?"":` class="art"`}>`;
const rank=(rows,sub)=>`<div class="wa-rank">${rows.map(([p,v],i)=>`<div class="wa-it"><span class="wa-rk">${i+1}</span>${thumb(p)}<span class="wa-n"><b>${esc(p.n)}</b><small>${esc(sub(p))}</small></span><span class="wa-v">${v}</span></div>`).join("")}</div>`;
const sub=p=>`${D(CITIES[p.city],"n")} · ${D(CATS[p.cat],"n")}${p.halal?" · ✓ halal":""}`;
const stampsOf=()=>new Map((data.stamps||[]).map(x=>[x.uid,Object.keys(x.s).length]));
const scoutState=id=>picks.add.includes(id)?"add":picks.skip.includes(id)?"skip":"";
const waiting=()=>scout&&scout.pending?scout.pending.filter(i=>!scoutState(i.id)).length:0;

// ---- the tabs ----
function today(){
  const {trips,opens,visits,stamps}=data;
  const A=mode!=="web",W=mode!=="app";
  const oT=sumDays(opens,0,1),oLW=sumDays(opens,7,1),vT=sumDays(visits,0,1),vLW=sumDays(visits,7,1);
  const b7=(A?sumDays(opens,0,7):0)+(W?sumDays(visits,0,7):0),bP7=(A?sumDays(opens,7,7):0)+(W?sumDays(visits,7,7):0);
  const tT=(A?oT:0)+(W?vT:0),tLW=(A?oLW:0)+(W?vLW:0);
  const newT=trips.filter(t=>riyadhDay(t.created)===riyadhDay(new Date())).length;
  const stT=stamps?stamps.reduce((s,x)=>s+Object.values(x.s).filter(d=>d===todayJ()).length,0):0,stAll=stamps?stamps.reduce((s,x)=>s+Object.keys(x.s).length,0):0;
  const when={there:0,soon:0,nodate:0};trips.forEach(t=>{const w=tripWhen(cleanTrip(t.data));if(w in when)when[w]++});
  const cityN=new Map();trips.forEach(t=>new Set(cleanTrip(t.data).stays.map(s=>s.city)).forEach(c=>cityN.set(c,(cityN.get(c)||0)+1)));
  const wd=new Date().toLocaleDateString("en-GB",{weekday:"long",timeZone:"Asia/Riyadh"});
  const day=new Date().toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long",timeZone:"Asia/Riyadh"});
  const name=typeof myName==="function"?myName():auth.name||(auth.email||"").split("@")[0];
  const what=[A&&opens?`${n(oT)} app open${oT===1?"":"s"}`:"",W&&visits?`${n(vT)} website visit${vT===1?"":"s"}`:""].filter(Boolean).join(" and ");
  const line=`${what?what+" today":"Nothing counted yet today"}${tT||tLW?`, ${tT>=tLW?n(tT-tLW)+" more":n(tLW-tT)+" fewer"} than last ${wd}`:""}. ${n(newT)} new account${newT===1?"":"s"}, ${n(stT)} stamp${stT===1?"":"s"} collected${when.there?`, ${when.there} ${when.there===1?"person is":"people are"} in Japan right now`:""}.`;
  const w=waiting();
  return `<div class="wa-hi"><div><small>${esc(day.toUpperCase())}</small><b>Hi ${esc(name)} 🐾</b><p>${esc(line)}</p></div><img src="assets/cat.png" alt=""></div>
    <div class="wa-tiles">
      ${A?tile(opens?n(oT):"–","app opens today",opens?pct(oT,oLW)+" vs last week":"not counting yet",{dn:oT<oLW,tag:"app"}):""}
      ${W?tile(visits?n(vT):"–","website visits today",visits?pct(vT,vLW)+" vs last week":"not counting yet",{dn:vT<vLW,tag:"web"}):""}
      ${tile(n(b7),mode==="both"?"both, last 7 days":mode==="app"?"opens, last 7 days":"visits, last 7 days",pct(b7,bP7),{dn:b7<bP7})}
      ${tile(n(newT),"new accounts today",n(trips.length)+" in total")}
      ${tile(stamps?n(stT):"–","stamps today",stamps?n(stAll)+" in total":"stamps rule not published")}
      ${tile(n(w),"Scout picks waiting",w?"review →":"all done ✓",{dn:!!w,go:"scout"})}</div>
    <div class="wa-grid">
      ${card(mode==="app"?"App opens per day":mode==="web"?"Website visits per day":"Opens and visits per day","last 30 days",(mode!=="web"&&opens)||(mode!=="app"&&visits)?chart():muted("Nothing to show yet: check that the latest firestore.rules are published."),"wa-big")}
      <div class="wa-col">
        ${card("Trips happening","counts only",`<div class="wa-fly"><div><b>${when.there}</b><span>in Japan now ✈️</span></div><div><b>${when.soon}</b><span>fly in 30 days</span></div><div><b>${when.nodate}</b><span>no date yet</span></div></div>`)}
        ${card("Where people use it","last 7 days",`<div class="wa-split"><div class="ap"><b>${opens?n(sumDays(opens,0,7)):"–"}</b><span>📱 app opens</span></div><div class="wb"><b>${visits?n(sumDays(visits,0,7)):"–"}</b><span>💻 website visits</span></div></div>`)}
        ${card("Cities in trips","trips that include it",cityN.size?hbars([...cityN].sort((a,b)=>b[1]-a[1]).slice(0,6).map(([c,v])=>({label:esc(D(CITIES[c],"n")),v}))):muted("No cities yet."))}
      </div></div>`;
}
function people(){
  const {trips}=data,wk=Date.now()-7*DAY,wk2=Date.now()-14*DAY;
  const planned=trips.filter(t=>hasTrip(cleanTrip(t.data))).length;
  const act=trips.filter(t=>t.updated>wk).length,actPrev=trips.filter(t=>t.updated>wk2&&t.updated<=wk).length;
  const shared=trips.filter(t=>t.members.length),invited=shared.reduce((a,t)=>a+t.members.length,0);
  const st=stampsOf(),memberOf=new Map();shared.forEach(t=>t.members.forEach(m=>memberOf.set(m,t)));
  const chip=(t,c)=>{const w=tripWhen(c),d=Math.floor((Date.now()-t.updated)/DAY);
    return w==="there"?`<span class="wa-chip b">in Japan</span>`:Date.now()-t.created<2*DAY?`<span class="wa-chip o">new</span>`:d<1?`<span class="wa-chip g">active today</span>`:`<span class="wa-chip">${esc(ago(t.updated))}</span>`};
  const ql=q.trim().toLowerCase();
  const rows=[...trips].sort((a,b)=>b.updated-a.updated).filter(t=>!ql||(t.email||t.emails[t.uid]||"").toLowerCase().includes(ql)).map(t=>{const c=cleanTrip(t.data),em=t.email||t.emails[t.uid]||"",inT=memberOf.get(t.uid),k=allIds(c).length;
    const trip=[c.stays.map(s=>D(CITIES[s.city],"n")).join(", "),k?k+" places":""].filter(Boolean).join(" · ")||"no trip yet";
    const tog=t.members.length?`👥 owner · ${t.members.length+1}`:inT?"👥 member":"";
    return `<tr><td><span class="wa-av">${esc((em[0]||"?").toUpperCase())}</span><span dir="ltr">${em?esc(em):`<span class="wa-mu">email not saved yet</span>`}</span></td><td>${esc(trip)}</td><td>${tog}</td><td>${st.get(t.uid)||"–"}</td><td>${fmtDay(t.created)}</td><td>${chip(t,c)}</td></tr>`}).join("");
  return `<div class="wa-tiles four">${tile(n(trips.length),"accounts",`+${trips.filter(t=>t.created>wk).length} this week`)}${tile(n(planned),"with a trip planned",trips.length?Math.round(planned/trips.length*100)+"% of accounts":"")}
      ${tile(n(act),"active this week",(act>=actPrev?"▲ ":"▼ ")+Math.abs(act-actPrev)+" vs last week",{dn:act<actPrev})}${tile(n(shared.length),"shared trips",invited+" people invited")}</div>
    <div class="wa-grid even">${card("New trips per week","last 8 weeks",weekly(trips))}
      ${card("Shared trips","",shared.length?`<table class="wa-tb"><tr><th>Owner</th><th>People</th><th>Last change</th></tr>${shared.sort((a,b)=>b.updated-a.updated).map(t=>`<tr><td dir="ltr">${esc(t.email||t.emails[t.uid]||"—")}</td><td>${t.members.length+1}</td><td>${ago(t.updated)}</td></tr>`).join("")}</table>`:muted("No shared trips yet."))}</div>
    ${card("Accounts",`${trips.length} · latest first`,`${muted("Accounts that saved a trip. Everyone who signed up: Firebase console → Authentication → Users.")}
      <div class="wa-scroll"><table class="wa-tb wa-acc"><tr><th>Account</th><th>Trip</th><th>Together</th><th>Stamps</th><th>Joined</th><th></th></tr>${rows||`<tr><td colspan="6" class="wa-mu">${ql?"No account matches.":"No accounts yet."}</td></tr>`}</table></div>`)}`;
}
function places(){
  const {trips,stamps}=data;
  const addN=new Map(),catN=new Map();
  trips.forEach(t=>{new Set(allIds(cleanTrip(t.data))).forEach(k=>{addN.set(k,(addN.get(k)||0)+1);const p=BYKEY.get(k);if(p)catN.set(p.cat,(catN.get(p.cat)||0)+1)})});
  const top=[...addN].map(([k,v])=>[BYKEY.get(k),v]).filter(x=>x[0]).sort((a,b)=>b[1]-a[1]).slice(0,10);
  const stN=new Map();let st=0;(stamps||[]).forEach(x=>Object.keys(x.s).forEach(k=>{stN.set(k,(stN.get(k)||0)+1);st++}));
  const topS=[...stN].map(([k,v])=>[BYKEY.get(k),v]).filter(x=>x[0]).sort((a,b)=>b[1]-a[1]).slice(0,10);
  const nophoto=P.filter(p=>!p.photo);
  return `<div class="wa-grid even">
      ${card("Most added to trips","all time",top.length?rank(top,sub):muted("No places added yet."))}
      ${card("Most stamped 🐾",stamps?`${st} stamps · ${stamps.filter(x=>Object.keys(x.s).length).length} people`:"",!stamps?muted("Stamps can't be read yet: check the stamps part of firestore.rules."):topS.length?rank(topS,p=>D(CITIES[p.city],"n")):muted("No stamps yet."))}
      ${card("Categories","times added",catN.size?hbars([...catN].sort((a,b)=>b[1]-a[1]).map(([c,v])=>({label:esc(D(CATS[c],"n")),v}))):muted("Nothing yet."))}
      ${card("Notebook health","",`<div class="wa-health"><span>🆕</span><div><b>${P.length} places · ${HOODS.length} areas · ${TRIPS.length} day trips</b><small>Live on the website and in the app.</small></div></div>
        <details class="wa-health"><summary><span>📷</span><div><b>${nophoto.length} places without a photo</b><small>Click to see the list</small></div></summary>
        <div class="wa-rank">${nophoto.map(p=>`<div class="wa-it">${thumb(p)}<span class="wa-n"><b>${esc(p.n)}</b><small>${esc(sub(p))}</small></span></div>`).join("")}</div></details>`)}
    </div>`;
}
function scoutTab(){
  if(!scout)return muted("No Scout report yet.");
  const items=scout.pending||[],w=waiting(),yes=items.filter(i=>scoutState(i.id)==="add").length;
  return `<div class="wa-warn">🔎 ${w?`Apollo Scout has <b>${w}</b> place${w===1?"":"s"} waiting. ✓ to add, ✗ to skip.`:"Nothing waiting."}${yes?` <b>${yes}</b> will be added on the next run.`:""}</div>
    ${muted(`Last run ${esc(scout.run||"?")} · runs every Tuesday and Friday morning. Every ✓ gets written up (English + Arabic) and added on the next run. Your picks are the same ones the app's dashboard shows.`)}
    <div class="wa-sc">${items.map(i=>{const s=scoutState(i.id),c=CATS[i.cat];
      return `<article class="wa-scard ${s}"><div class="wa-im" style="--c:var(--${esc(i.cat)},var(--lantern))"><img src="${esc(c?c.img:"assets/cat.png")}" alt="">${KIND[i.kind]?`<span>${esc(KIND[i.kind])}</span>`:""}</div>
        <div class="wa-bd"><b>${esc(i.n)}</b><small>${esc([D(CITIES[i.city]||{n:i.city},"n"),AREA(i.area),c?D(c,"n"):i.cat].filter(Boolean).join(" · "))}</small>
        <p>${esc(i.why)}</p>${i.halal?`<p class="wa-hal">Halal: ${esc(i.halal)}</p>`:""}
        <p class="wa-src"><a href="${esc(i.maps||"https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(`${i.n} ${(CITIES[i.city]||{n:i.city}).n} Japan`))}" target="_blank" rel="noopener">📍 Google Maps ↗</a>${(i.sources||[]).map((u,k)=>` · <a href="${esc(u)}" target="_blank" rel="noopener">source ${k+1} ↗</a>`).join("")}</p>
        <div class="wa-bt"><button type="button" class="y" data-id="${esc(i.id)}" data-v="add" aria-pressed="${s==="add"}">✓ Add</button><button type="button" class="n" data-id="${esc(i.id)}" data-v="skip" aria-pressed="${s==="skip"}">✗ Skip</button></div></div></article>`}).join("")||muted("Nothing waiting. The next run is Tuesday or Friday morning.")}</div>`;
}
async function pick(id,v){
  const on=picks[v].includes(id);picks.add=picks.add.filter(x=>x!==id);picks.skip=picks.skip.filter(x=>x!==id);if(!on)picks[v].push(id);
  draw();const L=a=>({arrayValue:{values:a.map(S)}});
  try{await fsPatch("scout/picks",{add:L(picks.add),skip:L(picks.skip)},["add","skip"])}catch(e){toast("Couldn't save. Check your connection.")}
}

// ---- the page ----
const TABS=[["today","☀️","Today"],["people","👥","People"],["places","📍","Places"],["scout","🔎","Scout"]];
function draw(){
  const el=box();if(!el)return;
  const sec=$("admin");if(sec)sec.classList.add("wa-on");
  const shell=body=>`<div class="wa"><nav class="wa-side" aria-label="Dashboard"><a class="wa-logo" href="#map"><img src="assets/cat.png" alt="">Tabi Neko</a>
      ${auth&&isAdmin()?TABS.map(([k,ic,l])=>`<button type="button" data-t="${k}" class="${k===tab?"on":""}" aria-current="${k===tab?"page":"false"}"><i>${ic}</i>${l}${k==="scout"&&waiting()?`<em>${waiting()}</em>`:""}</button>`).join(""):""}
      ${auth&&isAdmin()?`<div class="wa-meta">Counting<div class="wa-sw" role="group" aria-label="Counting">${[["both","Both"],["app","App"],["web","Web"]].map(([k,l])=>`<button type="button" data-m="${k}" class="${k===mode?"on":""}" aria-pressed="${k===mode}">${l}</button>`).join("")}</div>Totals only, never anyone's trip or hotel. Days are Riyadh time.</div>`:""}
      <a class="wa-back" href="#map">← Back to the site</a></nav><div class="wa-main">${body}</div></div>`;
  if(!auth){el.innerHTML=shell(`<h2 class="wa-h">Dashboard</h2>${muted("Log in with your owner account to see the dashboard.")}<button type="button" class="wa-btn" id="adminin">Log in</button>`);$("adminin").onclick=()=>openAcct("login");wire(el);return}
  if(!isAdmin()){el.innerHTML=shell(`<h2 class="wa-h">Dashboard</h2>${muted("This page is only for the site's owner.")}<p class="wa-muted">Your account ID: <code>${esc(auth.uid)}</code></p>`);wire(el);return}
  const T0=TABS.find(x=>x[0]===tab)||TABS[0];
  const body=busy&&!data?muted("Counting…"):err?muted(esc(err)):!data?"":{today,people,places,scout:scoutTab}[tab]();
  el.innerHTML=shell(`<div class="wa-hd"><h2 class="wa-h">${T0[2]}</h2>${tab==="people"?`<input class="wa-q" type="search" placeholder="🔍 Search an email" value="${esc(q)}" aria-label="Search an email">`:""}
    <div class="wa-r">${data?`updated ${data.at.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})}`:""}<button type="button" class="wa-btn ghost wa-re">${busy?"…":"↻ Refresh"}</button></div></div>${body}`);
  wire(el);
}
function wire(el){
  el.querySelectorAll(".wa-side [data-t],.wa-go[data-t]").forEach(b=>b.onclick=()=>{tab=b.dataset.t;try{localStorage.setItem("tabineko-wa-tab",tab)}catch(e){}draw();const m=el.querySelector(".wa");if(m)m.scrollTop=0});
  el.querySelectorAll(".wa-sw [data-m]").forEach(b=>b.onclick=()=>{mode=b.dataset.m;try{localStorage.setItem("tabineko-wa-mode",mode)}catch(e){}draw()});
  const re=el.querySelector(".wa-re");if(re)re.onclick=()=>{if(!busy)load()};
  const qi=el.querySelector(".wa-q");if(qi)qi.oninput=()=>{q=qi.value;const pos=qi.selectionStart;draw();const n2=box().querySelector(".wa-q");n2.focus();try{n2.setSelectionRange(pos,pos)}catch(e){}};
  el.querySelectorAll(".wa-chart").forEach(c=>{const cap=el.querySelector(".wa-cap");c.querySelectorAll("button").forEach(b=>{const f=()=>{if(cap)cap.textContent=b.dataset.tip;c.querySelectorAll(".on").forEach(x=>x.classList.remove("on"));b.classList.add("on")};b.onmouseenter=f;b.onfocus=f;b.onclick=f})});
  el.querySelectorAll(".wa-bt button").forEach(b=>b.onclick=()=>pick(b.dataset.id,b.dataset.v));
}
window.tnWebAdmin=()=>{draw();if(auth&&isAdmin()&&!busy&&(!data||Date.now()-data.at>60e3))load()};
// Logging in or out redraws it.
if(typeof userBtn==="function"){const _u=userBtn;userBtn=function(){_u();if(location.hash==="#admin")tnWebAdmin()}}
if(location.hash==="#admin"){show("admin");tnWebAdmin()}
})();
