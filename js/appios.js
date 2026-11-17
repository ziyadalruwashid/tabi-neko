// The iPhone app moves like an iPhone app:
// - A page slides in from the side over the one before, which slips back a
//   little under a soft shade, and slides away the same way on Back.
// - Swipe a page away to go back, from anywhere on it as on iOS 26: from
//   the left in English, from the right in Arabic. Rows that scroll
//   sideways, the map and the contributors' cards keep their own swipes;
//   from the very edge of the screen it works there too.
// - Sheets rise from the bottom and sink back down; pull one down to close it.
// - Tap the tab you're on, or the status bar, to scroll back to the top.
// - The tab bar's selection is a glass lens you can press and slide.
// Only on an iPhone: Android, tablets (html.tn-wide) and the website never
// run any of it. Every page still opens and closes through history
// (js/appshell.js), so this only animates what the pages already do.
(function(){
if(typeof IS_APP==="undefined"||!IS_APP)return;
if(!(window.Capacitor&&Capacitor.getPlatform&&Capacitor.getPlatform()==="ios"))return;

const H=document.documentElement,byId=id=>document.getElementById(id);
// The pages that open on top and push history (a tn… marker).
const PAGES=["pview","lview","axview","sview","prayview","qiblaview","staffview","staffshow","restview","rmview","pfview","sbook","aphome","crewcs","trview","prview","lens"];
// Pages that are part of a tab rather than on top of it: More's own pages
// (#admin…) and a trip opened from My trip.
const SUB=["hoods","apps","trips","crew","privacy","admin"];
const BASE={explore:"explore",map:"amap",trip:"trip",menu:"menu"};
const EASE="cubic-bezier(.32,.72,0,1)",OUT="cubic-bezier(.2,.8,.3,1)";
const phone=()=>!H.classList.contains("tn-wide");
const sgn=()=>H.dir==="rtl"?-1:1;
const vis=el=>!!el&&el.isConnected&&!el.hidden&&getComputedStyle(el).display!=="none";
const zOf=el=>parseInt(getComputedStyle(el).zIndex,10)||0;
const marked=st=>!!st&&typeof st==="object"&&Object.keys(st).some(k=>/^tn[A-Z]/.test(k)&&st[k]);
const above=(a,b)=>{const za=zOf(a),zb=zOf(b);return za!==zb?za>zb:!!(b.compareDocumentPosition(a)&Node.DOCUMENT_POSITION_FOLLOWING)};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

function topPage(){let t=null;for(const id of PAGES){const el=byId(id);if(vis(el)&&(!t||above(el,t)))t=el}return t}
function baseEl(){const h=location.hash.slice(1);if(SUB.includes(h)&&vis(byId(h)))return byId(h);
  const el=byId(BASE[H.dataset.tab]||"explore");return vis(el)?el:null}
// What shows once the top page goes: the next page down, Ask Apollo, or the tab.
function underOf(top){let u=null;
  for(const el of [...PAGES.map(byId),byId("apollo")]){if(el&&el!==top&&vis(el)&&!above(el,top)&&(!u||above(el,u)))u=el}
  return u||baseEl()}
// Nothing moves while a sheet, a pop-up or the first-run pages are up.
function busyScreen(){const c=H.classList;
  if(["tn-splash","onb-open","tpick-open","at-sheet-open","picking"].some(k=>c.contains(k)))return true;
  return [...document.querySelectorAll(".tpick:not(.ios-ghost),#atsheet:not(.ios-ghost),#bell,.sb-moment")].some(vis)}
// The page Back would close now, or null.
function navNow(){
  if(!phone()||busyScreen())return null;
  const st=history.state,h=location.hash.slice(1);
  let top=topPage(),flow=false;
  if(top){if(!marked(st))return null;
    // a page's own pop-up closes first, with its own button
    if([...top.querySelectorAll(".ah-scrim,.ah-sscrim:not(.ios-ghost),.tr-scrim:not(.ios-ghost),.pf-dim:not(.ios-ghost),.pf-sheet:not(.ios-ghost)")].some(e=>e.getClientRects().length))return null}
  else if(st&&st.tnTrip&&vis(byId("trip"))){top=byId("trip");flow=true}
  else if(SUB.includes(h)&&vis(byId(h))&&history.length>1){top=byId(h);flow=true}
  else return null;
  const chat=byId("apollo");
  if(H.classList.contains("chat-open")&&vis(chat)&&!above(top,chat))return null;
  return {top,flow,under:flow?null:underOf(top)}}

// ---- a copy of a page, for when the same page shows another place ----
// A place opened from a place's "Nearby" redraws the same page, so a copy of
// the one before is kept to slide back to. Only the last few are kept.
const snaps=new Map();let snapN=0,pre=null;
function snap(el){
  const c=el.cloneNode(true),from=[el,...el.querySelectorAll("*")],sc=[];
  for(let i=0;i<from.length;i++)if(from[i].scrollTop||from[i].scrollLeft)sc.push([i,from[i].scrollTop,from[i].scrollLeft]);
  c.removeAttribute("hidden");c.setAttribute("aria-hidden","true");c.inert=true;c.classList.add("ios-snap");
  c.querySelectorAll("img[loading]").forEach(i=>i.removeAttribute("loading"));
  return {el,c,sc,n:from.length}}
// Scroll a page (or its copy) to where the copy was taken.
function rescroll(s,el){const all=[el,...el.querySelectorAll("*")];if(all.length!==s.n)return;
  s.sc.forEach(([i,t,l])=>{all[i].scrollTop=t;all[i].scrollLeft=l})}
function keepSnap(s){const n=++snapN;snaps.set(n,s);while(snaps.size>8)snaps.delete(snaps.keys().next().value);return n}

// ---- the layers of one move ----
// p is how far the top page has gone: 0 in place, 1 off the screen.
let L=null;
function layers(nav,s){
  const {top,flow}=nav,w=innerWidth,d=sgn(),dim=document.createElement("div");dim.className="ios-dim";
  let under=nav.under,tb=null,clone=null;
  const keep=el=>el&&(el._iosT=el.style.transform,el.classList.add("ios-moving"));
  if(flow){
    // A page inside a tab: lift it over a shade on the plain paper.
    top._iosS=top.getAttribute("style");
    Object.assign(top.style,{position:"relative",zIndex:"1",background:"var(--paper)",minHeight:"100vh"});
    dim.style.zIndex="0";top.before(dim);under=null;
  }else{
    const z=zOf(top);
    if(s&&s.el===top){clone=s;top.after(s.c);s.c.style.zIndex=String(z-1);rescroll(s,s.c);under=s.c}
    dim.style.zIndex=String(z-1);(clone?clone.c:top).after(dim);
    if(under&&under===baseEl())tb=byId("tabbar");
  }
  keep(top);keep(under);keep(tb);top.classList.add("ios-top");
  L={top,under,tb,dim,clone,flow,w,d};return L}
const X=p=>`translate3d(${(p*L.w*L.d).toFixed(1)}px,0,0)`,U=p=>`translate3d(${(-(1-p)*.3*L.w*L.d).toFixed(1)}px,0,0)`;
function put(p){if(!L)return;L.top.style.transform=X(p);
  if(L.under)L.under.style.transform=U(p);if(L.tb)L.tb.style.transform=U(p);L.dim.style.opacity=String(1-p)}
function anim(a,b,ms,ease){
  if(!L)return Promise.resolve();
  const o={duration:ms,easing:ease||EASE,fill:"forwards"},as=[L.top.animate([{transform:X(a)},{transform:X(b)}],o),L.dim.animate([{opacity:1-a},{opacity:1-b}],o)];
  [L.under,L.tb].forEach(el=>{if(el)as.push(el.animate([{transform:U(a)},{transform:U(b)}],o))});
  return Promise.all(as.map(x=>x.finished.catch(()=>{}))).then(()=>{put(b);as.forEach(x=>x.cancel())})}
function done(){
  if(!L)return;const {top,under,tb,dim,clone,flow,back}=L;L=null;
  [top,under,tb].forEach(el=>{if(!el)return;el.getAnimations().forEach(a=>{if(a.effect&&a.effect.getKeyframes().some(k=>"transform" in k))a.cancel()});
    el.style.transform=el._iosT||"";el.classList.remove("ios-moving","ios-top")});
  if(flow){const s=top._iosS;if(s==null)top.removeAttribute("style");else top.setAttribute("style",s)}
  // Back on the place before: it's where you left it.
  if(back&&clone&&vis(clone.el))rescroll(clone,clone.el);
  dim.remove();if(clone)clone.c.remove();
}
// After going back from a page inside a tab, what's underneath settles in.
function settle(){const el=baseEl();if(!el)return;const d=sgn(),w=innerWidth;
  el.animate([{transform:`translate3d(${-.3*w*d}px,0,0)`,opacity:.6},{transform:"none",opacity:1}],{duration:340,easing:EASE})}

// ---- going back: Back buttons and the swipe ----
const _back=history.back.bind(history),_push=history.pushState.bind(history),_replace=history.replaceState.bind(history);
let busy=false,popping=0,queued=0,tapAt=0;
// Ready again: any Back asked for during the move happens now.
function idle(){busy=false;while(queued>0){queued--;_back()}}
function popDone(){if(!popping)return;clearTimeout(popping);popping=0;
  const flow=L&&L.flow,fin=()=>{done();if(flow)settle();idle()};
  // More's own pages close on the address change that follows, not before.
  if(flow&&SUB.includes(L.top.id)){let ok=0;const h=()=>{if(ok)return;ok=1;removeEventListener("hashchange",h);requestAnimationFrame(fin)};
    addEventListener("hashchange",h);setTimeout(h,300)}
  else fin()}
function leave(p,ms,ease){busy=true;L.back=true;
  anim(p,1,ms,ease).then(()=>{popping=setTimeout(popDone,800);_back()})}
// Back buttons call history.back(): the page slides away first, then goes.
history.back=function(){
  if(busy){queued++;return}
  const nav=performance.now()-tapAt<900?navNow():null;
  if(!nav)return _back();
  const s=history.state&&snaps.get(history.state.iosSnap);
  layers(nav,s);leave(0,nav.flow?360:420)};
addEventListener("popstate",()=>{if(popping)popDone();else if(L&&!busy){G=null;done()}});

// Back from a page lands where you were, not where the browser last noted.
try{history.scrollRestoration="manual"}catch(e){}

// ---- opening: pages slide in ----
history.pushState=function(st,t,u){
  const r=_push(st,t,u);
  if(marked(st)){const p=pre;pre=null;queueMicrotask(()=>opened(p))}
  return r};
function opened(p){
  if(L&&!popping){G=null;busy=false;done()}
  if(busy)return;
  const nav=navNow();if(!nav||nav.top.id==="sview")return; // search opens in place, with the keyboard
  let s=null;
  if(p&&p.el===nav.top&&performance.now()-p.at<1500){s=p.s;try{_replace(Object.assign({},history.state,{iosSnap:keepSnap(s)}),"")}catch(e){}}
  if(nav.flow){nav.top.animate([{transform:`translate3d(${.25*innerWidth*sgn()}px,0,0)`,opacity:0},{transform:"none",opacity:1}],{duration:380,easing:EASE});return}
  busy=true;layers(nav,s);put(1);
  anim(1,0,480).then(()=>{done();idle()})}
// More's own pages change the address (#admin…) rather than history.state.
let popAt=0;addEventListener("popstate",()=>{popAt=performance.now()});
addEventListener("hashchange",()=>{const h=location.hash.slice(1);
  if(performance.now()-popAt<200||!SUB.includes(h)||!phone())return;
  const el=byId(h);if(vis(el))el.animate([{transform:`translate3d(${.25*innerWidth*sgn()}px,0,0)`,opacity:0},{transform:"none",opacity:1}],{duration:380,easing:EASE})});

// Taps: none while a page is moving; a copy of the page before a place on
// it opens the next one in the same page.
addEventListener("click",e=>{
  if(busy||G&&G.on){e.preventDefault();e.stopImmediatePropagation();return}
  tapAt=performance.now();
  if(!phone()||!e.target.closest)return;
  const card=e.target.closest("[data-id]");if(!card)return;
  const top=topPage();if(top&&top.contains(card)&&!card.closest(".ios-snap"))pre={el:top,s:snap(top),at:tapAt};
},true);

// ---- the swipe ----
// The finger is followed on the very thing it touched as well as on the
// page: when a page redraws under the finger (the contributors' cards, a
// shared trip refreshing), iOS tells only that thing, now gone from the
// page, that the finger lifted, and the page would stay stuck halfway.
// Should one still be missed, the next touch finishes the swipe.
let G=null,tgt=null,lastE=null,swipedAt=0;
function follow(t){unfollow();tgt=t;t.addEventListener("touchmove",move,{passive:false});t.addEventListener("touchend",end);t.addEventListener("touchcancel",end)}
function unfollow(){if(!tgt)return;tgt.removeEventListener("touchmove",move);tgt.removeEventListener("touchend",end);tgt.removeEventListener("touchcancel",end);tgt=null}
const once=e=>{if(e===lastE)return false;lastE=e;return true};
const finger=e=>[...e.touches].find(t=>t.identifier===G.id)||e.touches[0];
// Things with their own sideways swipe, and rows that scroll sideways.
function ownSwipe(t,stop){
  if(t.closest("input,textarea,select,[contenteditable=true],canvas,video,.maplibregl-map,.cs-stage,.bl-rope,[data-noswipe]"))return true;
  for(let el=t;el&&el!==stop;el=el.parentElement)
    if(el.scrollWidth>el.clientWidth+2){const o=getComputedStyle(el).overflowX;if(o==="auto"||o==="scroll")return true}
  return false}
// A sheet comes down only from its top: a list inside it scrolls first.
// The pop-up sheets (log in, the city, the planner…) and My trip's are
// closed by a tap on their shade; the ones inside a page (an app on
// Apollo's phone, a day trip, the profile's) by a tap on theirs.
function sheetFrom(t){
  if(!phone()||!t.closest||t.closest(".ios-ghost"))return null;
  let sh=null,bd=null;const host=t.closest(".tpick,#atsheet");
  if(host){if(!vis(host))return null;sh=host.querySelector(":scope>.tpick-sheet,:scope>.at-sh");bd=host}
  else{sh=t.closest(".ah-sheet,.tr-sheet,.pf-sheet");if(sh)bd=sh.classList.contains("pf-sheet")?sh.parentElement.querySelector(":scope>.pf-dim"):sh.parentElement}
  if(!sh||!bd||!sh.contains(t))return null;
  if(t.closest("input,textarea,select,[contenteditable=true],[draggable=true]"))return null;
  for(let el=t;el&&el!==sh.parentElement;el=el.parentElement)
    if(el.scrollHeight>el.clientHeight+2&&el.scrollTop>0){const o=getComputedStyle(el).overflowY;if(o==="auto"||o==="scroll")return null}
  return {sh,bd}}
function start(e){
  if(e.touches.length!==1)return;
  const t=e.touches[0];
  if(G){if(G.id===t.identifier)return; // the same touch, heard again by a page around it
    end({type:"touchend",timeStamp:e.timeStamp})} // a lift that was never heard
  if(busy||L)return;
  const sh=sheetFrom(e.target);
  if(sh){G={kind:"sheet",...sh,id:t.identifier,x0:t.clientX,y0:t.clientY,on:false,v:[]};follow(e.target);return}
  const nav=navNow();if(!nav||!nav.top.contains(e.target))return;
  const d=sgn(),w=innerWidth,edge=(d>0?t.clientX:w-t.clientX)<=24;
  if(!edge&&ownSwipe(e.target,nav.top))return;
  G={kind:"page",nav,id:t.identifier,x0:t.clientX,y0:t.clientY,d,w,on:false,p:0,ox:0,v:[]};follow(e.target)}
function move(e){
  if(!G||!once(e))return;const t=finger(e);
  if(G.kind==="sheet"){const dy=t.clientY-G.y0,dx=t.clientX-G.x0;
    if(!G.on){if(Math.abs(dx)<8&&Math.abs(dy)<8)return;if(dy>8&&dy>Math.abs(dx)*1.2){G.on=true;G.oy=dy;grab(G)}else{G=null;unfollow();return}}
    if(e.cancelable)e.preventDefault();
    G.dy=dy-G.oy;drag(G);G.v.push([t.clientY,e.timeStamp]);if(G.v.length>5)G.v.shift();return}
  const dx=(t.clientX-G.x0)*G.d,dy=t.clientY-G.y0;
  if(!G.on){if(Math.abs(dx)<10&&Math.abs(dy)<10)return;
    if(dx>Math.abs(dy)*1.2){G.on=true;G.ox=Math.min(dx,12);quiet(e.target);layers(G.nav,history.state&&snaps.get(history.state.iosSnap))}else{G=null;unfollow();return}}
  if(e.cancelable)e.preventDefault();
  // From where the swipe was recognised, so the page doesn't jump to the finger.
  G.p=clamp((dx-G.ox)/G.w,0,1);put(G.p);G.v.push([t.clientX,e.timeStamp]);if(G.v.length>5)G.v.shift()}
// How fast the finger was going when it let go (px/ms); held still, it's 0.
const speed=(v,d,t)=>{const a=v[0],b=v[v.length-1];return a&&b&&b[1]>a[1]&&t-b[1]<90?((b[0]-a[0])*d)/(b[1]-a[1]):0};
function end(e){
  if(!G||e.timeStamp===undefined||!once(e))return;const g=G;G=null;unfollow();if(!g.on)return;
  if(g.kind==="sheet"){const v=speed(g.v,1,e.timeStamp),h=g.sh.offsetHeight;
    if(e.type!=="touchcancel"&&(g.dy>Math.min(150,h*.3)||(v>.5&&g.dy>24)))pullAway(g,v);else snapBack(g);
    return}
  swipedAt=performance.now();
  const v=speed(g.v,g.d,e.timeStamp),go=e.type!=="touchcancel"&&v>-.2&&(g.p>.4||(v>.35&&g.p>.02));
  if(go)leave(g.p,clamp((1-g.p)*g.w/Math.max(v,.9),160,380),OUT);
  else{busy=true;anim(g.p,0,clamp(g.p*g.w/Math.max(-v,.9),150,300),OUT).then(()=>{done();idle()})}}
// Swiping a page away isn't also a swipe on what's in it: the contributors'
// page would switch character (and redraw) as it went.
function quiet(t){try{t.dispatchEvent(new PointerEvent("pointercancel",{bubbles:true}))}catch(e){}}
addEventListener("pointerup",e=>{if(G&&G.on&&G.kind==="page"||performance.now()-swipedAt<400)e.stopImmediatePropagation()},true);

// ---- sheets rise and sink ----
// A sheet rises from the bottom as its shade fades in, and sinks back down
// when it closes, however it's closed: ✕, a tap on the shade, a choice made
// in it, or pulled down, the shade lightening as it goes. The app only
// shows and hides them (or draws them into a page and out again), so a
// closing sheet is a copy (ios-ghost) that sinks and is gone.
const SINK="cubic-bezier(.32,.72,0,1)";
let noGhost=0;
// The shade: the sheet's own backdrop (its colour fades), a dim beside it
// (it fades), or for the map's city list its own shadow (the list fades).
function shade(bd,sh){
  if(bd!==sh&&bd.contains(sh)){const m=(getComputedStyle(bd).backgroundColor.match(/[\d.]+/g)||[]).map(Number);
    const a=m.length>3?m[3]:m.length?1:0,c=k=>`rgba(${m[0]||0},${m[1]||0},${m[2]||0},${(a*k).toFixed(3)})`;
    return {set:k=>{bd.style.backgroundColor=k==null?"":c(k)},kf:(x,y)=>[{backgroundColor:c(x)},{backgroundColor:c(y)}]}}
  return {set:k=>{bd.style.opacity=k==null?"":String(k)},kf:(x,y)=>[{opacity:x},{opacity:y}]}}
function rise(bd,sh){
  if(!sh||!sh.isConnected)return;const h=sh.getBoundingClientRect().height;
  sh.animate([{transform:`translate3d(0,${h+60}px,0)`},{transform:"translate3d(0,0,0)"}],{duration:520,easing:SINK});
  bd.animate(shade(bd,sh).kf(0,1),{duration:360,easing:"ease-out"})}
function sink(nodes,bd,sh){
  const h=sh.getBoundingClientRect().height,o={duration:380,easing:SINK,fill:"forwards"};
  const a=sh.animate([{transform:"translate3d(0,0,0)"},{transform:`translate3d(0,${h+60}px,0)`}],o);
  bd.animate(shade(bd,sh).kf(1,0),o);
  const bye=()=>nodes.forEach(n=>n.remove());a.finished.then(bye,bye);setTimeout(bye,900)}
const ghostly=n=>{n.classList.add("ios-ghost");n.inert=true;n.setAttribute("aria-hidden","true");return n};
// The pop-up sheets, My trip's and the map's city list: shown and hidden.
const HOSTS=".tpick,#atsheet,.mp-cities";
const sheetIn=host=>host.matches(".mp-cities")?host:host.querySelector(":scope>.tpick-sheet,:scope>.at-sh");
function hostGhost(host){
  const g=ghostly(host.cloneNode(true));g.removeAttribute("hidden");
  const a=host.querySelectorAll("input,textarea"),b=g.querySelectorAll("input,textarea");
  a.forEach((x,i)=>{if(b[i]&&x.type!=="password")b[i].value=x.value}); // what was typed stays as it was
  host.after(g);const sh=sheetIn(g);if(sh)sink([g],g,sh);else g.remove()}
new MutationObserver(ms=>{
  if(!phone())return;const first=new Map(),added=new Set();
  for(const m of ms){
    if(m.type==="attributes"){if(!first.has(m.target))first.set(m.target,m.oldValue)}
    else m.addedNodes.forEach(n=>{if(n.nodeType===1&&n.matches(HOSTS))added.add(n)})}
  first.forEach((old,el)=>{if(!el.matches(HOSTS)||el.classList.contains("ios-ghost")||added.has(el))return;
    const was=old===null,now=!el.hidden;
    if(!was&&now)rise(el,sheetIn(el));
    else if(was&&!now&&performance.now()-noGhost>150)hostGhost(el)});
  added.forEach(el=>{if(!el.hidden&&!el.classList.contains("ios-ghost"))rise(el,sheetIn(el))});
}).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:["hidden"],attributeOldValue:true});
// Sheets drawn inside a page: an app on Apollo's phone, a day trip on How
// far?, the profile's. Closing redraws the page without it, so the sheet
// that was taken out is put back for a moment to sink.
[["aphome",".ah-sscrim",".ah-sheet"],["trview",".tr-scrim",".tr-sheet"],["pfview",".pf-dim",".pf-sheet"]].forEach(([id,bs,ss])=>{
  const pg=byId(id);if(!pg)return;let had=false;
  new MutationObserver(ms=>{
    const bd=pg.querySelector(bs+":not(.ios-ghost)"),sh=pg.querySelector(ss+":not(.ios-ghost)"),has=!!(bd&&sh)&&!pg.hidden;
    if(phone()&&!pg.hidden){
      if(has&&!had)rise(bd,sh);
      else if(!has&&had&&performance.now()-noGhost>150){let ob=null,os=null,par=null;
        for(const m of ms)for(const n of m.removedNodes){if(n.nodeType!==1||n.classList.contains("ios-ghost"))continue;
          if(!ob&&(ob=n.matches(bs)?n:n.querySelector(bs)))par=m.target;
          if(!os)os=n.matches(ss)?n:n.querySelector(ss)}
        if(ob&&os&&par&&par.isConnected){const nodes=ob.contains(os)?[ob]:[ob,os];nodes.forEach(n=>par.appendChild(ghostly(n)));sink(nodes,ob,os)}}}
    had=has;
  }).observe(pg,{childList:true,subtree:true,attributes:true,attributeFilter:["hidden"]});
});
// Pulling one down.
function grab(g){g.s=shade(g.bd,g.sh);g.h=g.sh.offsetHeight||1;
  [g.sh,g.bd].forEach(el=>el.getAnimations().forEach(a=>a.cancel()));g.sh.style.transition="none"}
