// The site owner's dashboard, at #admin. Loaded after js/account.js and uses
// its Firebase helpers. Not linked in the menu; the owner opens it from the
// account sheet.
//
// ADMIN_UID is the owner's Firebase user id. The Firestore rules give that one
// account (and no other) read access to every trip, so this page can count
// them. It shows totals, popular places and a list of accounts, and never
// shows anyone's trip itself or where they're staying.
//
// Visits are counted by countVisit below: one number per day in
// visits/<YYYY-MM-DD> (Riyadh time), plus one per browser tab, and nothing
// about who visited. The rules let anyone add 1 and only the owner read.
//
// Without a server there's no list of sign-ups to read here, only accounts
// that have saved a trip; the full list is in the Firebase console under
// Authentication → Users.
const ADMIN_UID="ngmNqVpxwkbL3SHdXJpmHkAoUO22";
const isAdmin=()=>!!(auth&&ADMIN_UID&&auth.uid===ADMIN_UID);

// Every trip document, page by page.
async function allTrips(){
  const out=[];let next="";
  do{
    const r=await call(`${FS}/trips?pageSize=300${next?"&pageToken="+encodeURIComponent(next):""}`,{token:await token()});
    (r.documents||[]).forEach(d=>{const t=readTrip(d),f=d.fields||{};
      out.push({...t,uid:d.name.split("/").pop(),email:f.email&&f.email.stringValue||"",created:new Date(d.createTime),updated:new Date(d.updateTime)})});
    next=r.nextPageToken||"";
  }while(next);
  return out;
}

const DAY=864e5;
const riyadhDay=d=>new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Riyadh"}).format(d);

// Count this visit: once per browser tab, never on a test copy of the site,
// and not for the owner. Failure is silent; it's only a counter.
function countVisit(){
  if(!FB_ON||isAdmin()||/^(localhost|127\.)/.test(location.hostname))return;
  try{if(sessionStorage.getItem("tabineko-visit"))return;sessionStorage.setItem("tabineko-visit","1")}catch(e){return}
  fetch(`${FS}:commit?key=${FIREBASE.apiKey}`,{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({writes:[{transform:{document:`${FS_PATH}/visits/${riyadhDay(new Date())}`,fieldTransforms:[{fieldPath:"n",increment:{integerValue:"1"}}]}}]})}).catch(()=>{});
}
// Every day's visits, as a Map of "YYYY-MM-DD" to a count. Read in pages
// with no sort order (sorting backwards would need its own Firestore index);
// there's one small document per day, so even years of them are quick.
async function visitDays(){
  const m=new Map();let next="";
  do{
    const r=await call(`${FS}/visits?pageSize=300${next?"&pageToken="+encodeURIComponent(next):""}`,{token:await token()});
    (r.documents||[]).forEach(d=>m.set(d.name.split("/").pop(),+(d.fields&&d.fields.n&&d.fields.n.integerValue||0)));
    next=r.nextPageToken||"";
  }while(next);
  return m;
}
// Visits per day for the last 30 days, as columns.
function daily(v){
  const days=[...Array(30)].map((_,i)=>{const d=new Date(Date.now()-(29-i)*DAY);return {d,n:v.get(riyadhDay(d))||0}});
  const top=Math.max(1,...days.map(x=>x.n));
  return `<div class="acols a30" role="img" aria-label="Visits per day, last 30 days">${days.map((x,i)=>`<div class="acol" tabindex="0" data-tip="${esc(fmtDay(x.d)+": "+x.n+" visit"+(x.n===1?"":"s"))}">
      <i style="height:${(x.n/top*100).toFixed(1)}%"></i>${i%5===4||i===29?`<span>${fmtDay(x.d)}</span>`:""}</div>`).join("")}</div>
    <details class="atable"><summary>Show as a table</summary><table><tr><th>Day</th><th>Visits</th></tr>${[...days].reverse().map(x=>`<tr><td>${fmtDay(x.d)}</td><td>${x.n}</td></tr>`).join("")}</table></details>`;
}
const fmtDay=d=>d.toLocaleDateString(isAR()?"ar":"en-GB",{day:"numeric",month:"short"});
const ago=d=>{const n=Math.floor((Date.now()-d)/DAY);return n<1?"today":n<2?"yesterday":n<30?n+" days ago":fmtDay(d)};
// One bar chart in the notebook's style: a single colour, rounded data ends,
// the value written beside each bar, and the exact number on hover or focus.
function bars(rows,{unit="",max}={}){
  const top=max||Math.max(1,...rows.map(r=>r.v));
  return `<ul class="abars">${rows.map(r=>`<li><span class="abl">${r.label}</span>
    <span class="abt" tabindex="0" data-tip="${esc(r.tip||r.v+unit)}"><i style="width:${Math.max(r.v?2:0,r.v/top*100).toFixed(1)}%"></i></span><b>${r.v}</b></li>`).join("")}</ul>`;
}
// New trips per week, the last eight weeks, as columns.
function weekly(trips){
  const now=Date.now(),wk=[...Array(8)].map((_,i)=>{const end=now-i*7*DAY,start=end-7*DAY;
    return {start:new Date(start),v:trips.filter(t=>t.created>start&&t.created<=end).length}}).reverse();
  const top=Math.max(1,...wk.map(w=>w.v));
  return `<div class="acols" role="img" aria-label="New trips per week, last 8 weeks">${wk.map(w=>`<div class="acol" tabindex="0" data-tip="${esc(`week of ${fmtDay(w.start)}: ${w.v} new`)}">
      <b>${w.v||""}</b><i style="height:${(w.v/top*100).toFixed(1)}%"></i><span>${fmtDay(w.start)}</span></div>`).join("")}</div>
    <details class="atable"><summary>Show as a table</summary><table><tr><th>Week of</th><th>New trips</th></tr>${wk.map(w=>`<tr><td>${fmtDay(w.start)}</td><td>${w.v}</td></tr>`).join("")}</table></details>`;
}

