// Ask Apollo: the floating chat on the home page. Loaded after js/app.js and
// uses its helpers ($, esc, T, isAR, store).
//
// Apollo's answers come from Claude through the small proxy in
// worker/ask-apollo.js, which holds the API key. APOLLO_API is that Worker's
// address; while it's empty Apollo answers with a friendly "coming soon".
//
// Chatting needs an account, like "plan my trip": each question carries the
// visitor's login token and the Worker checks it before calling Claude.
// Logged out, the button opens the login sheet and the chat follows.
const APOLLO_API="https://ask-apollo.ziyadalruwashid.workers.dev/";

const SUGGEST=["Halal ramen in Tokyo?","Plan a day in Kyoto for me","Best coffee near Shibuya?","Where can I pray in Osaka?"];
// The conversation survives a reload or a trip to another page, but only for
// this tab, and an empty or blocked sessionStorage just starts fresh.
const CHAT_KEY="tabineko-chat";
let chat=[],chatBusy=false;
try{chat=JSON.parse(sessionStorage.getItem(CHAT_KEY))||[]}catch(e){chat=[]}
// Past conversations stay on this phone (the last 10), for "Recent" on the
// start screen. The open one is saved there as it goes.
const PAST_KEY="tabineko-chats";
let chatId=null;try{chatId=sessionStorage.getItem(CHAT_KEY+"-id")}catch(e){}
const past=()=>{try{return JSON.parse(localStorage.getItem(PAST_KEY))||[]}catch(e){return []}};
function savePast(){if(!chat.some(m=>m.role==="user"))return;
  if(!chatId){chatId=Date.now().toString(36);try{sessionStorage.setItem(CHAT_KEY+"-id",chatId)}catch(e){}}
  const first=chat.find(m=>m.role==="user").text;
  const list=past().filter(c=>c.id!==chatId);list.unshift({id:chatId,title:first.slice(0,80),at:Date.now(),msgs:chat.slice(-40)});
  try{localStorage.setItem(PAST_KEY,JSON.stringify(list.slice(0,10)))}catch(e){}}
const saveChat=()=>{try{sessionStorage.setItem(CHAT_KEY,JSON.stringify(chat.slice(-40)))}catch(e){}savePast()};
function newChat(){if(chatBusy)return;chat=[];chatId=null;try{sessionStorage.removeItem(CHAT_KEY);sessionStorage.removeItem(CHAT_KEY+"-id")}catch(e){}renderChat();$("apolloq").focus()}
function openPast(id){const c=past().find(x=>x.id===id);if(!c||chatBusy)return;chat=c.msgs||[];chatId=c.id;
  try{sessionStorage.setItem(CHAT_KEY+"-id",chatId)}catch(e){}saveChat();renderChat()}

// Plain text in, safe HTML out: numbers and price ranges kept left-to-right
// (so "¥3,000–4,000" doesn't flip inside Arabic), escaped, line breaks kept,
// and **bold**
// honoured. Apollo bolds every place he recommends; one whose name matches a
// place on the site becomes a link that jumps to it on the map.
const PLACE_BY_NAME=new Map(P.map(p=>[LOW(p.n),p]));
const chatHTML=s=>esc(s.replace(LTR_RUN,"\u2066$&\u2069")).replace(/\*\*(.+?)\*\*/g,(m,t)=>{
  const p=PLACE_BY_NAME.get(LOW(t.replace(/&amp;/g,"&")));
  return p?`<button type="button" class="pl" data-id="${p.id}">${t}</button>`:`<b>${t}</b>`;
}).replace(/\n/g,"<br>");
function goPlace(id){
  const p=P.find(q=>q.id===id);if(!p)return;
  // Same as picking a search result: switch city, clear any filter that could
  // hide the card, then select it. On a phone the chat covers the map, so it
  // steps aside; it opens again where it was.
  if(p.city!==city){city=p.city;store.set("tabineko-city",city)}
  active=new Set(Object.keys(CATS));area=null;halalOnly=false;zoomTo=null;selected=null;
  renderCities();renderAreas();renderFilters();
  if(matchMedia("(max-width:640px)").matches)closeApollo();
  select(p.id,true);
}