function drag(g){const y=g.dy>=0?g.dy:-Math.min(24,Math.sqrt(-g.dy)*2.4); // past the top it only stretches a little
  g.sh.style.transform=`translate3d(0,${y.toFixed(1)}px,0)`;g.s.set(1-clamp(g.dy/g.h,0,1))}
function snapBack(g){const {sh,bd,s,h}=g,y=Math.max(0,g.dy||0),o={duration:320,easing:OUT};
  sh.animate([{transform:sh.style.transform||"translate3d(0,0,0)"},{transform:"translate3d(0,0,0)"}],o);
  bd.animate(s.kf(1-clamp(y/h,0,1),1),o);sh.style.transform="";sh.style.transition="";s.set(null)}
function pullAway(g,v){busy=true;const {sh,bd,s,h}=g,y=Math.max(0,g.dy);
  const o={duration:clamp((h+60-y)/Math.max(v,1.1),160,320),easing:"cubic-bezier(.2,.6,.35,1)",fill:"forwards"};
  const a=sh.animate([{transform:`translate3d(0,${y}px,0)`},{transform:`translate3d(0,${h+60}px,0)`}],o),b=bd.animate(s.kf(1-clamp(y/h,0,1),0),o);
  const fin=()=>{busy=false;noGhost=performance.now();bd.dispatchEvent(new MouseEvent("click",{bubbles:true}));
    if(bd.isConnected&&vis(bd)&&vis(sh)){sh.style.transform=`translate3d(0,${h+60}px,0)`;a.cancel();b.cancel();snapBack({...g,dy:h})} // it stayed open
    else{a.cancel();b.cancel();sh.style.transform="";sh.style.transition="";s.set(null)}};
  a.finished.then(fin,()=>{busy=false;snapBack(g)})}
