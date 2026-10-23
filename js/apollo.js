// Ask Apollo: the floating chat on the home page. Loaded after js/app.js and
// uses its helpers ($, esc, T, isAR, store).
//
// Apollo's answers come from Claude through the small proxy in
// worker/ask-apollo.js, which holds the API key. APOLLO_API is that Worker's
// address; while it's empty Apollo answers with a friendly "coming soon".
const APOLLO_API="https://ask-apollo.ziyadalruwashid.workers.dev/";

const SUGGEST=["Halal ramen in Tokyo?","Plan a day in Kyoto for me","Best coffee near Shibuya?","Where can I pray in Osaka?"];
// The conversation survives a reload or a trip to another page, but only for
// this tab, and an empty or blocked sessionStorage just starts fresh.
const CHAT_KEY="tabineko-chat";
let chat=[],chatBusy=false;
try{chat=JSON.parse(sessionStorage.getItem(CHAT_KEY))||[]}catch(e){chat=[]}
const saveChat=()=>{try{sessionStorage.setItem(CHAT_KEY,JSON.stringify(chat.slice(-40)))}catch(e){}};

// Plain text in, safe HTML out: escaped, line breaks kept, and **bold**
// honoured. Apollo bolds every place he recommends; one whose name matches a
// place on the site becomes a link that jumps to it on the map.
const PLACE_BY_NAME=new Map(P.map(p=>[LOW(p.n),p]));
const chatHTML=s=>esc(s).replace(/\*\*(.+?)\*\*/g,(m,t)=>{
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
  $("apollob").innerHTML=`<img src="assets/cat.png" alt=""><span>${T("Ask Apollo")}</span>`;
  $("apollob").setAttribute("aria-label",T("Ask Apollo"));
  $("apollo").setAttribute("aria-label",T("Chat with Apollo"));
  $("apollox").setAttribute("aria-label",T("Close chat"));
  $("apollotitle").textContent=T("Ask Apollo");
  $("apollosub").textContent=T("your travel cat 🐾");
  $("apolloq").placeholder=T("Ask me anything about Japan…");
  $("apollosend").setAttribute("aria-label",T("Send"));
  renderChat();
}
function renderChat(){
  const log=$("apollolog");
  let h=`<div class="msg apo"><p>${chatHTML(T("Meow! I'm Apollo. Ask me where to eat halal, what to see, or how to get around, and I'll answer from my notebook."))}</p></div>`;
  h+=chat.map(m=>`<div class="msg ${m.role==="user"?"you":"apo"}"><p>${chatHTML(m.text)}</p></div>`).join("");
  // The dots show until Apollo's first words arrive.
  if(chatBusy&&!(chat.length&&chat[chat.length-1].role==="assistant"))h+=`<div class="msg apo typing" aria-label="${esc(T("Apollo is typing"))}"><p><i></i><i></i><i></i></p></div>`;
  // Starter questions only until the first message, so they don't nag.
  if(!chat.length)h+=`<div class="chips">${SUGGEST.map(s=>`<button type="button" class="chip">${esc(T(s))}</button>`).join("")}</div>`;
  log.innerHTML=h;
  log.querySelectorAll(".chip").forEach(b=>b.onclick=()=>send(b.textContent));
  log.querySelectorAll(".pl").forEach(b=>b.onclick=()=>goPlace(b.dataset.id));
  log.scrollTop=log.scrollHeight;
}

// Messages flagged skip (the coming-soon note, errors, and the question that
// got one) stay on screen but aren't sent back as history, so the turns the
// API sees always alternate question, answer, question.
const history=()=>chat.filter(m=>!m.skip&&m.text).map(m=>({role:m.role,content:m.text}));
const SAY={
  refusal:"I can't help with that one. Ask me something about your trip to Japan!",
  slow:"You're asking faster than I can walk! Give me a minute, then try again.",
  error:"Something went wrong on my side. Try again in a moment.",
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
      const res=await fetch(APOLLO_API,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({messages:history()})});
      if(!res.ok||!res.body)fail(res.status===429?"slow":"error");
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
      if(chat[chat.length-1].role==="assistant"&&!chat[chat.length-1].skip)chat[chat.length-1].text+="…";
      else fail("error");
    }
  }
  chatBusy=false;saveChat();renderChat();
}

// The box grows with what you type, up to about five lines.
function fitInput(){const q=$("apolloq");q.style.height="auto";q.style.height=Math.min(q.scrollHeight,132)+"px"}

function openApollo(){
  const p=$("apollo");if(!p.hidden)return;
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
$("apolloform").onsubmit=e=>{e.preventDefault();send($("apolloq").value)};
$("apolloq").oninput=fitInput;
// Enter sends, Shift+Enter starts a new line, Escape closes.
$("apolloq").onkeydown=e=>{
  if(e.key==="Enter"&&!e.shiftKey&&!e.isComposing){e.preventDefault();send($("apolloq").value)}
};
$("apollo").addEventListener("keydown",e=>{if(e.key==="Escape"){e.preventDefault();closeApollo()}});
renderApollo();syncApollo();
