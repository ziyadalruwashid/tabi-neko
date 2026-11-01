// Apps to download, as Apollo's phone (the app only): the page looks like a
// phone home screen with the apps in folders, one folder per group in
// data/apps.js, and Apollo's four favourites on the dock. Tap a folder and it
// opens big; tap an app and a card slides up with what it does, the tip and
// one store button: Google Play on Android, the App Store on an iPhone.
(function(){
if(typeof IS_APP==="undefined"||!IS_APP)return;
const el=document.createElement("div");el.id="aphome";el.hidden=true;el.setAttribute("role","dialog");el.setAttribute("aria-modal","true");document.body.appendChild(el);
const EMO={move:"🚆",pay:"💳",book:"🎟️",food:"🍜",halal:"🥩",net:"📶"};
const DOCK=["Google Maps","Halal Gourmet Japan","GO","Google Translate"];
const IOS=()=>{try{return Capacitor.getPlatform()==="ios"}catch(e){return false}};
let fold=null,app=null;
const grp=k=>AGROUPS.find(g=>g.k===k)||{};
// An app with no icon gets a coloured tile with its emoji (`e` in
// data/apps.js), or its group's.
const icon=a=>a.icon?`<img class="ah-ico" src="${esc(a.icon)}" alt="" loading="lazy">`:`<span class="ah-ico ah-ltr" style="--c:var(${grp(a.g).c||"--lantern"})" aria-hidden="true">${a.e||EMO[a.g]||"📱"}</span>`;
const nm=a=>a.n.replace(/^Japan Travel by /,"");
function store(a){
  const ios=IOS(),url=ios?a.ios:a.android;
  if(url)return `<a class="ah-get" href="${esc(url)}" target="_blank" rel="noopener">${ios?"":"▶ "}${T(ios?"Get it on the App Store":"Get it on Google Play")}</a>`;
  if(!a.ios&&!a.android)return `<p class="ah-none">${T("Pick any one you like from the store.")}</p>`;
  return `<p class="ah-none">${T(ios?"Not on iPhone":"Not on Android")}</p>`;
}
function draw(){
  if(el.hidden)return;
  const idx=n=>APPS.findIndex(a=>a.n===n);
  el.innerHTML=`<div class="ah-bg"></div>
  <div class="ah-top"><button type="button" class="ah-x" aria-label="${esc(T("Back"))}">‹</button><b>${T("Apollo's phone")}</b></div>
  <div class="ah-wid"><img src="${GI()}" alt=""><div><b>${T("My Japan home screen")}</b><p>${T("Every app I keep on my phone in Japan, in folders. Tap one and I'll tell you why.")}</p></div></div>
  <div class="ah-folders">${AGROUPS.map(G=>{const list=APPS.filter(a=>a.g===G.k);if(!list.length)return "";
    return `<button type="button" class="ah-fold" data-g="${G.k}"><span class="ah-g">${list.slice(0,4).map(icon).join("")}${"<i></i>".repeat(Math.max(0,4-list.length))}</span><b>${EMO[G.k]||""} ${esc(D(G,"t"))}</b><small>${NP(list.length,"app")}</small></button>`}).join("")}</div>
  <div class="ah-dock"><span class="ah-dl">${T("always on my dock")}</span>${DOCK.map(idx).filter(i=>i>=0).map(i=>`<button type="button" class="ah-app" data-i="${i}" aria-label="${esc(APPS[i].n)}">${icon(APPS[i])}</button>`).join("")}</div>
  ${fold?openFold():""}${app!==null?openApp():""}`;
  el.querySelector(".ah-x").onclick=close;
  el.querySelectorAll(".ah-fold").forEach(b=>b.onclick=()=>{fold=b.dataset.g;draw()});
  el.querySelectorAll(".ah-app").forEach(b=>b.onclick=e=>{e.stopPropagation();app=+b.dataset.i;draw()});
  const sc=el.querySelector(".ah-scrim");if(sc)sc.onclick=e=>{if(e.target===sc){fold=null;draw()}};
  const ss=el.querySelector(".ah-sscrim");if(ss)ss.onclick=e=>{if(e.target===ss){app=null;draw()}};
}
function openFold(){
  const G=grp(fold),list=APPS.map((a,i)=>[a,i]).filter(([a])=>a.g===fold);
  return `<div class="ah-scrim${app===null?"":" dim"}"><div class="ah-open" role="group" aria-label="${esc(D(G,"t"))}"><h2>${EMO[fold]||""} ${esc(D(G,"t"))}</h2><p>${esc(D(G,"why"))}</p>
    <div class="ah-grid">${list.map(([a,i])=>`<button type="button" class="ah-app" data-i="${i}">${icon(a)}<span class="ah-nm">${esc(nm(a))}</span></button>`).join("")}</div></div></div>`;
}
function openApp(){
  const a=APPS[app],G=grp(a.g);
  return `<div class="ah-sscrim"><div class="ah-sheet" style="--c:var(${G.c||"--lantern"})"><span class="ah-grab"></span>
    <div class="ah-h">${icon(a)}<div><b>${esc(a.n)}</b><small>${esc(D(G,"t"))} · ${esc(D(a,"tag"))}</small></div></div>
    <p>${esc(D(a,"what"))}</p>
    ${a.tip?`<div class="ah-tip"><img src="${GI()}" alt=""><span>${esc(D(a,"tip"))}</span></div>`:""}
    ${store(a)}</div></div>`;
}
function open(fromHistory){el.hidden=false;document.documentElement.classList.add("aph-open");fold=null;app=null;if(!fromHistory)history.pushState({tnApps:1},"");draw();el.scrollTop=0}
function closeNow(){el.hidden=true;document.documentElement.classList.remove("aph-open")}
function close(){if(history.state&&history.state.tnApps)history.back();else closeNow()}
addEventListener("popstate",e=>{const st=e.state||{};if(st.tnApps){if(el.hidden)open(true)}else if(!el.hidden)closeNow()});
window.tnOpenApps=()=>open();
// The phone's back button: the app card, then the folder, then the page.
window.tnAppsBack=()=>{if(el.hidden)return false;if(app!==null){app=null;draw();return true}if(fold){fold=null;draw();return true}return false};
})();
