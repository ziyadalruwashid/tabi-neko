// Your profile (the app only): a page opened from the card at the top of
// More, with your travel buddy, name and email, a few numbers, and the
// things you can change: name, buddy, email, password, language. Log out
// and delete your account are here too.
//
// Everything goes through Firebase Authentication (js/account.js helpers):
// - the name and the buddy are the account's display name and picture;
// - a new email is only switched after you tap the link Firebase sends to
//   it (you're logged out then, and log in with the new email);
// - changing the password, or the email, asks for the current password.
(function(){
if(typeof IS_APP==="undefined"||!IS_APP||!FB_ON)return;

const pf=document.createElement("div");pf.id="pfview";pf.hidden=true;pf.setAttribute("role","dialog");pf.setAttribute("aria-modal","true");document.body.appendChild(pf);
let sheet=null; // {k:"name"|"buddy"|"email"|"password", msg, ok, busy, val}
const BACK=()=>`<svg viewBox="0 0 24 24" width="25" height="25" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${document.documentElement.dir==="rtl"?"M9 18l6-6-6-6":"M15 18l-6-6 6-6"}"/></svg>`;
const num=v=>isAR()?iso(String(v)):String(v);
const since=ms=>{if(!ms)return "";const d=Math.floor((Date.now()-ms)/864e5);return d<1?T("changed today"):d<2?T("changed yesterday"):d<60?T("changed {n} days ago",{n:num(d)}):T("changed {d}",{d:new Date(ms).toLocaleDateString(isAR()?"ar":"en-GB",{month:"short",year:"numeric"})})};

// Your trips, stamps and saved places, from this phone.
function counts(){
  let ts=[];try{const a=JSON.parse(store.get("tabineko-trips")||"[]");if(Array.isArray(a))ts=a.map(cleanTrip).filter(t=>t.stays.length||t.ideas.length)}catch(e){}
  if(!ts.length&&(trip.stays.length||trip.ideas.length))ts=[trip];
  const places=new Set();ts.forEach(t=>allIds(t).forEach(k=>places.add(k)));
  return {trips:ts.length,places:places.size,stamps:typeof window.tnStampCount==="function"?tnStampCount():0};
}

function draw(){
  if(pf.hidden)return;
  if(!auth){close(true);return}
  const b=buddyOf(auth),c=counts();
  const row=(k,ic,l,v,cls="")=>`<button type="button" class="pf-row ${cls}" data-k="${k}"><span class="pf-ic" aria-hidden="true">${ic}</span><b>${l}</b>${v?`<small${k==="email"?' dir="ltr"':""}>${esc(v)}</small>`:""}<i aria-hidden="true">›</i></button>`;
  pf.innerHTML=`<div class="pf-scroll"><div class="apbar"><button type="button" class="pv-cb pf-back" aria-label="${esc(T("Back"))}">${BACK()}</button><b>${T("Profile")}</b></div>
    <div class="pf-card"><button type="button" class="pf-av" data-k="buddy" aria-label="${esc(T("Change your travel buddy"))}">${b?`<img src="${esc(b.img)}" alt="">`:""}<i aria-hidden="true">✎</i></button>
      <b>${esc(myName())}</b><small dir="ltr">${esc(auth.email||"")}</small>
      ${auth.verified?`<span class="pf-ok">✓ ${T("confirmed")}</span>`:`<button type="button" class="pf-verify">${T("Confirm your email")}</button>`}
      <div class="pf-stats"><div><b>${num(c.trips)}</b><span>${T("trips")}</span></div><div><b>${num(c.stamps)}</b><span>${T("stamps")}</span></div><div><b>${num(c.places)}</b><span>${T("places saved")}</span></div></div></div>
    <h2 class="pf-h">${T("Account")}</h2>
    <div class="pf-list">${row("name","🙂",T("Name"),auth.name||"")}${row("buddy","🐾",T("Travel buddy"),b?b.n:"")}${row("email","✉️",T("Email"),auth.email)}${row("password","🔑",T("Password"),since(auth.pwAt))}</div>
    <h2 class="pf-h">${T("App")}</h2>
    <div class="pf-list">${row("lang","🌐",T("Language"),isAR()?"العربية":"English")}${row("privacy","🔒",T("Privacy"),"")}</div>
    <div class="pf-list pf-end"><button type="button" class="pf-row pf-out" data-k="out"><b>${T("Log out")}</b></button><button type="button" class="pf-row pf-del" data-k="delete"><b>${T("Delete my account")}</b></button></div>
    </div>${sheet?sheetHTML():""}`;
  wire();
}
function sheetHTML(){
  const s=sheet,err=s.msg?`<p class="thome-msg${s.ok?" ok":""}" role="alert">${esc(s.msg)}</p>`:"",go=l=>`<button type="submit" class="store"${s.busy?" disabled":""}>${s.busy?T("One moment…"):l}</button>`;
  let h="";
  if(s.k==="name")h=`<h3>${T("Your name")}</h3><p>${T("It's how Apollo greets you.")}</p><form class="acct-f" novalidate><input type="text" class="thome-q" id="pf-name" value="${esc(auth.name||"")}" maxlength="40" autocomplete="given-name" aria-label="${esc(T("Your name"))}">${go(T("Save"))}</form>`;
  else if(s.k==="buddy"){const cur=s.val||(buddyOf(auth)||{}).k;
    h=`<h3>${T("Travel buddy")}</h3><p>${T("Pick your travel buddy. It's your picture in the app.")}</p>
    <div class="acct-buddies" role="radiogroup">${BUDDIES.map(b=>`<button type="button" role="radio" class="acct-bud${b.k===cur?" on":""}" data-b="${b.k}" aria-checked="${b.k===cur}"><img src="${esc(b.img)}" alt=""><small>${esc(b.n)}</small></button>`).join("")}</div>
    <form class="acct-f">${go(T("Save"))}</form>`}
  else if(s.k==="email")h=`<h3>${T("Change email")}</h3><p>${T("We'll send a link to the new email. It switches when you tap it, then you log in with the new one.")}</p>
    <form class="acct-f" novalidate><input type="email" class="thome-q" id="pf-email" placeholder="${esc(T("New email"))}" aria-label="${esc(T("New email"))}" autocomplete="email" dir="ltr">
    ${pwField("pf-cur","Current password","current-password")}${go(T("Send the link"))}</form>`;
  else if(s.k==="password")h=`<h3>${T("Change password")}</h3><p>${T("Type your current password, then the new one.")}</p>
    <form class="acct-f" novalidate>${pwField("pf-cur","Current password","current-password")}${pwField("pf-new","New password (8 or more characters)","new-password",true)}${go(T("Save new password"))}</form>`;
  return `<div class="pf-dim"></div><div class="pf-sheet" role="dialog" aria-modal="true"><span class="pf-grab" aria-hidden="true"></span><button type="button" class="tdel pf-x" aria-label="${esc(T("Close"))}">×</button>${h}${err}</div>`;
}
const q=s=>pf.querySelector(s);
function wire(){
  q(".pf-back").onclick=()=>close();
  if(q(".pf-verify"))q(".pf-verify").onclick=async()=>{try{await ID("sendOobCode",{requestType:"VERIFY_EMAIL",idToken:await token()});toast(T("We sent a link to {e}. Tap it to confirm your email.",{e:auth.email}))}catch(e){toast(failMsg(e))}};
  pf.querySelectorAll("[data-k]").forEach(b=>b.onclick=()=>{const k=b.dataset.k;
    if(["name","buddy","email","password"].includes(k)){sheet={k,msg:""};draw();const f=q(".pf-sheet input");if(f)f.focus();return}
    if(k==="lang"){setLang(isAR()?"en":"ar");draw();return}
    if(k==="privacy"){close(true);location.hash="#privacy";return}
    if(k==="out"){loggedOut(false);close(true);toast(T("Logged out. Your trip stays on this phone."));return}
    if(k==="delete")openAcct("delete")});
  if(!sheet)return;
  q(".pf-x").onclick=closeSheet;q(".pf-dim").onclick=closeSheet;
  wirePw(q(".pf-sheet"));
  pf.querySelectorAll(".acct-bud").forEach(b=>b.onclick=()=>{sheet.val=b.dataset.b;draw()});
  q(".pf-sheet form").onsubmit=e=>{e.preventDefault();save()};
}
// Messages and the busy button change in place, so what you typed stays.
function say(m,ok){sheet.msg=m;sheet.ok=!!ok;busy(false);const sh=q(".pf-sheet");if(!sh)return draw();
  let p=sh.querySelector(".thome-msg");if(!p){p=document.createElement("p");p.setAttribute("role","alert");sh.appendChild(p)}
  p.className="thome-msg"+(ok?" ok":"");p.textContent=m}
function busy(on){sheet.busy=on;const b=q(".pf-sheet button[type=submit]");if(b){b.disabled=on;if(on){b.dataset.l=b.textContent;b.textContent=T("One moment…")}else if(b.dataset.l)b.textContent=b.dataset.l}}
async function reauth(pw){const r=await ID("signInWithPassword",{email:auth.email,password:pw,returnSecureToken:true});auth={...auth,...signedIn({...r,email:auth.email})};saveAuth();return r.idToken}
async function save(){
  const s=sheet,v=id=>(q(id)&&q(id).value||"");
  try{
    if(s.k==="name"){const n=v("#pf-name").trim().slice(0,40);if(!n)return say(T("Type your name."));
      busy(true);await updateProfile({displayName:n});closeSheet();toast(T("Saved ✓"))}
    else if(s.k==="buddy"){const b=BUDDIES.find(x=>x.k===s.val);if(!b||b===buddyOf(auth))return closeSheet();
      busy(true);await updateProfile({photoUrl:BUDDY_BASE+b.img});closeSheet();toast(T("Saved ✓"))}
    else if(s.k==="email"){const em=v("#pf-email").trim().toLowerCase(),pw=v("#pf-cur");
      if(!okEmail(em))return say(T("That email doesn't look right."));if(em===auth.email)return say(T("That's already your email."));if(!pw)return say(T("Type your password."));
      busy(true);const tok=await reauth(pw);
      await ID("sendOobCode",{requestType:"VERIFY_AND_CHANGE_EMAIL",idToken:tok,newEmail:em});
      say(T("We sent a link to {e}. Tap it to switch your email. Until then, keep using {o}.",{e:em,o:auth.email}),true)}
    else if(s.k==="password"){const cur=v("#pf-cur"),nw=v("#pf-new");
      if(!cur)return say(T("Type your password."));if(nw.length<8)return say(T("Your password needs at least 8 characters."));if(nw===cur)return say(T("Pick a password you haven't used here."));
      busy(true);const tok=await reauth(cur);
      const r=await ID("update",{idToken:tok,password:nw,returnSecureToken:true});
      auth={...auth,...signedIn({...r,email:auth.email})};saveAuth();await lookup();closeSheet();toast(T("Password changed ✓"))}
  }catch(e){const c=e&&e.code;
    say(WRONG.includes(c)&&c!=="INVALID_EMAIL"?T("That password isn't right."):c==="EMAIL_EXISTS"?T("There's already an account with that email."):c==="INVALID_EMAIL"?T("That email doesn't look right."):c==="WEAK_PASSWORD"?T("Your password needs at least 8 characters."):failMsg(e))}
}
function closeSheet(){sheet=null;draw()}

function open(fromHistory){pf.hidden=false;sheet=null;document.documentElement.classList.add("pf-open");draw();q(".pf-scroll").scrollTop=0;
  if(!fromHistory)history.pushState({tnProf:1},"");lookup().then(draw)}
function closeNow(){pf.hidden=true;sheet=null;document.documentElement.classList.remove("pf-open")}
// now: leave the page for somewhere else (no step back in history).
function close(now){const here=history.state&&history.state.tnProf;
  if(now){closeNow();if(here)history.replaceState(null,"")}else if(here)history.back();else closeNow()}
addEventListener("popstate",e=>{const st=e.state||{};if(st.tnProf)open(true);else if(!pf.hidden)closeNow()});
window.tnOpenProfile=()=>open();
// The phone's back button: a sheet first.
window.tnProfBack=()=>{if(sheet){closeSheet();return true}return false};
// Logging in, out or changing anything redraws the page.
// (Not while a sheet is open: that would wipe what you typed.)
if(typeof userBtn==="function"){const _u=userBtn;userBtn=function(){_u();if(!auth||!sheet)draw()}}
})();
