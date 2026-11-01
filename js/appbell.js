// The shrine bell (the app only): how we ask to send notifications. Pull the
// red and white rope down, the bell swings with a soft "ding", and only then
// does Android ask its own question. Asking nicely first matters: Android
// lets an app show its question only a couple of times.
//
// Shown right after sign-up (once you've picked your buddy), from the
// Reminders page while they're off, and at most once more by itself, when
// your trip has dates but notifications aren't on yet.
(function(){
if(typeof IS_APP==="undefined"||!IS_APP)return;
const LN=()=>window.Capacitor&&Capacitor.Plugins&&Capacitor.Plugins.LocalNotifications;
const KEY="tabineko-bell";
let st={n:0,at:0};try{st={...st,...JSON.parse(store.get(KEY)||"{}")}}catch(e){}
const saveSt=()=>{try{store.set(KEY,JSON.stringify(st))}catch(e){}};
async function perm(){const L=LN();if(!L)return "prompt";try{return (await L.checkPermissions()).display}catch(e){return "prompt"}}

const el=document.createElement("div");el.id="bell";el.hidden=true;el.setAttribute("role","dialog");el.setAttribute("aria-modal","true");document.body.appendChild(el);
let phase="ask",after=null;
function draw(){
  if(el.hidden)return;
  if(phase==="done"||phase==="off"){
    const on=phase==="done";
    el.innerHTML=`<div class="bl-done"><img src="${GI()}" alt=""><b>${on?T("You're all set 🐾"):T("No problem 🐾")}</b>
      <p>${on?T("Plan your days in My trip and Apollo will remind you. Add your travel date so he knows when."):T("You can turn reminders on anytime in More → Reminders.")}</p>
      ${on?`<button type="button" class="bl-btn bl-plan">${T("Plan my trip")}</button>`:""}<button type="button" class="bl-ghost bl-close">${on?T("Explore first"):T("OK")}</button></div>`;
    el.querySelector(".bl-close").onclick=close;
    const p=el.querySelector(".bl-plan");if(p)p.onclick=()=>{close();const tb=document.querySelector('#tabbar [data-t="trip"]');if(tb)tb.click()};
    return;
  }
  el.innerHTML=`<div class="bl-roof"></div><div class="bl-beam"></div><i class="bl-ring r1"></i><i class="bl-ring r2"></i>
    <div class="bl-suzu"><div class="bl-cord"></div><div class="bl-bell"></div><div class="bl-rope" role="button" tabindex="0" aria-label="${esc(T("Pull the rope to turn on reminders"))}"><i></i></div></div>
    <div class="bl-pull" aria-hidden="true">${T("pull the rope")}<i>👇</i></div>
    <div class="bl-fly" aria-hidden="true"></div>
    <div class="bl-txt"><h2>${T("Ring the bell, and Apollo will remind you")}</h2><p>${T("Like at a shrine: one pull, and your trip is watched over.")}</p>
      <div class="bl-chips"><span>☀️ ${T("Morning plan")}</span><span>⏰ ${T("Before each stop")}</span><span>✈️ ${T("Flight")}</span><span>🏨 ${T("Check-in")}</span></div>
      <button type="button" class="bl-ghost bl-later">${T("Not now")}</button>
      <small>${T("Only about your own trip. No ads, ever.")}</small></div>`;
  el.querySelector(".bl-later").onclick=()=>{phase="off";draw()};
  wireRope();
}
// Drag the rope down past the line (or tap it, or press Enter) to ring.
function wireRope(){
  const r=el.querySelector(".bl-rope"),s=el.querySelector(".bl-suzu");let y0=null,dy=0,base=0;
  // The rope stretches down from the bell as you pull, and springs back.
  const set=v=>{r.style.height=v?(base+v)+"px":""};
  r.onpointerdown=e=>{y0=e.clientY;dy=0;base=r.offsetHeight;r.setPointerCapture(e.pointerId);r.classList.add("drag")};
  r.onpointermove=e=>{if(y0===null)return;dy=Math.max(0,Math.min(110,e.clientY-y0));set(dy)};
  const up=()=>{if(y0===null)return;y0=null;r.classList.remove("drag");set(0);if(dy>55||dy<4)ring(s)};
  r.onpointerup=up;r.onpointercancel=()=>{y0=null;set(0)};
  r.onkeydown=e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();ring(s)}};
}
let ringing=false;
async function ring(s){
  if(ringing)return;ringing=true;
  s.classList.remove("swing");void s.offsetWidth;s.classList.add("swing");ding();
  const pl=el.querySelector(".bl-pull");if(pl)pl.style.opacity=0;
  try{navigator.vibrate&&navigator.vibrate([30,60,30])}catch(e){}
  // A few reminders flutter out of the bell.
  const fly=el.querySelector(".bl-fly");
  fly.innerHTML=[T("☀️ Morning plan"),T("⏰ Senso-ji at 9:00"),T("🐾 Stamp waiting")].map((t,i)=>`<span style="--i:${i}">${esc(t)}</span>`).join("");
  await new Promise(r=>setTimeout(r,1300));
  let ok=false;const L=LN();
  try{if(L){const p=await L.requestPermissions();ok=p.display==="granted"}else ok=true}catch(e){}
  st.n++;st.at=Date.now();saveSt();ringing=false;
  phase=ok?"done":"off";draw();
  if(ok&&window.tnRemindNow)tnRemindNow();
}
// A temple bell from two soft tones that fade, made on the phone.
function ding(){try{
  const A=window.AudioContext||window.webkitAudioContext;if(!A)return;const a=new A(),t=a.currentTime;
  [[880,.22],[1320,.09],[660,.12]].forEach(([f,v])=>{const o=a.createOscillator(),g=a.createGain();o.type="sine";o.frequency.value=f;
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+.01);g.gain.exponentialRampToValueAtTime(.0001,t+1.8);o.connect(g).connect(a.destination);o.start(t);o.stop(t+1.9)});
  setTimeout(()=>a.close(),2200)}catch(e){}}

function open(){el.hidden=false;phase="ask";document.documentElement.classList.add("bl-open");draw()}
function close(){el.hidden=true;document.documentElement.classList.remove("bl-open");if(after){const f=after;after=null;f()}}
// why: "signup" right after sign-up, "settings" from the Reminders page,
// "trip" once by itself. Never if notifications are already on or blocked.
window.tnBellAsk=async(why,then)=>{
  const p=await perm();if(p==="granted"||p==="denied"){if(why==="settings")toast(p==="denied"?T("Notifications are off for Tabi Neko. Turn them on in your phone's settings."):T("Reminders are on ✓"));return}
  if(why==="trip"&&(st.n>=1||Date.now()-st.at<3*864e5))return;
  after=then||null;open();
};
window.tnBellBack=()=>{if(el.hidden)return false;close();return true};
// Once by itself: the trip has days with dates and notifications aren't on.
setTimeout(()=>{if(window.tnTripPlan&&tnTripPlan().length&&!document.querySelector("#onb:not([hidden])"))tnBellAsk("trip")},6000);
})();