function renderApollo(){
  $("apollob").innerHTML=`<img src="${GI()}" alt=""><span>${T("Ask Apollo")}</span>`;
  $("apollob").setAttribute("aria-label",T("Ask Apollo"));
  $("apollo").setAttribute("aria-label",T("Chat with Apollo"));
  $("apollox").setAttribute("aria-label",T("Close chat"));
  $("apollotitle").textContent=T("Ask Apollo");
  const hi=document.querySelector("#apollo .apohead img");if(hi)hi.src=GI();
  $("apollosub").textContent=T("your travel cat 🐾");
  $("apolloq").placeholder=T("Ask me anything about Japan…");
  $("apollosend").setAttribute("aria-label",T("Send"));
  if($("apollonew"))$("apollonew").setAttribute("aria-label",T("New chat"));
  renderChat();
}
// ---- reading an answer ----
// Apollo is asked to end with "Next: q1 | q2 | q3" (follow-up questions) and
// to write a day plan as "HH:MM - **Place** - note" lines. Both are shown as
// their own pieces, not as text. Places he bolds that are in the notebook
// become cards under the answer.
const NEXT=/\n?\s*(?:Next|التالي)\s*[:：]\s*(.*)$/i;
function readAnswer(text){
  let next=[],body=text||"";const m=body.match(NEXT);
  if(m){next=m[1].split("|").map(x=>x.replace(/\*\*/g,"").trim()).filter(x=>x&&x.length<70).slice(0,3);body=body.slice(0,m.index)}
  else body=body.replace(/\n\s*(Nex?t?|Ne|N)\s*$/i,""); // a "Next:" still arriving
  const lines=body.split("\n"),plan=[],keep=[];
  lines.forEach(l=>{const q=l.match(/^\s*[-•*]?\s*(\d{1,2}[:.]\d{2})\s*[-–—:|]\s*(.+?)\s*$/);
    if(q){const parts=q[2].split(/\s+[-–—|]\s+/);plan.push({t:q[1].replace(".",":"),what:parts[0],note:parts.slice(1).join(" · ")});keep.push("\u0000")}
    else keep.push(l)});
  const isPlan=plan.length>=3;
  const txt=(isPlan?keep.filter(l=>l!=="\u0000"):keep.map(l=>l==="\u0000"?"":l)).join("\n").replace(/\n{3,}/g,"\n\n").trim();
  const names=[...body.matchAll(/\*\*(.+?)\*\*/g)].map(x=>PLACE_BY_NAME.get(LOW(x[1]))).filter(Boolean);
  const places=[...new Map(names.map(p=>[p.id,p])).values()];
  return {txt,next,plan:isPlan?plan:null,places};
}
const placeOf=s=>{const m=(s||"").match(/\*\*(.+?)\*\*/);return m&&PLACE_BY_NAME.get(LOW(m[1]))||PLACE_BY_NAME.get(LOW((s||"").replace(/\*\*/g,"").trim()))};
const apKey=p=>typeof PKEY==="function"?PKEY(p):p.city+"|"+p.n;
function placeCards(ps){if(!ps.length)return "";
  return `<div class="ap-cards">${ps.slice(0,6).map(p=>{const k=apKey(p),on=typeof inTrip==="function"&&inTrip(k);
    return `<div class="ap-card"><button type="button" class="ap-im pl" data-id="${p.id}" style="background-image:url('${esc(p.photo||CATS[p.cat].img)}')${p.photo?"":";background-size:70%;background-repeat:no-repeat;background-color:#F5EDE0"}">${p.halal?`<em>${p.hl==="friendly"?T("Muslim-friendly"):T("halal ✓")}</em>`:""}</button>
      <div class="ap-ct"><b dir="auto">${esc(p.n)}</b><small>${esc(D(CITIES[p.city]||{},"n")||"")} · ${esc(D(CATS[p.cat],"n"))}</small>
      <div class="ap-cb"><button type="button" class="pl" data-id="${p.id}">${T("Open")}</button><button type="button" class="ap-add${on?" on":""}" data-k="${esc(k)}">${on?"✓":"＋ "+T("Trip")}</button></div></div></div>`}).join("")}</div>`}