let adminBusy=false;
async function renderAdmin(){
  const box=$("adminbox");if(!box||adminBusy)return;
  if(!auth){box.innerHTML=`<p class="anote">Log in with your admin account to see the dashboard.</p><button type="button" class="store" id="adminin">Log in</button>`;
    $("adminin").onclick=()=>openAcct("login");return}
  if(!isAdmin()){box.innerHTML=`<p class="anote">This page is only for the site's owner.</p><p class="anote small">Your account ID: <code>${esc(auth.uid)}</code></p>`;return}
  adminBusy=true;box.innerHTML=`<p class="anote">Counting trips…</p>`;
  let trips;
  // Visits are read separately, so a problem there doesn't hide the rest.
  let visits=null,visitErr="";try{visits=await visitDays()}catch(e){visitErr=String(e&&(e.code||e.status)||"no connection")}
  try{trips=await allTrips()}catch(e){adminBusy=false;box.innerHTML=`<p class="anote">Couldn't load the trips (${esc(String(e&&e.code||e&&e.status||"no connection"))}). Check that the latest firestore.rules are published.</p>`;return}
  adminBusy=false;
  const planned=trips.filter(t=>hasTrip(cleanTrip(t.data))),wk=Date.now()-7*DAY;
  const shared=trips.filter(t=>t.members.length),people=shared.reduce((n,t)=>n+t.members.length,0);
  const memberOf=new Map();shared.forEach(t=>t.members.forEach(m=>memberOf.set(m,t)));
  // Places and cities across all trips (each counted once per trip).
  const placeN=new Map(),cityN=new Map(),catN=new Map();
  trips.forEach(t=>{const c=cleanTrip(t.data),ids=new Set(allIds(c));
    ids.forEach(k=>{placeN.set(k,(placeN.get(k)||0)+1);const p=BYKEY.get(k);catN.set(p.cat,(catN.get(p.cat)||0)+1)});
    new Set(c.stays.map(s=>s.city)).forEach(x=>cityN.set(x,(cityN.get(x)||0)+1))});
  const topPlaces=[...placeN].sort((a,b)=>b[1]-a[1]).slice(0,15);
  const tile=(n,l,s)=>`<div class="atile"><b>${n}</b><span>${l}</span>${s?`<small>${s}</small>`:""}</div>`;
  const acctRows=[...trips].sort((a,b)=>b.updated-a.updated).map(t=>{const c=cleanTrip(t.data),inT=memberOf.get(t.uid);
    const email=t.email||t.emails[t.uid]||"";
    return `<tr><td dir="ltr">${email?esc(email):`<span class="amuted">not saved yet</span>`}</td><td>${c.stays.map(s=>esc(D(CITIES[s.city],"n"))).join(", ")||"—"}</td><td>${allIds(c).length}</td>
      <td>${t.members.length?`owner · ${t.members.length+1} people`:inT?`member of ${esc(inT.email||inT.emails[inT.uid]||"a trip")}`:"—"}</td><td>${fmtDay(t.created)}</td><td>${ago(t.updated)}</td></tr>`}).join("");
  const vsum=k=>{let n=0;for(let i=0;i<k;i++)n+=visits.get(riyadhDay(new Date(Date.now()-i*DAY)))||0;return n};
  box.innerHTML=`
    ${visits?`<div class="atiles">${tile(vsum(1),"visits today")}${tile(vsum(7),"visits, last 7 days")}${tile(vsum(30),"visits, last 30 days")}</div>
    <section class="acard wide avisits"><span class="tape"></span><h2>Visits per day</h2>${daily(visits)}
      <p class="amuted">One visit = someone opening the site in a browser tab. Your own visits aren't counted. Days are Riyadh time.</p></section>`
    :`<p class="anote">Visits aren't available yet (${esc(visitErr)}). Check that the latest firestore.rules are published.</p>`}
    <div class="atiles">${tile(trips.length,"accounts with a trip",`${planned.length} with something planned`)}
      ${tile(trips.filter(t=>t.created>wk).length,"new this week")}
      ${tile(trips.filter(t=>t.updated>wk).length,"active this week","saved a change")}
      ${tile(shared.length,"shared trips",`${people} people invited`)}</div>
    <div class="agrid">
      <section class="acard"><span class="tape"></span><h2>New trips per week</h2>${weekly(trips)}</section>
      <section class="acard"><span class="tape pink"></span><h2>Cities in trips</h2>${cityN.size?bars([...cityN].sort((a,b)=>b[1]-a[1]).map(([c,v])=>({label:esc(D(CITIES[c],"n")),v,tip:`${v} trip${v===1?"":"s"}`}))):`<p class="amuted">No cities yet.</p>`}</section>
      <section class="acard wide"><span class="tape"></span><h2>Most-added places</h2>
        ${topPlaces.length?`<table class="aplaces"><tr><th>#</th><th>Place</th><th>Category</th><th>In trips</th></tr>${topPlaces.map(([k,v],i)=>{const p=BYKEY.get(k);
          return `<tr><td>${i+1}</td><td><b>${esc(p.n)}</b><small>${esc(D(CITIES[p.city],"n"))} · ${esc(AREA(p.area))}${p.halal?" · ✓ halal":""}</small></td><td>${esc(D(CATS[p.cat],"n"))}</td>
            <td><span class="abt mini" tabindex="0" data-tip="${v} trip${v===1?"":"s"}"><i style="width:${(v/topPlaces[0][1]*100).toFixed(1)}%"></i></span><b>${v}</b></td></tr>`}).join("")}</table>`:`<p class="amuted">No places added yet.</p>`}</section>
      <section class="acard"><span class="tape pink"></span><h2>Categories</h2>${catN.size?bars([...catN].sort((a,b)=>b[1]-a[1]).map(([c,v])=>({label:esc(D(CATS[c],"n")),v,tip:`added ${v} time${v===1?"":"s"}`}))):`<p class="amuted">Nothing yet.</p>`}</section>
      <section class="acard"><span class="tape"></span><h2>Shared trips</h2>${shared.length?`<table><tr><th>Owner</th><th>People</th><th>Last change</th></tr>${shared.sort((a,b)=>b.updated-a.updated).map(t=>
        `<tr><td dir="ltr">${esc(t.email||t.emails[t.uid]||"—")}</td><td>${t.members.length+1}</td><td>${ago(t.updated)}</td></tr>`).join("")}</table>`:`<p class="amuted">No shared trips yet.</p>`}</section>
      <section class="acard wide"><span class="tape pink"></span><h2>Accounts</h2>
        <p class="amuted">Accounts that saved a trip, latest first. Emails show once someone saves after this update. Everyone who signed up: Firebase console → Authentication → Users.</p>
        <div class="ascroll"><table class="aaccts"><tr><th>Email</th><th>Cities</th><th>Places</th><th>Planning together</th><th>Started</th><th>Last saved</th></tr>${acctRows||`<tr><td colspan="6" class="amuted">No accounts yet.</td></tr>`}</table></div></section>
    </div>
    <p class="anote small">Totals only: this page never shows anyone's trip or where they're staying. <button type="button" class="tclear" id="adminre">Refresh</button></p>`;
  $("adminre").onclick=renderAdmin;
}
addEventListener("hashchange",()=>{if(location.hash==="#admin")renderAdmin()});
if(location.hash==="#admin"){show("admin");renderAdmin()}
countVisit();
