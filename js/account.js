// Accounts: an optional login that keeps My trip safe and the same on every
// device. Loaded after js/trip.js and uses its trip state and helpers.
//
// The server is Google Firebase, on its free plan: Firebase Authentication
// for email and password, and Firestore to keep each person's trip. FIREBASE
// holds the project's web settings; while they're empty, nothing about
// accounts shows and the site works as before, keeping trips on the phone.
//
// These two values are meant to be public: what stops one person reading
// another's trip is the Firestore security rules (see firebase/README.md).
//
// Firebase is used through its plain web addresses rather than its SDK, so
// the site loads nothing extra. Each account has one trip, in the document
// trips/<user id>, saved as a JSON string. Every change is sent a moment
// later; the copy edited most recently wins.
const FIREBASE={apiKey:"AIzaSyCDpZenpMYnCsck56GgBk3jyn-BHZUbiwE",projectId:"tabi-neko-52eae"};
const FB_ON=!!(FIREBASE.apiKey&&FIREBASE.projectId);

const AUTH_KEY="tabineko-auth",SYNC_KEY="tabineko-sync";
let auth=null,sync={at:"",dirty:false},syncState="";
try{auth=JSON.parse(store.get(AUTH_KEY))||null}catch(e){auth=null}
try{sync={...sync,...JSON.parse(store.get(SYNC_KEY))}}catch(e){}
const saveAuth=()=>store.set(AUTH_KEY,auth?JSON.stringify(auth):"");
const saveSync=()=>store.set(SYNC_KEY,JSON.stringify(sync));

// fetch with JSON in and out; anything that isn't a 2xx throws
// {status, code}, where code is Firebase's own error name (EMAIL_EXISTS…).
async function call(url,{method="GET",body,form,token}={}){
  const r=await fetch(url,{method,
    headers:{...(body?{"Content-Type":"application/json"}:{}),...(form?{"Content-Type":"application/x-www-form-urlencoded"}:{}),...(token?{Authorization:"Bearer "+token}:{})},
    body:body?JSON.stringify(body):form||undefined});
  const data=await r.json().catch(()=>null);
  if(!r.ok)throw {status:r.status,code:String(data&&data.error&&(data.error.message||data.error.status)||"").split(" ")[0]};
  return data;
}
const ID=(what,body)=>call(`https://identitytoolkit.googleapis.com/v1/accounts:${what}?key=${FIREBASE.apiKey}`,{method:"POST",body});
const signedIn=r=>({token:r.idToken,refresh:r.refreshToken,uid:r.localId,email:r.email,exp:Date.now()+(+r.expiresIn||3600)*1000});

// A login token lasts an hour; the long-lived refresh token gets a new one.
async function token(){
  if(!auth)throw {status:401};
  if(Date.now()<auth.exp-60000)return auth.token;
  try{
    const r=await call(`https://securetoken.googleapis.com/v1/token?key=${FIREBASE.apiKey}`,{method:"POST",
      form:"grant_type=refresh_token&refresh_token="+encodeURIComponent(auth.refresh)});
    auth={...auth,token:r.id_token,refresh:r.refresh_token,exp:Date.now()+(+r.expires_in||3600)*1000};saveAuth();
    return auth.token;
  }catch(e){if(e&&e.status===400)throw {status:401};throw e}
}
const DOC=()=>`https://firestore.googleapis.com/v1/projects/${FIREBASE.projectId}/databases/(default)/documents/trips/${auth.uid}`;

// ---- syncing the trip ----
const tripJSON=t=>JSON.stringify({name:t.name,ideas:t.ideas,stays:t.stays});
const hasTrip=t=>!!(t.name||t.ideas.length||t.stays.length);
// The account's trip, as {data, at}, or null if it has none yet.
async function serverTrip(){
  try{
    const d=await call(DOC(),{token:await token()});
    let data={};try{data=JSON.parse(d.fields&&d.fields.data&&d.fields.data.stringValue||"{}")}catch(e){}
    return {data,at:d.updateTime};
  }catch(e){if(e&&e.status===404)return null;throw e}
}
// Put a trip from the account on this phone, without sending it back.
function applyServer(rec){
  trip=cleanTrip(rec.data||{});store.set(TRIP_KEY,JSON.stringify(trip));
  sync={at:rec.at,dirty:false};saveSync();
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
    const d=await call(DOC(),{method:"PATCH",token:await token(),body:{fields:{data:{stringValue:tripJSON(trip)}}}});
    sync={at:d.updateTime,dirty:false};saveSync();setSync("saved");
  }catch(e){if(e&&e.status===401)loggedOut(true);else setSync("offline")}
  finally{pushing=false}
}
// Picks up changes made on another device: when the page opens, and when
// you come back to the tab. Unsent changes on this phone go up instead.
async function pull(){
  if(!auth)return;
  if(sync.dirty)return push();
  try{
    const rec=await serverTrip();
    if(rec&&rec.at!==sync.at)applyServer(rec);
    else if(!rec&&hasTrip(trip))return push();
    setSync("saved");
  }catch(e){if(e&&e.status===401)loggedOut(true);else setSync("offline")}
}
addEventListener("online",()=>auth&&pull());
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")pull()});

