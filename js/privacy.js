// The privacy page, short first: four promises, what stays on your phone and
// what's saved in your account side by side, then a question to tap open for
// each detail, and "Delete my account" at the bottom. In the app it opens
// from More as its own page; on the website it fills #privacy (the address
// the store listings link to).
//
// Keep it true: if what the app keeps changes, change it here too.
(function(){
const QS=[
  ["👀","Who can see my trip?","Only you. The owner of Tabi Neko sees totals (like how many trips include Senso-ji) and a list of accounts with their email, cities and when they last saved, never your trip itself or where you're staying. If someone shared a trip with you before, the people in it can see and edit it and see each other's email."],
  ["📍","Location and camera","Your location is only used on your phone: to measure how far places are and to check you're really at a place for its stamp. Halal Lens reads the photo on your phone and never uploads it. Both ask your permission first, and you can say no."],
  ["🐱","Ask Apollo","Questions you ask Apollo are sent to Anthropic's Claude to write the answer, under Anthropic's own privacy policy. They aren't linked to your account, and we don't keep them. Only if you tap Report on an answer do we save that one question and answer, without your account, so we can fix it."],
  ["📊","What we count","One number per day for app opens and one for website visits. Nothing about you goes with it: no cookies, no IP address, no device details."],
  ["🗺️","Maps and hotel search","The map pictures come from OpenFreeMap. When you search for where you're staying, what you type goes to OpenStreetMap's free search to find it."],
  ["🔐","Where it's stored","Your account, trips and stamps are stored with Google Firebase, which runs the server for us. If you log in with Google, Google only tells us your name and email; we don't keep your Google photo. We don't sell any of it, share it or use it for ads."]
];
const PHONE=[["📍","Your location (Near me, stamps, prayer times)"],["📸","Halal Lens photos, read on the phone"],["🔔","Your reminders"],["🌐","Your language"]];
const ACCT=[["✉️","Email (password scrambled)"],["🐱","Your name and buddy"],["🗓️","Your trips"],["🐾","Your stamps"]];
let openQ=0;
function html(){
  const logged=typeof auth!=="undefined"&&!!auth;
  return `<div class="pr-hero"><small>${T("THE SHORT VERSION")}</small><b>${T("Your trip is yours. That's it.")}</b>
      <div class="pr-prom"><span>🚫 ${T("no ads")}</span><span>💸 ${T("never sold")}</span><span>🍪 ${T("no tracking")}</span><span>🗑️ ${T("delete anytime")}</span></div><img src="${typeof GI==="function"?GI():"assets/cat.png"}" alt=""></div>
    <div class="pr-two"><div class="pr-box ph"><h3>📱 ${T("Stays on your phone")}</h3><ul>${PHONE.map(([i,t])=>`<li><i>${i}</i>${T(t)}</li>`).join("")}</ul></div>
      <div class="pr-box ac"><h3>☁️ ${T("In your account")}</h3><ul>${ACCT.map(([i,t])=>`<li><i>${i}</i>${T(t)}</li>`).join("")}</ul></div></div>
    <p class="pr-opt">${T("Exploring needs no account. You only need one to plan trips and collect stamps.")}</p>
    <div class="pr-acc">${QS.map(([i,q,a],k)=>`<div class="pr-q${k===openQ?" open":""}"><button type="button" data-k="${k}" aria-expanded="${k===openQ}"><span>${i}</span><b>${T(q)}</b><i aria-hidden="true">⌄</i></button><div class="pr-a"><p>${T(a)}</p></div></div>`).join("")}</div>
    <div class="pr-delbox" id="pr-delete"><h3>🗑️ ${T("Delete your Tabi Neko account")}</h3>
      <p>${T("In the app: More → Privacy → Delete my account. On the website: log in, then tap the button below.")}</p>
      <p>${T("Your account, email, name, trips and stamps are deleted straight away and can't be brought back. Nothing is kept afterwards: Ask Apollo questions are never saved, and the daily counts were never linked to you.")}</p>
    ${logged?`<button type="button" class="pr-del">🗑️<span><b>${T("Delete my account")}</b><small>${T("Your account, trips and stamps, gone straight away")}</small></span></button>`
      :`<button type="button" class="pr-del pr-login">🔑<span><b>${T("Log in to delete your account")}</b><small>${T("You're not logged in, so nothing is saved in an account.")}</small></span></button>`}</div>`;
}
function wire(box){
  box.querySelectorAll(".pr-q button").forEach(b=>b.onclick=()=>{const k=+b.dataset.k;openQ=openQ===k?-1:k;
    box.querySelectorAll(".pr-q").forEach((q,i)=>{q.classList.toggle("open",i===openQ);q.querySelector("button").setAttribute("aria-expanded",i===openQ)})});
  const d=box.querySelector(".pr-del");if(d)d.onclick=()=>{if(typeof openAcct==="function")openAcct(d.classList.contains("pr-login")?"login":"delete")};
}
// ---- the website: fill #privacy ----
function web(){const sec=document.getElementById("privacy");if(!sec)return;
  let box=sec.querySelector(".pr-page");if(!box){sec.innerHTML=`<div class="pr-page"></div>`;box=sec.querySelector(".pr-page")}
  box.innerHTML=`<h1 class="pr-h">${T("Privacy")}</h1>`+html();wire(box);
  // tabi-neko.vercel.app/delete-account (for the store listings) lands here
  // with ?delete: go straight to the delete section.
  if(/[?&]delete\b/.test(location.search)&&!web.went){web.went=1;setTimeout(()=>{const d=document.getElementById("pr-delete");if(d){d.scrollIntoView({block:"center"});d.classList.add("pr-hi")}},300)}}
if(typeof IS_APP==="undefined"||!IS_APP){web();
  if(typeof setLang==="function"){const _s=setLang;setLang=function(l){_s(l);setTimeout(web,l==="ar"&&typeof AR_ON==="function"&&!AR_ON()?400:30)}}
  if(typeof userBtn==="function"){const _u=userBtn;userBtn=function(){_u();web()}}
  return}
// ---- the app: its own page, opened from More ----
const el=document.createElement("div");el.id="prview";el.hidden=true;el.setAttribute("role","dialog");el.setAttribute("aria-modal","true");document.body.appendChild(el);
function draw(){if(el.hidden)return;el.innerHTML=`<div class="pr-top"><button type="button" class="pr-x" aria-label="${esc(T("Back"))}">‹</button><b>${T("Privacy")}</b></div><div class="pr-page">${html()}</div>`;
  el.querySelector(".pr-x").onclick=close;wire(el)}
function open(fromHistory){el.hidden=false;document.documentElement.classList.add("pr-open");if(!fromHistory){openQ=0;history.pushState({tnPriv:1},"")}draw();el.scrollTop=0}
function closeNow(){el.hidden=true;document.documentElement.classList.remove("pr-open")}
function close(){if(history.state&&history.state.tnPriv)history.back();else closeNow()}
addEventListener("popstate",e=>{const st=e.state||{};if(st.tnPriv){if(el.hidden)open(true)}else if(!el.hidden)closeNow()});
window.tnOpenPrivacy=()=>open();
if(typeof userBtn==="function"){const _u=userBtn;userBtn=function(){_u();draw()}}
})();
