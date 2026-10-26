// Accounts: an optional login that keeps My trip safe and the same on every
// device. Loaded after js/trip.js and uses its trip state and helpers.
//
// The server is PocketBase (hosted on PocketHost). PB_URL is its address;
// while it's empty, nothing about accounts shows and the site works as before.
// Without logging in, a trip lives in this browser only, exactly as it always has.
//
// Logging in is by email and password. "Forgot password?" asks PocketBase to
// email a reset link, which only works once the server's mail settings are set.
//
// One trip per account, stored as JSON in the "trips" collection. Every save
// is sent a moment later; the copy edited most recently wins.
const PB_URL="";

const AUTH_KEY="tabineko-auth",SYNC_KEY="tabineko-sync";
let auth=null,sync={id:null,at:"",dirty:false},syncState="";
try{auth=JSON.parse(store.get(AUTH_KEY))||null}catch(e){auth=null}
try{sync={...sync,...JSON.parse(store.get(SYNC_KEY))}}catch(e){}
const saveAuth=()=>store.set(AUTH_KEY,auth?JSON.stringify(auth):"");
const saveSync=()=>store.set(SYNC_KEY,JSON.stringify(sync));

// A small fetch wrapper: JSON in, JSON out, the login token attached, and a
// thrown {status, data} on anything that isn't a 2xx.
async function pb(path,{method="GET",body}={}){
  const r=await fetch(PB_URL.replace(/\/$/,"")+path,{method,
    headers:{...(body?{"Content-Type":"application/json"}:{}),...(auth?{Authorization:auth.token}:{})},
    body:body?JSON.stringify(body):undefined});
  const data=r.status===204?null:await r.json().catch(()=>null);
  if(!r.ok)throw {status:r.status,data};
  return data;
}

// ---- syncing the trip ----
const tripJSON=t=>JSON.stringify({name:t.name,ideas:t.ideas,stays:t.stays});
const hasTrip=t=>!!(t.name||t.ideas.length||t.stays.length);
async function latestTrip(){
  const f=encodeURIComponent(`owner="${auth.record.id}"`);
  const res=await pb(`/api/collections/trips/records?filter=${f}&sort=-updated&perPage=1`);
  return res&&res.items&&res.items[0]||null;
}
// Put a trip from the account on this phone, without sending it back.
function applyServer(rec){
  trip=cleanTrip(rec.data||{});store.set(TRIP_KEY,JSON.stringify(trip));
  sync={id:rec.id,at:rec.updated,dirty:false};saveSync();
  tripBadge();homeBtn();renderTrip();renderList();renderMap();
}
let pushT=null,pushing=false;
// trip.js calls this after every change.
function syncSoon(){
  if(!auth)return;
  sync.dirty=true;saveSync();setSync("saving");
  clearTimeout(pushT);pushT=setTimeout(push,1200);
}
async function push(){
  if(!auth||pushing)return;
  pushing=true;
  try{
    const rec=sync.id?await pb(`/api/collections/trips/records/${sync.id}`,{method:"PATCH",body:{data:JSON.parse(tripJSON(trip))}})
      :await pb(`/api/collections/trips/records`,{method:"POST",body:{owner:auth.record.id,data:JSON.parse(tripJSON(trip))}});
    sync={id:rec.id,at:rec.updated,dirty:false};saveSync();setSync("saved");
  }catch(e){
    if(e&&e.status===404&&sync.id){sync.id=null;saveSync();pushing=false;return push()} // deleted elsewhere: start a new one
    if(e&&e.status===401)return loggedOut(true);
    setSync("offline");
  }finally{pushing=false}
}
// Picks up changes made on another device: when the page opens, and when
// you come back to the tab. Unsent changes on this phone go up instead.
async function pull(){
  if(!auth)return;
  try{
    const rec=await latestTrip();
    if(sync.dirty)return push();
    if(rec&&rec.updated!==sync.at)applyServer(rec);
    else if(!rec&&hasTrip(trip)){sync.id=null;return push()}
    setSync("saved");
  }catch(e){if(e&&e.status===401)loggedOut(true);else setSync("offline")}
}
addEventListener("online",()=>auth&&(sync.dirty?push():pull()));
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")pull()});

// Right after logging in, the trip on this phone and the one in the account
// may both exist. If only one does, it's used; if they differ, you choose.
async function afterLogin(){
  let rec=null;
  try{rec=await latestTrip()}catch(e){}
  const here=hasTrip(trip);
  if(!rec){sync={id:null,at:"",dirty:false};saveSync();if(here)push();else setSync("saved");return closeAcct()}
  if(!here||tripJSON(cleanTrip(rec.data||{}))===tripJSON(trip)){applyServer(rec);setSync("saved");return closeAcct()}
  acct={step:"choose",rec};renderAcct();
}