// The listeners sit on the pages and sheets themselves, so Explore and the
// map scroll as freely as ever.
function bind(el){if(!el||el._ios)return;el._ios=1;
  el.addEventListener("touchstart",start,{passive:true});el.addEventListener("touchmove",move,{passive:false});
  el.addEventListener("touchend",end);el.addEventListener("touchcancel",end)}
function bindAll(){[...PAGES,"trip",...SUB,"atsheet"].forEach(id=>bind(byId(id)));document.querySelectorAll(".tpick:not(.ios-ghost)").forEach(bind)}
bindAll();
new MutationObserver(ms=>{if(ms.some(m=>[...m.addedNodes].some(n=>n.nodeType===1&&!n.classList.contains("ios-ghost")&&(n.classList.contains("tpick")||PAGES.includes(n.id)))))bindAll()})
  .observe(document.body,{childList:true});

// ---- back to the top ----
// The tab you're on, tapped again, scrolls up; once at the top it does what
// it always did.
addEventListener("click",e=>{const a=e.target.closest&&e.target.closest("#tabbar .tb.on:not(.tb-apo)");
  if(!a||!phone()||topPage()||window.scrollY<4)return;
  e.preventDefault();e.stopImmediatePropagation();window.scrollTo({top:0,behavior:"smooth"})},true);
