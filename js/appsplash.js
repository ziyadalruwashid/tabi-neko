// The app's opening: a boarding pass from Riyadh to Tokyo for Apollo. It
// flies up, the plane draws its route, a «ようこそ» (welcome) stamp lands on
// it, and the pass tears along its perforation to open the app underneath.
//
// Runs once each time the app starts (once per tab with ?app=1), only in the
// app layout. index.html adds the "tn-splash" class before the first paint, so
// the orange screen is there from the start and nothing flashes. A tap skips
// ahead to the tear. With "reduce motion" on, it just fades.
// No dependencies: it runs before the rest of the scripts, straight after
// the #tnsplash element in index.html.
(function(){
const html=document.documentElement,box=document.getElementById("tnsplash");
if(!box||!html.classList.contains("tn-splash"))return;
try{sessionStorage.setItem("tabineko-splash","1")}catch(e){}

const MONTHS=["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
const now=new Date(Date.now()+9*3600e3),day=`${String(now.getUTCDate()).padStart(2,"0")} ${MONTHS[now.getUTCMonth()]}`; // Japan's date
const bars=Array.from({length:38},(_,i)=>`<i style="width:${[1,2,3,1,2][i%5]}px"></i>`).join("");
const pass=`<div class="sp-wrap"><div class="sp-pass">
  <div class="sp-main"><div class="sp-h"><b>TABI NEKO AIR</b><span>بطاقة صعود · BOARDING PASS</span></div>
   <div class="sp-r"><div><small>FROM</small><big>RUH</big><i>الرياض</i></div>
    <svg viewBox="0 0 140 60" class="sp-arc" aria-hidden="true"><clipPath id="SPCLIP-N"><rect class="sp-clip" width="0" height="60"/></clipPath>
     <path d="M8 48 Q70 -10 132 48" fill="none" stroke="#C9B49A" stroke-width="2.5" stroke-dasharray="5 6" clip-path="url(#SPCLIP-N)"/>
     <g class="sp-plane" opacity="0"><path d="M0 -14 L4 -4 L16 2 L16 6 L4 3 L3 12 L7 15 L7 18 L0 16 L-7 18 L-7 15 L-3 12 L-4 3 L-16 6 L-16 2 L-4 -4 Z" fill="#F14E24" transform="scale(.85)"/></g></svg>
    <div><small>TO</small><big>TYO</big><i>طوكيو</i></div></div>
   <div class="sp-g"><div><small>PASSENGER</small><b>APOLLO 🐾</b></div><div><small>SEAT</small><b>1A</b></div><div><small>GATE</small><b>猫</b></div><div><small>BOARDING</small><b>NOW</b></div></div></div>
  <div class="sp-perf"></div>
  <div class="sp-stub"><img src="assets/cat.png" alt=""><div class="sp-bar">${bars}</div></div>
  <div class="sp-stamp"><b>ようこそ</b><small>WELCOME TO JAPAN</small><small>✦ ${day} ✦</small></div></div></div>`;
// Two copies of the same scene, one above the tear and one below it. Until
// the tear they sit exactly on top of each other and look like one.
const scene=n=>`<div class="sp-half sp-${n}"><svg class="sp-pet" aria-hidden="true"></svg>${pass.replace(/SPCLIP-N/g,"SPCLIP-"+n)}</div>`;
box.innerHTML=scene("a")+scene("b");
const halves=[...box.querySelectorAll(".sp-half")],q=s=>[...box.querySelectorAll(s)];

const cl=(x,a=0,b=1)=>Math.max(a,Math.min(b,x)),seg=(t,a,b)=>cl((t-a)/(b-a)),lerp=(a,b,u)=>a+(b-a)*u;
const eo=u=>1-Math.pow(1-u,3),ei=u=>u*u*u,eio=u=>u<.5?4*u*u*u:1-Math.pow(-2*u+2,3)/2,back=u=>1+2.7*Math.pow(u-1,3)+1.7*Math.pow(u-1,2);
let W=innerWidth,H=innerHeight;
const petals=t=>Array.from({length:10},(_,i)=>{const x0=(i*73)%W,y0=(i*131)%H,sp=40+(i%5)*14,y=((y0+t*sp)%(H+40))-20,x=x0+Math.sin(t*1.6+i)*16;
  return `<path transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${((i*47+t*90)%360).toFixed(0)}) scale(${.9+(i%4)*.3})" d="M0 0 C 6 -8, 14 -4, 12 4 C 9 9, 2 8, 0 0 Z" fill="#F7B6C8" opacity="${.5+(i%3)*.15}"/>`}).join("");

// The tear follows the pass's dotted line, as a zigzag across the screen.
function cut(){
  // Measured with the pass at rest, so zoom on small phones is counted too.
  const w=box.querySelector(".sp-a .sp-wrap"),pf=box.querySelector(".sp-a .sp-perf"),keep=w.style.transform;
  w.style.transform="none";const y=Math.round(pf.getBoundingClientRect().top-halves[0].getBoundingClientRect().top)-1,pts=[];w.style.transform=keep;
  for(let x=0;x<=W+13;x+=13)pts.push(`${x}px ${y+((x/13)%2?5:-5)}px`);
  halves[0].style.clipPath=`polygon(0 0,${W}px 0,${[...pts].reverse().join(",")})`;
  halves[1].style.clipPath=`polygon(${pts.join(",")},${W}px ${H}px,0 ${H}px)`;
}

const TEAR=1.7,END=2.4;let t0=null,skip=0,done=false;
function frame(t){
  const u=seg(t,.05,.7),ty=lerp(H*.9,0,back(u)),rot=lerp(22,0,eo(u));
  const sh=t>1.12&&t<1.34?Math.sin((t-1.12)*90)*6*(1-seg(t,1.12,1.34)):0;
  q(".sp-wrap").forEach(w=>w.style.transform=`translate(${sh.toFixed(2)}px,${(ty+sh*.4).toFixed(1)}px) rotate(${rot.toFixed(2)}deg)`);
  const a=seg(t,.6,1.05)*.93,e=eio(a);
  q(".sp-clip").forEach(r=>r.setAttribute("width",(140*eio(seg(t,.6,1.05))).toFixed(1)));
  const bx=(1-e)*(1-e)*8+2*(1-e)*e*70+e*e*132,by=(1-e)*(1-e)*48-2*(1-e)*e*10+e*e*48,dx=2*(1-e)*62+2*e*62,dy=-2*(1-e)*58+2*e*58;
  q(".sp-plane").forEach(g=>{g.setAttribute("transform",`translate(${bx.toFixed(1)} ${by.toFixed(1)}) rotate(${(Math.atan2(dy,dx)*57.3+90).toFixed(1)})`);g.setAttribute("opacity",a>0?1:0)});
  const s=seg(t,.98,1.14);q(".sp-stamp").forEach(el=>{el.style.opacity=s>0?Math.min(1,s*2.5):0;el.style.transform=`rotate(-16deg) scale(${lerp(2.6,1,ei(s)).toFixed(3)})`});
  q(".sp-pet").forEach(el=>el.innerHTML=petals(t));
  const tr=ei(seg(t,TEAR,END));
  halves[0].style.transform=`translateY(${(-tr*H*.95).toFixed(1)}px) rotate(${(-tr*9).toFixed(2)}deg)`;
  halves[1].style.transform=`translateY(${(tr*H*.85).toFixed(1)}px) rotate(${(tr*7).toFixed(2)}deg)`;
  if(t>=TEAR)box.classList.add("open");
}
function finish(){if(done)return;done=true;html.classList.remove("tn-splash");box.remove()}
function tick(now){
  if(done)return;if(t0===null)t0=now;
  const t=(now-t0)/1000+skip;frame(t);
  if(t>=END)return finish();
  requestAnimationFrame(tick);
}
// Hide the phone's own launch screen once ours is painted (same orange).
function hideNative(){try{const S=window.Capacitor&&Capacitor.Plugins&&Capacitor.Plugins.SplashScreen;if(S)S.hide({fadeOutDuration:150})}catch(e){}}
function start(){
  W=innerWidth;H=innerHeight;cut();frame(0);hideNative();
  if(matchMedia("(prefers-reduced-motion: reduce)").matches){box.style.transition="opacity .35s";setTimeout(()=>{box.style.opacity=0;setTimeout(finish,380)},500);return}
  requestAnimationFrame(tick);
}
box.addEventListener("click",()=>{if(t0===null)return;const t=(performance.now()-t0)/1000+skip;if(t<TEAR){skip+=TEAR-t;box.querySelectorAll(".sp-stamp").forEach(e=>e.style.opacity=1)}});
addEventListener("resize",()=>{if(!done){W=innerWidth;H=innerHeight;cut()}});
// Start once the page and the fonts are ready, but never wait long for them.
let started=false;const go=()=>{if(!started){started=true;start()}};
const ready=()=>{Promise.race([document.fonts?document.fonts.ready:Promise.resolve(),new Promise(r=>setTimeout(r,700))]).then(()=>requestAnimationFrame(go))};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",ready);else ready();
setTimeout(go,1500); // safety net
setTimeout(finish,6000);
})();
