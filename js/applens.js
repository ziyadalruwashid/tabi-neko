// Halal Lens (the app only), opened from its card in More. Point the camera
// at a food label or a menu: the phone reads the Japanese and looks for
// pork, alcohol and "ask first" ingredients from data/halal.js.
//
// Free and offline: the text is read on the phone by Tesseract (bundled in
// assets/vendor/tesseract with its Japanese model, about 10 MB, loaded the
// first time the lens is used). The photo never leaves the phone.
//
// It only finds words that are printed, and reading can go wrong on small
// or curved text, so every answer says it isn't a halal certificate, and
// "Ask the staff" (big Japanese questions to show) is always one tap away.
(function(){
if(typeof IS_APP==="undefined"||!IS_APP||typeof HALAL==="undefined")return;

const TESS="assets/vendor/tesseract/";
const abs=p=>new URL(p,location.href).href;
const NORM=s=>String(s||"").normalize("NFKC");
const isKana=c=>/[゠-ヿ]/.test(c||"");
const isJa=c=>/[぀-ヿ㐀-鿿]/.test(c);
// Every spelling, longest first, so 洋酒 wins over the 酒 inside it.
const TERMS=HALAL.flatMap(e=>e.w.map(w=>({w:NORM(w),e}))).sort((a,b)=>b.w.length-a.w.length);

const el=document.createElement("div");el.id="lens";el.hidden=true;el.setAttribute("role","dialog");el.setAttribute("aria-modal","true");document.body.appendChild(el);
const file=document.createElement("input");file.type="file";file.accept="image/*";file.hidden=true;document.body.appendChild(file);
let mode="label",phase="cam",stream=null,shot=null,res=null,pct=0,camErr="",askI=0,askFrom="cam",q="",worker=null,workerP=null;

// ---- the camera ----
async function startCam(){
  stopCam();camErr="";
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){camErr="none";draw();return}
  try{stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment",width:{ideal:1920},height:{ideal:1080}},audio:false});
    const v=el.querySelector("video");if(v){v.srcObject=stream;v.play().catch(()=>{})}}
  catch(e){camErr=e&&e.name==="NotAllowedError"?"denied":"none";draw()}
}
function stopCam(){if(stream){stream.getTracks().forEach(t=>t.stop());stream=null}}
function snap(){
  const v=el.querySelector("video");if(!v||!v.videoWidth)return;
  const c=document.createElement("canvas"),k=Math.min(1,2000/Math.max(v.videoWidth,v.videoHeight));
  c.width=Math.round(v.videoWidth*k);c.height=Math.round(v.videoHeight*k);c.getContext("2d").drawImage(v,0,0,c.width,c.height);
  read(c);
}
file.onchange=()=>{const f=file.files&&file.files[0];file.value="";if(!f)return;
  const img=new Image(),u=URL.createObjectURL(f);
  img.onload=()=>{const c=document.createElement("canvas"),k=Math.min(1,2000/Math.max(img.width,img.height));c.width=Math.round(img.width*k);c.height=Math.round(img.height*k);
    c.getContext("2d").drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(u);read(c)};
  img.onerror=()=>{URL.revokeObjectURL(u);toast(T("Couldn't open that photo."))};img.src=u};

// ---- reading the Japanese ----
function loadTess(){
  if(window.Tesseract)return Promise.resolve();
  return new Promise((ok,no)=>{const s=document.createElement("script");s.src=TESS+"tesseract.min.js";s.onload=ok;s.onerror=no;document.head.appendChild(s)});
}
function getWorker(){
  if(worker)return Promise.resolve(worker);
  if(!workerP)workerP=loadTess().then(()=>Tesseract.createWorker("jpn",1,{workerPath:abs(TESS+"worker.min.js"),corePath:abs(TESS),langPath:abs(TESS+"lang"),
    logger:m=>{if(m.status==="recognizing text"){pct=Math.round(m.progress*100);const p=el.querySelector(".ln-pct");if(p)p.textContent=T("Reading the Japanese… {n}%",{n:pct})}}}))
    .then(w=>worker=w).catch(e=>{workerP=null;throw e});
  return workerP;
}
async function read(canvas){
  stopCam();shot={url:canvas.toDataURL("image/jpeg",.9),w:canvas.width,h:canvas.height};res=null;pct=0;phase="busy";draw();
  try{
    const w=await getWorker();
    const {data}=await w.recognize(canvas,{},{blocks:true,text:true});
    res=match(data);phase="result";draw();
  }catch(e){console.warn(e);phase="result";res={err:true};draw()}
}
// Every letter in reading order with its box on the photo, then the words.
function match(data){
  const ch=[];
  (data.blocks||[]).forEach(b=>(b.paragraphs||[]).forEach(p=>(p.lines||[]).forEach(l=>(l.words||[]).forEach(w=>(w.symbols||[]).forEach(s=>{
    for(const c of NORM(s.text).replace(/\s/g,""))ch.push({c,b:s.bbox})})))));
  // The long-vowel mark ー is often read as 一 or a dash next to katakana.
  ch.forEach((x,i)=>{if("一-－—―‐".includes(x.c)&&(isKana((ch[i-1]||{}).c)||isKana((ch[i+1]||{}).c)))x.c="ー"});
  const hay=ch.map(x=>x.c).join(""),used=new Array(hay.length).fill(false),hits=[];
  TERMS.forEach(t=>{let i=hay.indexOf(t.w);while(i>=0){const j=i+t.w.length;
    if(!used.slice(i,j).some(Boolean)){for(let k=i;k<j;k++)used[k]=true;if(t.e.lvl!=="skip")hits.push({e:t.e,w:t.w,i,j})}
    i=hay.indexOf(t.w,i+1)}});
  const box=h=>{const bs=ch.slice(h.i,h.j).map(x=>x.b);return {x0:Math.min(...bs.map(b=>b.x0)),y0:Math.min(...bs.map(b=>b.y0)),x1:Math.max(...bs.map(b=>b.x1)),y1:Math.max(...bs.map(b=>b.y1))}};
  hits.forEach(h=>h.box=box(h));
  // One line per entry, however many times it's printed.
  const seen=new Map();hits.forEach(h=>{if(!seen.has(h.e))seen.set(h.e,{e:h.e,w:h.w,n:0});seen.get(h.e).n++});
  const items=[...seen.values()];
  // "From soy" (大豆由来) on the label is about the emulsifier: that one is fine.
  const plant=items.some(x=>x.e.lvl==="ok"&&/大豆由来|植物/.test(x.e.w.join("")));
  items.forEach(x=>{x.lvl=x.e.lvl;if(plant&&x.lvl==="ask"&&/乳化剤/.test(x.e.w.join(""))){x.lvl="ok";x.soy=true}});
  return {hits,items,read:[...hay].filter(isJa).length,text:hay};
}

// ---- drawing ----
const L=x=>isAR()?x.ar:x.en,W=x=>isAR()?x.whyAr:x.why;
const COL={no:"#D33A2C",ask:"#E3A23B",ok:"#2E8B3E"};
function draw(){
  if(el.hidden)return;
  const top=`<div class="ln-top"><button type="button" class="ln-x" aria-label="${esc(T("Close"))}">×</button><b>${T("Halal Lens")}</b>
    <button type="button" class="ln-askb" aria-label="${esc(T("Ask the staff"))}">💬</button></div>`;
  const modes=`<div class="ln-modes" role="tablist">${[["label","🏷 "+T("Label")],["menu","📜 "+T("Menu")],["words","🔤 "+T("Word list")]].map(([k,l])=>`<button type="button" role="tab" data-m="${k}" class="${mode===k?"on":""}" aria-selected="${mode===k}">${l}</button>`).join("")}</div>`;
  let h="";
  if(phase==="ask"){const a=HALAL_ASK[askI];
    h=`<div class="ln-ask"><div class="ln-top"><button type="button" class="ln-back" aria-label="${esc(T("Back"))}">×</button><b>${T("Ask the staff")}</b><span></span></div>
      <p class="ln-turn">${T("Turn your phone to the staff 👇")}</p>
      <div class="ln-jp" lang="ja">${esc(a.jp)}</div><p class="ln-tr">"${esc(a.en)}"</p><p class="ln-tr ar" dir="rtl" lang="ar">${esc(a.ar)}</p>
      ${askI<3?`<div class="ln-yn"><div><b lang="ja">はい</b>${T("Yes")}</div><div><b lang="ja">いいえ</b>${T("No")}</div></div>`:""}
      <div class="ln-qs">${HALAL_ASK.map((x,i)=>`<button type="button" data-q="${i}" class="${i===askI?"on":""}">${esc(isAR()?x.ar:x.en)}</button>`).join("")}</div></div>`;
  }
  else if(mode==="words"){
    const qq=NORM(q).toLowerCase(),list=HALAL.filter(e=>e.lvl!=="skip"&&(!qq||[e.en,e.ar,...e.w].some(s=>NORM(s).toLowerCase().includes(qq))));
    const grp=[["no",T("Not halal")],["ask",T("Ask first")],["ok",T("Good signs")]];
    h=`<div class="ln-page">${top}${modes}<input type="search" class="ln-search" placeholder="${esc(T("Search a word, in English, Arabic or Japanese"))}" value="${esc(q)}" aria-label="${esc(T("Search"))}">
      ${grp.map(([k,l])=>{const a=list.filter(e=>e.lvl===k);return a.length?`<h3 class="ln-gh"><i style="background:${COL[k]}"></i>${l}</h3>${a.map(e=>`<div class="ln-it"><span class="ln-w" lang="ja">${esc(e.w.slice(0,3).join(" · "))}</span><span class="ln-d"><b>${esc(L(e))}</b>${esc(W(e))}</span></div>`).join("")}`:""}).join("")}
      ${list.length?"":`<p class="ln-none">${T("No word like that in the list.")}</p>`}</div>`;
  }
  else if(phase==="cam"){
    h=`<div class="ln-cam"><video playsinline muted autoplay></video>${top}${modes}
      ${camErr?`<div class="ln-noc"><p>${camErr==="denied"?T("Allow the camera for Tabi Neko in your phone's settings, or pick a photo instead."):T("The camera isn't available. Pick a photo instead.")}</p><button type="button" class="ln-pick btn">🖼 ${T("Pick a photo")}</button></div>`
        :`<div class="ln-frame" aria-hidden="true"><i></i><i></i><i></i><i></i></div>`}
      <div class="ln-hint"><img src="${GI()}" alt=""><span>${mode==="menu"?T("Fit the dish names in the frame. Apollo knows dishes like tonkotsu and chashu."):T("Find 原材料名 (ingredients) on the back and fit it in the frame.")}</span></div>
      <div class="ln-bar"><button type="button" class="ln-sm ln-pick" aria-label="${esc(T("Pick a photo"))}">🖼</button>
        <button type="button" class="ln-shut" aria-label="${esc(T("Take the photo"))}"${camErr?" disabled":""}><i></i></button><span class="ln-sm" aria-hidden="true"></span></div></div>`;
  }
  else{
    const r=res||{},items=r.items||[],no=items.filter(x=>x.lvl==="no"),ask=items.filter(x=>x.lvl==="ask"),ok=items.filter(x=>x.lvl==="ok");
    const v=phase==="busy"?null:r.err?["mb","!",T("Couldn't read this one"),T("Try again in better light, or pick the photo again.")]
      :no.length?["no","✕",T("Not halal"),T("Found {w} in it.",{w:no.map(x=>L(x.e).toLowerCase()).slice(0,3).join(isAR()?"، ":", ")})]
      :ask.length?["mb","?",T("Ask first"),T("Nothing clearly haram, but some things could be. Ask the staff.")]
      :r.read<8?["mb","!",T("Couldn't read enough"),T("Move closer, hold still, and make sure the text is sharp and well lit.")]
      :["ok","✓",T("No pork or alcohol words found"),T("Not a halal certificate: look for a halal logo, or ask.")];
    const row=x=>`<div class="ln-it"><span class="ln-dot" style="background:${COL[x.lvl]}"></span><span class="ln-w" lang="ja">${esc(x.w)}</span>
      <span class="ln-d"><b>${esc(L(x.e))}</b>${x.soy?T("This label says it's from soy or vegetable, so it's fine."):esc(W(x.e))}</span></div>`;
    const marks=r.hits?r.hits.filter(x=>x.e.lvl!=="ok"||true).map(x=>{const b=x.box,lv=x.e.lvl==="ok"?"ok":(items.find(i=>i.e===x.e)||{}).lvl||x.e.lvl;
      return `<i class="ln-mk" style="--c:${COL[lv]};left:${b.x0/shot.w*100}%;top:${b.y0/shot.h*100}%;width:${(b.x1-b.x0)/shot.w*100}%;height:${(b.y1-b.y0)/shot.h*100}%"></i>`}).join(""):"";
    h=`<div class="ln-res">${top}<div class="ln-photo"><div class="ln-pic"><img src="${shot?shot.url:""}" alt="">${marks}${phase==="busy"?`<i class="ln-scan"></i>`:""}</div></div>
      <div class="ln-sheet"><span class="ln-grab" aria-hidden="true"></span>
      ${phase==="busy"?`<div class="ln-busy"><img src="${GI()}" alt=""><b class="ln-pct">${worker?T("Reading the Japanese… {n}%",{n:pct}):T("Getting ready (first time only)…")}</b><small>${T("This happens on your phone, the photo isn't sent anywhere.")}</small></div>`
       :`<div class="ln-ver ${v[0]}"><span class="ln-ic">${v[1]}</span><span><b>${esc(v[2])}</b><small>${esc(v[3])}</small></span></div>
        ${[...no,...ask,...ok].map(row).join("")}
        <div class="ln-btns"><button type="button" class="ln-again">${T("Scan again")}</button><button type="button" class="ln-askb btn">${T("Ask the staff")}</button></div>
        <p class="ln-note">⚠️ ${T("Apollo only reads what's printed and can misread small text. Not a halal certificate.")}</p>`}</div></div>`;
  }
  el.innerHTML=h;wire();
  if(phase==="cam"&&mode!=="words"&&!camErr){const v=el.querySelector("video");if(stream){v.srcObject=stream;v.play().catch(()=>{})}else startCam()}
}
function wire(){
  const q1=s=>el.querySelector(s);
  el.querySelectorAll(".ln-x").forEach(b=>b.onclick=close);
  el.querySelectorAll(".ln-askb").forEach(b=>b.onclick=()=>{askFrom=phase==="ask"?askFrom:phase;stopCam();phase="ask";draw()});
  if(q1(".ln-back"))q1(".ln-back").onclick=()=>{phase=askFrom;draw()};
  el.querySelectorAll(".ln-qs [data-q]").forEach(b=>b.onclick=()=>{askI=+b.dataset.q;draw()});
  el.querySelectorAll(".ln-modes [data-m]").forEach(b=>b.onclick=()=>{mode=b.dataset.m;if(mode==="words")stopCam();else phase="cam";draw()});
  el.querySelectorAll(".ln-pick").forEach(b=>b.onclick=()=>file.click());
  if(q1(".ln-shut"))q1(".ln-shut").onclick=snap;
  if(q1(".ln-again"))q1(".ln-again").onclick=()=>{phase="cam";res=null;draw()};
  const s=q1(".ln-search");if(s)s.oninput=()=>{q=s.value;const pos=s.selectionStart;draw();const n=q1(".ln-search");n.focus();try{n.setSelectionRange(pos,pos)}catch(e){}};
}

// ---- opening and closing ----
function open(fromHistory){el.hidden=false;document.documentElement.classList.add("ln-open");phase="cam";res=null;draw();if(!fromHistory)history.pushState({tnLens:1},"")}
function closeNow(){stopCam();el.hidden=true;document.documentElement.classList.remove("ln-open")}
function close(){if(history.state&&history.state.tnLens)history.back();else closeNow()}
addEventListener("popstate",e=>{const st=e.state||{};if(st.tnLens)open(true);else if(!el.hidden)closeNow()});
// Leaving the app turns the camera off; coming back turns it on again.
document.addEventListener("visibilitychange",()=>{if(el.hidden)return;if(document.hidden)stopCam();else if(phase==="cam"&&mode!=="words")startCam()});
window.tnOpenLens=()=>open();
// The phone's back button: the staff card, then a result, then the lens.
window.tnLensBack=()=>{if(el.hidden)return false;if(phase==="ask"){phase=askFrom;draw();return true}if(phase==="result"){phase="cam";res=null;draw();return true}return false};
// The More page's card.
window.tnLensCard=()=>`<button type="button" class="ln-card"><span class="ln-cbig" aria-hidden="true">📸</span><span><b>${T("Halal Lens")}</b><small>${T("Snap a label or a menu. Apollo checks it for pork and alcohol.")}</small></span><i aria-hidden="true">›</i></button>`;
if(typeof window.tnRenderMore==="function")tnRenderMore();
})();