// ---- the tab bar's glass lens (iOS 26) ----
// The tab you're on sits on a soft pill. Press the bar and the pill lifts
// into a clear glass lens: the bar swells a little and the icon under the
// lens grows. Slide along the bar and the lens follows, stretching with
// the speed; let go and it springs onto the tab under it and opens it. A
// tap flies it to the tab tapped. Apollo, raised in the middle, keeps its
// own button (the lens can still be let go over it).
const bar=byId("tabbar"),lens=document.createElement("i");lens.className="ios-lens";lens.setAttribute("aria-hidden","true");
const SK=560,SC=2*Math.sqrt(SK)*.7,S={x:[0,0,0],y:[0,0,0],w:[0,0,0],h:[0,0,0]}; // [now, speed, aim]: a spring each
let lraf=0,lt=0,barW=-1,LP=null;
const tbs=()=>[...bar.querySelectorAll(".tb")],onTab=()=>bar.querySelector(".tb.on:not(.tb-apo)");
// Measured inside the bar, so its swell (and a page sliding it along) don't count.
const midX=tb=>tb.offsetLeft+tb.offsetWidth/2;
const local=cx=>{const B=bar.getBoundingClientRect();return (cx-B.left)*bar.offsetWidth/(B.width||1)};
function geo(tb,up){const ref=bar.querySelector(".tb:not(.tb-apo)")||tb;
  return up?{x:midX(tb),y:bar.offsetHeight/2,w:ref.offsetWidth+22,h:bar.offsetHeight+14}:{x:midX(tb),y:ref.offsetTop+ref.offsetHeight/2,w:ref.offsetWidth-6,h:ref.offsetHeight+8}}
