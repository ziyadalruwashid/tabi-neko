// The website's landing page: what people see at tabi-neko.vercel.app with
// no link in the address. It's about the app: what it does, the buddies, and
// where to download it. "Explore the notebook" opens the website as it was
// (#map), and any link with a # or ? (a place, a shared trip, the dashboard)
// skips the landing page. Never shown inside the app.
//
// Motion: the headline rises word by word, the phones tilt with the pointer,
// the city stamps press in, sections slide in as they scroll into view, the feature
// list plays itself, place photos drift past, and a tap leaves a paw print.
// All of it is switched off for people who ask for reduced motion.
(function(){
if(typeof IS_APP!=="undefined"&&IS_APP)return;
const APK="https://github.com/ziyadalruwashid/tabi-neko/releases/download/android-latest/tabi-neko.apk";
const H=document.documentElement;
const still=()=>matchMedia("(prefers-reduced-motion: reduce)").matches;
const wanted=()=>!location.hash&&!location.search;
const el=document.createElement("div");el.id="landing";document.body.prepend(el);
const n=v=>isAR()?iso(String(v)):String(v);
const android=/Android/i.test(navigator.userAgent);

const FEATS=[
  ["trip","🗓️","A trip that plans itself","Pick your cities and dates. Apollo fills each day with places worth the trip, in an order that makes sense, and counts down to the flight."],
  ["trips","🚆","How far?","Every day trip on one map, by how long the train takes: Fuji, Nara, Kamakura and more, with the ticket price and when to leave."],
  ["stamps","🐾","Apollo's stamp book","Stand at Senso-ji, Fushimi Inari or Osaka Castle and collect its stamp. Your book fills up as you go."],
  ["home","☀️","What's good right now","Opens on your city: what's in season, what's near you, and the moods for today, from temples to late-night eats."],
  ["lens","📸","Halal Lens","Point the camera at a label or a menu and it reads the Japanese for you. Works offline."],
  ["apps","📱","Apollo's phone","The apps he keeps on his phone in Japan, in folders: trains, taxis, tickets, translation."]
];
const BUDS=[["apollo","assets/cat.png","--lantern","guide","i only recommend places i'd go back to."],
  ["kenbo","assets/crew/kenbo.png","--wasabi","scout","if it's more than an hour out of the city, it's my page. pack water."],
  ["fa","assets/crew/fa.png","--mochi","support","slow down. drink something warm. you've got this."]];
const TIPS=["i only recommend places i'd go back to.","Great Buddha before 10:00. trust me.","the deer in Nara bow first. bow back.","download the city offline before you land."];
const bud=k=>(typeof BUDDIES!=="undefined"&&BUDDIES.find(b=>b.k===k))||{};
const crewOf=k=>(typeof CREW!=="undefined"&&CREW.find(c=>c.n.toLowerCase()===k))||{};

const storeBtn=(cls="")=>`<a class="lp-store ${cls}" href="${APK}" rel="noopener"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3.6 2.3 13.4 12l-9.8 9.7c-.4-.2-.6-.6-.6-1.1V3.4c0-.5.2-.9.6-1.1Zm10.9 10.8 2.5 2.5-11.3 6.4 8.8-8.9Zm3.6-3.6 2.9 1.7c.8.5.8 1.6 0 2.1l-2.9 1.7-2.8-2.9 2.8-2.6ZM5.7 2l11.3 6.4-2.5 2.5L5.7 2Z"/></svg><span><small>${T("Download for")}</small><b>Android</b></span></a>`;
const iosBtn=`<span class="lp-store soon" aria-disabled="true"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M16.4 12.6c0-2.4 2-3.6 2.1-3.7-1.1-1.7-2.9-1.9-3.5-1.9-1.5-.2-2.9.9-3.7.9-.8 0-1.9-.9-3.2-.8-1.6 0-3.1 1-4 2.4-1.7 3-.4 7.4 1.2 9.8.8 1.2 1.8 2.5 3 2.4 1.2 0 1.7-.8 3.1-.8 1.5 0 1.9.8 3.2.8 1.3 0 2.1-1.2 2.9-2.4.9-1.3 1.3-2.7 1.3-2.7s-2.4-1-2.4-4ZM14 5.4c.7-.8 1.1-1.9 1-3-1 0-2.1.7-2.8 1.5-.6.7-1.2 1.8-1 2.9 1.1.1 2.1-.6 2.8-1.4Z"/></svg><span><small>${T("Coming soon to")}</small><b>iPhone</b></span></span>`;
// Each word of the headline rises on its own.
const words=(s,cls="")=>s.split(" ").map((w,i)=>`<span class="lp-w ${cls}" style="--i:${i}">${esc(w)}</span>`).join(" ");
const phone=(img,cls)=>`<div class="lp-ph ${cls}"><img src="assets/landing/${img}.webp" alt="" loading="lazy" decoding="async"></div>`;

function photos(){
  // Famous sights from every city in turn: temples, views, streets, nature.
  const ok=p=>p.photo&&p.tier!=="worth"&&["shrine","views","streets","nature"].includes(p.cat);
  const by=new Map();P.filter(ok).forEach(p=>{if(!by.has(p.city))by.set(p.city,[]);by.get(p.city).push(p)});
  const pool=[];for(let i=0;pool.length<28&&i<40;i++)by.forEach(l=>{if(l[i]&&pool.length<28)pool.push(l[i])});
  const row=list=>`<div class="lp-mq-row"><div class="lp-mq-track">${[...list,...list].map(p=>`<figure><img src="${esc(p.photo)}" alt="" loading="lazy" decoding="async"><figcaption>${esc(p.n)}</figcaption></figure>`).join("")}</div></div>`;
  const h=Math.ceil(pool.length/2);return row(pool.slice(0,h))+row(pool.slice(h).reverse());
}
function draw(){
  const cs=Object.keys(CITIES).filter(k=>P.some(p=>p.city===k));
  el.innerHTML=`
  <header class="lp-nav"><a class="lp-logo" href="#" aria-label="Tabi Neko"><img src="assets/cat.png" alt="">Tabi Neko</a>
    <nav><a href="#lp-feat" data-to="lp-feat">${T("Features")}</a><a href="#lp-how" data-to="lp-how">${T("How it works")}</a><a href="#lp-bud" data-to="lp-bud">${T("Buddies")}</a><a href="#map" class="lp-nb">${T("Explore the notebook")}</a></nav>
    <span class="lp-sp"></span><button type="button" class="lp-lang" lang="${isAR()?"en":"ar"}">${isAR()?"English":"العربية"}</button>
    <a class="lp-cta lp-get" href="${APK}">↓ ${T("Get the app")}</a></header>

  <section class="lp-hero"><div class="lp-glow" aria-hidden="true"></div>
    <div class="lp-copy">
      <h1>${words(T("Japan, planned by a cat"))} <em>${words(T("who's been."),"hl")}</em></h1>
      <p class="lp-lead lp-in" style="--d:6">${T("Tabi Neko is Apollo's travel notebook in your pocket: {n} places he checked himself, a trip planner that fills your days, and stamps to collect as you go.",{n:n(P.length)})}</p>
      <div class="lp-btns lp-in" style="--d:7">${storeBtn()}${iosBtn}<a class="lp-cta ghost lp-nb" href="#map">${T("Explore the notebook")} <i>${isAR()?"←":"→"}</i></a></div>
    </div>
    <div class="lp-stage" aria-hidden="true"><div class="lp-tilt">
      ${phone("stamps","l")}${phone("trips","r")}${phone("home","c")}
      <button type="button" class="lp-bub" tabindex="-1"><img src="assets/cat.png" alt=""><span class="lp-tip">“${esc(T(TIPS[0]))}”</span></button>
      <div class="lp-chip c1">🐾 ${T("Stamp collected")}: <b>Senso-ji</b></div>
      <div class="lp-chip c2">✈️ ${T("20 days to go")}</div>
    </div></div>
  </section>

  <section class="lp-cities lp-rv" aria-label="${esc(T("The cities in the notebook"))}"><p class="lp-ch">${T("{n} cities, one notebook. Pick one to start.",{n:n(cs.length)})}</p>
    <div class="lp-hk">${cs.map((k,i)=>`<button type="button" class="lp-hanko" data-c="${k}" style="--d:${i};--r:${[-8,5,-3,7,-6,4,-2][i%7]}deg"><span class="lp-hj">${esc(CITIES[k].jp)}</span><b>${esc(D(CITIES[k],"n"))}</b><small>${esc(D(CITIES[k],"nick")||"")}</small></button>`).join("")}</div></section>

  <section class="lp-mq" dir="ltr" aria-label="${esc(T("Some of the places"))}">${photos()}</section>

  <section class="lp-sec" id="lp-feat"><span class="lp-k lp-rv">${T("WHAT'S INSIDE")}</span><h2 class="lp-rv">${T("Everything for the trip, in one small app")}</h2>
    <p class="lp-d lp-rv">${T("Plan at home, use it on the street. In English and Arabic, with the travel buddy you pick as your guide.")}</p>
    <div class="lp-show lp-rv"><div class="lp-fl" role="tablist">${FEATS.map(([k,ic,h,p],i)=>`<button type="button" role="tab" class="lp-f${i?"":" on"}" data-i="${i}" aria-selected="${!i}"><span class="lp-fi">${ic}</span><span><b>${T(h)}</b><small>${T(p)}</small></span><i class="lp-bar"></i></button>`).join("")}</div>
      <div class="lp-fp"><div class="lp-ph big">${FEATS.map(([k],i)=>`<img src="assets/landing/${k}.webp" alt="" class="${i?"":"on"}" loading="lazy" decoding="async">`).join("")}</div><div class="lp-ring" aria-hidden="true"></div></div></div>
  </section>

  <section class="lp-sec lp-how" id="lp-how"><span class="lp-k lp-rv">${T("HOW IT WORKS")}</span><h2 class="lp-rv">${T("Three steps to Japan")}</h2>
    <div class="lp-steps"><svg class="lp-path" viewBox="0 0 1000 40" preserveAspectRatio="none" aria-hidden="true"><path d="M20 20 C 250 -10, 350 50, 500 20 S 800 -10, 980 20"/></svg>
    ${[["🗺️","Pick your cities and dates","Tokyo, Kyoto, Osaka, Nara… and how many nights in each."],["🐱","Apollo fills your days","Places in a good order, with the walk or the train between them. Change anything you like."],["🐾","Go, and collect the stamps","In Japan the app opens on today: what's next, what's near, and a stamp at every famous place."]]
      .map(([ic,h,p],i)=>`<div class="lp-step lp-rv" style="--d:${i}"><span class="lp-num">${n(i+1)}</span><span class="lp-si">${ic}</span><h3>${T(h)}</h3><p>${T(p)}</p></div>`).join("")}</div></section>

  <section class="lp-sec" id="lp-bud"><span class="lp-k lp-rv">${T("PICK YOUR GUIDE")}</span><h2 class="lp-rv">${T("Travel with Apollo, Kenbo or Fa")}</h2>
    <p class="lp-d lp-rv">${T("Your buddy says hello, gives the tips and guides the whole app. Tap one to hear from them.")}</p>
    <div class="lp-buds">${BUDS.map(([k,img,c,role,q],i)=>{const b=bud(k),cr=crewOf(k);return `<button type="button" class="lp-b lp-rv" style="--c:var(${c});--d:${i}" data-q="${esc(D(cr,"tip")||T(q))}">
      <span class="lp-bq" aria-live="polite"></span><img src="${img}" alt=""><b>${esc(isAR()?b.ar||D(cr,"n")||b.n:b.n||cr.n||k)}</b><small>${esc(D(cr,"role")||role)}</small><span class="lp-hi">${esc(isAR()?b.helloAr||"مياو!":b.hello||"Meow!")}</span></button>`}).join("")}</div></section>

  <section class="lp-final lp-rv" id="lp-get"><div><h2>${T("Your Japan trip, in your pocket.")}</h2>
      <p>${T("Free. No ads. Your trip is saved to your account, so it's safe on any phone, and you can plan it together with your travel buddies.")}</p>
      <div class="lp-btns">${storeBtn("light")}<a class="lp-cta ghost light lp-nb" href="#map">${T("Explore the notebook")}</a></div></div>
    <div class="lp-qr"><img src="assets/landing/qr.svg" alt="${esc(T("QR code to download the Android app"))}"><span>${T("Scan with your phone")}</span></div></section>

  <footer class="lp-foot"><a class="lp-logo" href="#"><img src="assets/cat.png" alt="">Tabi Neko</a><span>${T("made in Riyadh")} 🐾</span><span class="lp-sp"></span>
    <a href="#map" class="lp-nb">${T("Explore the notebook")}</a><a href="#privacy">${T("Privacy")}</a><a href="#crew">${T("Contributors")}</a></footer>`;
  wire();
}

// ---- motion and taps ----
let io=null,featT=null,featI=0,tipT=null,tipI=0;
function wire(){
  el.querySelectorAll("[data-to]").forEach(a=>a.onclick=e=>{e.preventDefault();const t=document.getElementById(a.dataset.to);if(t)t.scrollIntoView({behavior:still()?"auto":"smooth",block:"start"})});
  el.querySelectorAll(".lp-logo").forEach(a=>a.onclick=e=>{e.preventDefault();scrollTo({top:0,behavior:still()?"auto":"smooth"})});
  el.querySelector(".lp-lang").onclick=()=>setLang(isAR()?"en":"ar");
  // "Get the app": straight to the download on an Android phone, to the QR code elsewhere.
  el.querySelectorAll(".lp-get").forEach(a=>a.onclick=e=>{if(android)return;e.preventDefault();const g=$("lp-get");g.scrollIntoView({behavior:still()?"auto":"smooth",block:"center"});g.classList.remove("pulse");void g.offsetWidth;g.classList.add("pulse")});
  // Sections slide in once, and numbers count up, as they come into view.
  if(io)io.disconnect();
  io=new IntersectionObserver(es=>es.forEach(e=>{if(!e.isIntersecting)return;e.target.classList.add("in");io.unobserve(e.target);
}),{threshold:.18,rootMargin:"0px 0px -40px 0px"});
  el.querySelectorAll(".lp-rv").forEach(x=>io.observe(x));
  // The phones lean toward the pointer.
  const st=el.querySelector(".lp-stage"),tilt=el.querySelector(".lp-tilt");
  if(st&&!still()&&matchMedia("(pointer:fine)").matches){
    el.querySelector(".lp-hero").onpointermove=e=>{const r=st.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;
      tilt.style.transform=`rotateY(${(x*10).toFixed(2)}deg) rotateX(${(-y*8).toFixed(2)}deg)`;tilt.style.setProperty("--px",x.toFixed(3));tilt.style.setProperty("--py",y.toFixed(3))};
    el.querySelector(".lp-hero").onpointerleave=()=>{tilt.style.transform="";tilt.style.setProperty("--px",0);tilt.style.setProperty("--py",0)}}
  // Apollo's tip changes every few seconds, or when you tap him.
  const bub=el.querySelector(".lp-bub");
  const nextTip=()=>{tipI=(tipI+1)%TIPS.length;const s=bub.querySelector(".lp-tip");s.classList.remove("show");void s.offsetWidth;s.textContent=`“${T(TIPS[tipI])}”`;s.classList.add("show");bub.classList.remove("hop");void bub.offsetWidth;bub.classList.add("hop")};
  bub.onclick=()=>{nextTip();clearInterval(tipT);tipT=setInterval(nextTip,5200)};
  clearInterval(tipT);if(!still())tipT=setInterval(nextTip,5200);
  // The feature list plays itself; tapping one takes over.
  const fs=[...el.querySelectorAll(".lp-f")],imgs=[...el.querySelectorAll(".lp-fp img")];
  const pick=(i,user)=>{featI=i;fs.forEach((b,k)=>{b.classList.toggle("on",k===i);b.setAttribute("aria-selected",k===i);b.classList.remove("run");if(k===i&&!user&&!still()){void b.offsetWidth;b.classList.add("run")}});
    imgs.forEach((m,k)=>m.classList.toggle("on",k===i))};
  fs.forEach(b=>b.onclick=()=>{clearInterval(featT);featT=null;pick(+b.dataset.i,true)});
  clearInterval(featT);featT=null;
  const show=el.querySelector(".lp-show");
  const play=()=>{if(featT||still())return;pick(featI,false);featT=setInterval(()=>pick((featI+1)%FEATS.length,false),6000)};
  new IntersectionObserver((es,o)=>{if(es[0].isIntersecting){play();o.disconnect()}},{threshold:.3}).observe(show);
  // A city's stamp: it presses down, then the notebook opens on that city.
  el.querySelectorAll(".lp-hanko").forEach(b=>b.onclick=()=>{b.classList.remove("press");void b.offsetWidth;b.classList.add("press");
    setTimeout(()=>{const k=b.dataset.c;try{store.set("tabineko-city",k);city=k;selected=null;area=null;zoomTo=null;renderAll()}catch(e){}location.hash="#map";requestAnimationFrame(()=>{if(typeof show==="function")show("map")})},still()?0:420)});
  // Buddies: tap one and they say their line.
  el.querySelectorAll(".lp-b").forEach(b=>b.onclick=()=>{const q=b.querySelector(".lp-bq");el.querySelectorAll(".lp-b.talk").forEach(x=>{if(x!==b)x.classList.remove("talk")});
    q.textContent=`“${b.dataset.q}”`;b.classList.remove("talk");void b.offsetWidth;b.classList.add("talk")});
}
// A paw print where you tap or click.
el.addEventListener("pointerdown",e=>{if(still()||e.target.closest("a,button"))return;const p=document.createElement("span");p.className="lp-paw";p.textContent="🐾";
  p.style.left=e.clientX+"px";p.style.top=e.clientY+"px";p.style.setProperty("--r",(Math.random()*50-25)+"deg");document.body.appendChild(p);setTimeout(()=>p.remove(),900)});

// ---- showing and hiding ----
function sync(){const on=wanted();H.classList.toggle("lp-on",on);if(on){if(!el.firstChild)draw();document.title="Tabi Neko · "+T("your Japan travel notebook")}else document.title="Tabi Neko"}
addEventListener("hashchange",sync);
// "Explore the notebook" (#map) opens the notebook from the top.
el.addEventListener("click",e=>{const a=e.target.closest(".lp-nb");if(!a)return;e.preventDefault();location.hash="#map";requestAnimationFrame(()=>{if(typeof show==="function")show("map")})});
if(typeof setLang==="function"){const _s=setLang;setLang=function(l){_s(l);if(wanted())setTimeout(draw,l==="ar"&&typeof AR_ON==="function"&&!AR_ON()?400:30)}}
sync();
})();
