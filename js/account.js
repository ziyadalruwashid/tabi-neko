// Accounts: an optional login that keeps My trip safe and the same on every
// device, and lets family plan one trip together. Loaded after js/trip.js and
// uses its trip state and helpers.
//
// The server is Google Firebase, on its free plan: Firebase Authentication
// for email and password, and Firestore for the trips. FIREBASE holds the
// project's web settings; while they're empty, nothing about accounts shows
// and the site works as before, keeping trips on the phone.
//
// These two values are meant to be public: what stops one person reading
// another's trip is the Firestore security rules (firebase/firestore.rules).
//
// Firebase is used through its plain web addresses rather than its SDK, so
// the site loads nothing extra.
//
// Each person's own trip is the document trips/<their user id>, the trip
// itself saved as a JSON string in "data". The owner can turn on an invite
// link; whoever opens it and logs in is added to the trip's "members" and
// can edit it too. users/<user id> remembers which trip someone is planning,
// so every device of theirs opens the same one.
//
// Every change is sent a moment later, and only if the trip hasn't changed
// on the server since we last saw it. If it has (someone else edited it),
// the two versions are merged and sent again; see merge3.
const FIREBASE={apiKey:"AIzaSyCDpZenpMYnCsck56GgBk3jyn-BHZUbiwE",projectId:"tabi-neko-52eae"};
const FB_ON=!!(FIREBASE.apiKey&&FIREBASE.projectId);

const AUTH_KEY="tabineko-auth",SYNC_KEY="tabineko-sync",JOIN_KEY="tabineko-join";
// sync.owner: whose trip this phone is on ("" = your own); at: the server's
// version we last saw; base: the trip as it was then, for merging.
const SYNC0={owner:"",at:"",dirty:false,base:""};
let auth=null,sync={...SYNC0},syncState="",share={members:[],emails:{},code:""};
try{auth=JSON.parse(store.get(AUTH_KEY))||null}catch(e){auth=null}
try{sync={...sync,...JSON.parse(store.get(SYNC_KEY))}}catch(e){}
const saveAuth=()=>{store.set(AUTH_KEY,auth?JSON.stringify(auth):"");userBtn()};
const saveSync=()=>store.set(SYNC_KEY,JSON.stringify(sync));

