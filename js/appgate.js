// Planning needs an account (the app only). Adding a place to your trip, from
// any of its buttons, and the My trip tab itself ask you to log in first, so
// every trip is saved to an account and safe on any phone. If you tapped
// "add" before logging in, that place is added as soon as you're in.
// A trip someone shared with you can still be looked at without logging in.
(function(){
if(typeof IS_APP==="undefined"||!IS_APP||typeof FB_ON==="undefined"||!FB_ON)return;
const logged=()=>typeof auth!=="undefined"&&!!auth;
window.tnLogged=logged;
// Every button that adds a place to the trip, wherever it is.
const ADD=".addtrip,.mp-add,.hx-madd,.lr-add,.ar-add,.tsave";
let pending=null;
function ask(){if(typeof openAcct==="function")openAcct("login","trip")}
// Runs before the buttons' own handlers (capture, on window) and stops them.
addEventListener("click",e=>{
  if(logged())return;const b=e.target.closest&&e.target.closest(ADD);if(!b)return;
  e.stopPropagation();e.preventDefault();
  pending=b.dataset.k&&!b.classList.contains("on")&&!(typeof inTrip==="function"&&inTrip(b.dataset.k))?b.dataset.k:null;
  ask();
},true);
// My trip: a friendly invitation instead of the planner.
function gateHTML(){
  return `<div class="gt-box"><div class="gt-art"><img src="${GI()}" alt=""><span class="gt-pin">🗺️</span></div>
    <h2>${T("Plan your trip with Apollo")}</h2>
    <p>${T("Log in, or create a free account, to plan your days and add places to your trip. It's saved to your account, so it's safe on any phone.")}</p>
    <ul class="gt-list"><li>📅 ${T("Your days, hotels and bookings in one place")}</li><li>🐾 ${T("Apollo fills empty days with places from the notebook")}</li><li>📘 ${T("A trip PDF with every day and its map links")}</li></ul>
    <button type="button" class="gt-in">${T("Log in")}</button><button type="button" class="gt-up">${T("Create a free account")}</button></div>`;
}
if(typeof renderTrip==="function"){const _r=renderTrip;renderTrip=function(){
  const box=$("tripbook");
  if(!logged()&&box&&!(typeof shared!=="undefined"&&shared)){
    box.classList.remove("tv-on","at-onday");box.innerHTML=gateHTML();
    box.querySelector(".gt-in").onclick=()=>openAcct("login","trip");
    box.querySelector(".gt-up").onclick=()=>openAcct("signup","trip");
    return}
  return _r.apply(this,arguments)}}
// Logging in or out redraws My trip, and adds the place you tapped before.
if(typeof userBtn==="function"){const _u=userBtn;userBtn=function(){_u();
  if(logged()&&pending&&typeof inTrip==="function"&&!inTrip(pending)&&typeof BYKEY!=="undefined"&&BYKEY.has(pending)){
    trip.ideas.push(pending);saveTrip();toast(T("Added to your trip ✓"));
    document.querySelectorAll(`[data-k="${CSS.escape(pending)}"]`).forEach(x=>{if(x.classList.contains("addtrip"))x.outerHTML=tripBtn(BYKEY.get(pending));else{x.classList.add("on");if(x.textContent.trim()==="＋")x.textContent="✓"}})}
  if(logged())pending=null;
  try{if($("trip")&&!$("trip").hidden)renderTrip()}catch(e){}}}
try{if($("trip")&&!$("trip").hidden)renderTrip()}catch(e){}
})();
