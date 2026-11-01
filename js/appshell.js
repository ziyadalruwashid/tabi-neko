// The app layout: what the page looks like inside the iPhone and Android
// apps (and in a browser tab opened with ?app=1). The website itself is
// untouched; everything here only runs when <html> has the "tn-app" class,
// which index.html sets before the first paint.
//
// - A bottom tab bar: Explore · Map · Apollo · My trip · More.
// - Explore: city chips, search, categories and swipeable rows of places.
// - A full place page, opened from anywhere a place is picked (a row, the
//   list, a map pin, a search result, a name in Apollo's answer). The phone's
//   back button closes it.
// - More: the account, the other pages and the settings.
// Loaded last, after js/admin.js, and uses the helpers from js/app.js and
// js/trip.js.
(function(){
if(!IS_APP)return;

const SVG=(d,fill)=>`<svg viewBox="0 0 24 24" width="25" height="25" fill="${fill?"currentColor":"none"}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const I={
  explore:'<path d="M4 11.5 12 5l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z"/>',
  map:'<path d="m9 4-5 2v14l5-2 6 2 5-2V4l-5 2-6-2zM9 4v14M15 6v14"/>',
  trip:'<path d="M7 4h10a1 1 0 0 1 1 1v15l-6-3-6 3V5a1 1 0 0 1 1-1z"/>',
  menu:'<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
  search:'<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
  back:'<path d="m15 5-7 7 7 7"/>',
  share:'<path d="M12 15V4m0 0-4 4m4-4 4 4M6 13v6h12v-6"/>',
  pin:'<path d="M12 21s-6-5.4-6-11a6 6 0 1 1 12 0c0 5.6-6 11-6 11z"/><circle cx="12" cy="10" r="2.2"/>',
};
const cityOf=c=>D(CITIES[c],"n");
const placeById=id=>P.find(p=>p.id===id);
// A place as a photo card. Places without a photo show their category art.
const pcard=p=>`<button type="button" class="pc" data-id="${p.id}" style="--c:var(--${p.cat})">
  <span class="pimg${p.photo?"":" art"}"><img src="${p.photo||CATS[p.cat].img}" alt="" loading="lazy">${p.halal?`<i class="hb">${p.hl==="friendly"?T("Muslim-friendly"):T("halal ✓")}</i>`:""}${p.gem?`<i class="gb">${T("⭐ hidden gem")}</i>`:""}</span>
  <b><bdi>${esc(p.n)}</bdi></b><small><i></i>${esc(D(CATS[p.cat],"n"))} · ${esc(AREA(p.area))}</small></button>`;
const wireCards=box=>box.querySelectorAll(".pc").forEach(b=>b.onclick=()=>openPlace(b.dataset.id));

// ---- the tab bar ----
const TABS=[["explore","Explore"],["map","Map"],["apollo","Apollo"],["trip","My trip"],["menu","More"]];
const bar=document.createElement("nav");bar.id="tabbar";document.body.appendChild(bar);
function renderTabs(){
  bar.setAttribute("aria-label",T("Main"));
  bar.innerHTML=TABS.map(([k,l])=>k==="apollo"
    ?`<button type="button" class="tb tb-apo" data-t="apollo"><span class="tb-cat"><img src="assets/cat.png" alt=""></span><b>${T(l)}</b></button>`
    :`<a class="tb" href="#${k}" data-t="${k}">${SVG(I[k])}<b>${T(l)}</b></a>`).join("");
  bar.querySelectorAll("a.tb").forEach(a=>a.onclick=e=>{e.preventDefault();go(a.dataset.t)});
  bar.querySelector(".tb-apo").onclick=()=>openApollo();
  if(typeof tripBadge==="function")tripBadge();
  syncTabs();
}
// Tabs swap in place (no history), like any app; pages opened from More
// and place pages are added to history, so the back button returns.
function go(t,keep){
  closePlaceNow();if(typeof closeList==="function")closeList();if(window.closeSearchNow)closeSearchNow(true);
  try{history.replaceState(null,"","#"+t)}catch(_){}show(t,true);
  // Explore follows your trip, which may have changed on the other tabs.
  if(t==="explore"&&typeof renderExplore==="function")renderExplore();
  if(!keep)window.scrollTo(0,0);
}
const SUB=["hoods","apps","trips","memories","crew","privacy","admin"];
function current(){const h=location.hash.slice(1);
  if(h==="explore"||h==="trip"||h==="menu")return h;if(h==="hoods")return "explore";if(SUB.includes(h))return "menu";
  return $("home").hidden?"explore":"map"}
function syncTabs(){const c=current();bar.querySelectorAll(".tb").forEach(b=>b.classList.toggle("on",b.dataset.t===c))}
const _show=show;show=function(t,q){_show(t,q);syncTabs()};

// ---- Explore ----
let exploreCity=city;
// Japan's clock, whatever the phone's time zone: the header follows it.
const jst=()=>{const d=new Date(Date.now()+9*3600e3);return {h:d.getUTCHours(),m:d.getUTCMinutes(),mo:d.getUTCMonth(),day:Math.floor(d.getTime()/864e5)}};
const PERIODS={morning:{sky:["#9FD3EE","#FBE7C6"],far:"#A9C9DC",mid:"#86A9C2",near:"#6F93AE",sun:"#FFE7A3",greet:"Good morning",hint:"a good time for temples"},
  afternoon:{sky:["#4FA8DE","#BEE2F3"],far:"#9CC2D8",mid:"#7AA4C0",near:"#5F88A8",sun:"#FFF6D6",greet:"Hi",hint:"nice weather for a walk"},
  sunset:{sky:["#E2665A","#FBC98E"],far:"#E9A285",mid:"#C67C6E",near:"#A8605A",sun:"#FFD08A",greet:"Good evening",hint:"sunset soon"},
  night:{sky:["#121A3A","#3A3D76"],far:"#363C6E",mid:"#272B55",near:"#1D2045",sun:null,greet:"Evening",hint:"time for the night views"}};
const period=h=>h>=5&&h<11?"morning":h>=11&&h<16?"afternoon":h>=16&&h<19?"sunset":"night";
function jstText(){const {h,m}=jst(),hh=h%12||12,mm=String(m).padStart(2,"0");
  if(!isAR())return `${hh}:${mm} ${h<12?"am":"pm"} in ${cityOf(exploreCity)}`;
  const part=h>=4&&h<11?"الصبح":h<14?"الظهر":h<17?"العصر":h<19?"المغرب":"الليل";
  return `${hh}:${mm} ${part} في ${cityOf(exploreCity)}`}
// The scene behind the greeting: sky for the hour in Japan, and the city's
// own landmarks.
// Each city's own landmarks behind the greeting, coloured like the real
// thing in the day, warm at sunset, and lit up at night.
const LM={
  // Tokyo Tower: red and white lattice, orange glow after dark.
  tower(cx,b,h,col){const w=h*.2;return `<g fill="${col}"><path d="M${cx-w} ${b} L${cx-w*.18} ${b-h*.72} L${cx+w*.18} ${b-h*.72} L${cx+w} ${b} L${cx+w*.62} ${b} Q${cx} ${b-h*.26} ${cx-w*.62} ${b} Z"/>
    <rect x="${cx-w*.62}" y="${b-h*.45}" width="${w*1.24}" height="${h*.06}" rx="1"/><rect x="${cx-w*.34}" y="${b-h*.74}" width="${w*.68}" height="${h*.05}" rx="1"/>
    <path d="M${cx-w*.12} ${b-h*.74} L${cx} ${b-h} L${cx+w*.12} ${b-h*.74} Z"/></g>
    <g stroke="#fff" stroke-width="1" opacity=".55" fill="none"><path d="M${cx-w*.82} ${b-h*.12} L${cx+w*.82} ${b-h*.12} M${cx-w*.56} ${b-h*.3} L${cx+w*.56} ${b-h*.3} M${cx-w*.3} ${b-h*.58} L${cx+w*.3} ${b-h*.58}"/></g>`},
  skytree(cx,b,h,col){return `<g fill="${col}"><path d="M${cx-9} ${b} L${cx-3} ${b-h*.78} L${cx+3} ${b-h*.78} L${cx+9} ${b} Z"/><rect x="${cx-10}" y="${b-h*.6}" width="20" height="9" rx="4"/><rect x="${cx-7}" y="${b-h*.76}" width="14" height="6" rx="3"/>
    <rect x="${cx-1.2}" y="${b-h}" width="2.4" height="${h*.25}"/></g>`},
  pagoda(cx,b,s,roof,body,spire){let g="",y=b;for(let i=0;i<5;i++){const rw=s*(1-i*.11),bw=s*.52*(1-i*.1),bh=s*.26;
    g+=`<rect x="${cx-bw/2}" y="${y-bh}" width="${bw}" height="${bh}" fill="${body}"/>`;y-=bh;
    g+=`<path d="M${cx-rw/2} ${y+2} Q${cx-rw*.3} ${y-4} ${cx-bw*.42} ${y-s*.1} L${cx+bw*.42} ${y-s*.1} Q${cx+rw*.3} ${y-4} ${cx+rw/2} ${y+2} Z" fill="${roof}"/>`;y-=s*.1}
    return g+`<rect x="${cx-1.4}" y="${y-s*.55}" width="2.8" height="${s*.55}" fill="${spire}"/>${[0,1,2,3,4].map(i=>`<rect x="${cx-4}" y="${y-s*.12-i*s*.07}" width="8" height="1.8" fill="${spire}"/>`).join("")}`},
  torii(cx,b,s,col){const pw=s*.09;return `<g fill="${col}"><rect x="${cx-s*.36-pw/2}" y="${b-s}" width="${pw}" height="${s}"/><rect x="${cx+s*.36-pw/2}" y="${b-s}" width="${pw}" height="${s}"/>
    <rect x="${cx-s*.5}" y="${b-s*.8}" width="${s}" height="${s*.07}"/><path d="M${cx-s*.62} ${b-s*1.04} Q${cx} ${b-s*.95} ${cx+s*.62} ${b-s*1.04} L${cx+s*.56} ${b-s*.92} L${cx-s*.56} ${b-s*.92} Z"/></g>`},
  castle(cx,b,s,wall,roof,stone,gold){const lv=[[1,.36],[.8,.3],[.62,.27],[.46,.25]];let y=b-s*.3,g=`<path d="M${cx-s*.62} ${b} L${cx-s*.5} ${y} L${cx+s*.5} ${y} L${cx+s*.62} ${b} Z" fill="${stone}"/>`;
    lv.forEach(([w,h],i)=>{const ww=s*w*.86,hh=s*h*.62;g+=`<rect x="${cx-ww/2}" y="${y-hh}" width="${ww}" height="${hh}" fill="${wall}"/><path d="M${cx-ww/2-s*.08} ${y-hh+3} Q${cx-ww*.3} ${y-hh-4} ${cx-ww*.3} ${y-hh-s*.07} L${cx+ww*.3} ${y-hh-s*.07} Q${cx+ww*.3} ${y-hh-4} ${cx+ww/2+s*.08} ${y-hh+3} Z" fill="${roof}"/>
      ${i===1||i===2?`<path d="M${cx-s*.08} ${y-hh-s*.07} L${cx} ${y-hh-s*.16} L${cx+s*.08} ${y-hh-s*.07} Z" fill="${roof}"/>`:""}<rect x="${cx-ww*.3}" y="${y-hh*.6}" width="${ww*.6}" height="${hh*.18}" fill="${roof}" opacity=".25"/>`;y-=hh+s*.07});
    return g+`<path d="M${cx-s*.17} ${y+1} L${cx-s*.2} ${y-s*.07} M${cx+s*.17} ${y+1} L${cx+s*.2} ${y-s*.07}" stroke="${gold}" stroke-width="4" stroke-linecap="round"/>`},
  tsutenkaku(cx,b,h,col,acc){return `<g fill="${col}"><path d="M${cx-18} ${b} L${cx-6} ${b-h*.42} L${cx+6} ${b-h*.42} L${cx+18} ${b} L${cx+10} ${b} Q${cx} ${b-h*.2} ${cx-10} ${b} Z"/><rect x="${cx-7}" y="${b-h*.9}" width="14" height="${h*.48}"/>
    <rect x="${cx-12}" y="${b-h*.86}" width="24" height="${h*.16}" rx="2"/><rect x="${cx-1.2}" y="${b-h}" width="2.4" height="${h*.12}"/></g><rect x="${cx-12}" y="${b-h*.8}" width="24" height="${h*.05}" fill="${acc}"/>`},
  hall(cx,b,s,roof,wall,gold){return `<rect x="${cx-s*.5}" y="${b-s*.08}" width="${s}" height="${s*.08}" fill="#B5AA9C"/><rect x="${cx-s*.42}" y="${b-s*.34}" width="${s*.84}" height="${s*.26}" fill="${wall}"/>
    ${[0,1,2,3,4,5,6].map(i=>`<rect x="${cx-s*.4+i*s*.13}" y="${b-s*.34}" width="${s*.03}" height="${s*.26}" fill="#5A3A2A" opacity=".55"/>`).join("")}
    <path d="M${cx-s*.62} ${b-s*.3} Q${cx-s*.4} ${b-s*.38} ${cx-s*.36} ${b-s*.46} L${cx+s*.36} ${b-s*.46} Q${cx+s*.4} ${b-s*.38} ${cx+s*.62} ${b-s*.3} Z" fill="${roof}"/>
    <rect x="${cx-s*.3}" y="${b-s*.56}" width="${s*.6}" height="${s*.1}" fill="${wall}"/>
    <path d="M${cx-s*.5} ${b-s*.52} Q${cx-s*.32} ${b-s*.6} ${cx-s*.28} ${b-s*.7} L${cx+s*.28} ${b-s*.7} Q${cx+s*.32} ${b-s*.6} ${cx+s*.5} ${b-s*.52} Z" fill="${roof}"/>
    <path d="M${cx-s*.3} ${b-s*.7} l2 -${s*.07} l5 ${s*.07} Z M${cx+s*.3} ${b-s*.7} l-2 -${s*.07} l-5 ${s*.07} Z" fill="${gold}"/>`},
  deer(x,b,s,col,flip,bow){const f=flip?-1:1;return `<g transform="translate(${x} ${b}) scale(${f*s} ${s})" fill="${col}"><ellipse cx="0" cy="-22" rx="16" ry="8"/><rect x="-12" y="-18" width="3" height="18"/><rect x="-6" y="-18" width="3" height="18"/><rect x="7" y="-18" width="3" height="18"/><rect x="11" y="-18" width="3" height="18"/>
    <path d="${bow?"M12 -26 L22 -14 L26 -10 L24 -6 L16 -14 Z":"M10 -26 L16 -40 L22 -40 L20 -34 L14 -24 Z"}"/>${bow?"":`<path d="M18 -40 l-2 -7 M20 -40 l3 -7" stroke="${col}" stroke-width="1.6"/>`}
    <circle cx="-4" cy="-24" r="1.6" fill="#fff" opacity=".7"/><circle cx="3" cy="-21" r="1.4" fill="#fff" opacity=".7"/><circle cx="-9" cy="-20" r="1.3" fill="#fff" opacity=".7"/></g>`},
  porttower(cx,b,h,col){return `<path d="M${cx-17} ${b} Q${cx-4} ${b-h*.5} ${cx-13} ${b-h*.9} L${cx+13} ${b-h*.9} Q${cx+4} ${b-h*.5} ${cx+17} ${b} Z" fill="${col}"/>
    <g stroke="#fff" stroke-width=".9" opacity=".45">${[-12,-6,0,6,12].map(o=>`<path d="M${cx+o*1.3} ${b} Q${cx+o*.35} ${b-h*.5} ${cx+o} ${b-h*.9}" fill="none"/>`).join("")}</g>
    <rect x="${cx-15}" y="${b-h*.98}" width="30" height="${h*.08}" rx="3" fill="#F2EEE6"/><rect x="${cx-1}" y="${b-h*1.08}" width="2" height="${h*.1}" fill="${col}"/>`},
  museum(x,b,s){return `<g fill="none" stroke="#F7F5F0" stroke-width="2.4" stroke-linejoin="round"><path d="M${x} ${b} L${x+s*.35} ${b-s*.9} L${x+s*.55} ${b}"/><path d="M${x+s*.25} ${b} L${x+s*.65} ${b-s*.75} L${x+s*.85} ${b}"/><path d="M${x+s*.55} ${b} L${x+s} ${b-s*.6} L${x+s*1.15} ${b}"/></g>`},
  buddha(cx,b,s,col,dark){return `<g fill="${col}"><path d="M${cx-s*.62} ${b} Q${cx-s*.6} ${b-s*.42} ${cx-s*.3} ${b-s*.56} L${cx+s*.3} ${b-s*.56} Q${cx+s*.6} ${b-s*.42} ${cx+s*.62} ${b} Z"/>
    <rect x="${cx-s*.1}" y="${b-s*.66}" width="${s*.2}" height="${s*.14}"/><ellipse cx="${cx}" cy="${b-s*.8}" rx="${s*.18}" ry="${s*.2}"/>
    <ellipse cx="${cx-s*.19}" cy="${b-s*.74}" rx="${s*.04}" ry="${s*.1}"/><ellipse cx="${cx+s*.19}" cy="${b-s*.74}" rx="${s*.04}" ry="${s*.1}"/>
    ${[-2,-1,0,1,2].map(i=>`<circle cx="${cx+i*s*.06}" cy="${b-s*.97+Math.abs(i)*s*.02}" r="${s*.035}"/>`).join("")}<circle cx="${cx}" cy="${b-s*1.02}" r="${s*.05}"/></g>
    <path d="M${cx-s*.32} ${b-s*.2} Q${cx} ${b-s*.1} ${cx+s*.32} ${b-s*.2}" stroke="${dark}" stroke-width="2" fill="none" opacity=".5"/><ellipse cx="${cx}" cy="${b-s*.22}" rx="${s*.16}" ry="${s*.05}" fill="${dark}" opacity=".45"/>
    <path d="M${cx-s*.08} ${b-s*.8} q${s*.04} ${s*.02} ${s*.07} 0 M${cx+s*.01} ${b-s*.8} q${s*.04} ${s*.02} ${s*.07} 0" stroke="${dark}" stroke-width="1.6" fill="none" opacity=".6"/>`},
};
// Per city: the far layer (hills, sea), the landmarks, and what lights up at night.
function cityLayer(c){
  if(c==="tokyo")return {far:"fuji",parts:[{g:LM.skytree(108,262,148,"#E9EEF3"),lit:"#8FB8FF"},{g:LM.tower(300,262,124,"#E8452E"),lit:"#FFA040"}]};
  if(c==="kyoto")return {far:"hills",parts:[{g:[0,1,2,3].map(i=>LM.torii(30+i*26,262-i*3,40-i*7,"#E5482C")).join(""),lit:"#FF8A50"},
    {g:LM.pagoda(292,262,52,"#3B2E2A","#8A5A40","#B89B5E"),lit:"#FFC870"}]};
  if(c==="osaka")return {far:"low",parts:[{g:LM.tsutenkaku(92,262,112,"#BFC6CC","#F2A33A"),lit:"#FFD27A"},{g:LM.castle(282,262,84,"#F7F3EA","#4E9483","#9E968A","#D9A93A"),lit:"#FFF2D0"}]};
  if(c==="nara")return {far:"hills",parts:[{g:LM.pagoda(78,262,46,"#3B2E2A","#7E5038","#B89B5E"),lit:"#FFC870"},{g:LM.hall(262,262,150,"#3A302C","#E6DDCB","#D9A93A")},
    {g:LM.deer(170,266,.95,"#A87444",false,false)+LM.deer(205,268,.8,"#B07D4C",true,true)}]};
  if(c==="kobe")return {far:"rokko",sea:true,parts:[{g:LM.porttower(150,250,112,"#E2402E"),lit:"#FF7A4A"},{g:LM.museum(222,250,62)},
    {g:`<path d="M292 246 h58 l-6 8 h-48 Z" fill="#F2EEE6"/><rect x="304" y="238" width="22" height="8" fill="#F2EEE6"/><rect x="314" y="230" width="5" height="8" fill="#E2402E"/>`}]};
  if(c==="kamakura")return {far:"sea",sea:true,parts:[{g:LM.buddha(140,262,120,"#7E9A8E","#3F5A52")},{g:LM.torii(305,262,44,"#E5482C"),lit:"#FF8A50"},
    {g:`<path d="M330 214 Q352 196 380 212 Z" fill="#6E8E7E"/><rect x="350" y="192" width="5" height="16" fill="#F2EEE6"/>`}]};
  return {far:"fuji",parts:[]};
}
function scene(k,c){
  const t=PERIODS[k];
  const W=390,H=300,L=cityLayer(c);let s=`<svg class="xs-sky" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax slice" aria-hidden="true"><defs>
    <linearGradient id="xs-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${t.sky[0]}"/><stop offset="1" stop-color="${t.sky[1]}"/></linearGradient>
    <radialGradient id="xs-s"><stop offset="0" stop-color="${t.sun||"#fff"}" stop-opacity=".95"/><stop offset=".35" stop-color="${t.sun||"#fff"}" stop-opacity=".55"/><stop offset="1" stop-color="${t.sun||"#fff"}" stop-opacity="0"/></radialGradient>
    <radialGradient id="xs-lit"><stop offset="0" stop-color="#FFD9A0" stop-opacity=".55"/><stop offset="1" stop-color="#FFD9A0" stop-opacity="0"/></radialGradient>
    <linearGradient id="xs-f" x1="0" y1="0" x2="0" y2="1"><stop offset=".7" stop-color="#FAF4E8" stop-opacity="0"/><stop offset="1" stop-color="#FAF4E8"/></linearGradient>
    <filter id="xs-dusk"><feColorMatrix type="matrix" values="1 .06 0 0 .04  0 .82 0 0 0  0 0 .72 0 0  0 0 0 1 0"/></filter>
    <filter id="xs-dark"><feColorMatrix type="matrix" values=".22 .05 .05 0 .02  .05 .22 .06 0 .03  .08 .1 .4 0 .08  0 0 0 1 0"/></filter></defs>
    <rect width="${W}" height="${H}" fill="url(#xs-g)"/>`;
  if(k==="night"){for(let i=0;i<40;i++)s+=`<circle class="xs-star" style="animation-delay:${(i%7)*.6}s" cx="${(i*97)%W}" cy="${(i*53)%150+10}" r="${(i%3)*.4+.6}" fill="#fff" opacity="${.4+(i%4)*.15}"/>`;
    s+=`<circle cx="236" cy="132" r="18" fill="#FFF3C9"/><circle cx="244" cy="125" r="16" fill="${t.sky[0]}"/>`}
  else{const sx={morning:78,afternoon:110,sunset:300}[k],sy={morning:120,afternoon:62,sunset:170}[k];
    s+=`<circle cx="${sx}" cy="${sy}" r="80" fill="url(#xs-s)"/><circle cx="${sx}" cy="${sy}" r="${k==="sunset"?26:20}" fill="${t.sun}"/>
    <g class="xs-cloud" fill="#fff" opacity=".55"><ellipse cx="250" cy="70" rx="46" ry="11"/><ellipse cx="275" cy="62" rx="24" ry="10"/><ellipse cx="60" cy="150" rx="38" ry="8"/></g>`}
  // far layer
  if(L.far==="fuji")s+=`<path d="M-10 250 L120 150 Q132 141 144 150 L300 250 Z" fill="${t.far}"/><path d="M108 160 L120 150 Q132 141 144 150 L157 160 L150 157 L142 164 L133 156 L124 164 L116 157 Z" fill="#fff" opacity="${k==="night"?.35:.85}"/>`;
  if(L.far==="hills")s+=`<path d="M-10 240 Q60 170 140 205 Q200 160 270 196 Q330 168 400 210 L400 260 L-10 260 Z" fill="${t.far}"/><path d="M-10 250 Q90 205 180 232 Q270 200 400 236 L400 262 L-10 262 Z" fill="${t.mid}" opacity=".55"/>`;
  if(L.far==="rokko")s+=`<path d="M-10 225 Q50 175 120 196 Q190 160 260 190 Q330 170 400 196 L400 250 L-10 250 Z" fill="${t.far}"/>`;
  if(L.far==="low")s+=`<path d="M-10 238 Q120 214 230 228 T400 222 L400 260 L-10 260 Z" fill="${t.far}" opacity=".8"/>`;
  if(L.far==="sea")s+=`<rect y="212" width="${W}" height="60" fill="${t.far}"/><g stroke="#fff" stroke-width="1.4" opacity=".35">${[0,1,2,3,4,5].map(i=>`<path d="M${(i*71)%360} ${222+(i%3)*12} q10 -4 20 0" fill="none"/>`).join("")}</g>`;
  // the city behind the landmarks
  if(c!=="kamakura"&&c!=="nara"){const b=[[150,214,22],[174,224,18],[196,206,16],[214,220,22],[236,212,14],[20,222,24],[46,212,18],[66,226,22],[340,216,18],[360,226,24]];
    s+=`<g fill="${t.mid}" opacity=".85">${b.map(([x,y,w])=>`<rect x="${x}" y="${y}" width="${w}" height="${262-y}" rx="1.5"/>`).join("")}</g>`;
    if(k==="night")for(let i=0;i<30;i++){const [x,y,w]=b[i%b.length];s+=`<rect x="${x+3+(i*7)%Math.max(4,w-6)}" y="${y+5+(i*11)%30}" width="2.4" height="3" fill="#FFD98A" opacity="${.5+(i%3)*.2}"/>`}}
  // landmarks: real colours by day, warmer at sunset, dark with lights at night
  const flt=k==="sunset"?` filter="url(#xs-dusk)"`:k==="night"?` filter="url(#xs-dark)"`:"";
  L.parts.forEach(p=>{
    if(k==="night"&&p.lit){s+=`<g filter="url(#xs-dusk)">${p.g}</g>`;s+=`<g opacity=".55" style="mix-blend-mode:screen">${p.g.replace(/fill="#[0-9A-Fa-f]{6}"/g,`fill="${p.lit}"`)}</g>`}
    else s+=`<g${flt}>${p.g}</g>`});
  if(L.sea&&L.far!=="sea")s+=`<rect y="250" width="${W}" height="20" fill="${t.far}"/><g stroke="#fff" stroke-width="1.3" opacity=".35">${[0,1,2,3,4].map(i=>`<path d="M${(i*83)%370} ${255+(i%2)*6} q10 -4 20 0" fill="none"/>`).join("")}</g>`;
  return s+`<path d="M0 266 Q90 244 190 258 T390 252 L390 300 L0 300 Z" fill="${t.near}" opacity=".9"/><rect width="${W}" height="${H}" fill="url(#xs-f)"/></svg>`;
}

// Apollo's lists: the stories, the moods and the season all open one.
const inCity=()=>P.filter(p=>p.city===exploreCity);
const photoFirst=a=>[...a].sort((x,y)=>(y.photo?1:0)-(x.photo?1:0));
const halalHere=()=>{const a=inCity().filter(p=>p.cat==="food"&&p.halal);
  return near?a.sort((x,y)=>KM(near,x)-KM(near,y)):a.sort((x,y)=>(y.hl==="certified")-(x.hl==="certified")||(y.photo?1:0)-(x.photo?1:0))};
// What's good this month, by Japan's calendar.
function season(){const mo=jst().mo;
  const S=mo<=1||mo===11?["Winter lights ✨","Illuminations and night views, the best season for city lights.",["views","streets"]]
    :mo<=3?["Cherry blossom season 🌸","Parks and shrines turn pink, go early in the morning.",["nature","shrine"]]
    :mo<=5?["Green season 🌿","Fresh gardens and long days, hydrangeas in June.",["nature","shrine"]]
    :mo<=7?["Summer festivals 🎆","Fireworks, festivals and evenings by the river.",["streets","views"]]
    :mo<=8?["Late summer 🍧","Shaved ice, river walks and cooler evenings.",["coffee","nature"]]
    :["Autumn leaves 🍁","The best time for gardens, trees turn red and gold.",["nature","shrine"]];
  return {t:S[0],s:S[1],ps:photoFirst(inCity().filter(p=>S[2].includes(p.cat)&&p.photo))}}
// Apollo's pick of the day: the same all day, a new one tomorrow.
function dailyPick(){const a=inCity().filter(p=>p.photo&&(p.gem||p.tier==="must"));if(!a.length)return null;return a[jst().day%a.length]}
const MONTHS_AR=["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
const MONTHS_EN=["January","February","March","April","May","June","July","August","September","October","November","December"];

// A practical tip a day: the things first-timers wish they had known.
const TIPS=["Put a Suica or PASMO card in your phone's wallet: tap it on trains, buses and at convenience stores.",
  "Bins are rare on the street. Keep a small bag for your rubbish until you find one at a konbini.",
  "On escalators, stand on the left in Tokyo and on the right in Osaka.",
  "Trains are quiet: no phone calls, and keep your voice low.",
  "There's no tipping in Japan. Leaving money on the table can confuse the staff.",
  "Many small restaurants take cash only. 7-Eleven ATMs accept foreign cards.",
  "In a konbini, check snack labels for pork (豚・ポーク) and alcohol (アルコール・みりん).",
  "Big stations and both Tokyo airports have prayer rooms. Ask at the information desk.",
  "Coin lockers at stations fit a cabin bag, so you can explore before check-in.",
  "Send big suitcases to your next hotel with takkyubin, from the hotel desk or a konbini.",
  "Google Maps is great for trains in Japan: it shows the platform, the car and the fare.",
  "Tap water is safe to drink everywhere.",
  "Take your shoes off where you see a step up or slippers at the door.",
  "In Nara, the deer bow before you feed them. Show empty hands when you're out of crackers."];
function tipCard(){const t=TIPS[jst().day%TIPS.length];
  return `<div class="xs-tip"><img src="assets/cat.png" alt=""><span><small>${T("Apollo's tip of the day 💡")}</small><b>${esc(T(t))}</b></span></div>`}
// The city's neighbourhoods, from the Areas page, as wide photo cards.
function areasRow(){const hs=HOODS.filter(h=>h.city===exploreCity&&h.photo);if(!hs.length)return "";
  return `<section class="ax-row"><header><h2>${T("Areas to explore 🏘️")}</h2><button type="button" class="ax-all xs-areas-all">${T("See all")}</button></header><div class="ax-hs">${hs.map(h=>`<button type="button" class="xs-area" data-h="${esc(h.n)}">
    <img src="${h.photo}" alt="" loading="lazy" style="object-position:${h.pos||"50% 50%"}"><span><b>${esc(D(h,"n"))}</b><small>${esc(D(h,"vibe"))}</small></span></button>`).join("")}</div></section>`}
// The weather now in the city, from Open-Meteo (free, no key). No answer, no chip.
const WX={};
const wxIcon=c=>c===0?"☀️":c<=2?"🌤️":c===3?"☁️":c<=48?"🌫️":c<=67||c>=80&&c<=82?"🌧️":c<=77||c===85||c===86?"🌨️":c>=95?"⛈️":"🌦️";
function weather(){
  const c=exploreCity,b=BOX[c],show=w=>{if(c===exploreCity)$("explore").querySelectorAll(".xs-wx").forEach(el=>el.textContent=w?` · ${wxIcon(w.code)} ${Math.round(w.t)}°`:"")};
  if(!b)return;const hit=WX[c];if(hit&&Date.now()-hit.at<30*60e3)return show(hit);
  fetch(`https://api.open-meteo.com/v1/forecast?latitude=${((b.n+b.s)/2).toFixed(3)}&longitude=${((b.w+b.e)/2).toFixed(3)}&current=temperature_2m,weather_code&timezone=Asia%2FTokyo`)
    .then(r=>r.ok?r.json():null).then(j=>{if(!j||!j.current)return;WX[c]={t:j.current.temperature_2m,code:j.current.weather_code,at:Date.now()};show(WX[c])}).catch(()=>{});
}
// ---- the top of Explore follows your trip ----
// No trip: what's good right now, and a nudge to start one. A trip coming
// up: its countdown first. On the trip: today's plan, with the next stop.
const shortKm=km=>{const t=km<1?T("{n} m",{n:Math.max(10,Math.round(km*100)*10)}):T("{n} km",{n:km<10?km.toFixed(1):Math.round(km)});return isAR()?iso(t):t};
const pickNear=a=>{const h=window.tnMe||(near&&nearKind==="me"?near:null);
  return h?[...a].sort((x,y)=>KM(h,x)-KM(h,y)):[...a].sort((x,y)=>((y.tier==="must")*2+!!y.gem+(y.photo?1:0))-((x.tier==="must")*2+!!x.gem+(x.photo?1:0)))};
const NOW={morning:["Fresh air and no crowds yet. Before 10 is {w} 🐾","temple time",()=>inCity().filter(p=>p.photo&&(p.cat==="shrine"||p.cat==="nature"))],
  afternoon:["Lunchtime! {w} close by, then a walk 🐾","Halal food",()=>halalHere().filter(p=>p.photo)],
  sunset:["The sun's going down soon: catch it from {w} 🌇","a view",()=>inCity().filter(p=>p.photo&&p.cat==="views")],
  night:["The city lights up: {w} and lively streets 🌃","night views",()=>inCity().filter(p=>p.photo&&(p.cat==="views"||(p.cat==="streets"&&/night|evening|neon|lantern|dark/i.test(p.t+" "+p.tip))))]};
function nowCard(k){
  const [msg,w,get]=NOW[k],ps=pickNear(get()).slice(0,3),h=window.tnMe||(near&&nearKind==="me"?near:null);
  if(!ps.length)return "";
  return `<section class="hx-now"><header><i class="hx-pulse"></i><b>${esc(T("Right now in {c}",{c:cityOf(exploreCity)}))}</b><small><span class="xs-time">${esc(jstText())}</span><span class="xs-wx"></span></small></header>
    <p>${T(msg,{w:`<b>${esc(T(w))}</b>`})}</p>
    <div class="hx-nowc">${ps.map(p=>`<button type="button" class="pc hx-np" data-id="${p.id}"><img src="${p.photo}" alt="" loading="lazy"><b><bdi>${esc(p.n)}</bdi></b>
      <small>${esc(h?shortKm(KM(h,p)):p.gem?T("⭐ hidden gem"):p.tier==="must"?"🔥 "+T("don't skip this"):D(CATS[p.cat],"n"))}</small></button>`).join("")}</div></section>`}
function tripTop(){
  const info=window.tnTripDays&&tnTripDays();if(!info||!(trip.stays.length||trip.ideas.length))return "";
  const dl=info.dl,nd=info.days,route=trip.stays.map(s=>cityOf(s.city)).join(isAR()?" ← ":" → ");
  // How ready the plan is: a place to stay in each city, and something in each day.
  const miss=[];let total=0,done=0;
  trip.stays.forEach(s=>{total++;if(s.home)done++;else miss.push(T("Hotel in {c}",{c:cityOf(s.city)}))});
  let n=0;trip.stays.forEach(s=>s.days.forEach(d=>{n++;total++;if(d.ids.length||(d.bk||[]).length)done++;else miss.push(T("Day {n} is empty",{n}))}));
  if(!trip.start){total++;miss.unshift(T("Your travel date"))}else done++;
  const pct=total?Math.round(done/total*100):0,d0=info.date(0),dz=info.date(Math.max(0,nd-1));
  const M=isAR()?MONTHS_AR:MONTHS_EN,md=d=>`${d.getUTCDate()} ${M[d.getUTCMonth()]}`;
  const head=dl==null?esc(trip.name||T("My Japan trip")):dl>1?esc(T("{n} days to go",{n:dl})):dl===1?esc(T("Tomorrow!")):"";
  if(dl!=null&&dl<=0)return "";
  return `<button type="button" class="hx-trip"><span class="hx-tl"><small>${esc(T("Your trip"))} ✈️${d0?` · ${esc(md(d0))} – ${esc(md(dz))}`:""}</small><b>${head}</b>
      <span class="hx-route">${esc(route||T("Your ideas 💡"))} · ${esc(T(tripCount(trip)===1?"1 place":"{n} places",{n:tripCount(trip)}))}</span>
      <span class="hx-bar"><i style="width:${pct}%"></i></span><em>${miss.length?esc(T("Still to do: {x}",{x:miss.slice(0,2).join(" · ")})):esc(T("All set! 🎉"))}</em></span>
    <span class="hx-ring" style="--p:${pct}"><b>${dl!=null?esc(isAR()?iso(String(dl)):String(dl)):"🧳"}</b><small>${dl!=null?esc(T(dl===1?"day left":"days left")):""}</small></span></button>`}
function todayCard(){
  const t=window.tnToday&&tnToday();if(!t)return "";
  const {h,m}=jst(),now=h*60+m,its=t.items.filter(x=>x.k!=="hop"&&x.k!=="home"&&x.t!=null&&x.t>=0);
  const ni=its.findIndex(x=>x.t+(x.m||45)>now),nx=ni>-1?its[ni]:null,rest=ni>-1?its.slice(ni+1,ni+4):[];
  const nm=x=>x.k==="stop"?x.p.n:x.k==="lunch"?x.x.p.n:(x.b.n||[x.b.a,x.b.b].filter(Boolean).join(" → ")||T("Booking"));
  const pic=x=>x.k==="stop"?x.p:x.k==="lunch"?x.x.p:null;
  let hopTxt="";if(nx){const i=t.items.indexOf(nx);const hp=t.items[i-1];if(hp&&hp.k==="hop")hopTxt=hp.h.t}
  const w=t.w;
  return `<section class="hx-today"><header><b>🧳 ${esc(T("Day {n} of your trip",{n:t.n+1}))}</b><small>${esc(cityOf(t.s.city))}${w?` · ${wxIcon(w.code)} ${w.t}°`:""}</small></header>
    ${nx?`<button type="button" class="hx-next"${pic(nx)?` data-id="${pic(nx).id}"`:""}>${pic(nx)&&pic(nx).photo?`<img src="${pic(nx).photo}" alt="">`:`<span class="hx-bi">${nx.k==="bk"?"🎫":"📍"}</span>`}
      <span><small>${esc([T("Next"),t.clock(nx.t),hopTxt].filter(Boolean).join(" · "))}</small><b><bdi>${esc(nm(nx))}</bdi></b>
      ${nx.k==="lunch"?`<em class="hx-hal">🍜 ${esc(T("Halal lunch · Apollo's pick"))}</em>`:nx.k==="stop"&&D(nx.p,"tip")?`<i>🐾 ${esc(D(nx.p,"tip").split(/(?<=[.!؟?])\s/)[0])}</i>`:""}</span></button>`
      :`<p class="hx-done">${esc(T(t.d.ids.length?"That's today done! 🎉 Rest well.":"Nothing planned today yet. Add some places?"))}</p>`}
    ${rest.length?`<div class="hx-rest">${rest.map(x=>`<div class="${x.k==="lunch"?"h":""}"><em>${esc(t.clock(x.t))}</em><b><bdi>${esc(nm(x))}</bdi></b>${x.k==="lunch"?`<span>${esc(T("Apollo's pick"))}</span>`:""}</div>`).join("")}</div>`:""}
    <button type="button" class="hx-open" data-s="${t.a}" data-d="${t.b}">${esc(T("Open your day"))} ${isAR()?"←":"→"}</button></section>`}
// "What's your mood?": Apollo's stickers in a row; tap one and its top three
// places show right under it, each with ＋ for the trip, and "All N" for the list.
const MOOD=[["halal","Halal","ramen.png","#E8F3E3","#2E8B3E",()=>halalHere()],["views","Views","fuji.png","#E3EEF8","#1D52A0",()=>pickNear(inCity().filter(p=>p.cat==="views"))],
  ["coffee","Coffee & sweets","coffee.png","#F6EBDD","#9A6233",()=>pickNear(inCity().filter(p=>p.cat==="coffee"))],["shrine","Temples","torii.png","#FBE5DE","#E0402A",()=>pickNear(inCity().filter(p=>p.cat==="shrine"))],
  ["gems","Hidden","c-gem.png","#FFF3CC","#B8860B",()=>pickNear(inCity().filter(p=>p.gem))],["shop","Shopping","c-shop.png","#FCE4EC","#C2185B",()=>pickNear(inCity().filter(p=>p.cat==="shop"))],
  ["nature","Nature","c-nature.png","#E6F1DE","#4F7A1E",()=>pickNear(inCity().filter(p=>p.cat==="nature"))],["experience","Experiences","c-experience.png","#EEE6F6","#7B5EA7",()=>pickNear(inCity().filter(p=>p.cat==="experience"))]];
let moodSel="halal";
function moodRes(){
  const m=MOOD.find(x=>x[0]===moodSel)||MOOD[0],ps=m[5](),h=window.tnMe||(near&&nearKind==="me"?near:null);
  return `<div class="hx-mres" style="--bg:${m[3]};--c:${m[4]}">${ps.slice(0,3).map(p=>{const k=PKEY(p),on=inTrip(k);
    return `<div class="hx-mr"><button type="button" class="hx-mgo" data-id="${p.id}"><span class="hx-mi${p.photo?"":" art"}" style="--c2:var(--${p.cat})"><img src="${p.photo||CATS[p.cat].img}" alt="" loading="lazy"></span>
      <span class="hx-mt"><b><bdi>${esc(p.n)}</bdi></b><small>${esc(AREA(p.area))}${h?" · "+esc(shortKm(KM(h,p))):""}${p.halal&&m[0]!=="halal"?" · "+esc(T("halal ✓")):""}</small></span></button>
      <button type="button" class="hx-madd${on?" on":""}" data-k="${esc(k)}" aria-pressed="${on}" aria-label="${esc(T("＋ Add to my trip"))}">${on?"✓":"＋"}</button></div>`}).join("")
    ||`<p class="hx-mnone">${esc(T("Nothing here yet in this city. Try another city."))}</p>`}
    ${ps.length>3?`<button type="button" class="hx-mall">${esc(T("All {n} {x}",{n:ps.length,x:T(m[1])}))} ${isAR()?"←":"→"}</button>`:""}</div>`}
function moodPicker(){
  const ms=MOOD.filter(x=>x[5]().length);if(!ms.some(x=>x[0]===moodSel))moodSel=(ms[0]||MOOD[0])[0];
  return `<h2 class="hx-h">${T("What's your mood?")}</h2><div class="hx-moods" role="tablist">${ms.map(x=>`<button type="button" role="tab" class="hx-mood${x[0]===moodSel?" on":""}" data-m="${x[0]}" aria-selected="${x[0]===moodSel}" style="--bg:${x[3]};--c:${x[4]}">
    <span><img src="assets/${x[2]}" alt=""></span><b>${esc(T(x[1]))}</b></button>`).join("")}</div><div class="hx-mwrap">${moodRes()}</div>`}
function wireMood(el){
  const w=el.querySelector(".hx-mwrap");if(!w)return;
  const wireRes=()=>{
    w.querySelectorAll(".hx-mgo").forEach(b=>b.onclick=()=>openPlace(b.dataset.id));
    w.querySelectorAll(".hx-madd").forEach(b=>b.onclick=()=>{const k=b.dataset.k;if(inTrip(k))removeKey(k);else{trip.ideas.push(k);toast(T("Added to your trip ✓"))}
      saveTrip();const on=inTrip(k);b.classList.toggle("on",on);b.textContent=on?"✓":"＋";b.setAttribute("aria-pressed",String(on))});
    const all=w.querySelector(".hx-mall");if(all)all.onclick=()=>{const m=MOOD.find(x=>x[0]===moodSel);openList(T(m[1]),cityOf(exploreCity),m[5]())}};
  el.querySelectorAll(".hx-mood").forEach(b=>b.onclick=()=>{moodSel=b.dataset.m;
    el.querySelectorAll(".hx-mood").forEach(x=>{const on=x===b;x.classList.toggle("on",on);x.setAttribute("aria-selected",String(on))});
    w.innerHTML=moodRes();wireRes()});
  wireRes();
}
// The newest places in the city: data/places.js grows by appending a line.
const fresh=()=>P.filter(p=>p.city===exploreCity&&p.photo).slice(-12).reverse();
let autoCity=false,lastToday="";
function renderExplore(){
  // On the trip, Explore starts in the city you're in today (once; your own pick wins after that).
  if(!autoCity&&window.tnToday){autoCity=true;const t=tnToday();if(t&&t.s.city!==exploreCity&&TRIP_CITIES.includes(t.s.city)){exploreCity=t.s.city;city=exploreCity}}
  const el=$("explore");if(!el)return;
  const who=typeof auth!=="undefined"&&auth&&auth.email?auth.email.split("@")[0]:"";
  const cities=["tokyo","kyoto","osaka","nara","kobe","kamakura"].filter(c=>TRIP_CITIES.includes(c)),k=period(jst().h),P0=PERIODS[k];
  const pick=dailyPick();
  const row=(t,s,ps,key)=>ps.length?`<section class="ax-row"><header><h2>${T(t)}</h2>${key?`<button type="button" class="ax-all" data-list="${key}">${T("See all")}</button>`:""}</header>
    ${s?`<p class="ax-sub">${esc(s)}</p>`:""}<div class="ax-hs">${ps.slice(0,12).map(pcard).join("")}</div></section>`:"";
  el.innerHTML=`<div class="xs xs-${k}">${scene(k,exploreCity)}
      <div class="xs-hi"><div><b>${esc(who?T(P0.greet+", {n}!",{n:who}):T(P0.greet+"!"))} ${{morning:"☀️",afternoon:"🌤️",sunset:"🌇",night:"🌙"}[k]}</b><small><span class="xs-time">${esc(jstText())}</span><span class="xs-wx"></span></small><p class="xs-hint">${esc(T(P0.hint))}</p></div>
        <button type="button" class="xs-cat" aria-label="${esc(T("More"))}"><img src="assets/cat.png" alt=""></button></div></div>
    <button type="button" class="ax-search xs-search">${SVG(I.search)}<span>${T("Search places, areas, food…")}</span></button>
    <div class="ax-cities" role="tablist">${cities.map(c=>`<button type="button" role="tab" class="ax-city${c===exploreCity?" on":""}" data-c="${c}" aria-selected="${c===exploreCity}">${esc(cityOf(c))}</button>`).join("")}</div>
    ${(()=>{const td=todayCard();lastToday=td;if(td)return td;const tt=tripTop();return tt?tt+nowCard(k):nowCard(k)+(trip.stays.length||trip.ideas.length?"":`<button type="button" class="hx-cta"><span>✈️</span><span><b>${T("Start your trip with Apollo")}</b><small>${T("Pick your cities and he sorts your days.")}</small></span><i>${isAR()?"←":"→"}</i></button>`)})()}
    ${moodPicker()}
    ${pick?`<button type="button" class="xs-pick" data-id="${pick.id}"><span class="xs-tape"></span><span class="xs-pola"><img src="${pick.photo}" alt=""><small>${esc(D(pick,"cap"))}</small></span>
      <span class="xs-pt"><small>${T("Apollo's pick for today 🐾")}</small><b><bdi>${esc(pick.n)}</bdi></b><i>${esc((D(pick,"tip")||"").split(/(?<=[.!؟?])\s/)[0])}</i><em>${T("See the place")} ${isAR()?"←":"→"}</em></span></button>`:""}
    ${row("New on Tabi Neko 🆕",T("Apollo just added these"),fresh(),"new")}
    ${row("Hidden gems ⭐",T("Even locals don't know these"),photoFirst(inCity().filter(p=>p.gem)),"gems")}
    ${areasRow()}`;
  wireCards(el);
  el.querySelector(".xs-cat").onclick=()=>go("menu");
  el.querySelectorAll(".hx-trip,.hx-cta").forEach(b=>b.onclick=()=>go("trip"));
  el.querySelectorAll(".hx-open").forEach(b=>b.onclick=()=>{go("trip");if(window.tnOpenDay)tnOpenDay(+b.dataset.s,+b.dataset.d)});
  el.querySelectorAll(".hx-next[data-id]").forEach(b=>b.onclick=()=>openPlace(b.dataset.id));
  wireMood(el);
  el.querySelectorAll(".xs-area").forEach(b=>b.onclick=()=>openArea(HOODS.find(x=>x.city===exploreCity&&x.n===b.dataset.h)));
  weather();
  el.querySelectorAll(".ax-city").forEach(b=>b.onclick=()=>{exploreCity=b.dataset.c;city=exploreCity;store.set("tabineko-city",city);renderExplore()});
  el.querySelector(".xs-search").onclick=()=>{city=exploreCity;store.set("tabineko-city",city);if(window.openSearch)openSearch("")};
  if(el.querySelector(".xs-pick"))el.querySelector(".xs-pick").onclick=()=>openPlace(pick.id);
  el.querySelectorAll(".xs-areas-all").forEach(b=>b.onclick=()=>{location.hash="#hoods";window.scrollTo(0,0)});
  el.querySelectorAll(".ax-all[data-list]").forEach(b=>b.onclick=()=>{const k2=b.dataset.list,L={halal:["Halal food 🍜",halalHere()],gems:["Hidden gems ⭐",photoFirst(inCity().filter(p=>p.gem))],new:["New on Tabi Neko 🆕",fresh()]}[k2];
    openList(T(L[0]),cityOf(exploreCity),L[1])});
}
window.tnRenderExplore=renderExplore;
window.tnExploreCity=c=>{if(!CITIES[c])return;exploreCity=c;city=c;store.set("tabineko-city",c);renderExplore()};
// The clock in the header ticks with Japan's time, and the sky changes with it.
let lastPeriod=period(jst().h);
setInterval(()=>{if($("explore").hidden)return;const k=period(jst().h);
  if(k!==lastPeriod){lastPeriod=k;renderExplore()}else{$("explore").querySelectorAll(".xs-time").forEach(t=>t.textContent=jstText());if($("explore").querySelector(".hx-today")&&todayCard()!==lastToday)renderExplore()}},30000);


// ---- the place page ----
const pv=document.createElement("div");pv.id="pview";pv.hidden=true;pv.setAttribute("role","dialog");pv.setAttribute("aria-modal","true");document.body.appendChild(pv);
let pvId=null;
function renderPlace(){
  const p=placeById(pvId);if(!p)return;
  const C=CATS[p.cat],maps=p.url||"https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(`${p.n} ${CITIES[p.city].n} Japan`);
  const nearby=P.filter(x=>x.city===p.city&&x.id!==p.id).map(x=>[x,KM(p,x)]).sort((a,b)=>a[1]-b[1]).slice(0,8).map(a=>a[0]);
  const fact=(l,v)=>v?`<div><small>${T(l)}</small><b>${esc(v)}</b></div>`:"";
  pv.setAttribute("aria-label",p.n);
  pv.innerHTML=`<div class="pv-scroll">
    <div class="pv-hero${p.photo?"":" art"}" style="--c:var(--${p.cat})"><img src="${p.photo||C.img}" alt="">
      <div class="pv-btns"><button type="button" class="pv-cb pv-back" aria-label="${esc(T("Back"))}">${SVG(I.back)}</button><span></span>
        <button type="button" class="pv-cb pv-share" aria-label="${esc(T("Share"))}">${SVG(I.share)}</button></div></div>
    <div class="pv-body">
      <div class="pv-chips">${p.halal?`<span class="pv-ch hal">${p.hl==="friendly"?T("Muslim-friendly"):p.hl==="certified"?T("✓ Halal certified"):T("✓ halal")}</span>`:""}
        <span class="pv-ch" style="--c:var(--${p.cat})"><i></i>${esc(D(C,"n"))}</span><span class="pv-ch">${esc(AREA(p.area))}</span>
        ${p.tier==="must"?`<span class="pv-ch must">🔥 ${T("don't skip this")}</span>`:""}${p.gem?`<span class="pv-ch gem">${T("⭐ hidden gem")}</span>`:""}</div>
      <h1><bdi>${esc(p.n)}</bdi></h1>${p.jp?`<p class="pv-jp" lang="ja">${esc(p.jp)}</p>`:""}
      <div class="pv-facts">${fact("When",D(p,"t"))}${fact("Cost",D(p,"cost"))}${fact("How long",D(p,"dur"))}</div>
      <div class="pv-note"><img src="assets/cat.png" alt=""><p>${D(p,"tip")}</p></div>
      ${p.book?`<a class="pv-book" href="${p.book}" target="_blank" rel="noopener">${T("Book it ↗")}</a>`:""}
      ${nearby.length?`<section class="ax-row pv-near"><header><h2>${T("Nearby")}</h2></header><div class="ax-hs">${nearby.map(pcard).join("")}</div></section>`:""}
    </div></div>
    <div class="pv-cta"><a class="pv-maps" href="${maps}" target="_blank" rel="noopener">${SVG(I.pin)}${T("Google Maps")}</a>${tripBtn(p)}</div>`;
  pv.querySelector(".pv-back").onclick=closePlace;
  pv.querySelector(".pv-share").onclick=()=>{const url="https://tabi-neko.vercel.app/",text=`${p.n} · Tabi Neko 🐾`;
    if(navigator.share)navigator.share({title:p.n,text,url}).catch(()=>{});else{try{navigator.clipboard.writeText(`${text} ${url}`);toast(T("Link copied. Paste it to a friend ✓"))}catch(e){}}};
  wireCards(pv);
}
function openPlace(id,fromHistory){
  if(!placeById(id))return;
  pvId=id;renderPlace();pv.hidden=false;document.documentElement.classList.add("pv-open");
  pv.querySelector(".pv-scroll").scrollTop=0;
  if(!fromHistory)history.pushState({tnPlace:id},"");
}
function closePlaceNow(){pv.hidden=true;pvId=null;if(lv.hidden)document.documentElement.classList.remove("pv-open")}
function closePlace(){if(history.state&&history.state.tnPlace)history.back();else closePlaceNow()}
addEventListener("popstate",e=>{const st=e.state||{};
  if(st.tnPlace)openPlace(st.tnPlace,true);else closePlaceNow();
  if(!st.tnPlace&&!st.tnList&&typeof closeList==="function")closeList()});
window.openPlace=openPlace; // the real map (js/appmap.js) opens places too
// Pop-up lists (the add-places picker, the account, Apollo's planner) slide
// up as bottom sheets. They're redrawn on every tap, so the slide plays only
// when one opens: after that it's marked "again".
(function(){const arm=el=>{el.classList.remove("again");clearTimeout(el._sheetT);el._sheetT=setTimeout(()=>el.classList.add("again"),320)};
  new MutationObserver(ms=>ms.forEach(m=>{const t=m.target;if(m.type==="attributes"&&t.classList&&t.classList.contains("tpick")&&!t.hidden)arm(t);
    (m.addedNodes||[]).forEach(n=>{if(n.classList&&n.classList.contains("tpick")&&!n.hidden)arm(n)})}))
    .observe(document.body,{attributes:true,attributeFilter:["hidden"],subtree:true,childList:true})})();
// The phone's back button (Android): close what's on top, step back through
// pages, go back to Explore from the other tabs, and only leave the app from
// Explore, on a second press.
let backAt=0;
function onBack(){
  if(window.tnOnbBack&&tnOnbBack())return;
  const H=document.documentElement,top=[...document.querySelectorAll(".tpick,#atsheet")].filter(e=>!e.hidden).pop();
  if(top){top.dispatchEvent(new MouseEvent("click",{bubbles:true}));return}
  if(H.classList.contains("picking")&&typeof endPick==="function"){endPick(true);return}
  if(H.classList.contains("chat-open")&&typeof closeApollo==="function"){closeApollo();return}
  const mc=document.querySelector(".mp-cities:not([hidden])");if(mc){mc.hidden=true;return}
  const st=history.state||{};
  if(st.tnPlace||st.tnList||st.tnSearch||st.tnDay||st.tnTrip){history.back();return}
  const c=current(),h=location.hash.slice(1);
  if(h==="hoods"){go("explore");return}
  if(SUB.includes(h)){go("menu");return}
  if(c!=="explore"){go("explore");return}
  if(Date.now()-backAt<2000){try{Capacitor.Plugins.App.exitApp()}catch(e){}return}
  backAt=Date.now();toast(T("Press back again to leave"));
}
try{const A=window.Capacitor&&Capacitor.Plugins&&Capacitor.Plugins.App;if(A&&A.addListener)A.addListener("backButton",onBack)}catch(e){}
window.tnBack=onBack; // for tests
window.goTab=go;window.openListPage=openList; // and so does search (js/appsearch.js)
// Every way of picking a place opens its page instead of unfolding the card.
const _select=select;select=function(id){if(!id)return;if(typeof closeApollo==="function")closeApollo();openPlace(id)};

// ---- a list page: a story, a mood, the season or "See all" ----
const lv=document.createElement("div");lv.id="lview";lv.hidden=true;lv.setAttribute("role","dialog");lv.setAttribute("aria-modal","true");document.body.appendChild(lv);
// Rows like a maps app: photo, the full name, area and distance, a clear
// halal badge, Apollo's one-liner, and ＋ to add it to the trip. Filters
// across the top, and the whole list on the map.
let lvAll=[],lvF="",lvTitle="";
const lvHere=()=>window.tnMe||(near&&nearKind==="me"?near:null);
function lvShort(km){const t=km<1?T("{n} m",{n:Math.max(10,Math.round(km*100)*10)}):T("{n} km",{n:km<10?km.toFixed(1):Math.round(km)});return isAR()?iso(t):t}
function lvFilters(ps){
  const f=[["",T("All")]];
  if(ps.some(p=>p.hl==="certified")&&ps.some(p=>p.hl!=="certified"))f.push(["cert",T("✓ Halal certified")]);
  else if(ps.some(p=>p.halal)&&ps.some(p=>!p.halal))f.push(["halal",T("halal ✓")]);
  const cats=[...new Set(ps.map(p=>p.cat))];if(cats.length>1)cats.forEach(c=>f.push(["c:"+c,D(CATS[c],"n")]));
  const ar={};ps.forEach(p=>ar[p.area]=(ar[p.area]||0)+1);
  Object.keys(ar).filter(a=>ar[a]>=2).sort((x,y)=>ar[y]-ar[x]).slice(0,5).forEach(a=>{if(Object.keys(ar).length>1)f.push(["a:"+a,"📍 "+AREA(a)])});
  return f}
function lvRow(p){
  const h=lvHere(),k=PKEY(p),on=inTrip(k),tip=(D(p,"tip")||"").split(/(?<=[.!؟?])\s/)[0];
  const badge=p.halal?`<span class="lr-h${p.hl==="friendly"?" f":""}">${p.hl==="friendly"?T("Muslim-friendly"):p.hl==="certified"?T("✓ Halal certified"):T("✓ halal")}</span>`:"";
  return `<div class="lr" style="--c:var(--${p.cat})"><button type="button" class="lr-go" data-id="${p.id}">
    <span class="lr-img${p.photo?"":" art"}"><img src="${p.photo||CATS[p.cat].img}" alt="" loading="lazy">${p.gem?`<i>⭐</i>`:""}</span>
    <span class="lr-t"><b><bdi>${esc(p.n)}</bdi></b><small><i></i>${esc(D(CATS[p.cat],"n"))} · ${esc(AREA(p.area))}${h?` · ${esc(lvShort(KM(h,p)))}`:""}</small>${badge}
      ${tip?`<em>🐾 ${esc(tip)}</em>`:""}</span></button>
    <button type="button" class="lr-add${on?" on":""}" data-k="${esc(k)}" aria-label="${esc(T("＋ Add to my trip"))}" aria-pressed="${on}">${on?"✓":"＋"}</button></div>`}
function lvDraw(){
  const ps=lvAll.filter(p=>!lvF||(lvF==="cert"?p.hl==="certified":lvF==="halal"?p.halal:lvF.startsWith("c:")?p.cat===lvF.slice(2):p.area===lvF.slice(2)));
  const box=lv.querySelector(".lv-rows");
  box.innerHTML=ps.map(lvRow).join("")||`<p class="lv-none">${esc(T("Nothing here yet in this city. Try another city."))}</p>`;
  const sm=lv.querySelector(".lv-bar small");if(sm)sm.textContent=`${lv.dataset.sub?lv.dataset.sub+" · ":""}${T(ps.length===1?"1 place":"{n} places",{n:ps.length})}${lvHere()?" · "+T("nearest to you first"):""}`;
  box.querySelectorAll(".lr-go").forEach(b=>b.onclick=()=>openPlace(b.dataset.id));
  box.querySelectorAll(".lr-add").forEach(b=>b.onclick=()=>{const k=b.dataset.k;
    if(inTrip(k))removeKey(k);else{trip.ideas.push(k);toast(T("Added to your trip ✓"))}
    saveTrip();const on=inTrip(k);b.classList.toggle("on",on);b.textContent=on?"✓":"＋";b.setAttribute("aria-pressed",String(on))});
  lv.querySelectorAll(".lv-f button").forEach(b=>b.classList.toggle("on",b.dataset.f===lvF));
  const m=lv.querySelector(".lv-map");if(m)m.hidden=!ps.length;
  lv.lvShown=ps;
}
function openList(title,sub,ps,fromHistory){
  const h=lvHere();lvAll=h?[...ps].sort((a,b)=>KM(h,a)-KM(h,b)):[...ps];lvF="";lvTitle=title;lv.dataset.sub=sub||"";
  const fs=lvFilters(lvAll);
  lv.innerHTML=`<div class="lv-bar"><button type="button" class="pv-cb lv-back" aria-label="${esc(T("Back"))}">${SVG(I.back)}</button><div><b>${esc(title)}</b><small></small></div></div>
    ${fs.length>1?`<div class="lv-f">${fs.map(([k,l])=>`<button type="button" data-f="${esc(k)}">${esc(l)}</button>`).join("")}</div>`:""}
    <div class="lv-rows"></div>
    ${typeof mapOnly==="function"?`<button type="button" class="lv-map">${SVG(I.map)} ${T("Show them on the map")}</button>`:""}`;
  lv.classList.remove("lv-area");
  lv.querySelector(".lv-back").onclick=()=>history.back();
  lv.querySelectorAll(".lv-f button").forEach(b=>b.onclick=()=>{lvF=b.dataset.f;lvDraw();lv.scrollTop=0});
  const m=lv.querySelector(".lv-map");if(m)m.onclick=()=>{const ps2=lv.lvShown||lvAll;if(!ps2.length)return;mapOnly(ps2,lvTitle);go("map")};
  lvDraw();lv.hidden=false;lv.scrollTop=0;document.documentElement.classList.add("pv-open");
  if(!fromHistory)history.pushState({tnList:1},"");
}
// ---- an area's own page: its photo, Apollo's story, the area at a glance,
// the best time and his tip, what not to miss, and every place in it ----
function openArea(h,fromHistory){
  if(!h)return;
  const ps=P.filter(p=>p.city===h.city&&p.area===h.area),hl=ps.filter(p=>p.halal).length;
  const miss=(h.miss||[]).map(n=>P.find(p=>p.city===h.city&&p.n===n)).filter(Boolean);
  const hh=lvHere();lvAll=hh?[...ps].sort((a,b)=>KM(hh,a)-KM(hh,b)):photoFirst(ps);lvF="";lvTitle=D(h,"n");lv.dataset.sub="";
  const fs=lvFilters(lvAll),N=n=>isAR()?iso(String(n)):String(n);
  const ST=[["food","🍜","Food"],["shop","🛍️","Shopping"],["culture","⛩️","Culture"],["night","🌙","Nightlife"],["calm","🌿","Calm"]];
  const addB=p=>{const k=PKEY(p),on=inTrip(k);return `<button type="button" class="lr-add ar-add${on?" on":""}" data-k="${esc(k)}" aria-pressed="${on}" aria-label="${esc(T("＋ Add to my trip"))}">${on?"✓":"＋"}</button>`};
  lv.innerHTML=`<div class="ar-hero"><img src="${esc(h.photo)}" alt=""${h.pos?` style="object-position:${esc(h.pos)}"`:""}><button type="button" class="pv-cb lv-back ar-back" aria-label="${esc(T("Back"))}">${SVG(I.back)}</button>
      <div class="ar-ht">${h.jp?`<span class="ar-jp" lang="ja">${esc(h.jp)}</span>`:""}<h1>${esc(D(h,"n"))}</h1><p>${esc(D(h,"vibe"))}</p>
        <div class="ar-chips"><span>${esc(cityOf(h.city))}</span><span>📍 ${esc(T(ps.length===1?"1 place":"{n} places",{n:ps.length}))}</span>${hl?`<span>🍜 ${esc(T("{n} halal",{n:hl}))}</span>`:""}</div></div></div>
    <div class="ar-body">
      ${D(h,"story")?`<div class="ar-story"><img src="assets/cat.png" alt=""><p>${esc(D(h,"story"))}</p></div>`:""}
      ${h.stats?`<h2 class="ar-h">${T("The area at a glance")}</h2><div class="ar-stats">${ST.map(([k,e,l])=>`<div><span>${e} ${esc(T(l))}</span><i role="img" aria-label="${esc(T("{n} out of 5",{n:h.stats[k]||0}))}">${[1,2,3,4,5].map(i=>`<b class="${i<=(h.stats[k]||0)?"on":""}"></b>`).join("")}</i></div>`).join("")}</div>`:""}
      <div class="ar-two">${D(h,"best")?`<div class="ar-best"><small>⏰ ${T("Best time")}</small><b>${esc(D(h,"best"))}</b></div>`:""}${D(h,"tip")?`<div class="ar-tip"><small>🐾 ${T("Apollo's tip")}</small><b>${esc(D(h,"tip"))}</b></div>`:""}</div>
      ${miss.length?`<h2 class="ar-h">${T("Don't miss 🔥")}</h2><div class="ar-miss">${miss.map(p=>`<div class="ar-mc" style="--c:var(--${p.cat})"><button type="button" class="ar-go" data-id="${p.id}"><span class="ar-mi${p.photo?"":" art"}"><img src="${p.photo||CATS[p.cat].img}" alt="" loading="lazy"></span>
        <b><bdi>${esc(p.n)}</bdi></b><small>${esc(D(CATS[p.cat],"n"))}${p.halal?" · "+esc(T("halal ✓")):""}</small></button>${addB(p)}</div>`).join("")}</div>`:""}
      <h2 class="ar-h">${esc(T("Everything in {a}",{a:D(h,"n")}))} <span class="ar-n">${N(ps.length)}</span></h2></div>
    ${fs.length>1?`<div class="lv-f ar-f">${fs.map(([k,l])=>`<button type="button" data-f="${esc(k)}">${esc(l)}</button>`).join("")}</div>`:""}
    <div class="lv-rows"></div>
    ${typeof mapOnly==="function"&&ps.length?`<button type="button" class="lv-map">${SVG(I.map)} ${T("Show the area on the map")}</button>`:""}`;
  lv.classList.add("lv-area");
  lv.querySelector(".lv-back").onclick=()=>history.back();
  lv.querySelectorAll(".lv-f button").forEach(b=>b.onclick=()=>{lvF=b.dataset.f;lvDraw()});
  lv.querySelectorAll(".ar-go").forEach(b=>b.onclick=()=>openPlace(b.dataset.id));
  lv.querySelectorAll(".ar-add").forEach(b=>b.onclick=()=>{const k=b.dataset.k;if(inTrip(k))removeKey(k);else{trip.ideas.push(k);toast(T("Added to your trip ✓"))}
    saveTrip();const on=inTrip(k);b.classList.toggle("on",on);b.textContent=on?"✓":"＋";b.setAttribute("aria-pressed",String(on))});
  const m=lv.querySelector(".lv-map");if(m)m.onclick=()=>{mapOnly(lv.lvShown||lvAll,lvTitle);go("map")};
  lvDraw();lv.hidden=false;lv.scrollTop=0;document.documentElement.classList.add("pv-open");
  if(!fromHistory)history.pushState({tnList:1},"");
}
window.openArea=openArea;
function closeList(){lv.hidden=true;if(pv.hidden)document.documentElement.classList.remove("pv-open")}

// On the Areas page, a card opens the area's own page instead of flipping.
if(typeof renderHoods==="function"){const _rh=renderHoods;renderHoods=function(){_rh();
  const list=HOODS.filter(x=>x.city===hoodCity);
  document.querySelectorAll("#hgrid .hcard").forEach((c,i)=>c.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();openArea(list[i])},true))};renderHoods()}