// fetch with JSON in and out; anything that isn't a 2xx throws
// {status, code}, where code is Firebase's own error name (EMAIL_EXISTS,
// FAILED_PRECONDITION…).
async function call(url,{method="GET",body,form,token}={}){
  const r=await fetch(url,{method,
    headers:{...(body?{"Content-Type":"application/json"}:{}),...(form?{"Content-Type":"application/x-www-form-urlencoded"}:{}),...(token?{Authorization:"Bearer "+token}:{})},
    body:body?JSON.stringify(body):form||undefined});
  const data=await r.json().catch(()=>null);
  if(!r.ok){const e=data&&data.error||{},m=String(e.message||"").split(" ")[0];
    throw {status:r.status,code:/^[A-Z_]+$/.test(m)?m:e.status||m}}
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

// ---- Firestore, by hand ----
const FS_PATH=`projects/${FIREBASE.projectId}/databases/(default)/documents`;
const FS=`https://firestore.googleapis.com/v1/${FS_PATH}`;
const S=v=>({stringValue:v});
const mask=fs=>fs.map(f=>"updateMask.fieldPaths="+encodeURIComponent(f)).join("&");
// A user id can start with a digit, so it's quoted inside a field path.
const KEYP=k=>"`"+k+"`";
async function fsGet(path){try{return await call(`${FS}/${path}`,{token:await token()})}catch(e){if(e&&e.status===404)return null;throw e}}
const fsPatch=async(path,fields,fieldPaths,extra="")=>call(`${FS}/${path}?${mask(fieldPaths)}${extra}`,{method:"PATCH",token:await token(),body:{fields}});
const fsCommit=async writes=>call(`${FS}:commit`,{method:"POST",token:await token(),body:{writes}});
// A trip document as plain values.
function readTrip(d){
  const f=d.fields||{};let data={};
  try{data=JSON.parse(f.data&&f.data.stringValue||"{}")}catch(e){}
  return {data,at:d.updateTime,members:((f.members&&f.members.arrayValue&&f.members.arrayValue.values)||[]).map(v=>v.stringValue),
    emails:Object.fromEntries(Object.entries((f.emails&&f.emails.mapValue&&f.emails.mapValue.fields)||{}).map(([k,v])=>[k,v.stringValue])),
    code:f.code&&f.code.stringValue||""};
}
const me=()=>auth.uid;
const tripOwner=()=>sync.owner||me();
const isShared=()=>!!auth&&(tripOwner()!==me()||share.members.length>0);
async function serverTrip(owner){const d=await fsGet("trips/"+(owner||tripOwner()));return d&&readTrip(d)}
async function getActive(){const d=await fsGet("users/"+me());return d&&d.fields&&d.fields.active&&d.fields.active.stringValue||""}
const setActive=owner=>fsPatch("users/"+me(),{active:S(owner)},["active"]);

// ---- syncing the trip ----
const tripJSON=t=>JSON.stringify({name:t.name,ideas:t.ideas,stays:t.stays});
const hasTrip=t=>!!(t.name||t.ideas.length||t.stays.length);
function setShare(rec){share={members:rec.members,emails:rec.emails,code:rec.code};sync.share=share;saveSync()}
// Put a trip from the server on this phone, without sending it back.
function applyServer(rec){
  trip=cleanTrip(rec.data||{});store.set(TRIP_KEY,JSON.stringify(trip));
  sync={...sync,at:rec.at,dirty:false,base:tripJSON(trip)};setShare(rec);
  tripBadge();homeBtn();renderTrip();renderList();renderMap();
}
// Show a trip we've changed locally (after a merge) without a full save.
function showLocal(){store.set(TRIP_KEY,JSON.stringify(trip));tripBadge();homeBtn();renderTrip();renderList();renderMap()}

// Two people changed the trip at once. Starting from the version both began
// with (base), keep each side's changes: the trip's name and the cities and
// days from whichever side changed them, and every place where the side that
// moved it (or added or removed it) put it.
function merge3(baseJSON,local,server){
  let base;try{base=JSON.parse(baseJSON)}catch(e){return local}
  base=cleanTrip(base);server=cleanTrip(server);
  const shape=t=>JSON.stringify(t.stays.map(s=>({c:s.city,h:s.home,d:s.days.map(d=>d.t)})));
  const pos=t=>{const m=new Map();t.ideas.forEach(k=>m.set(k,"ideas"));t.stays.forEach((s,i)=>s.days.forEach((d,j)=>d.ids.forEach(k=>m.set(k,i+"."+j))));return m};
  const pb=pos(base),pl=pos(local),ps=pos(server);
  const src=shape(local)!==shape(base)&&shape(server)===shape(base)?local:server;
  const out={name:local.name!==base.name?local.name:server.name,ideas:[],
    stays:src.stays.map(s=>({city:s.city,home:s.home,days:s.days.map(d=>({t:d.t,ids:[]}))}))};
  const final=new Map();
  new Set([...pl.keys(),...ps.keys()]).forEach(k=>{const f=pl.get(k)!==pb.get(k)?pl.get(k):ps.get(k);if(f)final.set(k,f)});
  const list=r=>{if(r==="ideas")return out.ideas;const[i,j]=r.split(".").map(Number);return out.stays[i]&&out.stays[i].days[j]?out.stays[i].days[j].ids:null};
  const placed=new Set(),order=[...src.ideas.map(k=>[k,"ideas"])];
  src.stays.forEach((s,i)=>s.days.forEach((d,j)=>d.ids.forEach(k=>order.push([k,i+"."+j]))));
  order.forEach(([k,r])=>{if(final.get(k)===r&&!placed.has(k)){list(r).push(k);placed.add(k)}});
  final.forEach((r,k)=>{if(!placed.has(k)){(list(r)||out.ideas).push(k);placed.add(k)}});
  return out;
}

let pushT=null,pushing=false;
// trip.js calls this after every change.
function syncSoon(){
  if(!auth)return;
  sync.dirty=true;saveSync();setSync("saving");
  clearTimeout(pushT);pushT=setTimeout(push,1200);
}
async function push(again){
  if(!auth||pushing)return;
  pushing=true;
  const sent=tripJSON(trip);
  try{
    // Your own trip also carries your email, for the site owner's account list.
    const own=tripOwner()===me();
    const d=await fsPatch("trips/"+tripOwner(),own?{data:S(sent),email:S(auth.email)}:{data:S(sent)},own?["data","email"]:["data"],sync.at?"&currentDocument.updateTime="+encodeURIComponent(sync.at):"");
    sync={...sync,at:d.updateTime,base:sent,dirty:tripJSON(trip)!==sent};saveSync();
    if(sync.dirty)syncSoon();else setSync("saved");
    pushing=false;
  }catch(e){
    pushing=false;
    // Someone else saved first: merge their version with ours, then retry.
    if(e&&(e.code==="FAILED_PRECONDITION"||(e.status===404&&sync.at))&&!again){
      try{const rec=await serverTrip();
        if(!rec){if(tripOwner()!==me())return gone();sync.at="";saveSync();return push(true)}
        trip=merge3(sync.base,trip,rec.data);sync={...sync,at:rec.at,base:tripJSON(cleanTrip(rec.data))};setShare(rec);showLocal();
        return push(true);
      }catch(e2){e=e2}
    }
    if(e&&e.status===401)return loggedOut(true);
    if(e&&e.status===403&&tripOwner()!==me())return gone();
    setSync("offline");
  }
}
// Picks up changes made on another device or by someone you're planning
// with: when the page opens, when you come back to the tab, and every 15
// seconds while a shared trip is open.
async function pull(){
  if(!auth||pushing)return;
  try{
    const rec=await serverTrip();
    if(!rec){if(tripOwner()!==me())return gone();if(hasTrip(trip))push();else setSync("saved");return}
    setShare(rec);
    if(rec.at===sync.at){if(sync.dirty)push();else{setSync("saved");renderShareBits()}return}
    if(sync.dirty){trip=merge3(sync.base,trip,rec.data);sync={...sync,at:rec.at,base:tripJSON(cleanTrip(rec.data))};showLocal();return push()}
    applyServer(rec);setSync("saved");
  }catch(e){if(e&&e.status===401)loggedOut(true);else if(e&&e.status===403&&tripOwner()!==me())gone();else setSync("offline")}
}
addEventListener("online",()=>auth&&pull());
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")pull()});
setInterval(()=>{if(auth&&isShared()&&document.visibilityState==="visible"&&!$("trip").hidden)pull()},15000);

// Your own trip, as it is in the account (null if none).
async function openOwn(){
  sync={...SYNC0};share={members:[],emails:{},code:""};saveSync();
  const rec=await serverTrip(me());
  if(rec)applyServer(rec);else{trip=freshTrip();showLocal()}
}
// The shared trip you were on is gone: the owner deleted it, or removed you.
async function gone(){
  toast(T("That shared trip isn't available anymore, so you're back on your own trip."));
  try{await setActive("")}catch(e){}
  try{await openOwn()}catch(e){setSync("offline")}
}

// Right after logging in: if you're planning someone's trip, open that.
// Otherwise the trip on this phone and the one in the account may both
// exist. If only one does, it's used; if they differ, you choose.
async function afterLogin(){
  let active="";try{active=await getActive()}catch(e){}
  if(active&&active!==me()){
    // Whatever is on this phone goes into your own trip first, if that's empty.
    try{if(hasTrip(trip)&&!(await serverTrip(me())))await fsPatch("trips/"+me(),{data:S(tripJSON(trip)),email:S(auth.email)},["data","email"])}catch(e){}
    sync={...SYNC0,owner:active};
    try{const rec=await serverTrip();if(rec){applyServer(rec);setSync("saved");closeAcct();return joinIfAsked()}}catch(e){}
    try{await setActive("")}catch(e){}
    sync={...SYNC0};
  }
  let rec=null;
  try{rec=await serverTrip(me())}catch(e){}
  const here=hasTrip(trip);
  if(!rec){sync={...SYNC0};saveSync();if(here)push();else setSync("saved");closeAcct();return joinIfAsked()}
  if(!here||tripJSON(cleanTrip(rec.data||{}))===tripJSON(trip)){applyServer(rec);setSync("saved");closeAcct();return joinIfAsked()}
  acct={step:"choose",rec};renderAcct();
}

// ---- planning together ----
// An invite link is #join=<owner id>.<code>. The code is a random string on
// the owner's trip; the security rules let anyone who knows it add
// themselves (and only themselves) to the trip's members.
let invite=null;
try{invite=JSON.parse(sessionStorage.getItem(JOIN_KEY))}catch(e){}
function readInvite(){
  const m=location.hash.match(/^#join=([A-Za-z0-9]+)\.([a-z0-9]+)$/);if(!m)return;
  invite={owner:m[1],code:m[2]};try{sessionStorage.setItem(JOIN_KEY,JSON.stringify(invite))}catch(e){}
  history.replaceState(null,"","#trip");show("trip");renderTrip();
}
function dropInvite(){invite=null;try{sessionStorage.removeItem(JOIN_KEY)}catch(e){}renderTrip()}
addEventListener("hashchange",readInvite);
function joinIfAsked(){if(invite&&auth)joinTrip()}
async function joinTrip(){
  const {owner,code}=invite;
  if(owner===me()){dropInvite();return toast(T("That's the invite link to your own trip."))}
  setSync("saving");
  try{
    // Your own trip is saved before switching, so nothing on this phone is lost.
    if(!sync.owner&&sync.dirty)await push();
    await fsCommit([{update:{name:`${FS_PATH}/trips/${owner}`,fields:{join:S(code),emails:{mapValue:{fields:{[me()]:S(auth.email)}}}}},
      updateMask:{fieldPaths:["join","emails."+KEYP(me())]},
      updateTransforms:[{fieldPath:"members",appendMissingElements:{values:[S(me())]}}],currentDocument:{exists:true}}]);
    await setActive(owner);
    sync={...SYNC0,owner};
    const rec=await serverTrip();applyServer(rec);setSync("saved");
    dropInvite();toast(T("You joined the trip 🎉 Changes you make show up for everyone."));
  }catch(e){
    if(e&&e.status===401)return loggedOut(true);
    dropInvite();setSync(sync.dirty?"offline":"saved");
    toast(e&&(e.status===403||e.status===404)?T("This invite link doesn't work anymore. Ask for a new one."):T("Couldn't join just now. Open the link again in a moment."));
  }
}
async function leaveTrip(){
  if(!confirm(T("Leave this shared trip? You'll go back to your own trip.")))return;
  try{
    await fsCommit([{update:{name:`${FS_PATH}/trips/${tripOwner()}`,fields:{}},updateMask:{fieldPaths:["emails."+KEYP(me())]},
      updateTransforms:[{fieldPath:"members",removeAllFromArray:{values:[S(me())]}}],currentDocument:{exists:true}}]);
  }catch(e){if(!(e&&(e.status===403||e.status===404)))return acctFail(e)}
  try{await setActive("");await openOwn();closeAcct();toast(T("You left the shared trip. This is your own trip again."))}catch(e){acctFail(e)}
}
// Owner: turn the invite link on (a new code) or off (no code, so the old
// link stops working; people already in stay in).
async function setCode(on){
  acct.busy=true;renderAcct();
  try{
    const code=on?Array.from(crypto.getRandomValues(new Uint8Array(12)),b=>(b%36).toString(36)).join(""):"";
    const d=await fsPatch("trips/"+me(),{data:S(tripJSON(trip)),email:S(auth.email),code:S(code),emails:{mapValue:{fields:{[me()]:S(auth.email)}}}},["data","email","code","emails."+KEYP(me())]);
    sync={...sync,at:d.updateTime,base:tripJSON(trip),dirty:false};setShare(readTrip(d));setSync("saved");
    acct.busy=false;renderAcct();
  }catch(e){acctFail(e)}
}
async function removeMember(uid){
  if(!confirm(T("Remove {e} from this trip?",{e:share.emails[uid]||T("this person")})))return;
  try{
    const left=share.members.filter(x=>x!==uid);
    const d=await fsPatch("trips/"+me(),{members:{arrayValue:{values:left.map(S)}}},["members","emails."+KEYP(uid)]);
    sync={...sync,at:d.updateTime};setShare(readTrip(d));renderAcct();
  }catch(e){acctFail(e)}
}
const inviteURL=()=>location.origin+location.pathname+"#join="+me()+"."+share.code;
async function sendInvite(){
  const url=inviteURL();
  try{if(navigator.share){await navigator.share({title:trip.name||T("My Japan trip"),text:T("Plan our Japan trip with me on Tabi Neko 🐾"),url});return}}catch(e){if(e&&e.name==="AbortError")return}
  try{await navigator.clipboard.writeText(url);toast(T("Invite link copied ✓"))}catch(e){prompt(T("Copy this link:"),url)}
}
// The "Plan together" sheet reads the latest members first.
async function openShare(){
  openAcct("share");
  try{const rec=await serverTrip();if(rec){setShare(rec);if(rec.at!==sync.at&&!sync.dirty)applyServer(rec)}}catch(e){}
  if(acct&&acct.step==="share")renderAcct();
}
// Only the bar and the open sheet change when the members do.
function renderShareBits(){if(acct&&acct.step==="share")renderAcct();const b=$("tripbook")&&$("tripbook").querySelector(".tacct-t");if(b)b.textContent=barText()}

// ---- the login sheet ----
let acct=null; // {step:"login"|"signup"|"choose"|"me"|"delete"|"share", email, msg, ok, busy, rec}
// why: "plan" when the planner sent you here, so the sheet says so.
function openAcct(step,why){
  acct={step:step||(auth?"me":"login"),email:"",msg:"",why};
  let el=$("acct");
  if(!el){el=document.createElement("div");el.id="acct";el.className="tpick acct";document.body.appendChild(el);
    el.addEventListener("click",e=>{if(e.target===el&&acct.step!=="choose")closeAcct()});
    el.addEventListener("keydown",e=>{if(e.key==="Escape"&&acct.step!=="choose")closeAcct()})}
  el.hidden=false;document.documentElement.classList.add("tpick-open");
  renderAcct();
}
function closeAcct(){const el=$("acct");if(el)el.hidden=true;document.documentElement.classList.remove("tpick-open");acct=null;renderTrip();
  // Logged in from the planner's button: carry on to the planner.
  if(planAfterLogin){planAfterLogin=false;if(auth)openPlanner()}
  if(typeof renderAdmin==="function"&&!$("admin").hidden)renderAdmin()}
const acctFail=e=>{if(e&&e.status===401)return loggedOut(true);if(acct){acct.busy=false;say(failMsg(e))}else toast(failMsg(e))};
function renderAcct(){
  const el=$("acct"),a=acct;if(!el||!a)return;
  const err=a.msg?`<p class="thome-msg${a.ok?" ok":""}" role="alert">${esc(a.msg)}</p>`:"";
  const pwBox=(ph,ac)=>`<input type="password" class="thome-q" id="acct-pw" placeholder="${esc(T(ph))}" aria-label="${esc(T("Password"))}" autocomplete="${ac}" required dir="ltr">`;
  let h="";
  if(a.step==="login"||a.step==="signup"){const up=a.step==="signup";
    h=`<h2 id="acct-h">${T(up?"Create your account":"Log in to Tabi Neko")}</h2>
    <p>${T(invite?"Log in, or create an account, to join the trip you were invited to.":a.why==="plan"?"Log in, or create a free account, and Apollo will plan your trip. Your plan is saved to your account too.":"Keep your trip safe and open it on any phone or laptop.")}</p>
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
  else if(a.step==="share"){
    const mine=tripOwner()===me(),people=[tripOwner(),...share.members.filter(x=>x!==tripOwner())];
    const who=uid=>`<li><span class="acct-av" aria-hidden="true">${esc((share.emails[uid]||"?")[0].toUpperCase())}</span><span dir="ltr">${esc(share.emails[uid]||T("someone"))}</span>
      ${uid===tripOwner()?`<small>${T("owner")}</small>`:uid===me()?`<small>${T("you")}</small>`:""}
      ${mine&&uid!==me()?`<button type="button" class="tdel acct-rm" data-u="${esc(uid)}" aria-label="${esc(T("Remove {e} from this trip",{e:share.emails[uid]||""}))}">×</button>`:""}</li>`;
    h=`<h2 id="acct-h">${T("Plan together")}</h2>`+(mine?
      `<p>${T("Send this link to family or friends. Once they log in, they can edit this trip with you, and changes show up for everyone within a few seconds.")}</p>`+
      (share.code?`<div class="acct-link"><input readonly value="${esc(inviteURL())}" aria-label="${esc(T("Invite link"))}" dir="ltr"><button type="button" class="store acct-send">${T("Send invite")} ↗</button></div>
        <p class="acct-small"><button type="button" class="tclear acct-off">${T("Turn off the link")}</button> · ${T("people already in stay in")}</p>`
      :`<form class="acct-f"><button type="submit" class="store acct-on"${a.busy?" disabled":""}>${a.busy?T("One moment…"):"👨‍👩‍👧 "+T("Create an invite link")}</button></form>`)
      :`<p>${T("You're planning this trip together with the people below. Your own trip is still saved in your account.")}</p>`)+
      (share.members.length?`<h3 class="acct-h3">${T("Planning this trip")}</h3><ul class="acct-people">${people.map(who).join("")}</ul>`:"")+
      err+(mine?"":`<p class="acct-small"><button type="button" class="tclear acct-leave">${T("Leave this trip")}</button></p>`);
  }
  else h=`<h2 id="acct-h">${T("Your account")}</h2>
    <p>${T("Logged in as {e}. Your trip is saved to your account.",{e:`<b dir="ltr">${esc(auth&&auth.email||"")}</b>`})}</p>
    <div class="acct-two">${typeof isAdmin==="function"&&isAdmin()?`<button type="button" class="store acct-admin">📊 ${T("Admin dashboard")}</button>`:""}<button type="button" class="store acct-out">${T("Log out")}</button></div>
    <p class="acct-small"><button type="button" class="tclear acct-del">${T("Delete my account and trip")}</button> · <a href="#privacy" class="acct-priv">${T("Privacy")}</a></p>`;
  el.innerHTML=`<div class="tpick-sheet acct-sheet" role="dialog" aria-modal="true" aria-labelledby="acct-h">
    ${a.step==="choose"?"":`<button type="button" class="tdel acct-x" aria-label="${esc(T("Close"))}">×</button>`}
    <img src="assets/cat.png" alt="" class="acct-cat">${h}</div>`;
  const q=s=>el.querySelector(s);
  if(q(".acct-x"))q(".acct-x").onclick=closeAcct;
  el.querySelectorAll(".acct-priv").forEach(l=>l.onclick=e=>{e.preventDefault();closeAcct();show("privacy");history.replaceState(null,"","#privacy")});
  if(a.step==="login"||a.step==="signup"){
    q(".acct-f").onsubmit=e=>{e.preventDefault();logIn(q("#acct-email").value,q("#acct-pw").value,a.step==="signup")};
    q(".acct-mode").onclick=()=>{acct={step:a.step==="signup"?"login":"signup",email:q("#acct-email").value,msg:"",why:a.why};renderAcct()};
    if(q(".acct-forgot"))q(".acct-forgot").onclick=()=>forgot(q("#acct-email").value);
    if(!a.busy)(a.email?q("#acct-pw"):q("#acct-email")).focus()}
  if(a.step==="choose")el.querySelectorAll("[data-keep]").forEach(b=>b.onclick=()=>{
    if(b.dataset.keep==="server")applyServer(a.rec);else{sync={...SYNC0,at:a.rec.at,dirty:true,base:tripJSON(cleanTrip(a.rec.data))};saveSync();push()}
    closeAcct();joinIfAsked()});
  if(a.step==="me"){q(".acct-out").onclick=()=>{loggedOut(false);closeAcct();toast(T("Logged out. Your trip stays on this phone."))};
    if(q(".acct-admin"))q(".acct-admin").onclick=()=>{closeAcct();show("admin");history.replaceState(null,"","#admin");renderAdmin()};
    q(".acct-del").onclick=()=>{acct={step:"delete",msg:""};renderAcct()}}
  if(a.step==="delete"){q(".acct-f").onsubmit=e=>{e.preventDefault();deleteAccount(q("#acct-pw").value)};
    q(".acct-back").onclick=()=>{acct={step:"me",msg:""};renderAcct()};if(!a.busy)q("#acct-pw").focus()}
  if(a.step==="share"){
    if(q(".acct-f"))q(".acct-f").onsubmit=e=>{e.preventDefault();setCode(true)};
    if(q(".acct-send"))q(".acct-send").onclick=sendInvite;
    if(q(".acct-link input"))q(".acct-link input").onfocus=e=>e.target.select();
    if(q(".acct-off"))q(".acct-off").onclick=()=>setCode(false);
    if(q(".acct-leave"))q(".acct-leave").onclick=leaveTrip;
    el.querySelectorAll(".acct-rm").forEach(b=>b.onclick=()=>removeMember(b.dataset.u));
  }
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
  auth=null;saveAuth();sync={...SYNC0};share={members:[],emails:{},code:""};saveSync();setSync("");
  if(expired)toast(T("You were logged out. Log in again to keep syncing."));
  renderTrip();
}
// Firebase only deletes an account right after a fresh login, so the
// password is asked again. You leave any shared trip and your own trip is
// deleted first, while we're still allowed.
async function deleteAccount(pw){
  if(!pw)return say(T("Type your password."));
  acct={...acct,busy:true,msg:""};renderAcct();
  try{
    const r=await ID("signInWithPassword",{email:auth.email,password:pw,returnSecureToken:true});
    auth=signedIn({...r,email:auth.email});
    if(tripOwner()!==me())try{await fsCommit([{update:{name:`${FS_PATH}/trips/${tripOwner()}`,fields:{}},updateMask:{fieldPaths:["emails."+KEYP(me())]},
      updateTransforms:[{fieldPath:"members",removeAllFromArray:{values:[S(me())]}}],currentDocument:{exists:true}}])}catch(e){}
    for(const p of ["trips/"+me(),"users/"+me()])try{await call(`${FS}/${p}`,{method:"DELETE",token:auth.token})}catch(e){if(!(e&&e.status===404))throw e}
    await ID("delete",{idToken:auth.token});
    loggedOut(false);closeAcct();toast(T("Your account is deleted."));
  }catch(e){say(WRONG.includes(e&&e.code)?T("That password isn't right."):failMsg(e))}
}

// ---- the bar at the top of My trip ----
function setSync(s){syncState=s;const el=$("tripbook")&&$("tripbook").querySelector(".tacct-s");if(el)el.textContent=syncText()}
const syncText=()=>({saving:T("Saving…"),saved:T("Saved ✓"),offline:T("Offline. It'll save when you're back online.")})[syncState]||"";
const barText=()=>isShared()?T("Planning together · {n} people",{n:1+share.members.filter(x=>x!==tripOwner()).length}):T("Saved to your account");
function acctBar(){
  if(!FB_ON)return "";
  let h="";
  if(invite)h+=`<div class="tinvite"><img src="assets/cat.png" alt=""><div><b>${T("You're invited to plan a trip together 🐾")}</b>
    <p>${T(auth?"Join to see the trip and edit it with them. Your own trip stays saved in your account.":"Log in or create an account to join. It's free.")}</p>
    <div class="tbtns"><button type="button" class="store tinv-go">${T(auth?"Join the trip":"Log in to join")}</button><button type="button" class="tclear tinv-no">${T("No thanks")}</button></div></div></div>`;
  if(!auth)return h+`<div class="tacct"><span>📱 ${T("Saved on this phone only.")}</span><button type="button" class="store tacct-in">☁️ ${T("Log in to keep it safe")}</button></div>`;
  return h+`<div class="tacct on"><span>${isShared()?"👨‍👩‍👧":"☁️"} <span class="tacct-t">${esc(barText())}</span> <small class="tacct-s" role="status">${esc(syncText())}</small></span>
    <span class="tacct-r"><button type="button" class="store tacct-pt">👨‍👩‍👧 ${T("Plan together")}</button><button type="button" class="tclear tacct-me" dir="ltr">${esc(auth.email)}</button></span></div>`;
}
function wireAcct(box){
  const q=s=>box.querySelector(s);
  if(q(".tacct-in"))q(".tacct-in").onclick=()=>openAcct("login");
  if(q(".tacct-me"))q(".tacct-me").onclick=()=>openAcct("me");
  if(q(".tacct-pt"))q(".tacct-pt").onclick=openShare;
  if(q(".tinv-go"))q(".tinv-go").onclick=()=>auth?joinTrip():openAcct("login");
  if(q(".tinv-no"))q(".tinv-no").onclick=dropInvite;
}

// The header button: "Log in", or once you are, a circle with your initial.
// It opens the same sheet as the bar on My trip, from any page.
const PERSON=`<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8.5" r="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M4.5 20.5c1.2-4 4.2-6 7.5-6s6.3 2 7.5 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
function userBtn(){
  const b=$("userb");if(!b)return;
  b.hidden=!FB_ON;if(!FB_ON)return;
  b.classList.toggle("on",!!auth);
  b.innerHTML=auth?`<span class="ini" aria-hidden="true">${esc((auth.email||"?")[0].toUpperCase())}</span>`:`${PERSON}<span class="lbl">${T("Log in")}</span>`;
  b.setAttribute("aria-label",auth?T("Your account ({e})",{e:auth.email}):T("Log in"));
  b.title=auth?auth.email:"";
  b.onclick=()=>openAcct(auth?"me":"login");
}

// Start: a saved login from the old setup (or a broken one) is dropped;
// otherwise check for changes made elsewhere, and pick up an invite link.
if(auth&&!auth.refresh){auth=null;saveAuth()}
if(sync.share)share=sync.share;
userBtn();readInvite();renderTrip();
if(FB_ON&&auth)pull();