function drawLens(){const u=S.x[1],sx=1+Math.min(Math.abs(u)/2600,.22),sy=1-Math.min(Math.abs(u)/5200,.1);
  lens.style.width=S.w[0].toFixed(1)+"px";lens.style.height=S.h[0].toFixed(1)+"px";
  lens.style.transform=`translate3d(${(S.x[0]-S.w[0]/2).toFixed(1)}px,${(S.y[0]-S.h[0]/2).toFixed(1)}px,0) scale(${sx.toFixed(3)},${sy.toFixed(3)})`}
function lensTick(now){const dt=Math.min(.034,(now-lt)/1000);lt=now;let on=false;
  for(const k in S){const s=S[k];s[1]+=(SK*(s[2]-s[0])-SC*s[1])*dt;s[0]+=s[1]*dt;
    if(Math.abs(s[2]-s[0])>.05||Math.abs(s[1])>.5)on=true;else{s[0]=s[2];s[1]=0}}
  drawLens();lraf=on?requestAnimationFrame(lensTick):0}
function aim(g,snap){for(const k in g){const s=S[k];s[2]=g[k];if(snap){s[0]=g[k];s[1]=0}}
  if(snap){cancelAnimationFrame(lraf);lraf=0;drawLens()}else if(!lraf){lt=performance.now();lraf=requestAnimationFrame(lensTick)}}