// ---- More ----
const MORE=[["Discover",[["🚆","Day trips","trips"],["📱","Apps to download","apps"],["📸","Memories","memories"]]],
  ["Settings",[["🌐","Language","lang"],["🔒","Privacy","privacy"],["🐾","Contributors","crew"]]]];
function renderMore(){
  const el=$("menu");if(!el)return;
  const me=typeof auth!=="undefined"&&auth;
  el.innerHTML=`<header class="ax-h"><div><h1>${T("More")}</h1></div></header>
    <button type="button" class="am-prof"><img src="assets/cat.png" alt=""><div><b>${esc(me?me.email.split("@")[0]:T("Your account"))}</b>
      <small>${esc(me?me.email:T("Log in or create a free account"))}</small></div><i aria-hidden="true">‹</i></button>
    ${MORE.map(([h,items])=>`<h2 class="am-h">${T(h)}</h2><div class="am-list">${items.map(([ic,l,k])=>`<button type="button" class="am-li" data-k="${k}"><span aria-hidden="true">${ic}</span><b>${T(l)}</b>
      ${k==="lang"?`<small>${isAR()?"العربية":"English"}</small>`:""}<i aria-hidden="true">‹</i></button>`).join("")}</div>`).join("")}
    <p class="am-foot">Tabi Neko · ${T("made in Riyadh")} 🐾</p>`;
  el.querySelector(".am-prof").onclick=()=>{if(typeof openAcct==="function")openAcct(me?"me":"login")};
  el.querySelectorAll(".am-li").forEach(b=>b.onclick=()=>{const k=b.dataset.k;
    if(k==="lang"){setLang(isAR()?"en":"ar");return}
    location.hash="#"+k;window.scrollTo(0,0)});
}

