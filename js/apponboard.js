// The app's first run: four stops of a trip with Apollo, right after the
// boarding pass. Each stop is a real photo fading into the notebook's cream
// paper, with a paper thing on it:
//   1. Arrival (Tokyo Tower): luggage tags to pick your language.
//   2. The city (Shibuya): a printed map with photo pins and where you are.
//   3. The route (Tokyo Station): a JR ticket with your days, stamped by Apollo.
//   4. The gate at night: omamori charms for Tokyo, Kyoto or Osaka; the
//      photo changes with the city, and Let's go opens Explore on it.
// Swipe or tap Next; Skip ends it. It shows once (tabineko-onboarded), or
// again with ?onboard=1. Only in the app layout.
(function(){
if(!IS_APP)return;
const KEY="tabineko-onboarded";
let force=false;try{force=/[?&]onboard=1/.test(location.search)}catch(e){}
if(store.get(KEY)==="1"&&!force)return;

const N=4,PH="assets/photos/",HD="assets/hoods/";
let i=0,pick="tokyo";
const el=document.createElement("div");el.id="onb";el.setAttribute("role","dialog");el.setAttribute("aria-modal","true");
document.body.appendChild(el);document.documentElement.classList.add("onb-open");

// The three most visited cities, each with its own night photo behind the gate.
const CITY=[["tokyo","東京","assets/onboard/tokyo.jpg","22% 50%"],["kyoto","京都","assets/onboard/kyoto.jpg","88% 40%"],["osaka","大阪","assets/onboard/osaka.jpg","48% 40%"]].filter(([c])=>TRIP_CITIES.includes(c));
const cityPic=c=>(CITY.find(x=>x[0]===c)||CITY[0]);
const stk=st=>`<img class="ob-stk" src="assets/cat.png" alt="" style="${st}">`;
const tape=(c,st)=>`<span class="ob-tape" style="${st};--t:${c}"></span>`;
const note=(t,st)=>`<span class="ob-note" style="${st}">${esc(t)}</span>`;
const pin=(n,x,y)=>{const p=P.find(q=>q.n===n&&q.photo);return p?`<span class="ob-pin" style="left:${x}%;top:${y}%"><img src="${p.photo}" alt=""></span>`:""};

function slides(){
  const ar=isAR();
  return [
  {img:HD+"tokyo-tower.jpg",pos:"50% 40%",kick:"ようこそ · WELCOME TO JAPAN",tag:"01 · ARRIVAL",h:T("Welcome to Japan"),p:T("I'm Apollo, and I've tried every place here myself. Pick your language and let's go."),
   obj:"",below:`<div class="ob-tags">${[["ar","العربية","AR"],["en","English","EN"]].map(([l,n,c])=>`<button type="button" class="ob-tag${(ar?"ar":"en")===l?" on":""}" data-l="${l}"><span class="ob-hole"></span><span><small>LANGUAGE</small><b>${n}</b></span><em>${c}</em>${(ar?"ar":"en")===l?stk("inset-inline-end:-14px;top:-24px;width:54px;transform:rotate(-12deg)"):""}</button>`).join("")}</div>`,cta:T("Continue")},
  {img:HD+"shibuya.jpg",pos:"50% 50%",kick:"地図 · THE MAP",tag:"02 · THE CITY",h:T("All of Japan on one map"),p:T("Nearly 500 places: sights, hidden spots, coffee and food. See what's near you and walk there."),
   obj:`<div class="ob-obj ob-map"><svg viewBox="0 0 320 170" aria-hidden="true"><rect width="320" height="170" fill="#F4EEE2"/><path d="M250 0 Q232 90 262 170" stroke="#BFDCEA" stroke-width="20" fill="none"/><rect x="24" y="24" width="70" height="46" rx="10" fill="#D9E8C6"/>
     ${[28,68,108,148].map(y=>`<path d="M0 ${y} L320 ${y+8}" stroke="#fff" stroke-width="6"/>`).join("")}${[60,140,200].map(x=>`<path d="M${x} 0 L${x+6} 170" stroke="#fff" stroke-width="6"/>`).join("")}
     <path d="M84 116 C 120 96, 150 70, 196 64" stroke="#F14E24" stroke-width="3" stroke-dasharray="2 7" stroke-linecap="round" fill="none"/>
     <circle cx="84" cy="116" r="16" fill="#1D72F0" opacity=".18"/><circle cx="84" cy="116" r="7" fill="#1D72F0" stroke="#fff" stroke-width="3"/></svg>
     ${pin("Senso-ji",6,14)}${pin("Shibuya Sky",55,17)}${pin("Halal Wagyu Yakiniku Panga",66,55)}
     <div class="ob-mfoot"><span><small>${T("Closest to you")}</small><b>Shibuya Sky</b></span><em>🚶 ${esc(T("{n} min",{n:3}))}</em></div>${tape("rgba(255,209,59,.75)","top:-10px;left:40%;transform:rotate(-4deg)")}
     ${stk("top:-34px;inset-inline-start:-14px;width:74px;transform:rotate(10deg)")}</div>${note(T("The sunset from here is amazing 🐾"),"top:calc(48% + 20px);inset-inline-end:36px;transform:rotate(-4deg)")}`,cta:T("Next")},
  {img:HD+"tokyo-station.jpg",pos:"50% 45%",kick:"旅程 · THE ROUTE",tag:"03 · THE ROUTE",h:T("Your trip, day by day"),p:T("Your flight, hotel and places in one schedule, and Apollo suggests what's next."),
   obj:`<div class="ob-obj ob-tix"><div class="ob-tixh"><span>JR 東日本 · ITINERARY</span><span>No. 0386</span></div>
     <div class="ob-tixr"><span><small>FROM</small><b>RUH</b></span><i></i><span><small>TO</small><b>TYO</b></span></div>
     ${[["07:40",T("Land at Narita"),"✈"],["15:00",T("Hotel check-in"),"⌂"],["09:00","Senso-ji · "+T("Day {n}",{n:2}),"◉"]].map(([t,n,e])=>`<div class="ob-tixl"><em>${t}</em><span>${esc(n)}</span><i>${e}</i></div>`).join("")}
     <div class="ob-tixf"><span>PASSENGER · APOLLO 🐾</span><span>CAR 7 · 1A</span></div>
     <div class="ob-paw"><b>🐾</b><small>APOLLO<br>APPROVED</small></div>${tape("rgba(255,143,163,.7)","top:-10px;right:30px;transform:rotate(6deg)")}</div>
     ${note(T("Trust me, I sorted it for you ✓"),"top:calc(56% + 6px);inset-inline-start:40px;transform:rotate(3deg)")}`,cta:T("Next")},
  {img:cityPic(pick)[2],pos:cityPic(pick)[3],night:true,kick:"出発 · DEPARTURE",tag:"04 · THE GATE",h:T("Where to first?"),p:T("Pick your city and Apollo shows you around."),
   obj:"",below:`<div class="ob-oms" role="radiogroup">${CITY.map(([c,j])=>`<button type="button" role="radio" class="ob-om${c===pick?" on":""}" data-c="${c}" aria-checked="${c===pick}"><i></i><span lang="ja">${j}</span><b>${esc(D(CITIES[c],"n"))}</b></button>`).join("")}</div>`,
   cta:T("Let's go ✈️")}];
}
function draw(){
  const S=slides();
  el.innerHTML=`<div class="ob-track">${S.map((s,k)=>`<section class="ob-s${s.night?" night":""}${k===i?" in":""}" aria-hidden="${k!==i}">
      <img class="ob-bg" src="${s.img}" alt="" style="object-position:${s.pos}"><div class="ob-vig"></div>${s.obj}
      <div class="ob-body"><small class="ob-kick">${s.kick}</small><h1>${esc(s.h)}</h1><p>${esc(s.p)}</p>${s.below||""}
        <button type="button" class="ob-cta" data-k="${k}">${esc(s.cta)}</button>${s.later?`<button type="button" class="ob-later">${esc(s.later)}</button>`:""}</div></section>`).join("")}</div>
    <div class="ob-top"><div class="ob-bars">${S.map((_,k)=>`<i class="${k<i?"d":k===i?"on":""}"></i>`).join("")}</div>
      <div class="ob-hd"><span class="ob-st">${S[i].tag}</span><button type="button" class="ob-skip">${T("Skip")}</button></div></div>`;
  place(0,false);
  el.querySelector(".ob-skip").onclick=()=>finish(false);
  el.querySelectorAll(".ob-cta").forEach(b=>b.onclick=()=>{if(+b.dataset.k<N-1)go(i+1);else finish(true)});
  const later=el.querySelector(".ob-later");if(later)later.onclick=()=>finish(false);
  el.querySelectorAll(".ob-tag").forEach(b=>b.onclick=()=>{const l=b.dataset.l;if((isAR()?"ar":"en")===l)return;
    setLang(l);setTimeout(draw,l==="ar"&&typeof AR_ON==="function"&&!AR_ON()?400:30)});
  el.querySelectorAll(".ob-om").forEach(b=>b.onclick=()=>{pick=b.dataset.c;el.querySelectorAll(".ob-om").forEach(x=>{const on=x===b;x.classList.toggle("on",on);x.setAttribute("aria-checked",String(on))});
    // The photo behind the gate changes to the city, with a soft crossfade.
    const s=el.querySelectorAll(".ob-s")[N-1],old=s.querySelector(".ob-bg"),[,,src,pos]=cityPic(pick),n=old.cloneNode();
    n.src=src;n.style.objectPosition=pos;n.style.opacity="0";n.style.transition="opacity .5s";old.after(n);
    requestAnimationFrame(()=>requestAnimationFrame(()=>{n.style.opacity="1"}));setTimeout(()=>old.remove(),550)});
}
// The slides sit side by side; in Arabic the next one comes from the left.
const sgn=()=>isAR()?1:-1;
function place(dx,anim){
  const t=el.querySelector(".ob-track");if(!t)return;
  t.style.transition=anim?"transform .5s cubic-bezier(.2,.8,.2,1)":"none";
  t.style.transform=`translateX(calc(${sgn()*i*100}% + ${dx}px))`;
  // A little parallax: the photos drift slower than the paper.
  el.querySelectorAll(".ob-bg").forEach((b,k)=>{b.style.transition=t.style.transition;b.style.transform=`translateX(${k===i?dx*-.3:0}px) scale(1.08)`});
}
function go(n){
  n=Math.max(0,Math.min(N-1,n));if(n===i)return place(0,true);
  i=n;place(0,true);
  el.querySelectorAll(".ob-s").forEach((s,k)=>{s.classList.toggle("in",k===i);s.setAttribute("aria-hidden",String(k!==i))});
  el.querySelectorAll(".ob-bars i").forEach((b,k)=>b.className=k<i?"d":k===i?"on":"");
  el.querySelector(".ob-st").textContent=slides()[i].tag;
}
// Swiping: follows the finger, then settles on the nearest slide.
let x0=null,y0=null,dx=0,horiz=null;
el.addEventListener("touchstart",e=>{if(e.target.closest(".ob-tag,.ob-om"))return;x0=e.touches[0].clientX;y0=e.touches[0].clientY;dx=0;horiz=null},{passive:true});
el.addEventListener("touchmove",e=>{if(x0===null)return;const mx=e.touches[0].clientX-x0,my=e.touches[0].clientY-y0;
  if(horiz===null&&Math.abs(mx)+Math.abs(my)>8)horiz=Math.abs(mx)>Math.abs(my);if(!horiz)return;
  dx=mx;const edge=(i===0&&dx*sgn()<0)||(i===N-1&&dx*sgn()>0);place(edge?dx*.3:dx,false)},{passive:true});
el.addEventListener("touchend",()=>{if(x0===null)return;x0=null;if(!horiz){return}
  // Pulling the next stop in: from the left in Arabic, from the right in English.
  const w=el.clientWidth*.18;if(dx*sgn()>w)go(i+1);else if(dx*sgn()<-w)go(i-1);else place(0,true)},{passive:true});
el.addEventListener("keydown",e=>{if(e.key==="ArrowLeft")go(i+(isAR()?1:-1));if(e.key==="ArrowRight")go(i+(isAR()?-1:1))});

function finish(start){
  store.set(KEY,"1");
  if(pick&&CITIES[pick]){if(window.tnExploreCity)tnExploreCity(pick);else{city=pick;store.set("tabineko-city",pick)}}
  el.classList.add("out");document.documentElement.classList.remove("onb-open");
  setTimeout(()=>el.remove(),450);window.tnOnbBack=null;
  if(typeof goTab==="function"){
    goTab("explore")
  }
}
// The phone's back button steps back through the stops.
window.tnOnbBack=()=>{if(!document.getElementById("onb"))return false;if(i>0)go(i-1);return true};
draw();
})();