// Back on the tab you're on (at once when the bar has only just appeared).
function rest(snap){if(!bar||!phone())return;if(!lens.isConnected){bar.prepend(lens);snap=true}
  const t=onTab(),w=bar.offsetWidth;if(!w)return;if(w!==barW){barW=w;snap=true}
  lens.style.visibility=t?"":"hidden";if(t)aim(geo(t,false),snap)}
const mag=tb=>tbs().forEach(x=>x.classList.toggle("ios-mag",x===tb));
const nearest=x=>tbs().reduce((a,tb)=>Math.abs(midX(tb)-x)<Math.abs(midX(a)-x)?tb:a);
function release(e,cancel){if(!LP)return;const p=LP;LP=null;
  bar.classList.remove("ios-press");lens.classList.remove("up");mag(null);
  if(p.drag&&e&&e.cancelable)e.preventDefault(); // a slide isn't also a tap
  const on=onTab(),t=p.over;
  if(cancel||t===on)return rest();
  if(!p.drag){if(!t.classList.contains("tb-apo"))aim(geo(t,false));setTimeout(()=>{if(!LP)rest()},400);return} // the tap's own click opens it
  if(t.classList.contains("tb-apo"))rest();else aim(geo(t,false));
  t.click()}
if(bar){
  bar.addEventListener("touchstart",e=>{
    if(!phone()||e.touches.length!==1)return;const t=e.touches[0],tb=e.target.closest(".tb");
    if(!tb||tb.classList.contains("tb-apo"))return;
    rest();LP={x0:t.clientX,y0:t.clientY,id:t.identifier,drag:false,over:tb};
    lens.style.visibility="";lens.classList.add("up");bar.classList.add("ios-press");mag(tb);aim(geo(tb,true))},{passive:true});
  bar.addEventListener("touchmove",e=>{if(!LP)return;const t=[...e.touches].find(x=>x.identifier===LP.id);if(!t)return;
    const dx=t.clientX-LP.x0,dy=t.clientY-LP.y0;
    if(!LP.drag){if(Math.abs(dy)>14&&Math.abs(dy)>Math.abs(dx))return release(null,true);if(Math.abs(dx)<6)return;LP.drag=true}
    if(e.cancelable)e.preventDefault();
    const cs=tbs().map(midX),x=clamp(local(t.clientX),Math.min(...cs)-12,Math.max(...cs)+12);
    const n=nearest(x);if(n!==LP.over){LP.over=n;mag(n)}
    const g=geo(n,true);g.x=x;aim(g)},{passive:false});
  bar.addEventListener("touchend",e=>release(e,false),{passive:false});
  bar.addEventListener("touchcancel",()=>release(null,true));
  // The tab changed (a tap, or from anywhere else), or the bar was redrawn.
  new MutationObserver(ms=>{if(LP)return;
    if(ms.some(m=>m.type==="childList"?!lens.isConnected:m.target.classList.contains("tb")&&(m.oldValue||"").split(" ").includes("on")!==m.target.classList.contains("on")))rest()})
    .observe(bar,{childList:true,subtree:true,attributes:true,attributeFilter:["class"],attributeOldValue:true});
  // The bar hides under Ask Apollo and some sheets; back, the pill is in place.
  new MutationObserver(()=>{if(!LP&&bar.offsetWidth!==barW)rest(true)}).observe(H,{attributes:true,attributeFilter:["class"]});
  addEventListener("resize",()=>{barW=-1;rest(true)});
  requestAnimationFrame(()=>rest(true));if(document.fonts)document.fonts.ready.then(()=>{barW=-1;rest(true)});
}

