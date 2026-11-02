// Apollo's stamp book (the app only). Each famous place in data/stamps.js
// has its own ink stamp. You collect it on the place's page, and only when
// your phone says you're there: the location is checked once, on the phone,
// and never sent anywhere. What's saved is which stamps you have and when.
//
// Stamps belong to your account: you need to be logged in to collect them,
// and they're kept in Firestore at stamps/<your user id> (see
// firebase/firestore.rules), as a JSON string {"city|name":"2026-11-02"}.
// A copy stays on the phone so the book opens without internet, and a
// stamp collected offline is sent when you're back online.
//
// The book is opened from More; every stamp place's page shows its stamp.
(function(){
if(typeof IS_APP==="undefined"||!IS_APP||typeof STAMPS==="undefined")return;

const CACHE="tabineko-stamps";
// Ink colours by kind of place, a little deeper than the map's so they read as ink.
const INK={shrine:"#D9441E",food:"#C98A00",views:"#1D52A0",nature:"#4D8A30",streets:"#22807B",coffee:"#8A5A2E",shop:"#D5506C",experience:"#6E4FA0"};
const FRAME={shrine:"circle",views:"hex",streets:"square",food:"square",nature:"cloud",shop:"square",experience:"cloud",coffee:"circle"};
const GHOST="#B9A794";

// Every stamp, with its place.
const LIST=STAMPS.map(s=>({...s,p:P.find(p=>p.city===s.c&&p.n===s.n)})).filter(s=>s.p);
const BYID=new Map(LIST.map(s=>[s.p.id,s]));
const KEY=s=>s.c+"|"+s.n;
const CITY_ORDER=[...new Set(LIST.map(s=>s.c))];

// ---- what you've collected ----
// mine: {key: "YYYY-MM-DD"}; dirty: collected here and not yet saved.
let mine={},dirty=false,loadedFor="";
try{const c=JSON.parse(store.get(CACHE)||"null");if(c&&typeof auth!=="undefined"&&auth&&c.uid===auth.uid){mine=c.s||{};dirty=!!c.dirty;loadedFor=c.uid}}catch(e){}
const keep=()=>{try{store.set(CACHE,JSON.stringify({uid:auth?auth.uid:"",s:mine,dirty}))}catch(e){}};
const logged=()=>typeof auth!=="undefined"&&!!auth&&typeof FB_ON!=="undefined"&&FB_ON;
const have=s=>!!mine[KEY(s)];
const count=()=>LIST.filter(have).length;
const clean=o=>{const out={};if(o&&typeof o==="object")for(const s of LIST){const v=o[KEY(s)];if(typeof v==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(v))out[KEY(s)]=v}return out};

async function load(){
  if(!logged()){mine={};dirty=false;loadedFor="";redraw();return}
  if(loadedFor!==auth.uid){mine={};dirty=false;loadedFor=auth.uid}
  try{
    const d=await fsGet("stamps/"+auth.uid);
    let server={};try{server=clean(JSON.parse(d&&d.fields&&d.fields.data&&d.fields.data.stringValue||"{}"))}catch(e){}
    // Keep the earliest date of each, from here and from the server.
    const both={...server};for(const k in mine)if(!both[k]||mine[k]<both[k])both[k]=mine[k];
    const more=Object.keys(both).length>Object.keys(server).length;
    mine=both;keep();redraw();
    if(more||dirty)save();
  }catch(e){if(e&&e.status===401&&typeof loggedOut==="function")loggedOut(true)}
}
async function save(){
  if(!logged())return;dirty=true;keep();
  try{await fsPatch("stamps/"+auth.uid,{data:S(JSON.stringify(mine))},["data"]);dirty=false;keep()}
  catch(e){if(e&&e.status===401&&typeof loggedOut==="function")loggedOut(true)}
}
addEventListener("online",()=>{if(dirty)save()});

// ---- the drawings ----
// Each is drawn in a 100×100 stamp, roughly inside x 26–74, y 16–64, as
// lines in the ink colour c. Apollo peeks in at a corner (AP moves him).
const torii=(c,x,y,s)=>`<g transform="translate(${x} ${y}) scale(${s})" stroke-width="${2.3/s}"><path d="M-22 -16 Q0 -21 22 -16 L22 -13 Q0 -17.5 -22 -13Z" fill="${c}"/><path d="M-18 -8 H18 M-14 -15 V16 M14 -15 V16 M0 -16 V-8"/></g>`;
const wave=(y,x0=28,n=4)=>`<path d="M${x0} ${y}${" q5 -2.5 10 0".repeat(1)}${" t10 0".repeat(n-1)}"/>`;
const star=(x,y,r)=>`<path d="M${x} ${y-r} Q${x} ${y} ${x+r} ${y} Q${x} ${y} ${x} ${y+r} Q${x} ${y} ${x-r} ${y} Q${x} ${y} ${x} ${y-r}Z" fill="currentColor"/>`;
const ICON={
  lantern:c=>`<rect x="39" y="25" width="22" height="4" rx="1"/><path d="M38 29 Q35.5 42 38 55 L62 55 Q64.5 42 62 29Z"/><path d="M37.6 33 H62.4 M37.6 51 H62.4"/><text x="50" y="46" text-anchor="middle" font-size="10" font-weight="900" fill="${c}" stroke="none" font-family="sans-serif">雷門</text><rect x="39" y="55" width="22" height="4" rx="1"/><path d="M50 59 V63"/>`,
  torii:c=>torii(c,50,44,1.05)+`<path d="M30 61 H70"/>`,
  tower:()=>`<path d="M50 17 V25"/><path d="M47.5 25 L36 62 M52.5 25 L64 62"/><rect x="42.3" y="37" width="15.4" height="4"/><path d="M45 30 H55 M40.8 48 H59.2 M39 54 H61 M41 48 L60.5 54 M59 48 L39.5 54"/><path d="M44 62 Q50 53 56 62"/>`,
  skytree:()=>`<path d="M50 13 V21"/><path d="M48 21 L46 58 M52 21 L54 58"/><rect x="45" y="28" width="10" height="3" rx="1.5"/><rect x="43" y="38" width="14" height="4.5" rx="2"/><path d="M46 52 L39 62 M54 52 L61 62 M33 62 H67 M47 47 H53"/>`,
  cross:c=>{let s=`<path d="M30 30 V24 H38 V30 M40 30 V20 H48 V30 M58 30 V22 H66 V30 M50 30 V26 H56 V30 M28 33 H72"/>`;
    for(let i=0;i<6;i++)s+=`<rect x="${33+i*6}" y="${37+i*3.3}" width="3" height="7" transform="rotate(-50 ${34.5+i*6} ${40+i*3.3})" fill="${c}" stroke="none"/><rect x="${64-i*6}" y="${37+i*3.3}" width="3" height="7" transform="rotate(50 ${65.5-i*6} ${40+i*3.3})" fill="${c}" stroke="none"/>`;return s},
  skyscraper:()=>`<path d="M42 62 V24 L50 17 L58 24 V62 M38 24 H62 M42 30 H58 M46 36 V58 M54 36 V58 M30 62 V40 H38 V62 M62 62 V44 H70 V62 M26 62 H74"/>`,
  trees:()=>`<circle cx="38" cy="38" r="8"/><path d="M38 46 V60"/><circle cx="54" cy="32" r="10"/><path d="M54 42 V60 M28 60 H72 M28 52 q4 -3 8 0 M60 50 q3 -2 6 0"/>`,
  yagura:c=>`<path d="M28 62 L32 46 H68 L72 62 M30 54 H70 M38 46 L37 54 M50 46 V54 M62 46 L63 54"/><rect x="38" y="36" width="24" height="10"/><path d="M34 36 Q50 29 66 36Z" fill="${c}"/><path d="M44 40 h4 M52 40 h4"/>`,
  sakura:c=>`<path d="M50 62 V44 M50 50 L42 43 M50 47 L58 40 M30 62 H70"/><circle cx="40" cy="36" r="8"/><circle cx="52" cy="29" r="9"/><circle cx="62" cy="38" r="7"/>`+[[38,34],[43,39],[50,26],[55,31],[61,36],[63,41]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="1.5" fill="${c}"/>`).join(""),
  electric:c=>`<rect x="38" y="20" width="24" height="42"/><rect x="30" y="25" width="7" height="22"/><rect x="63" y="30" width="7" height="18"/><path d="M53 26 L45 41 H51 L47 55 L57 37 H51Z" fill="${c}"/><path d="M26 62 H74"/>`,
  market:c=>`<path d="M30 33 L34 23 H66 L70 33Z"/><path d="M30 33 q3.33 4 6.67 0 t6.67 0 t6.67 0 t6.67 0 t6.67 0 t6.67 0"/><path d="M42 23 L40 33 M50 23 V33 M58 23 L60 33 M33 37 V62 M67 37 V62 M28 62 H72 M33 56 H67"/><path d="M40 49 q8 -6 16 0 q-8 6 -16 0Z M56 49 l5 -4 v8Z"/><circle cx="44" cy="48" r=".9" fill="${c}"/>`,
  sparkle:()=>star(42,36,10)+star(60,28,7)+star(60,50,6)+`<circle cx="34" cy="54" r="2"/><circle cx="48" cy="58" r="1.5"/><circle cx="68" cy="40" r="1.5"/>`,
  inari:c=>torii(c,50,34,.55)+torii(c,50,40,.75)+torii(c,50,47,1)+`<path d="M30 63 H70"/>`,
  stage:c=>`<path d="M29 33 Q50 24 71 33 Z" fill="${c}"/><rect x="35" y="33" width="30" height="9"/><path d="M29 44 H71 M33 44 V62 M40 44 V62 M47 44 V62 M53 44 V62 M60 44 V62 M67 44 V62 M31 51 H69 M31 57 H69"/>`,
  kinkaku:c=>`<path d="M50 17 V21"/><path d="M39 27 Q50 20 61 27Z" fill="${c}"/><rect x="43" y="27" width="14" height="6"/><path d="M36 36 Q50 30 64 36Z" fill="${c}"/><rect x="40" y="36" width="20" height="6"/><path d="M33 45 Q50 39 67 45Z" fill="${c}"/><rect x="38" y="45" width="24" height="8"/>`+wave(58,28,5)+wave(62.5,33,4),
  ginkaku:c=>`<path d="M50 22 V26"/><path d="M39 31 Q50 25 61 31Z" fill="${c}"/><rect x="42" y="31" width="16" height="7"/><path d="M35 41 Q50 34 65 41Z" fill="${c}"/><rect x="39" y="41" width="22" height="10"/><path d="M45 41 V51 M55 41 V51 M26 62 H74 M28 62 L33 53 H38 L43 62"/><circle cx="66" cy="52" r="5"/><path d="M66 57 V62"/>`,
  bamboo:()=>[34,42,50,58,66].map((x,i)=>`<path d="M${x} ${18+i%2*4} V63"/>`+[28,38,48,58].map(y=>`<path d="M${x-2} ${y+i%2*3} H${x+2}"/>`).join("")).join("")+`<path d="M34 24 q5 -4 10 -3 M50 22 q-6 -3 -10 0 M58 26 q5 -4 10 -2 M66 30 q-4 -5 -9 -4"/>`,
  lanterns:c=>`<path d="M26 28 H74 L70 23 H30Z" fill="${c}"/><path d="M30 31 Q50 36 70 31"/>`+[36,50,64].map(x=>`<path d="M${x} ${33.5-(x===50?-1.5:0)} v3"/><ellipse cx="${x}" cy="${43+(x===50?1.5:0)}" rx="5" ry="6.5"/><path d="M${x-5} ${43+(x===50?1.5:0)} h10 M${x} ${49.5+(x===50?1.5:0)} v3"/>`).join("")+`<path d="M26 62 H74 M30 62 V56 H70 V62"/>`,
  gate:c=>`<path d="M26 32 Q50 21 74 32 L70 36 H30Z" fill="${c}"/><path d="M32 40 H68 M34 36 V62 M66 36 V62 M44 40 V62 M56 40 V62 M28 62 H72"/><path d="M45 44 H55 V62 H45Z" fill="${c}" fill-opacity=".25"/>`,
  path:()=>`<path d="M30 62 Q44 46 48 18 M44 62 Q56 46 56 18"/><path d="M36 54 q3 -1.5 6 0 M41 44 q2.5 -1.5 5 0 M45 34 q2 -1 4 0"/><circle cx="31" cy="32" r="7"/><path d="M31 39 V48"/><circle cx="68" cy="38" r="7"/><path d="M68 45 V56"/>`,
  castle:c=>`<path d="M33 62 L37 50 L63 50 L67 62Z M35 56 H65"/><rect x="41" y="43" width="18" height="7"/><path d="M36 43 Q50 37 64 43Z" fill="${c}"/><rect x="44" y="34.5" width="12" height="6"/><path d="M39.5 34.5 Q50 29 60.5 34.5Z" fill="${c}"/><rect x="46.5" y="27.5" width="7" height="4.5"/><path d="M42 27.5 Q50 22 58 27.5Z" fill="${c}"/>`,
  canal:c=>`<rect x="55" y="17" width="13" height="19" rx="2"/><text x="61.5" y="31" text-anchor="middle" font-size="10" font-weight="900" fill="${c}" stroke="none" font-family="sans-serif">道</text><path d="M61.5 36 V44"/><path d="M27 46 Q50 33 73 46 M27 50 Q50 37 73 50 M33 43 V48 M40 39.5 V44.5 M47 38 V43 M54 38 V43 M61 39.5 V44.5 M67 42.5 V47.5"/>`+wave(57,27,5)+wave(62,32,4),
  globe:()=>`<circle cx="50" cy="38" r="14"/><ellipse cx="50" cy="38" rx="6" ry="14"/><path d="M36 38 H64 M38 31 H62 M38 45 H62"/><ellipse cx="50" cy="38" rx="22" ry="5.5" transform="rotate(-14 50 38)"/><path d="M50 52 V58 M42 60 H58"/>`,
  fugu:c=>`<circle cx="48" cy="40" r="13"/>`+[0,30,60,90,120,150,180,210,240,270,300,330].map(a=>{const r=Math.PI*a/180;return `<path d="M${(48+13*Math.cos(r)).toFixed(1)} ${(40+13*Math.sin(r)).toFixed(1)} L${(48+17*Math.cos(r)).toFixed(1)} ${(40+17*Math.sin(r)).toFixed(1)}"/>`}).join("")+`<circle cx="43" cy="36" r="1.6" fill="${c}"/><path d="M38 44 q3 2 6 0 M61 40 l7 -5 v10Z M48 57 V63 M36 63 H60"/>`,
  tsutenkaku:c=>`<path d="M50 13 V19"/><rect x="43" y="19" width="14" height="10"/><path d="M44 29 L46 50 M56 29 L54 50 M38 62 Q50 46 62 62 M34 62 L44 50 H56 L66 62"/><rect x="45.5" y="34" width="9" height="3" fill="${c}"/>`,
  fish:c=>`<path d="M28 42 Q46 28 66 38 L74 32 L72 44 L74 54 L66 48 Q46 58 28 46Z"/><circle cx="34" cy="42" r="1.3" fill="${c}"/>`+[[44,38],[50,42],[56,39],[46,46],[58,46]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="1.1" fill="${c}"/>`).join("")+wave(60,30,4)+`<circle cx="38" cy="26" r="2"/><circle cx="33" cy="20" r="1.4"/>`,
  deer:c=>`<path d="M44 40 Q50 36 56 40 L54.5 55 Q50 60 45.5 55Z M44 41 L35 37.5 L43 45 M56 41 L65 37.5 L57 45 M46.5 38.5 L42 25 M44 31 L37 27 M53.5 38.5 L58 25 M56 31 L63 27 M48.5 54 H51.5"/><circle cx="47.6" cy="45.5" r="1.1" fill="${c}"/><circle cx="52.4" cy="45.5" r="1.1" fill="${c}"/>`,
  hall:c=>`<path d="M26 40 Q50 31 74 40 L70 40 L70 45 L30 45 L30 40Z" fill="${c}"/><path d="M33 33 L33 29 M67 33 L67 29 M30 45 V62 M70 45 V62 M30 51 H70 M37 51 V62 M44 51 V62 M56 51 V62 M63 51 V62 M26 62 H74"/><path d="M45 51 H55 V62 H45Z" fill="${c}" fill-opacity=".25"/>`,
  toro:c=>`<path d="M40 62 H60 M43 62 V58 H57 V62"/><rect x="47" y="44" width="6" height="14"/><rect x="42" y="33" width="16" height="11"/><rect x="46" y="36" width="8" height="5" fill="${c}" fill-opacity=".3"/><path d="M36 33 L50 24 L64 33Z" fill="${c}"/><circle cx="50" cy="21" r="2"/>`,
  pagoda:c=>`<path d="M50 12 V20 M48 15 H52 M48 18 H52"/>`+[0,1,2,3,4].map(i=>{const y=58-i*9,w=19-i*2.6;return `<path d="M${50-w} ${y} Q50 ${y-5} ${50+w} ${y}Z" fill="${c}"/><rect x="${50-w*.55}" y="${y}" width="${w*1.1}" height="${i?4:5}"/>`}).join("")+`<path d="M30 63 H70"/>`,
  buddha:c=>`<circle cx="50" cy="29" r="7"/><circle cx="50" cy="21.5" r="2.5" fill="${c}"/><path d="M43 28 v4 M57 28 v4 M34 62 Q33 41 50 38 Q67 41 66 62Z"/><ellipse cx="50" cy="53" rx="8" ry="4"/><path d="M28 62 H72"/>`,
  island:c=>`<path d="M26 54 Q38 34 54 44 Q62 38 74 54Z"/><path d="M57 42 V26 H62 V40 M55 26 H64 M59.5 26 V22"/><path d="M32 47 q2 -3 4 0 M40 41 q2 -3 4 0"/>`+wave(59,24,5)+wave(63.5,29,4),
  porttower:()=>`<path d="M42 62 Q51 42 44 22 M58 62 Q49 42 56 22"/><ellipse cx="50" cy="22" rx="7" ry="2"/><ellipse cx="50" cy="32" rx="4.6" ry="1.4"/><ellipse cx="50" cy="44" rx="3.6" ry="1.2"/><ellipse cx="50" cy="54" rx="5.6" ry="1.6"/><path d="M50 20 V15 M30 62 H70"/>`,
  house:c=>`<path d="M32 36 L50 22 L68 36 M35 36 V62 H65 V36 M60 30 V24 H64 V33 M50 22 V15 M47 16 L50 14 L53 16"/><rect x="39" y="41" width="7" height="8"/><rect x="54" y="41" width="7" height="8"/><path d="M46 62 V53 H54 V62 M42.5 41 V49 M57.5 41 V49"/><path d="M28 62 H72"/>`,
  anchor:()=>`<circle cx="50" cy="22" r="3.5"/><path d="M50 25.5 V58 M41 31 H59 M35 48 Q37 60 50 60 Q63 60 65 48 M32 51 L35 47 L38 51 M62 51 L65 47 L68 51"/>`,
  ropeway:()=>`<path d="M22 22 L78 38 M50 30 V37"/><rect x="42" y="37" width="16" height="13" rx="3"/><path d="M45 41 H55 V45 H45Z M26 63 Q38 48 52 58 Q62 50 74 63"/>`
};
// Where Apollo peeks in, when the corner (70, 58) is busy.
const AP={cross:[50,62],kinkaku:[72,46],canal:[36,30],sparkle:[70,62],lanterns:[72,52],fish:[68,62],island:[38,30],globe:[70,58],ropeway:[34,48],anchor:[71,44],pagoda:[72,48],tsutenkaku:[70,40],house:[74,50],buddha:[70,40],skyscraper:[70,32],electric:[72,58],market:[74,50],path:[50,58]};
const apollo=(c,x,y,s)=>`<g transform="translate(${x-50*s} ${y-44*s}) scale(${s})" fill="#FBF3E2" stroke="${c}" stroke-width="${(2.3/s).toFixed(2)}" stroke-linecap="round" stroke-linejoin="round">
 <path d="M37 41 L36.5 31 L44.5 37 Q50 35.6 55.5 37 L63.5 31 L63 41 Q66 49 62 56 Q50 62 38 56 Q34 49 37 41Z"/>
 <path d="M41 31 Q50 22.5 59 31" fill="${c}"/><path d="M38.5 35.5 Q50 26 61.5 35.5" fill="none"/>
 <path d="M42.5 47 q2 -2.4 4 0 M53.5 47 q2 -2.4 4 0" fill="none"/><path d="M48.6 51 h2.8 l-1.4 1.6z" fill="${c}"/></g>`;
let uid=0;
// A stamp as SVG. got: in colour with its date; otherwise a pale outline.
function stampSVG(s,{size=100,got,date,spin}={}){
  const c=got?INK[s.p.cat]||INK.shrine:GHOST,id="tns"+(uid++),shape=FRAME[s.p.cat]||"circle",txt=(s.t||s.n).toUpperCase();
  const jp=s.j||(s.p.jp||"").split(" ")[0];
  const frame=shape==="circle"?`<circle cx="50" cy="50" r="46" stroke-width="3.2"/><circle cx="50" cy="50" r="40.5" stroke-width="1.2"/>`
   :shape==="square"?`<rect x="5" y="5" width="90" height="90" rx="14" stroke-width="3.2"/><rect x="10.5" y="10.5" width="79" height="79" rx="10" stroke-width="1.2"/>`
   :shape==="hex"?`<polygon points="50,3 91,26.5 91,73.5 50,97 9,73.5 9,26.5" stroke-width="3.2" stroke-linejoin="round"/><polygon points="50,10 85,30 85,70 50,90 15,70 15,30" stroke-width="1.2"/>`
   :`<path d="M50 4 C64 4 70 9 79 15 C88 21 96 30 96 50 C96 70 88 79 79 85 C70 91 64 96 50 96 C36 96 30 91 21 85 C12 79 4 70 4 50 C4 30 12 21 21 15 C30 9 36 4 50 4Z" stroke-width="3.2"/><circle cx="50" cy="50" r="40" stroke-width="1.2" stroke-dasharray="2.5 2.5"/>`;
  const top=shape!=="square"?`<path id="${id}" d="M15,52 A35,35 0 0 1 85,52" fill="none"/><text font-family="Inter,sans-serif" font-weight="900" font-size="${txt.length>14?6.8:8.6}" letter-spacing="1.1" fill="${c}"><textPath href="#${id}" startOffset="50%" text-anchor="middle">${esc(txt)}</textPath></text>`
   :`<text x="50" y="21" text-anchor="middle" font-family="Inter,sans-serif" font-weight="900" font-size="8" letter-spacing=".6" fill="${c}"${txt.length>11?` textLength="62" lengthAdjust="spacingAndGlyphs"`:""}>${esc(txt)}</text>`;
  const [ax,ay]=AP[s.ic]||[70,58],d=date?date.split("-"):null;
  return `<svg class="tns" width="${size}" height="${size}" viewBox="0 0 100 100" aria-hidden="true"${spin?` style="transform:rotate(${spin}deg)"`:""}><g${got?` filter="url(#tn-ink)"`:""} style="color:${c}">
    <g fill="none" stroke="${c}">${frame}</g>${top}
    <g transform="translate(0 ${shape==="hex"?2:4}) scale(1 ${shape==="hex"?.88:.92})" transform-origin="50 40" fill="none" stroke="${c}" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">${(ICON[s.ic]||ICON.torii)(c)}</g>
    ${apollo(c,ax,ay,.36)}
    <text x="50" y="${shape==="hex"?72:75}" text-anchor="middle" font-family="sans-serif" font-weight="900" font-size="${jp.length>5?7.6:shape==="hex"?8.5:9.5}" fill="${c}" lang="ja">${esc(jp)}</text>
    ${d?`<text x="50" y="${shape==="hex"?81:85}" text-anchor="middle" font-family="Inter,sans-serif" font-weight="800" font-size="6.5" letter-spacing="1" fill="${c}">${+d[2]}·${+d[1]}·${d[0].slice(2)}</text>`:""}</g></svg>`;
}
// Stamps sit at a slight angle, the same one every time.
const tilt=s=>{let h=0;for(const ch of KEY(s))h=(h*31+ch.charCodeAt(0))|0;return (Math.abs(h)%17)-8};
// The ink texture, once for the whole app.
document.body.insertAdjacentHTML("beforeend",`<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs><filter id="tn-ink" x="-5%" y="-5%" width="110%" height="110%">
  <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" seed="4" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -6 4.3" result="m"/>
  <feComposite in="SourceGraphic" in2="m" operator="in" result="c"/><feTurbulence type="fractalNoise" baseFrequency=".05" numOctaves="2" seed="2" result="w"/><feDisplacementMap in="c" in2="w" scale="2"/></filter></defs></svg>`);

const longDate=v=>{const d=new Date(v+"T12:00:00");try{return d.toLocaleDateString(isAR()?"ar":"en-GB",{day:"numeric",month:"long",year:"numeric"})}catch(e){return v}};
const todayJ=()=>{const d=new Date(Date.now()+9*3600e3);return d.toISOString().slice(0,10)};
const cityName=c=>typeof cityOf==="function"?cityOf(c):D(CITIES[c],"n");
const dist=m=>m<1000?T("{n} m",{n:Math.round(m/10)*10}):T("{n} km",{n:(m/1000).toFixed(m<10000?1:0)});

// ---- on a place's page ----
let msg={};  // a line under the button after trying, by place id
window.tnStampSlot=p=>{
  const s=BYID.get(p.id);if(!s)return "";
  const got=logged()&&have(s),m=msg[p.id];
  let side;
  if(!logged())side=`<b>${T("Apollo's stamp 🐾")}</b><p>${T("Log in, then come here to collect this place's stamp for your book.")}</p><button type="button" class="btn sb-login">${T("Log in")}</button>`;
  else if(got)side=`<b>${T("Stamped ✓")}</b><p>${esc(longDate(mine[KEY(s)]))}</p><button type="button" class="sb-open">${T("Open my stamp book")}</button>`;
  else side=`<b>${T("Apollo's stamp 🐾")}</b><p>${T("You get it only when you're here.")}</p><button type="button" class="btn sb-go">${T("🐾 I'm here: stamp it")}</button>`;
  return `<section class="sb-slot${got?" got":""}"><button type="button" class="sb-art" aria-label="${esc(T("Stamp book"))}">${stampSVG(s,{size:104,got,date:got?mine[KEY(s)]:null,spin:got?tilt(s):0})}</button>
    <div>${side}${m?`<small class="sb-msg">${esc(m)}</small>`:""}</div></section>`;
};
window.tnStampWire=(box,p)=>{
  const s=BYID.get(p.id);if(!s)return;
  const q=c=>box.querySelector(c);
  if(q(".sb-login"))q(".sb-login").onclick=()=>{if(typeof openAcct==="function")openAcct("login")};
  if(q(".sb-open"))q(".sb-open").onclick=()=>openBook(s.c,KEY(s));
  q(".sb-art").onclick=()=>openBook(s.c,KEY(s));
  if(q(".sb-go"))q(".sb-go").onclick=()=>tryStamp(s);
};
function say(s,t){msg[s.p.id]=t;redraw()}
// Where you are, once. A reading that's only good to a few hundred metres
// (indoors, or right after the phone wakes) asks you to try again.
function tryStamp(s){
  if(!logged())return;
  if(typeof isAdmin==="function"&&isAdmin()&&confirm(T("Owner test: give yourself this stamp without being there?")))return give(s);
  if(!navigator.geolocation)return say(s,T("This phone can't share its location."));
  const b=pv().querySelector(".sb-go");if(b){b.disabled=true;b.textContent=T("Checking where you are…")}
  navigator.geolocation.getCurrentPosition(pos=>{
    const {latitude:lat,longitude:lng,accuracy:acc}=pos.coords,m=KM({lat,lng},s.p)*1000;
    if(m<=s.r)return give(s);
    if(acc>Math.max(150,s.r)&&m-acc<=s.r)return say(s,T("Your location isn't sharp yet. Step outside and try again."));
    say(s,T("You're {d} away. Come to {p} to get its stamp.",{d:dist(m),p:s.p.n}));
  },e=>say(s,e&&e.code===1?T("Allow location for Tabi Neko in your phone's settings, then try again."):T("Couldn't find where you are. Try again outside.")),
  {enableHighAccuracy:true,timeout:20000,maximumAge:20000});
}
function give(s){
  if(!have(s)){mine[KEY(s)]=todayJ();save()}
  delete msg[s.p.id];redraw();celebrate(s);
}

// ---- the moment it lands ----
// Apollo says the first sentence of his note about the place.
const firstLine=t=>{const m=String(t||"").match(/^.+?[.!?؟。](?=\s|$)/);return m?m[0]:t};
let moment=null;
function celebrate(s){
  closeMoment();
  const n=LIST.filter(x=>x.c===s.c&&have(x)).length,all=LIST.filter(x=>x.c===s.c).length;
  moment=document.createElement("div");moment.className="sb-moment";moment.setAttribute("role","dialog");moment.setAttribute("aria-label",T("Stamped!"));
  moment.innerHTML=`<div class="sb-paper"><div class="sb-land">${stampSVG(s,{size:190,got:true,date:mine[KEY(s)],spin:tilt(s)})}</div>
    <h3>${T("Stamped! 🎉")}</h3><p>${esc(T("{n} of {all} stamps in {c}",{n,all,c:cityName(s.c)}))}</p>
    <div class="sb-bub"><img src="${GI()}" alt=""><span>${esc(firstLine(D(s.p,"tip")))}</span></div>
    <div class="sb-btns"><button type="button" class="sb-done">${T("Done")}</button><button type="button" class="btn sb-book">${T("See my book")}</button></div></div>`;
  document.body.appendChild(moment);
  try{navigator.vibrate&&setTimeout(()=>navigator.vibrate(35),420)}catch(e){}
  moment.querySelector(".sb-done").onclick=closeMoment;
  moment.querySelector(".sb-book").onclick=()=>{closeMoment();openBook(s.c,KEY(s))};
  moment.onclick=e=>{if(e.target===moment)closeMoment()};
}
function closeMoment(){if(moment){moment.remove();moment=null}}

// ---- the book ----
const bk=document.createElement("div");bk.id="sbook";bk.hidden=true;bk.setAttribute("role","dialog");bk.setAttribute("aria-modal","true");document.body.appendChild(bk);
let bookCity=CITY_ORDER[0],flash="";
function drawBook(){
  if(bk.hidden)return;
  const me=logged(),n=me?count():0,cities=new Set(LIST.filter(s=>me&&have(s)).map(s=>s.c)).size;
  const first=me?Object.values(mine).sort()[0]:"";
  const name=me?myName():"";
  bk.innerHTML=`<div class="sb-scroll"><div class="apbar"><button type="button" class="pv-cb sb-back" aria-label="${esc(T("Back"))}">${SVG_BACK}</button><b>${T("Stamp book")}</b></div>
    <div class="sb-pass"><small>TABI NEKO PASSPORT</small><b>${me?esc(T("{n}'s Japan",{n:name})):T("Your Japan")}</b>
      <span>${me?esc(T("{n} of {all} stamps",{n,all:LIST.length})+(cities?" · "+(cities===1?T("1 city"):T("{n} cities",{n:num(cities)})):"")+(first?" · "+T("since {d}",{d:longDate(first)}):"")):T("Log in to start collecting")}</span>
      <i class="sb-bar"><i style="width:${Math.round(n/LIST.length*100)}%"></i></i><img src="assets/cat.png" alt=""></div>
    ${me?"":`<div class="sb-in"><p>${T("Stamps are saved to your account, so they're safe on any phone.")}</p><button type="button" class="btn sb-login">${T("Log in")}</button></div>`}
    <div class="sb-pills" role="tablist">${CITY_ORDER.map(c=>{const a=LIST.filter(s=>s.c===c);return `<button type="button" role="tab" data-c="${c}" class="${c===bookCity?"on":""}">${esc(cityName(c))} <small><bdi dir="ltr">${num(a.filter(s=>me&&have(s)).length)}/${num(a.length)}</bdi></small></button>`}).join("")}</div>
    <div class="sb-grid">${LIST.filter(s=>s.c===bookCity).map(s=>{const g=me&&have(s);
      return `<button type="button" class="sb-cell${g?" got":""}${KEY(s)===flash?" flash":""}" data-id="${s.p.id}">${stampSVG(s,{size:96,got:g,date:g?mine[KEY(s)]:null,spin:g?tilt(s):0})}<span>${esc(s.t||s.n)}</span></button>`}).join("")}</div>
    <p class="sb-foot">${T("Collect each stamp at the place itself. Your location is checked on your phone only.")}</p>
    ${me&&typeof isAdmin==="function"&&isAdmin()&&n?`<button type="button" class="at-link sb-clear">${T("Owner: clear my test stamps")}</button>`:""}</div>`;
  const q=c=>bk.querySelector(c);
  q(".sb-back").onclick=closeBook;
  if(q(".sb-login"))q(".sb-login").onclick=()=>{if(typeof openAcct==="function")openAcct("login")};
  bk.querySelectorAll(".sb-pills [data-c]").forEach(b=>b.onclick=()=>{bookCity=b.dataset.c;flash="";drawBook()});
  // A place opened from the book shows on top of it; back returns to the book.
  bk.querySelectorAll(".sb-cell").forEach(b=>b.onclick=()=>{if(typeof openPlace!=="function")return;openPlace(b.dataset.id);const pvEl=document.getElementById("pview");if(pvEl)pvEl.style.zIndex="64"});
  if(q(".sb-clear"))q(".sb-clear").onclick=()=>{if(!confirm(T("Clear all your stamps?")))return;mine={};save();redraw()};
}
const num=v=>isAR()?iso(String(v)):String(v);
const SVG_BACK=`<svg viewBox="0 0 24 24" width="25" height="25" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${document.documentElement.dir==="rtl"?"M9 18l6-6-6-6":"M15 18l-6-6 6-6"}"/></svg>`;
function openBook(c,k,fromHistory){
  const pvEl=document.getElementById("pview");if(pvEl)pvEl.style.zIndex="";
  if(c)bookCity=c;flash=k||"";bk.hidden=false;document.documentElement.classList.add("sb-open");drawBook();bk.querySelector(".sb-scroll").scrollTop=0;
  if(!fromHistory)history.pushState({tnBook:1},"");
}
function closeBookNow(){bk.hidden=true;document.documentElement.classList.remove("sb-open")}
function closeBook(){if(history.state&&history.state.tnBook)history.back();else closeBookNow()}
addEventListener("popstate",e=>{const st=e.state||{};if(st.tnBook)openBook(null,flash,true);else if(!bk.hidden)closeBookNow()});
window.tnOpenStampBook=()=>openBook();
window.tnStampCount=()=>logged()?count():0;
// For My trip and the reminders: does this place have a stamp, and is it yours?
window.tnStampInfo=k=>{const s=LIST.find(x=>KEY(x)===k);if(!s)return null;const got=logged()&&have(s);
  return {got,date:got?longDate(mine[k]):"",r:s.r,lat:s.p.lat,lng:s.p.lng,n:s.p.n,id:s.p.id}};
// The reminders' "you're nearby" banner stamps it right away (it already
// checked you're inside the place's circle).
window.tnStampNear=()=>LIST.filter(s=>!have(s));
window.tnStampGive=k=>{const s=LIST.find(x=>KEY(x)===k);if(s&&logged())give(s)};
// The phone's back button: the stamp moment first.
window.tnStampBack=()=>{if(moment){closeMoment();return true}return false};

// ---- the card at the top of More ----
window.tnStampCard=()=>{
  const me=logged(),n=me?count():0,last=me?LIST.filter(have).sort((a,b)=>mine[KEY(b)].localeCompare(mine[KEY(a)])).slice(0,3):[];
  return `<button type="button" class="sb-card"><span class="sb-ct"><small>${T("Apollo's stamp book")}</small><b>${me&&n?esc(T("{n} of {all} stamps",{n,all:LIST.length})):esc(T("{n} stamps waiting in Japan",{n:LIST.length}))}</b></span>
    <span class="sb-peek">${(last.length?last:LIST.slice(0,3)).map((s,i)=>`<i style="--i:${i}">${stampSVG(s,{size:58,got:!!last.length,date:last.length?mine[KEY(s)]:null,spin:tilt(s)})}</i>`).join("")}</span></button>`;
};

const pv=()=>document.getElementById("pview")||document.body;
function redraw(){
  if(typeof window.tnRenderPlace==="function")window.tnRenderPlace();
  if(typeof window.tnRenderMore==="function")window.tnRenderMore();
  drawBook();
}
// Logging in or out changes whose stamps these are.
if(typeof userBtn==="function"){const _u=userBtn;userBtn=function(){_u();const id=logged()?auth.uid:"";if(id!==loadedFor||!id)load();else redraw()}}
redraw();load();
})();