function planBox(plan,i){
  return `<div class="ap-plan">${plan.map(x=>{const p=placeOf(x.what);const name=p?`<button type="button" class="pl" data-id="${p.id}">${esc(p.n)}</button>`:chatHTML(x.what);
    return `<div class="ap-st"><time dir="ltr">${esc(x.t)}</time><span><b>${name}</b>${x.note?`<small>${chatHTML(x.note)}</small>`:""}</span></div>`}).join("")}
    ${plan.some(x=>placeOf(x.what))?`<button type="button" class="ap-save" data-i="${i}">＋ ${T("Save as a day in my trip")}</button>`:""}</div>`}
// Japan's local time, and the trip day if you're on your trip.
function context(){
  const c=window.tnChatCtx?tnChatCtx():{city:typeof city!=="undefined"?city:"tokyo"};
  const t=window.tnToday&&tnToday();const cty=t?t.s.city:c.city;
  const now=new Date(),hh=+new Intl.DateTimeFormat("en-GB",{hour:"numeric",hour12:false,timeZone:"Asia/Tokyo"}).format(now);
  const clock=new Intl.DateTimeFormat(isAR()?"ar":"en-GB",{hour:"numeric",minute:"2-digit",timeZone:"Asia/Tokyo"}).format(now);
  return {city:cty,day:t?t.n+1:0,hh,clock,wx:c.wx,icon:c.icon,cityName:D(CITIES[cty]||{n:cty},"n")};
}
function startScreen(){
  const x=context(),name=typeof myName==="function"?myName():"";
  const meal=x.hh<5?"food":x.hh<10?"breakfast":x.hh<15?"lunch":x.hh<22?"dinner":"food";
  const hasTrip=typeof trip!=="undefined"&&trip.start&&trip.stays.length;
  const cards=[
    ["🍜",T("Halal "+meal+" near me"),T("in {c}",{c:x.cityName}),T("Where can I have halal "+meal+" in {c}? Something good near the center.",{c:x.cityName}),"#FFE4D6"],
    ["🗓️",hasTrip?T("Plan my tomorrow"):T("Plan a day in {c}",{c:x.cityName}),hasTrip?T("a day that fits your trip"):T("an easy day, no rushing"),hasTrip?T("Plan my tomorrow in {c} as a day plan.",{c:x.cityName}):T("Plan an easy day in {c} for me as a day plan.",{c:x.cityName}),"#E3F2DF"],
    ["🗣️",T("Say it in Japanese"),T("to show the staff"),T("How do I ask a restaurant if the food has pork or alcohol, in Japanese?"),"#E8F0FB"],
    x.hh>=21||x.hh<6?["🌙",T("Open late tonight"),T("in {c}",{c:x.cityName}),T("What's good to do late at night in {c}?",{c:x.cityName}),"#EFE4FA"]
      :["🌧️",T("Rainy day ideas"),T("indoor places"),T("It's raining in {c}. What are good indoor places?",{c:x.cityName}),"#FFF3C9"]];
  const rec=past().filter(c=>c.id!==chatId).slice(0,3);
  return `<div class="ap-start"><div class="ap-ctx"><span>📍 ${esc(x.cityName)}${x.day?` · ${T("Day {n}",{n:x.day})}`:""}</span>${x.wx&&x.icon?`<span>${x.icon(x.wx.code)} ${Math.round(x.wx.t)}°</span>`:""}<span>🕒 ${esc(x.clock)}</span></div>
    <div class="ap-hero"><img src="${GI()}" alt=""><b>${name?T("What do you need, {n}?",{n:`<bdi>${esc(name)}</bdi>`}):T("What do you need?")}</b><p>${T("Ask me anything. I know the notebook, your trip and what time it is in Japan.")}</p></div>
    <div class="ap-qa">${cards.map(([ic,h,sm,q,bg])=>`<button type="button" class="ap-q" style="background:${bg}" data-q="${esc(q)}"><i>${ic}</i><span><b>${h}</b><small>${sm}</small></span></button>`).join("")}</div>
    ${rec.length?`<p class="ap-lab">${T("Recent")}</p>${rec.map(c=>`<button type="button" class="ap-rec" data-id="${c.id}"><span>💬</span><b dir="auto">${esc(c.title)}</b><small>${esc(new Date(c.at).toLocaleDateString(isAR()?"ar":"en-GB",{day:"numeric",month:"short"}))}</small></button>`).join("")}`:""}</div>`;
}
function renderChat(){
  const log=$("apollolog");
  const nb=$("apollonew");if(nb)nb.hidden=!chat.length;
  let h="";
  if(!chat.length)h=startScreen();
  else{
    const lastA=chat.map(m=>m.role).lastIndexOf("assistant");
    h+=chat.map((m,i)=>{if(m.role==="user")return `<div class="msg you"><p dir="auto">${chatHTML(m.text)}</p></div>`;
      const r=readAnswer(m.text),done=!(chatBusy&&i===chat.length-1);
      let o=r.txt?`<div class="msg apo"><p dir="auto">${chatHTML(r.txt)}</p></div>`:"";
      if(r.plan)o+=planBox(r.plan,i);
      if(done&&!m.skip&&!r.plan)o+=placeCards(r.places);
      if(done&&!m.skip&&i===lastA)o+=`<div class="ap-acts"><button type="button" class="ap-copy" data-i="${i}">⧉ ${T("Copy")}</button><button type="button" class="ap-again">↻ ${T("Ask again")}</button>${m.reported?`<button type="button" class="ap-rep" disabled>⚑ ${T("Reported ✓")}</button>`:`<button type="button" class="ap-rep" data-i="${i}">⚑ ${T("Report")}</button>`}</div>`
        +(r.next.length?`<div class="chips ap-next">${r.next.map(q=>`<button type="button" class="chip" dir="auto">${esc(q)}</button>`).join("")}</div>`:"");
      return o}).join("");
    if(chatBusy&&!(chat.length&&chat[chat.length-1].role==="assistant"))h+=`<div class="msg apo typing" aria-label="${esc(T("Apollo is typing"))}"><p><i></i><i></i><i></i></p></div>`;
  }
  log.innerHTML=h;
  log.querySelectorAll(".chip").forEach(b=>b.onclick=()=>send(b.textContent));
  log.querySelectorAll(".ap-q").forEach(b=>b.onclick=()=>send(b.dataset.q));
  log.querySelectorAll(".ap-rec").forEach(b=>b.onclick=()=>openPast(b.dataset.id));
  log.querySelectorAll(".pl").forEach(b=>b.onclick=()=>window.openPlace&&document.documentElement.classList.contains("tn-app")?openPlace(b.dataset.id):goPlace(b.dataset.id));
  log.querySelectorAll(".ap-add").forEach(b=>b.onclick=()=>{const k=b.dataset.k;if(typeof inTrip!=="function")return;
    if(inTrip(k))removeKey(k);else{trip.ideas.push(k);toast(T("Added to your trip ✓"))}saveTrip();const on=inTrip(k);b.classList.toggle("on",on);b.textContent=on?"✓":"＋ "+T("Trip")});
  log.querySelectorAll(".ap-save").forEach(b=>b.onclick=()=>savePlan(+b.dataset.i));
  log.querySelectorAll(".ap-copy").forEach(b=>b.onclick=()=>{const r=readAnswer(chat[+b.dataset.i].text);
    const t=(r.txt+(r.plan?"\n"+r.plan.map(x=>`${x.t} ${x.what}${x.note?" - "+x.note:""}`).join("\n"):"")).replace(/\*\*/g,"");
    try{navigator.clipboard.writeText(t).then(()=>toast(T("Copied ✓")),()=>{})}catch(e){}});
  log.querySelectorAll(".ap-again").forEach(b=>b.onclick=()=>{if(chatBusy)return;const qi=chat.map(m=>m.role).lastIndexOf("user");if(qi<0)return;const q=chat[qi].text;chat=chat.slice(0,qi);send(q)});
  log.querySelectorAll(".ap-rep[data-i]").forEach(b=>b.onclick=()=>askReport(b.closest(".ap-acts"),+b.dataset.i));
  if(chat.length)log.scrollTop=log.scrollHeight;else log.scrollTop=0;
}
// Report an answer (Google Play asks every AI chat to have one). It saves
// just that question and answer, with no account attached, in Firestore's
// reports/ list, which only the owner can read (firebase/firestore.rules).
const REPORT_WHY=[["wrong","Wrong or made up"],["offensive","Offensive or unsafe"],["other","Something else"]];
function askReport(box,i){if(!box)return;
  box.innerHTML=`<span class="ap-rq">${T("What's wrong with this answer?")}</span>`+REPORT_WHY.map(([k,t])=>`<button type="button" data-w="${k}">${T(t)}</button>`).join("")+`<button type="button" class="ap-rx" aria-label="${esc(T("Cancel"))}">✕</button>`;
  box.querySelector(".ap-rx").onclick=renderChat;
  box.querySelectorAll("[data-w]").forEach(b=>b.onclick=()=>sendReport(i,b.dataset.w))}