// The status bar: the page on top scrolls up (the tabs do it by themselves).
addEventListener("statusTap",()=>{const top=topPage();if(!top)return;
  const all=[top,...top.querySelectorAll("*")].filter(el=>el.scrollTop>0&&el.clientHeight>innerHeight*.4);
  if(all[0])all[0].scrollTo({top:0,behavior:"smooth"})});

// ---- photos: no "?" while one loads ----
// A photo shimmers until it has loaded (js/live.js marks it tn-ok), and on
// the iPhone it stays hidden till then, so iOS's broken-picture "?" never
// shows (css/tabi.css). One that had already loaded before live.js was
// listening is marked here, and one given a new photo shimmers again.
const PHOTO=/assets\/(?:photos|hoods|album)\/|_capacitor_file_/;
function watch(im){
  if(PHOTO.test(im.getAttribute("src")||""))im.classList.toggle("tn-ok",!!(im.complete&&im.naturalWidth))}
const scan=n=>{if(n.nodeType!==1)return;if(n.tagName==="IMG")watch(n);else n.querySelectorAll("img").forEach(watch);
  if(tapRow&&performance.now()-tapRow.at<1000)(n.matches(ROWS)?[n]:[...n.querySelectorAll(ROWS)]).forEach(r=>{if(rowKey(r)===tapRow.k)r.scrollLeft=tapRow.x});
  const at=n.classList.contains("maplibregl-ctrl-attrib")?n:n.querySelector(".maplibregl-ctrl-attrib");
  // The map opens its credits once they've arrived, a moment after it shows.
  if(at&&!at._tnFold){at._tnFold=new MutationObserver(foldCredits);at._tnFold.observe(at,{attributes:true,attributeFilter:["class"]});foldCredits()}};
