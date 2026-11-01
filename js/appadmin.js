// The owner's dashboard, app edition: the #admin page as four tabs (Today,
// People, Places, Scout), opened from a row in More that only the owner's
// account sees. Everything the website's dashboard (js/admin.js) shows is
// here too, plus app opens, stamps and trips happening; it reuses that
// file's helpers (allTrips, visitDays, the Scout picks).
//
// App opens are counted like website visits: one number per day in
// opens/<YYYY-MM-DD> (Riyadh time), once each time the app starts, not for
// the owner, and nothing about who opened it. The website's counter skips
// the app (its address is localhost), so the two never mix.
//
// Totals only: never anyone's trip, hotel or plan.
(function(){
if(typeof IS_APP==="undefined"||!IS_APP||typeof renderAdmin!=="function")return;
const BASE="https://tabi-neko.vercel.app/";

// ---- count this app open ----
(function countOpen(){
  if(!FB_ON||isAdmin())return;
  try{if(sessionStorage.getItem("tabineko-open"))return;sessionStorage.setItem("tabineko-open","1")}catch(e){return}
  fetch(`${FS}:commit?key=${FIREBASE.apiKey}`,{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({writes:[{transform:{document:`${FS_PATH}/opens/${riyadhDay(new Date())}`,fieldTransforms:[{fieldPath:"n",increment:{integerValue:"1"}}]}}]})}).catch(()=>{});
})();

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
// The Scout report from the website (the copy inside the app is old).
async function loadScoutLive(){
  const [s,p]=await Promise.all([fetch(BASE+"data/scout.json",{cache:"no-cache"}).then(r=>r.ok?r.json():null).catch(()=>null),fsGet("scout/picks").catch(()=>null)]);
  scout=s;picks={add:arr(p&&p.fields&&p.fields.add),skip:arr(p&&p.fields&&p.fields.skip)};
}
const scoutState=id=>picks.add.includes(id)?"add":picks.skip.includes(id)?"skip":"";
const waiting=()=>scout&&scout.pending?scout.pending.filter(i=>!scoutState(i.id)).length:0;
window.tnScoutWaiting=waiting;

// ---- shapes ----
const box=()=>$("adminbox");
let tab="today",data=null,err="",busy=false;
const n=v=>Number(v||0).toLocaleString("en");
const pct=(a,b)=>!b?(a?"new":""):(a>=b?"▲ ":"▼ ")+Math.abs(Math.round((a-b)/b*100))+"%";
const sumDays=(m,from,k)=>{let s=0;for(let i=0;i<k;i++)s+=m.get(riyadhDay(new Date(Date.now()-(from+i)*DAY)))||0;return s};
const todayJ=()=>new Date(Date.now()+9*3600e3).toISOString().slice(0,10);
const tile=(v,l,s,dn)=>`<div class="ad-t"><b>${v}</b><span>${l}</span>${s?`<i${dn?' class="dn"':""}>${s}</i>`:""}</div>`;
const card=(h,small,body,cls="")=>`<section class="ad-card ${cls}"><h3>${h}${small?`<small>${small}</small>`:""}</h3>${body}</section>`;
function cols(m,label,unit){
  const ds=[...Array(30)].map((_,i)=>{const d=new Date(Date.now()-(29-i)*DAY);return {d,v:m.get(riyadhDay(d))||0}});
  const top=Math.max(1,...ds.map(x=>x.v)),last=ds[29];
  const tipOf=x=>`${fmtDay(x.d)} · ${x.v} ${unit}`;
  return `<p class="ad-cap" aria-live="polite">${esc(tipOf(last))}</p>
    <div class="ad-cols" role="img" aria-label="${esc(label)}">${ds.map(x=>`<button type="button" data-tip="${esc(tipOf(x))}"><i style="height:${Math.max(x.v?3:0,x.v/top*100).toFixed(1)}%"></i></button>`).join("")}</div>
    <div class="ad-axis"><span>${fmtDay(ds[0].d)}</span><span>${fmtDay(ds[15].d)}</span><span>today</span></div>
    <details class="ad-table"><summary>Show as a table</summary><table>${[...ds].reverse().map(x=>`<tr><td>${fmtDay(x.d)}</td><td>${x.v}</td></tr>`).join("")}</table></details>`;
}
function hbars(rows){const top=Math.max(1,...rows.map(r=>r.v));
  return `<ul class="ad-bars">${rows.map(r=>`<li><span>${r.label}</span><span class="ad-tr"><i style="width:${Math.max(r.v?3:0,r.v/top*100).toFixed(1)}%"></i></span><b>${r.v}</b></li>`).join("")}</ul>`}
const thumb=p=>`<img src="${esc(p.photo||CATS[p.cat].img)}" alt="" loading="lazy"${p.photo?"":` class="art"`}>`;
const rank=(rows,sub)=>rows.map(([p,v],i)=>`<button type="button" class="ad-it" data-id="${p.id}"><span class="ad-r">${i+1}</span>${thumb(p)}<span class="ad-n"><b>${esc(p.n)}</b><small>${esc(sub(p))}</small></span><span class="ad-v">${v}</span></button>`).join("");

// ---- load everything ----
async function load(){
  busy=true;err="";draw();
  const safe=p=>p.catch(e=>{console.warn(e);return null});
  const [trips,opens,visits,stamps]=await Promise.all([safe(allTrips()),safe(days("opens")),safe(days("visits")),safe(allStamps()),safe(loadScoutLive())]);
  busy=false;
  if(!trips){err="Couldn't load the trips. Check your connection, or that the latest firestore.rules are published.";draw();return}
  data={trips,opens,visits,stamps,at:new Date()};draw();
  if(typeof window.tnRenderMore==="function")tnRenderMore();
}

// ---- the tabs ----
function today(){
  const {trips,opens,stamps}=data,wk=Date.now()-7*DAY;
  const oT=opens?sumDays(opens,0,1):0,oLW=opens?sumDays(opens,7,1):0,o7=opens?sumDays(opens,0,7):0,oP7=opens?sumDays(opens,7,7):0;
  const newT=trips.filter(t=>riyadhDay(t.created)===riyadhDay(new Date())).length;
  const stT=stamps?stamps.reduce((s,x)=>s+Object.values(x.s).filter(d=>d===todayJ()).length,0):0;
  const stAll=stamps?stamps.reduce((s,x)=>s+Object.keys(x.s).length,0):0;
  // Trips by their dates: counts only.
  const now=todayJ(),in30=new Date(Date.now()+9*3600e3+30*DAY).toISOString().slice(0,10);
  let there=0,soon=0,nodate=0;
  trips.forEach(t=>{const c=cleanTrip(t.data);if(!hasTrip(c))return;
    if(!c.start){nodate++;return}
    const len=c.stays.reduce((a,s)=>a+s.days.length,0)||1,end=new Date(new Date(c.start+"T12:00:00").getTime()+(len-1)*DAY).toISOString().slice(0,10);
    if(c.start<=now&&now<=end)there++;else if(c.start>now&&c.start<=in30)soon++});
  const day=new Date().toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long",timeZone:"Asia/Riyadh"});
  const name=(auth.email||"").split("@")[0];
  const line=opens?`${n(oT)} app open${oT===1?"":"s"} today${oLW||oT?`, ${oT>=oLW?n(oT-oLW)+" more":n(oLW-oT)+" fewer"} than last ${new Date().toLocaleDateString("en-GB",{weekday:"long",timeZone:"Asia/Riyadh"})}`:""}. ${n(newT)} new account${newT===1?"":"s"} and ${n(stT)} stamp${stT===1?"":"s"} collected.`:"App opens start counting once the new rules are published.";
  return `<div class="ad-hi"><small>${esc(day.toUpperCase())}</small><b>Hi ${esc(name)} 🐾</b><p>${esc(line)}</p><img src="assets/cat.png" alt=""></div>
    <div class="ad-tiles">${tile(n(oT),"app opens today",opens?pct(oT,oLW)+" vs last week":"not counting yet",oT<oLW)}${tile(n(o7),"opens, last 7 days",opens?pct(o7,oP7):"",o7<oP7)}
      ${tile(n(newT),"new accounts today",n(trips.length)+" in total")}${tile(stamps?n(stT):"–","stamps today",stamps?n(stAll)+" in total":"stamps rule not published")}</div>
    ${opens?card("App opens per day","last 30 days",cols(opens,"App opens per day, last 30 days","opens")):card("App opens per day","",`<p class="ad-muted">Paste the new firestore.rules (the <code>opens</code> part) in Firebase, then opens start counting.</p>`)}
    ${card("Trips happening","counts only, never names",`<div class="ad-fly"><div><b>${there}</b><span>in Japan now ✈️</span></div><div><b>${soon}</b><span>fly in the next 30 days</span></div><div><b>${nodate}</b><span>planning, no date yet</span></div></div>`)}
    ${data.visits?card("Website visits","last 30 days",`<div class="ad-mini"><span><b>${n(sumDays(data.visits,0,1))}</b> today</span><span><b>${n(sumDays(data.visits,0,7))}</b> last 7 days</span><span><b>${n(sumDays(data.visits,0,30))}</b> last 30 days</span></div>${cols(data.visits,"Website visits per day, last 30 days","visits")}`):""}`;
}
function people(){
  const {trips,stamps}=data,wk=Date.now()-7*DAY,wk2=Date.now()-14*DAY;
  const planned=trips.filter(t=>hasTrip(cleanTrip(t.data))).length;
  const act=trips.filter(t=>t.updated>wk).length,actPrev=trips.filter(t=>t.updated>wk2&&t.updated<=wk).length;
  const shared=trips.filter(t=>t.members.length),invited=shared.reduce((a,t)=>a+t.members.length,0);
  const cityN=new Map();trips.forEach(t=>new Set(cleanTrip(t.data).stays.map(s=>s.city)).forEach(c=>cityN.set(c,(cityN.get(c)||0)+1)));
  const stampsOf=new Map((stamps||[]).map(x=>[x.uid,Object.keys(x.s).length]));
  const memberOf=new Map();shared.forEach(t=>t.members.forEach(m=>memberOf.set(m,t)));
  const chip=t=>{const d=Math.floor((Date.now()-t.updated)/DAY);return Date.now()-t.created<2*DAY?`<span class="ad-chip o">new</span>`:d<1?`<span class="ad-chip g">active today</span>`:`<span class="ad-chip">${esc(ago(t.updated))}</span>`};
  const rows=[...trips].sort((a,b)=>b.updated-a.updated).map(t=>{const c=cleanTrip(t.data),em=t.email||t.emails[t.uid]||"",inT=memberOf.get(t.uid);
    const bits=[c.stays.map(s=>D(CITIES[s.city],"n")).join(", ")||"no trip yet",allIds(c).length?allIds(c).length+" places":"",stampsOf.get(t.uid)?stampsOf.get(t.uid)+" stamps":"",
      t.members.length?`owner · ${t.members.length+1} people`:inT?"member of a shared trip":"","started "+fmtDay(t.created)].filter(Boolean).join(" · ");
    return `<div class="ad-acct"><span class="ad-av">${esc((em[0]||"?").toUpperCase())}</span><span class="ad-n"><b dir="ltr">${em?esc(em):"email not saved yet"}</b><small>${esc(bits)}</small></span>${chip(t)}</div>`}).join("");
  return `<div class="ad-tiles">${tile(n(trips.length),"accounts",`+${trips.filter(t=>t.created>wk).length} this week`)}${tile(n(planned),"with a trip planned",trips.length?Math.round(planned/trips.length*100)+"% of accounts":"")}
      ${tile(n(act),"active this week",(act>=actPrev?"▲ ":"▼ ")+Math.abs(act-actPrev)+" vs last week",act<actPrev)}${tile(n(shared.length),"shared trips",invited+" people invited")}</div>
    ${card("Cities in trips","trips that include it",cityN.size?hbars([...cityN].sort((a,b)=>b[1]-a[1]).map(([c,v])=>({label:esc(D(CITIES[c],"n")),v}))):`<p class="ad-muted">No cities yet.</p>`)}
    ${card("New trips per week","last 8 weeks",weekly(trips))}
    ${card("Accounts",`${trips.length} · latest first`,`<p class="ad-muted">Accounts that saved a trip. Everyone who signed up: Firebase console → Authentication → Users.</p>${rows||`<p class="ad-muted">No accounts yet.</p>`}`)}
    ${shared.length?card("Shared trips","",shared.sort((a,b)=>b.updated-a.updated).map(t=>`<div class="ad-acct"><span class="ad-av">👥</span><span class="ad-n"><b dir="ltr">${esc(t.email||t.emails[t.uid]||"—")}</b><small>${t.members.length+1} people · last change ${esc(ago(t.updated))}</small></span></div>`).join("")):""}`;
}
function places(){
  const {trips,stamps}=data,month=Date.now()-30*DAY;
  const addN=new Map(),catN=new Map();
  trips.forEach(t=>{const ids=new Set(allIds(cleanTrip(t.data)));ids.forEach(k=>{addN.set(k,(addN.get(k)||0)+1);const p=BYKEY.get(k);if(p)catN.set(p.cat,(catN.get(p.cat)||0)+1)})});
  const top=[...addN].map(([k,v])=>[BYKEY.get(k),v]).filter(x=>x[0]).sort((a,b)=>b[1]-a[1]).slice(0,10);
  const stN=new Map();let st=0;(stamps||[]).forEach(x=>Object.keys(x.s).forEach(k=>{stN.set(k,(stN.get(k)||0)+1);st++}));
  const topS=[...stN].map(([k,v])=>[BYKEY.get(k),v]).filter(x=>x[0]).sort((a,b)=>b[1]-a[1]).slice(0,10);
  const nophoto=P.filter(p=>!p.photo);
  let live=null;try{live=JSON.parse(localStorage.getItem("tabineko-live")||"null")}catch(e){}
  const sub=p=>`${D(CITIES[p.city],"n")} · ${D(CATS[p.cat],"n")}${p.halal?" · ✓ halal":""}`;
  return `${card("Most added to trips","all time",top.length?`<div class="ad-list">${rank(top,sub)}</div>`:`<p class="ad-muted">No places added yet.</p>`)}
    ${card("Most stamped 🐾",stamps?`${st} stamps · ${stamps.filter(x=>Object.keys(x.s).length).length} people`:"",!stamps?`<p class="ad-muted">Stamps can't be read yet: check the stamps part of firestore.rules.</p>`:topS.length?`<div class="ad-list">${rank(topS,p=>D(CITIES[p.city],"n"))}</div>`:`<p class="ad-muted">No stamps yet.</p>`)}
    ${card("Categories","times added",catN.size?hbars([...catN].sort((a,b)=>b[1]-a[1]).map(([c,v])=>({label:esc(D(CATS[c],"n")),v}))):`<p class="ad-muted">Nothing yet.</p>`)}
    ${card("Notebook health","",`<details class="ad-health"><summary><span class="ad-av" style="background:#FFF0C2">📷</span><span class="ad-n"><b>${nophoto.length} places without a photo</b><small>Tap to see the list</small></span></summary>
        <div class="ad-list">${nophoto.map(p=>`<button type="button" class="ad-it" data-id="${p.id}">${thumb(p)}<span class="ad-n"><b>${esc(p.n)}</b><small>${esc(sub(p))}</small></span></button>`).join("")}</div></details>
      <div class="ad-acct"><span class="ad-av" style="background:#E3F2DF">🆕</span><span class="ad-n"><b>${P.length} places · ${HOODS.length} areas · ${TRIPS.length} day trips</b>
        <small>${live&&live.at?"On this phone from the website: "+esc(fmtDay(new Date(live.at)))+" "+new Date(live.at).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"}):"The copy inside the app. The website's latest arrives on the next open."}</small></span></div>`)}`;
}
function scoutTab(){
  if(!scout)return `<p class="ad-muted">No Scout report yet, or no connection to the website.</p>`;
  const items=scout.pending||[],w=waiting(),yes=items.filter(i=>scoutState(i.id)==="add").length;
  return `<div class="ad-warn">🔎 ${w?`Apollo Scout has <b>${w}</b> place${w===1?"":"s"} waiting. Tap ✓ to add or ✗ to skip.`:"Nothing waiting."} ${yes?`<b>${yes}</b> to add on the next run.`:""}</div>
    <p class="ad-muted">Last run ${esc(scout.run||"?")} · runs every Tuesday and Friday morning. Every ✓ gets written up (English + Arabic) and added on the next run, or right away if you message Claude "add my picks".</p>
    ${items.map(i=>{const s=scoutState(i.id),c=CATS[i.cat];
      return `<div class="ad-sc ${s}"><img src="${esc(c?c.img:"assets/cat.png")}" alt="" class="art"><div class="ad-bd"><b>${esc(i.n)}</b>
        <small>${esc([D(CITIES[i.city]||{n:i.city},"n"),AREA(i.area),c?D(c,"n"):i.cat,KIND[i.kind]||i.kind||""].filter(Boolean).join(" · "))}</small>
        <p>${esc(i.why)}</p>${i.halal?`<p class="ad-hal">Halal: ${esc(i.halal)}</p>`:""}
        <p class="ad-src"><a href="${esc(i.maps||"https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(`${i.n} ${(CITIES[i.city]||{n:i.city}).n} Japan`))}" target="_blank" rel="noopener">📍 Google Maps ↗</a>${(i.sources||[]).map((u,k)=>` · <a href="${esc(u)}" target="_blank" rel="noopener">source ${k+1} ↗</a>`).join("")}</p>
        <div class="ad-bt"><button type="button" class="y" data-id="${esc(i.id)}" data-v="add" aria-pressed="${s==="add"}">✓ Add</button><button type="button" class="n" data-id="${esc(i.id)}" data-v="skip" aria-pressed="${s==="skip"}">✗ Skip</button></div></div></div>`}).join("")}`;
}
async function pick(id,v){
  const on=picks[v].includes(id);picks.add=picks.add.filter(x=>x!==id);picks.skip=picks.skip.filter(x=>x!==id);if(!on)picks[v].push(id);
  draw();if(typeof window.tnRenderMore==="function")tnRenderMore();
  const L=a=>({arrayValue:{values:a.map(S)}});
  try{await fsPatch("scout/picks",{add:L(picks.add),skip:L(picks.skip)},["add","skip"])}catch(e){toast("Couldn't save. Check your connection.")}
}

function draw(){
  const el=box();if(!el)return;
  if(!auth){el.innerHTML=`<p class="ad-muted">Log in with your owner account to see the dashboard.</p><button type="button" class="ad-btn" id="adminin">Log in</button>`;$("adminin").onclick=()=>openAcct("login");return}
  if(!isAdmin()){el.innerHTML=`<p class="ad-muted">This page is only for the owner.</p>`;return}
  const w=scout?waiting():0;
  const tabs=[["today","Today"],["people","People"],["places","Places"],["scout","Scout"]];
  let body=busy&&!data?`<p class="ad-muted">Counting…</p>`:err?`<p class="ad-muted">${esc(err)}</p>`:!data?"":{today,people,places,scout:scoutTab}[tab]();
  el.innerHTML=`<div class="ad-top"><div class="ad-tabs" role="tablist">${tabs.map(([k,l])=>`<button type="button" role="tab" data-t="${k}" class="${k===tab?"on":""}" aria-selected="${k===tab}">${l}${k==="scout"&&w?` <i>${w}</i>`:""}</button>`).join("")}</div>
    <button type="button" class="ad-re" aria-label="Refresh">${busy?"…":"↻"}</button></div>${body}
    ${data?`<p class="ad-foot">Updated ${data.at.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})} · totals only, never anyone's trip or hotel. Days are Riyadh time.</p>`:""}`;
  el.querySelectorAll(".ad-tabs [data-t]").forEach(b=>b.onclick=()=>{tab=b.dataset.t;draw();el.scrollIntoView({block:"start"})});
  el.querySelector(".ad-re").onclick=()=>{if(!busy)load()};
  el.querySelectorAll(".ad-cols").forEach(c=>{const cap=c.previousElementSibling;c.querySelectorAll("button").forEach(b=>{const f=()=>{cap.textContent=b.dataset.tip;c.querySelectorAll(".on").forEach(x=>x.classList.remove("on"));b.classList.add("on")};b.onclick=f;b.onmouseenter=f;b.onfocus=f})});
  el.querySelectorAll(".ad-it[data-id]").forEach(b=>b.onclick=()=>{if(typeof openPlace==="function")openPlace(b.dataset.id)});
  el.querySelectorAll(".ad-bt button").forEach(b=>b.onclick=()=>pick(b.dataset.id,b.dataset.v));
}
// The dashboard draws itself; js/admin.js's renderAdmin is the website's.
renderAdmin=function(){draw();if(isAdmin()&&!busy&&(!data||Date.now()-data.at>60e3))load()};
// The Scout badge on More's row needs the report, once the owner is in.
if(isAdmin())loadScoutLive().then(()=>{if(typeof window.tnRenderMore==="function")tnRenderMore()}).catch(()=>{});
})();