// ---- the login sheet ----
let acct=null; // {step:"login"|"signup"|"choose"|"me", email, msg, busy, rec}
function openAcct(step){
  acct={step:step||(auth?"me":"login"),email:"",msg:""};
  let el=$("acct");
  if(!el){el=document.createElement("div");el.id="acct";el.className="tpick acct";document.body.appendChild(el);
    el.addEventListener("click",e=>{if(e.target===el&&acct.step!=="choose")closeAcct()});
    el.addEventListener("keydown",e=>{if(e.key==="Escape"&&acct.step!=="choose")closeAcct()})}
  el.hidden=false;document.documentElement.classList.add("tpick-open");
  renderAcct();
}
function closeAcct(){const el=$("acct");if(el)el.hidden=true;document.documentElement.classList.remove("tpick-open");acct=null;renderTrip()}
function renderAcct(){
  const el=$("acct"),a=acct;if(!el||!a)return;
  const err=a.msg?`<p class="thome-msg${a.ok?" ok":""}" role="alert">${esc(a.msg)}</p>`:"";
  let h="";
  if(a.step==="login"||a.step==="signup"){const up=a.step==="signup";
    h=`<h2 id="acct-h">${T(up?"Create your account":"Log in to Tabi Neko")}</h2>
    <p>${T("Keep your trip safe and open it on any phone or laptop.")}</p>
    <form class="acct-f" novalidate><input type="email" class="thome-q" id="acct-email" value="${esc(a.email)}" placeholder="${esc(T("your@email.com"))}" aria-label="${esc(T("Email"))}" autocomplete="email" required dir="ltr">
      <input type="password" class="thome-q" id="acct-pw" placeholder="${esc(T(up?"Password (8 or more characters)":"Password"))}" aria-label="${esc(T("Password"))}" autocomplete="${up?"new-password":"current-password"}" minlength="${up?8:1}" required dir="ltr">
      <button type="submit" class="store"${a.busy?" disabled":""}>${a.busy?T("One moment…"):T(up?"Create account":"Log in")}</button></form>${err}
    <p class="acct-small">${up?`${T("Already have an account?")} <button type="button" class="tclear acct-mode">${T("Log in")}</button>`
      :`${T("New here?")} <button type="button" class="tclear acct-mode">${T("Create an account")}</button> · <button type="button" class="tclear acct-forgot">${T("Forgot password?")}</button>`}</p>
    <p class="acct-small">${T("We only keep your email and your trip, and you can delete both anytime.")} <a href="#privacy" class="acct-priv">${T("Privacy")}</a></p>`}
  else if(a.step==="choose")h=`<h2 id="acct-h">${T("You have two trips")}</h2>
    <p>${T("There's a trip on this phone and a different one in your account. Which one do you want to keep?")}</p>
    <div class="acct-two"><button type="button" class="store" data-keep="server">☁️ ${T("The one in my account")}<small>${esc(a.rec.data&&a.rec.data.name||T("My Japan trip"))}</small></button>
      <button type="button" class="store" data-keep="local">📱 ${T("The one on this phone")}<small>${esc(trip.name||T("My Japan trip"))}</small></button></div>
    <p class="acct-small">${T("The other one is replaced.")}</p>`;
  else h=`<h2 id="acct-h">${T("Your account")}</h2>
    <p>${T("Logged in as {e}. Your trip is saved to your account.",{e:`<b dir="ltr">${esc(auth&&auth.record.email||"")}</b>`})}</p>
    <div class="acct-two"><button type="button" class="store acct-out">${T("Log out")}</button></div>
    <p class="acct-small"><button type="button" class="tclear acct-del">${T("Delete my account and trip")}</button> · <a href="#privacy" class="acct-priv">${T("Privacy")}</a></p>`;
  el.innerHTML=`<div class="tpick-sheet acct-sheet" role="dialog" aria-modal="true" aria-labelledby="acct-h">
    ${a.step==="choose"?"":`<button type="button" class="tdel acct-x" aria-label="${esc(T("Close"))}">×</button>`}
    <img src="assets/cat.png" alt="" class="acct-cat">${h}</div>`;
  const q=s=>el.querySelector(s);
  if(q(".acct-x"))q(".acct-x").onclick=closeAcct;
  el.querySelectorAll(".acct-priv").forEach(l=>l.onclick=e=>{e.preventDefault();closeAcct();show("privacy");history.replaceState(null,"","#privacy")});
  if(a.step==="login"||a.step==="signup"){
    q(".acct-f").onsubmit=e=>{e.preventDefault();logIn(q("#acct-email").value,q("#acct-pw").value,a.step==="signup")};
    q(".acct-mode").onclick=()=>{acct={step:a.step==="signup"?"login":"signup",email:q("#acct-email").value,msg:""};renderAcct()};
    if(q(".acct-forgot"))q(".acct-forgot").onclick=()=>forgot(q("#acct-email").value);
    if(!a.busy)(a.email?q("#acct-pw"):q("#acct-email")).focus()}
  if(a.step==="choose")el.querySelectorAll("[data-keep]").forEach(b=>b.onclick=()=>{
    if(b.dataset.keep==="server")applyServer(a.rec);else{sync={id:a.rec.id,at:a.rec.updated,dirty:true};saveSync();push()}
    closeAcct()});
  if(a.step==="me"){q(".acct-out").onclick=()=>{loggedOut(false);closeAcct();toast(T("Logged out. Your trip stays on this phone."))};
    q(".acct-del").onclick=deleteAccount}
}
const failMsg=e=>e&&e.status===429?T("Too many tries. Wait a minute, then try again."):e&&e.status?T("Something went wrong. Try again in a moment."):T("Couldn't reach the server. Check your connection.");
const okEmail=e=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
async function logIn(email,pw,signup){
  email=(email||"").trim().toLowerCase();
  if(!pw){acct.msg=T("Type your password.");acct.ok=false;acct.email=email;return renderAcct()}
  if(!okEmail(email)){acct.msg=T("That email doesn't look right.");acct.ok=false;return renderAcct()}
  if(signup&&pw.length<8){acct.msg=T("Your password needs at least 8 characters.");acct.ok=false;acct.email=email;return renderAcct()}
  acct={...acct,email,busy:true,msg:"",ok:false};renderAcct();
  try{
    if(signup)await pb("/api/collections/users/records",{method:"POST",body:{email,password:pw,passwordConfirm:pw}});
    const r=await pb("/api/collections/users/auth-with-password",{method:"POST",body:{identity:email,password:pw}});
    auth={token:r.token,record:{id:r.record.id,email:r.record.email}};saveAuth();
    toast(T(signup?"Account created ✓ Your trip is saved to your account.":"Logged in ✓ Your trip is saved to your account."));
    acct.busy=false;await afterLogin();
  }catch(e){
    acct.busy=false;const d=e&&e.data&&e.data.data||{};
    acct.msg=signup&&d.email?T("There's already an account with this email. Log in instead."):signup&&d.password?T("Your password needs at least 8 characters.")
      :!signup&&e&&e.status===400?T("Wrong email or password."):failMsg(e);
    renderAcct();
  }
}
async function forgot(email){
  email=(email||"").trim().toLowerCase();
  if(!okEmail(email)){acct.msg=T("Type your email first, then tap Forgot password.");acct.ok=false;return renderAcct()}
  try{await pb("/api/collections/users/request-password-reset",{method:"POST",body:{email}});
    acct.msg=T("If there's an account for {e}, we've emailed a link to reset the password.",{e:email});acct.ok=true}
  catch(e){acct.msg=failMsg(e);acct.ok=false}
  renderAcct();
}
function loggedOut(expired){
  auth=null;saveAuth();sync={id:null,at:"",dirty:false};saveSync();setSync("");
  if(expired)toast(T("You were logged out. Log in again to keep syncing."));
  renderTrip();
}
async function deleteAccount(){
  if(!confirm(T("Delete your account and the trip saved in it? The trip on this phone stays.")))return;
  try{await pb(`/api/collections/users/records/${auth.record.id}`,{method:"DELETE"});loggedOut(false);closeAcct();toast(T("Your account is deleted."))}
  catch(e){acct.msg=failMsg(e);renderAcct()}
}