// Right after logging in, the trip on this phone and the one in the account
// may both exist. If only one does, it's used; if they differ, you choose.
async function afterLogin(){
  let rec=null;
  try{rec=await serverTrip()}catch(e){}
  const here=hasTrip(trip);
  if(!rec){sync={at:"",dirty:false};saveSync();if(here)push();else setSync("saved");return closeAcct()}
  if(!here||tripJSON(cleanTrip(rec.data||{}))===tripJSON(trip)){applyServer(rec);setSync("saved");return closeAcct()}
  acct={step:"choose",rec};renderAcct();
}

// ---- the login sheet ----
let acct=null; // {step:"login"|"signup"|"choose"|"me"|"delete", email, msg, ok, busy, rec}
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
  const pwBox=(ph,ac)=>`<input type="password" class="thome-q" id="acct-pw" placeholder="${esc(T(ph))}" aria-label="${esc(T("Password"))}" autocomplete="${ac}" required dir="ltr">`;
  let h="";
  if(a.step==="login"||a.step==="signup"){const up=a.step==="signup";
    h=`<h2 id="acct-h">${T(up?"Create your account":"Log in to Tabi Neko")}</h2>
    <p>${T("Keep your trip safe and open it on any phone or laptop.")}</p>
    <form class="acct-f" novalidate><input type="email" class="thome-q" id="acct-email" value="${esc(a.email)}" placeholder="${esc(T("your@email.com"))}" aria-label="${esc(T("Email"))}" autocomplete="email" required dir="ltr">
      ${pwBox(up?"Password (8 or more characters)":"Password",up?"new-password":"current-password")}
      <button type="submit" class="store"${a.busy?" disabled":""}>${a.busy?T("One moment…"):T(up?"Create account":"Log in")}</button></form>${err}
    <p class="acct-small">${up?`${T("Already have an account?")} <button type="button" class="tclear acct-mode">${T("Log in")}</button>`
      :`${T("New here?")} <button type="button" class="tclear acct-mode">${T("Create an account")}</button> · <button type="button" class="tclear acct-forgot">${T("Forgot password?")}</button>`}</p>
    <p class="acct-small">${T("We only keep your email and your trip, and you can delete both anytime.")} <a href="#privacy" class="acct-priv">${T("Privacy")}</a></p>`}
  else if(a.step==="choose")h=`<h2 id="acct-h">${T("You have two trips")}</h2>
    <p>${T("There's a trip on this phone and a different one in your account. Which one do you want to keep?")}</p>
    <div class="acct-two"><button type="button" class="store" data-keep="server">☁️ ${T("The one in my account")}<small>${esc(a.rec.data&&a.rec.data.name||T("My Japan trip"))}</small></button>
      <button type="button" class="store" data-keep="local">📱 ${T("The one on this phone")}<small>${esc(trip.name||T("My Japan trip"))}</small></button></div>
    <p class="acct-small">${T("The other one is replaced.")}</p>`;
  else if(a.step==="delete")h=`<h2 id="acct-h">${T("Delete your account?")}</h2>
    <p>${T("This deletes your account and the trip saved in it. The trip on this phone stays. Type your password to confirm.")}</p>
    <form class="acct-f acct-danger" novalidate>${pwBox("Password","current-password")}
      <button type="submit" class="store"${a.busy?" disabled":""}>${a.busy?T("One moment…"):T("Delete my account and trip")}</button></form>${err}
    <p class="acct-small"><button type="button" class="tclear acct-back">${T("Cancel")}</button></p>`;
  else h=`<h2 id="acct-h">${T("Your account")}</h2>
    <p>${T("Logged in as {e}. Your trip is saved to your account.",{e:`<b dir="ltr">${esc(auth&&auth.email||"")}</b>`})}</p>
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
    if(b.dataset.keep==="server")applyServer(a.rec);else{sync={at:a.rec.at,dirty:true};saveSync();push()}
    closeAcct()});
  if(a.step==="me"){q(".acct-out").onclick=()=>{loggedOut(false);closeAcct();toast(T("Logged out. Your trip stays on this phone."))};
    q(".acct-del").onclick=()=>{acct={step:"delete",msg:""};renderAcct()}}
  if(a.step==="delete"){q(".acct-f").onsubmit=e=>{e.preventDefault();deleteAccount(q("#acct-pw").value)};
    q(".acct-back").onclick=()=>{acct={step:"me",msg:""};renderAcct()};if(!a.busy)q("#acct-pw").focus()}
}
const failMsg=e=>e&&(e.status===429||e.code==="TOO_MANY_ATTEMPTS_TRY_LATER")?T("Too many tries. Wait a minute, then try again.")
  :e&&e.status?T("Something went wrong. Try again in a moment."):T("Couldn't reach the server. Check your connection.");
// Firebase answers a wrong password and an unknown email the same way.
const WRONG=["INVALID_LOGIN_CREDENTIALS","INVALID_PASSWORD","EMAIL_NOT_FOUND","INVALID_EMAIL"];
const okEmail=e=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const say=(m,ok)=>{acct.msg=m;acct.ok=!!ok;acct.busy=false;renderAcct()};
async function logIn(email,pw,signup){
  email=(email||"").trim().toLowerCase();acct.email=email;
  if(!okEmail(email))return say(T("That email doesn't look right."));
  if(!pw)return say(T("Type your password."));
  if(signup&&pw.length<8)return say(T("Your password needs at least 8 characters."));
  acct={...acct,busy:true,msg:"",ok:false};renderAcct();
  try{
    const r=await ID(signup?"signUp":"signInWithPassword",{email,password:pw,returnSecureToken:true});
    auth=signedIn({...r,email:r.email||email});saveAuth();
    toast(T(signup?"Account created ✓ Your trip is saved to your account.":"Logged in ✓ Your trip is saved to your account."));
    acct.busy=false;await afterLogin();
  }catch(e){
    const c=e&&e.code;
    say(c==="EMAIL_EXISTS"?T("There's already an account with this email. Log in instead."):c==="WEAK_PASSWORD"?T("Your password needs at least 8 characters.")
      :c==="USER_DISABLED"?T("This account has been turned off."):WRONG.includes(c)?T("Wrong email or password."):failMsg(e));
  }
}
// Firebase sends the reset email itself, with a page to choose a new password.
async function forgot(email){
  email=(email||"").trim().toLowerCase();acct.email=email;
  if(!okEmail(email))return say(T("Type your email first, then tap Forgot password."));
  try{await ID("sendOobCode",{requestType:"PASSWORD_RESET",email});say(T("If there's an account for {e}, we've emailed a link to reset the password.",{e:email}),true)}
  catch(e){e&&e.code==="EMAIL_NOT_FOUND"?say(T("If there's an account for {e}, we've emailed a link to reset the password.",{e:email}),true):say(failMsg(e))}
}
function loggedOut(expired){
  auth=null;saveAuth();sync={at:"",dirty:false};saveSync();setSync("");
  if(expired)toast(T("You were logged out. Log in again to keep syncing."));
  renderTrip();
}
// Firebase only deletes an account right after a fresh login, so the
// password is asked again. The trip goes first, while we're still allowed.
async function deleteAccount(pw){
  if(!pw)return say(T("Type your password."));
  acct={...acct,busy:true,msg:""};renderAcct();
  try{
    const r=await ID("signInWithPassword",{email:auth.email,password:pw,returnSecureToken:true});
    auth=signedIn({...r,email:auth.email});
    try{await call(DOC(),{method:"DELETE",token:auth.token})}catch(e){if(!(e&&e.status===404))throw e}
    await ID("delete",{idToken:auth.token});
    loggedOut(false);closeAcct();toast(T("Your account is deleted."));
  }catch(e){say(WRONG.includes(e&&e.code)?T("That password isn't right."):failMsg(e))}
}

// ---- the bar at the top of My trip ----
function setSync(s){syncState=s;const el=$("tripbook")&&$("tripbook").querySelector(".tacct-s");if(el)el.textContent=syncText()}
const syncText=()=>({saving:T("Saving…"),saved:T("Saved ✓"),offline:T("Offline. It'll save when you're back online.")})[syncState]||"";
function acctBar(){
  if(!FB_ON)return "";
  if(!auth)return `<div class="tacct"><span>📱 ${T("Saved on this phone only.")}</span><button type="button" class="store tacct-in">☁️ ${T("Log in to keep it safe")}</button></div>`;
  return `<div class="tacct on"><span>☁️ ${T("Saved to your account")} <small class="tacct-s" role="status">${esc(syncText())}</small></span><button type="button" class="tclear tacct-me" dir="ltr">${esc(auth.email)}</button></div>`;
}
function wireAcct(box){
  const i=box.querySelector(".tacct-in"),m=box.querySelector(".tacct-me");
  if(i)i.onclick=()=>openAcct("login");if(m)m.onclick=()=>openAcct("me");
}

// Start: a saved login from the old setup (or a broken one) is dropped;
// otherwise check for changes made on another device.
if(auth&&!auth.refresh){auth=null;saveAuth()}
renderTrip();
if(FB_ON&&auth)pull();