async function sendReport(i,why){
  const a=chat[i];if(!a||a.reported)return;
  const q=(chat.slice(0,i).reverse().find(m=>m.role==="user")||{}).text||"";
  try{
    if(typeof FS==="undefined"||typeof auth==="undefined"||!auth)throw 0;
    await call(`${FS}/reports`,{method:"POST",token:await token(),body:{fields:{
      q:{stringValue:q.slice(0,600)},a:{stringValue:a.text.slice(0,6000)},why:{stringValue:why},
      lang:{stringValue:isAR()?"ar":"en"},at:{timestampValue:new Date().toISOString()}}}});
    a.reported=true;saveChat();renderChat();toast(T("Thanks, we'll take a look ✓"));
  }catch(e){toast(T("Couldn't send that. Try again in a moment."));renderChat()}
}
// A day plan from Apollo goes into My trip: the first empty day in that
// city, or a new day at the end of that city's stay, or a new stay.
function savePlan(i){
  if(typeof trip==="undefined"||typeof saveTrip!=="function")return;
  if(FB_ON&&!auth){openAcct("login","trip");return}
  const r=readAnswer(chat[i].text);if(!r.plan)return;
  const ps=r.plan.map(x=>placeOf(x.what)).filter(Boolean);if(!ps.length)return;
  const cnt={};ps.forEach(p=>cnt[p.city]=(cnt[p.city]||0)+1);const c=Object.keys(cnt).sort((a,b)=>cnt[b]-cnt[a])[0];
  const ids=[...new Set(ps.filter(p=>p.city===c).map(apKey))];
  ids.forEach(k=>{trip.ideas=trip.ideas.filter(x=>x!==k)});
  let st=trip.stays.find(s=>s.city===c);
  if(!st){st={city:c,home:null,days:[]};trip.stays.push(st)}
  let d=st.days.find(x=>!x.ids.length&&!(x.bk||[]).length);if(!d){d={t:"",ids:[]};st.days.push(d)}
  d.ids=ids;saveTrip();
  let n=0,at=0;trip.stays.forEach(s=>s.days.forEach(x=>{n++;if(x===d)at=n}));
  toast(T("Saved as day {n} in your trip ✓",{n:at}),T("Open my trip"),()=>{closeApollo();if(window.goTab)goTab("trip");else{show("trip");history.replaceState(null,"","#trip")}});
  if(typeof renderTrip==="function")try{renderTrip()}catch(e){}
}

