// Show the staff (the app only), opened from More → Discover.
//
// - A taxi card with your hotel from My trip (today's stay, or the first
//   one with a hotel): "To this hotel, please" in Japanese, with its map
//   pin, and the next stop on today's plan by its Japanese name.
// - Quick cards for the moments you're stuck: pork or alcohol, a place to
//   pray, paying by card, tax-free, the toilet, help.
// - Tapping one opens it full screen, facing the staff, with buttons the
//   staff can tap to answer (yes, no, over there, a moment), so you
//   understand the reply too. 🔊 reads it aloud in Japanese (the phone's
//   own voice, through @capacitor-community/text-to-speech).
// The food cards are the Halal Lens's questions (data/halal.js).
(function(){
if(typeof IS_APP==="undefined"||!IS_APP)return;
const ASK=typeof HALAL_ASK!=="undefined"?HALAL_ASK:[];
const ANS={yes:["はい","Yes"],no:["いいえ","No"],there:["あちらです","Over there 👉"],wait:["少々お待ちください","Wait a moment"]};
// "|" marks where a Japanese line may break (Japanese has no spaces, so
// the phone can't tell the words apart and would split them anywhere).
const BREAKS={"これに豚肉やアルコールは入っていますか？":"これに|豚肉やアルコールは|入っていますか？","ハラールのメニューはありますか？":"ハラールの|メニューは|ありますか？"};
const brk=a=>a?{...a,jp:BREAKS[a.jp]||a.jp}:{};
const CARDS=[
  {k:"pork",ic:"🍜",t:"Pork or alcohol?",...brk(ASK[0]),a:["yes","no"]},
  {k:"pray",ic:"🕌",t:"A place to pray?",jp:"お祈りできる|場所は|ありますか？",en:"Is there a place where I can pray?",ar:"فيه مكان أقدر أصلي فيه؟",a:["yes","no","there","wait"]},
  {k:"card",ic:"💳",t:"Card OK?",jp:"カードで|払えますか？",en:"Can I pay by card?",ar:"أقدر أدفع بالبطاقة؟",a:["yes","no"]},
  {k:"tax",ic:"🛍️",t:"Tax-free?",jp:"免税で|買えますか？|パスポートは|あります。",en:"Can I buy this tax-free? I have my passport.",ar:"أقدر أشتريه معفى من الضريبة؟ معي الجواز.",a:["yes","no","wait"]},
  {k:"toilet",ic:"🚻",t:"Toilet?",jp:"トイレは|どこですか？",en:"Where is the toilet?",ar:"وين الحمام؟",a:["there","wait"]},
  {k:"halal",ic:"🥙",t:"Halal menu?",...brk(ASK[4]),a:["yes","no"]},
  {k:"english",ic:"🗣️",t:"English?",jp:"英語を|話せる方は|いますか？",en:"Is there someone who speaks English?",ar:"فيه أحد يتكلم إنجليزي؟",a:["yes","no","wait"]},
  {k:"bags",ic:"🧳",t:"Leave my bags?",jp:"荷物を|預かって|もらえますか？",en:"Can you keep my luggage for a while?",ar:"تقدرون تحفظون شنطي شوي؟",a:["yes","no"]},
  {k:"photo",ic:"📷",t:"Photo OK?",jp:"写真を|撮っても|いいですか？",en:"May I take a photo?",ar:"أقدر أصوّر؟",a:["yes","no"]},
  {k:"help",ic:"🆘",t:"Help / doctor",jp:"助けてください。|救急車を|呼んでください。",en:"Please help me. Please call an ambulance.",ar:"ساعدني لو سمحت. اتصل على الإسعاف.",a:["yes","wait"],sos:true},
].filter(c=>c.jp);

// ---- the hotel and the next stop, from My trip ----
function stayNow(){
  if(typeof trip==="undefined"||!trip||!trip.stays)return null;
  const t=window.tnToday&&tnToday();
  const has=s=>s&&((s.hotel&&s.hotel.n)||(s.home&&s.home.n));
  if(t&&has(t.s))return t.s;
  return trip.stays.find(has)||null;
}
function hotel(){const s=stayNow();if(!s)return null;const n=(s.hotel&&s.hotel.n)||(s.home&&s.home.n);
  return {n,lat:s.home&&s.home.lat,lng:s.home&&s.home.lng}}
function nextStop(){
  const t=window.tnToday&&tnToday();if(!t||!t.items)return null;
  const j=new Date(Date.now()+9*3600e3),now=j.getUTCHours()*60+j.getUTCMinutes();
  const it=t.items.find(x=>x.k==="stop"&&x.p&&x.p.jp&&(x.t==null||x.t+(x.m||45)>now));
  return it?it.p:null;
}
const plain=jp=>jp.replace(/\|/g,"");
const lines=jp=>jp.split("|").map(x=>`<span>${esc(x)}</span>`).join("");
const mapsAt=(lat,lng)=>`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

// ---- the voice ----
const TTS=()=>window.Capacitor&&Capacitor.Plugins&&Capacitor.Plugins.TextToSpeech;
const canSay=()=>!!TTS()||("speechSynthesis" in window);
async function say(jp){
  try{const t=TTS();if(t){await t.stop().catch(()=>{});await t.speak({text:plain(jp),lang:"ja-JP",rate:.9});return}}
  catch(e){toast(T("This phone has no Japanese voice. Show the screen instead."));return}
  try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(plain(jp));u.lang="ja-JP";u.rate=.9;speechSynthesis.speak(u)}catch(e){}
}
function hush(){try{const t=TTS();if(t)t.stop().catch(()=>{});else if(window.speechSynthesis)speechSynthesis.cancel()}catch(e){}}

// ---- the page (option B) ----
const el=document.createElement("div");el.id="staffview";el.hidden=true;el.setAttribute("role","dialog");el.setAttribute("aria-modal","true");document.body.appendChild(el);
function draw(){
  if(el.hidden)return;
  const h=hotel(),nx=nextStop();
  el.innerHTML=`<div class="py-top"><button type="button" class="py-x" aria-label="${esc(T("Back"))}">‹</button><b>${T("Show the staff")}</b></div>
    <div class="py-scroll">
    ${h?`<button type="button" class="sf-taxi" data-c="hotel"><small>🚕 ${T("TAKE ME TO MY HOTEL")}</small><b><bdi>${esc(h.n)}</bdi></b><span class="sf-jp" lang="ja" dir="ltr">このホテルまでお願いします。</span>
        ${h.lat?`<span class="sf-pin" data-pin="1">📍 ${T("Show the map pin")}</span>`:""}<img src="${typeof GI==="function"?GI():"assets/cat.png"}" alt=""></button>`
      :`<button type="button" class="sf-taxi sf-empty" data-add="1"><small>🚕 ${T("TAKE ME TO MY HOTEL")}</small><b>${T("Add your hotel")}</b><span>${T("Add it in My trip and it shows here, ready for the taxi driver.")}</span><img src="${typeof GI==="function"?GI():"assets/cat.png"}" alt=""></button>`}
    ${nx?`<button type="button" class="py-card sf-next" data-c="next"><span><small>${T("Next on today's plan")}</small><b><bdi>${esc(nx.n)}</bdi> · <bdi lang="ja">${esc(nx.jp)}</bdi></b></span><i aria-hidden="true">🚕</i></button>`:""}
    <h3 class="py-h">${T("Quick cards")}</h3>
    <div class="sf-grid">${CARDS.map((c,i)=>`<button type="button" class="sf-g${c.sos?" sos":""}" data-i="${i}"><em aria-hidden="true">${c.ic}</em><b>${T(c.t)}</b><small lang="ja" dir="ltr">${esc(plain(c.jp).length>10?plain(c.jp).slice(0,9)+"…":plain(c.jp))}</small></button>`).join("")}</div>
    <p class="py-foot">${T("Emergency in Japan: ambulance and fire 119, police 110.")}</p>
    </div>`;
  el.querySelector(".py-x").onclick=close;
  const tx=el.querySelector(".sf-taxi");
  if(tx)tx.onclick=e=>{
    if(tx.dataset.add){close();setTimeout(()=>{const tb=document.querySelector('#tabbar [data-t="trip"]');if(tb)tb.click()},120);return}
    if(e.target.closest("[data-pin]"))return window.open(mapsAt(h.lat,h.lng),"_blank");
    show({jp:"このホテルまで|お願いします。",sub:h.n,en:"To this hotel, please.",ar:"لهذا الفندق لو سمحت.",a:["yes","wait"],pin:h.lat?mapsAt(h.lat,h.lng):""})};
  const ne=el.querySelector(".sf-next");
  if(ne)ne.onclick=()=>show({jp:`${nx.jp}まで|お願いします。`,sub:nx.n,en:`To ${nx.n}, please.`,ar:`إلى ${nx.n} لو سمحت.`,a:["yes","wait"],pin:nx.lat?mapsAt(nx.lat,nx.lng):""});
  el.querySelectorAll(".sf-g").forEach(b=>b.onclick=()=>show(CARDS[+b.dataset.i]));
}
function open(fromHistory){el.hidden=false;document.documentElement.classList.add("py-open");if(!fromHistory)history.pushState({tnStaff:1},"");draw()}
function closeNow(){el.hidden=true;document.documentElement.classList.remove("py-open")}
function close(){if(history.state&&history.state.tnStaff)history.back();else closeNow()}

// ---- full screen, facing the staff (option C) ----
const sv=document.createElement("div");sv.id="staffshow";sv.hidden=true;sv.setAttribute("role","dialog");sv.setAttribute("aria-modal","true");document.body.appendChild(sv);
let card=null,picked="";
function drawShow(){
  const c=card;if(!c)return;
  const n=plain(c.jp).length,big=n>18?34:n>11?40:46;
  sv.innerHTML=`<div class="ss-top"><button type="button" class="ss-x" aria-label="${esc(T("Close"))}">×</button><span>${T("Turn your phone to the staff 👇")}</span>
      ${canSay()?`<button type="button" class="ss-say" aria-label="${esc(T("Say it in Japanese"))}">🔊</button>`:"<i></i>"}</div>
    <div class="ss-main"><div class="ss-jp" lang="ja" dir="ltr" style="font-size:${big}px">${lines(c.jp)}</div>
      ${c.sub?`<div class="ss-sub"><bdi>${esc(c.sub)}</bdi></div>`:""}
      <p class="ss-tr" dir="ltr">"${esc(c.en)}"</p><p class="ss-tr" dir="rtl" lang="ar">"${esc(c.ar)}"</p>
      ${c.pin?`<button type="button" class="ss-pin">📍 ${T("Show the map pin")}</button>`:""}</div>
    ${picked?`<p class="ss-heard">${T("They said:")} <b>${T(ANS[picked][1])}</b></p>`:`<p class="ss-hint">${T("The staff can tap an answer")}</p>`}
    <div class="ss-ans">${c.a.map(k=>`<button type="button" class="ss-a ${k}${picked===k?" on":""}" data-a="${k}"><b lang="ja" dir="ltr">${ANS[k][0]}</b><small>${T(ANS[k][1])}</small></button>`).join("")}</div>`;
  sv.querySelector(".ss-x").onclick=closeShow;
  const sp=sv.querySelector(".ss-say");if(sp)sp.onclick=()=>say(c.jp);
  const pn=sv.querySelector(".ss-pin");if(pn)pn.onclick=()=>window.open(c.pin,"_blank");
  sv.querySelectorAll(".ss-a").forEach(b=>b.onclick=()=>{picked=b.dataset.a;drawShow()});
}
function show(c,fromHistory){card=c;picked="";sv.hidden=false;document.documentElement.classList.add("ss-open");if(!fromHistory)history.pushState({tnStaff:1,tnShow:1},"");drawShow()}
function closeShowNow(){sv.hidden=true;hush();document.documentElement.classList.remove("ss-open")}
function closeShow(){if(history.state&&history.state.tnShow)history.back();else closeShowNow()}

addEventListener("popstate",e=>{const st=e.state||{};
  if(!st.tnShow&&!sv.hidden)closeShowNow();
  if(st.tnStaff){if(el.hidden)open(true);else draw()}else if(!el.hidden)closeNow()});
window.tnOpenStaff=()=>open();
})();