// ---- a back bar on the pages opened from More ----
const TITLES={hoods:"Areas",trips:"Day trips",apps:"Apps to download",memories:"Memories",crew:"Contributors",privacy:"Privacy",admin:"Admin"};
function renderBars(){
  Object.keys(TITLES).forEach(k=>{const sec=$(k);if(!sec)return;
    let b=sec.querySelector(":scope > .apbar");
    if(!b){b=document.createElement("div");b.className="apbar";sec.prepend(b)}
    b.innerHTML=`<button type="button" class="pv-cb" aria-label="${esc(T("Back"))}">${SVG(I.back)}</button><b>${T(TITLES[k])}</b>`;
    b.querySelector("button").onclick=()=>{if(history.length>1)history.back();else go("menu")};
  });
}

// ---- keep everything in step ----
function renderShell(){renderTabs();renderExplore();renderMore();renderBars();if(pvId)renderPlace()}
const _setLang=setLang;setLang=function(l){_setLang(l);if(l==="ar"&&!AR_ON())return;renderShell()};
if(typeof userBtn==="function"){const _u=userBtn;userBtn=function(){_u();renderExplore();renderMore()}}
renderShell();
// The app opens on Explore unless a page was asked for.
const h=location.hash.slice(1);
if(!h||h==="top")go("explore");else syncTabs();
})();