// Messages flagged skip (the coming-soon note, errors, and the question that
// got one) stay on screen but aren't sent back as history, so the turns the
// API sees always alternate question, answer, question.
const chatHistory=()=>chat.filter(m=>!m.skip&&m.text).map(m=>({role:m.role,content:m.text}));
const SAY={
  refusal:"I can't help with that one. Ask me something about your trip to Japan!",
  slow:"You're asking faster than I can walk! Give me a minute, then try again.",
  error:"Something went wrong on my side. Try again in a moment.",
  login:"Log in again to keep chatting with me.",
};

async function send(text){
  text=(text||"").trim();
  if(!text||chatBusy)return;
  const q={role:"user",text};
  chat.push(q);chatBusy=true;saveChat();renderChat();
  $("apolloq").value="";fitInput();
  const fail=k=>{q.skip=true;chat.push({role:"assistant",text:T(SAY[k]),skip:true})};
  if(!APOLLO_API){
    await new Promise(r=>setTimeout(r,900));
    q.skip=true;
    chat.push({role:"assistant",text:T("I'm still learning to talk! My chat opens very soon. Until then, the map and the search box above have everything in my notebook."),skip:true});
  }else{
    try{
      // The newest question carries a short note: where you are and the time
      // in Japan, and how to lay out a day plan and the follow-ups.
      const msgs=chatHistory(),x=context();
      if(msgs.length)msgs[msgs.length-1]={role:"user",content:`[${x.cityName}${x.day?`, trip day ${x.day}`:""}, ${String(x.hh).padStart(2,"0")}h Japan] ${msgs[msgs.length-1].content}\n(Day plan: lines "HH:MM - **Place** - note". End: "Next: q1 | q2 | q3", in my language.)`};
      const res=await fetch(APOLLO_API,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({messages:msgs,idToken:await token()})});
      if(!res.ok||!res.body)fail(res.status===429?"slow":res.status===401?"login":"error");
      else{
        // The Worker streams plain text. Words appear as they arrive; a lone
        // "\0refusal" or "\0error" means no answer came, and is said kindly.
        const a={role:"assistant",text:""};chat.push(a);
        const rd=res.body.pipeThrough(new TextDecoderStream()).getReader();
        for(;;){const{value,done}=await rd.read();if(done)break;a.text+=value;
          if(!a.text.startsWith("\u0000"))renderChat()}
        if(a.text.startsWith("\u0000")||!a.text.trim()){chat.pop();fail(a.text==="\u0000refusal"?"refusal":"error")}
      }
    }catch(e){
      if(e&&e.status===401)fail("login");
      else if(chat[chat.length-1].role==="assistant"&&!chat[chat.length-1].skip)chat[chat.length-1].text+="…";
      else fail("error");
    }
  }
  chatBusy=false;saveChat();renderChat();
}