// ---- rows of chips keep their place ----
// Tapping a chip redraws its panel (the map's filters, Explore's moods, the
// areas' pills…): the row stays where you'd scrolled it instead of jumping
// back to the start.
const ROWS=".mp-chips,.hx-moods,.ax-pills,.ax-moods,.lv-f,.rs-chips,.sb-pills,.tv-pills,.ax-hs";
const rowKey=r=>{const pg=r.closest("[id]"),same=pg?[...pg.querySelectorAll(ROWS)].filter(x=>x.className===r.className):[r];return (pg?pg.id:"")+"|"+r.className+"|"+same.indexOf(r)};
let tapRow=null;
addEventListener("click",e=>{const r=e.target.closest&&e.target.closest(ROWS);tapRow=r?{k:rowKey(r),x:r.scrollLeft,at:performance.now()}:null},true);
// ---- the map's credits ----
// OpenFreeMap, OpenMapTiles and OpenStreetMap are credited in the ⓘ in the
// map's corner, as their licences ask. It starts folded instead of opening
// over the map every time; a tap on ⓘ opens it.
function foldCredits(){const a=document.querySelector("#amap .maplibregl-ctrl-attrib.maplibregl-compact-show:not(.tn-folded)");
  if(a){a.classList.remove("maplibregl-compact-show");a.classList.add("tn-folded")}}
new MutationObserver(ms=>{for(const m of ms){if(m.type!=="attributes")m.addedNodes.forEach(scan);else if(m.target.tagName==="IMG")watch(m.target)}})
  .observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:["src"]});
scan(document.body);

// ---- the app behind holds still ----
// While a page, a sheet, Ask Apollo, the first-run pages or the map are up,
// dragging can't move the app behind them (css/tabi.css, ios-lock): only
// what's on top scrolls and bounces, as in any iPhone app.
function lockCheck(){const c=H.classList,on=!!topPage()||H.dataset.tab==="map"||["chat-open","onb-open","tn-splash","tpick-open","at-sheet-open"].some(k=>c.contains(k))||
  [...document.querySelectorAll(".tpick:not(.ios-ghost),#atsheet:not(.ios-ghost),#bell")].some(vis);
  if(on!==c.contains("ios-lock"))c.toggle("ios-lock",on)}
let lockT=0;const lockSoon=()=>{if(!lockT)lockT=requestAnimationFrame(()=>{lockT=0;lockCheck()})};
new MutationObserver(lockSoon).observe(H,{attributes:true,attributeFilter:["class","data-tab"]});
new MutationObserver(lockSoon).observe(document.body,{attributes:true,attributeFilter:["hidden"],subtree:true,childList:true});
addEventListener("popstate",lockSoon);lockCheck();

// ---- the edge under the status bar ----
// As on iOS 26, what scrolls up under the clock and the Dynamic Island
// melts into a soft blur instead of running into them (css/tabi.css).
const edge=document.createElement("div");edge.id="ios-edge";edge.setAttribute("aria-hidden","true");document.body.appendChild(edge);
let scroller=null,edgeT=0;
function edgeCheck(){edgeT=0;
  const c=H.classList,top=topPage();let y=0;
  if(["chat-open","onb-open","tn-splash"].some(k=>c.contains(k))||[...document.querySelectorAll(".tpick:not(.ios-ghost),#atsheet:not(.ios-ghost)")].some(vis))y=0;
  else if(top){if(!["lens","crewcs","sview"].includes(top.id)&&scroller&&top.contains(scroller)&&scroller.clientHeight>innerHeight*.4)y=scroller.scrollTop}
  else if(H.dataset.tab!=="map")y=window.scrollY;
  const on=y>4;edge.classList.toggle("on",on);
  if(on){const el=document.elementFromPoint(innerWidth/2,4);edge.classList.toggle("dark",!!(el&&el.closest(".xs-night,.pv-hero,.ar-hero,.at-cover")))}}
const edgeSoon=()=>{if(!edgeT)edgeT=requestAnimationFrame(edgeCheck)};
document.addEventListener("scroll",e=>{if(e.target&&e.target.nodeType===1)scroller=e.target;edgeSoon()},{capture:true,passive:true});
new MutationObserver(edgeSoon).observe(H,{attributes:true,attributeFilter:["class","data-tab"]});
addEventListener("popstate",edgeSoon);

// iOS only shows a button as pressed (the glass swelling, css/tabi.css)
// when the page listens for touches.
document.addEventListener("touchstart",()=>{},{passive:true});

window.tnIOSNav={navNow,busy:()=>busy||!!L}; // for tests
})();