// ---- the bar at the top of My trip ----
function setSync(s){syncState=s;const el=$("tripbook")&&$("tripbook").querySelector(".tacct-s");if(el)el.textContent=syncText()}
const syncText=()=>({saving:T("Saving…"),saved:T("Saved ✓"),offline:T("Offline. It'll save when you're back online.")})[syncState]||"";
function acctBar(){
  if(!PB_URL)return "";
  if(!auth)return `<div class="tacct"><span>📱 ${T("Saved on this phone only.")}</span><button type="button" class="store tacct-in">☁️ ${T("Log in to keep it safe")}</button></div>`;
  return `<div class="tacct on"><span>☁️ ${T("Saved to your account")} <small class="tacct-s" role="status">${esc(syncText())}</small></span><button type="button" class="tclear tacct-me" dir="ltr">${esc(auth.record.email)}</button></div>`;
}
function wireAcct(box){
  const i=box.querySelector(".tacct-in"),m=box.querySelector(".tacct-me");
  if(i)i.onclick=()=>openAcct("login");if(m)m.onclick=()=>openAcct("me");
}

// Start: check the saved login is still good (and refresh it), then pull.
(async()=>{
  if(!PB_URL||!auth)return renderTrip();
  renderTrip();
  try{const r=await pb("/api/collections/users/auth-refresh",{method:"POST"});auth={token:r.token,record:{id:r.record.id,email:r.record.email}};saveAuth();pull()}
  catch(e){if(e&&e.status===401)loggedOut(true);else setSync("offline")}
})();