// The box grows with what you type, up to about five lines.
// The scrollbar only appears once it's that tall, not on an empty box.
function fitInput(){const q=$("apolloq");q.style.height="auto";const h=q.scrollHeight;
  q.style.height=Math.min(h,132)+"px";q.style.overflowY=h>132?"auto":"hidden"}

let chatAfterLogin=false;
function openApollo(){
  const p=$("apollo");if(!p.hidden)return;
  if(FB_ON&&!auth){chatAfterLogin=true;openAcct("login","chat");return}
  p.hidden=false;$("apollob").setAttribute("aria-expanded","true");
  document.documentElement.classList.add("chat-open");
  renderChat();$("apolloq").focus();
}
function closeApollo(){
  const p=$("apollo");if(p.hidden)return;
  p.hidden=true;$("apollob").setAttribute("aria-expanded","false");
  document.documentElement.classList.remove("chat-open");
  $("apollob").focus();
}
// The button lives on the home page only; leaving it closes the chat too.
function syncApollo(){
  const home=!$("home").hidden;
  $("apollob").hidden=!home;
  if(!home)closeApollo();
}

$("apollob").onclick=()=>$("apollo").hidden?openApollo():closeApollo();
$("apollox").onclick=closeApollo;
// A "new chat" button beside the close button, once there's something to clear.
(function(){const x=$("apollox");if(!x||$("apollonew"))return;const b=document.createElement("button");b.type="button";b.id="apollonew";b.className="apox apo-new";b.hidden=true;
  b.innerHTML=`<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>`;b.onclick=newChat;x.parentNode.insertBefore(b,x)})();
$("apolloform").onsubmit=e=>{e.preventDefault();send($("apolloq").value)};
$("apolloq").oninput=fitInput;
$("apolloq").dir="auto";
// Enter sends, Shift+Enter starts a new line, Escape closes.
$("apolloq").onkeydown=e=>{
  if(e.key==="Enter"&&!e.shiftKey&&!e.isComposing){e.preventDefault();send($("apolloq").value)}
};
$("apollo").addEventListener("keydown",e=>{if(e.key==="Escape"){e.preventDefault();closeApollo()}});
renderApollo();syncApollo();
