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
const fmtDay=d=>d.toLocaleDateString(isAR()?"ar":"en-GB",{day:"numeric",month:"short"});
const ago=d=>{const n=Math.floor((Date.now()-d)/DAY);return n<1?"today":n<2?"yesterday":n<30?n+" days ago":fmtDay(d)};
// New trips per week, the last eight weeks, as columns.
function weekly(trips){
  const now=Date.now(),wk=[...Array(8)].map((_,i)=>{const end=now-i*7*DAY,start=end-7*DAY;
    return {start:new Date(start),v:trips.filter(t=>t.created>start&&t.created<=end).length}}).reverse();
  const top=Math.max(1,...wk.map(w=>w.v));
  return `<div class="acols" role="img" aria-label="New trips per week, last 8 weeks">${wk.map(w=>`<div class="acol" tabindex="0" data-tip="${esc(`week of ${fmtDay(w.start)}: ${w.v} new`)}">
      <b>${w.v||""}</b><i style="height:${(w.v/top*100).toFixed(1)}%"></i><span>${fmtDay(w.start)}</span></div>`).join("")}</div>
    <details class="atable"><summary>Show as a table</summary><table><tr><th>Week of</th><th>New trips</th></tr>${wk.map(w=>`<tr><td>${fmtDay(w.start)}</td><td>${w.v}</td></tr>`).join("")}</table></details>`;
}

// The dashboard itself is drawn by js/webadmin.js on the website and by
// js/appadmin.js in the app; both use the helpers in this file.
function renderAdmin(){if(window.tnWebAdmin)tnWebAdmin()}
// ---- Apollo Scout ----
// The weekly scout task writes its suggestions to data/scout.json. Here the
// owner taps ✓ or ✗ on each; the choices go to Firestore scout/picks, which
// the next scout run reads (it's public to read, only the owner can write),
// adds the ✓ ones to the notebook and moves both kinds into "done".
let scout=null,picks={add:[],skip:[]};
const arr=d=>(d&&d.arrayValue&&d.arrayValue.values||[]).map(v=>v.stringValue);
async function loadScout(){
  const [s,p]=await Promise.all([fetch("data/scout.json",{cache:"no-store"}).then(r=>r.ok?r.json():null).catch(()=>null),fsGet("scout/picks").catch(()=>null)]);
  scout=s;picks={add:arr(p&&p.fields&&p.fields.add),skip:arr(p&&p.fields&&p.fields.skip)};
}
const KIND={trendy:"🔥 trending",new:"🆕 new",weird:"⭐ weird & hidden",halal:"🍜 halal"};
addEventListener("hashchange",()=>{if(location.hash==="#admin")renderAdmin()});
if(location.hash==="#admin"){show("admin");renderAdmin()}
countVisit();
