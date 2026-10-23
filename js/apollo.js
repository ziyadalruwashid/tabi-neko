// Ask Apollo: the floating chat on the home page. Loaded after js/app.js and
// uses its helpers ($, esc, T, isAR, store).
//
// The chat window is all here; the brains are not wired up yet. Set APOLLO_API
// to the proxy's URL (step two) and send() will talk to it. Until then Apollo
// answers every message with a friendly "coming soon".
const APOLLO_API="";

const SUGGEST=["Halal ramen in Tokyo?","Plan a day in Kyoto for me","Best coffee near Shibuya?","Where can I pray in Osaka?"];
// The conversation survives a reload or a trip to another page, but only for
// this tab, and an empty or blocked sessionStorage just starts fresh.
const CHAT_KEY="tabineko-chat";
let chat=[],chatBusy=false;
try{chat=JSON.parse(sessionStorage.getItem(CHAT_KEY))||[]}catch(e){chat=[]}
const saveChat=()=>{try{sessionStorage.setItem(CHAT_KEY,JSON.stringify(chat.slice(-40)))}catch(e){}};

// Plain text in, safe HTML out: escaped, with line breaks kept.
const chatHTML=s=>esc(s).replace(/\n/g,"<br>");

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
  if(chatBusy)h+=`<div class="msg apo typing" aria-label="${esc(T("Apollo is typing"))}"><p><i></i><i></i><i></i></p></div>`;
  // Starter questions only until the first message, so they don't nag.
  if(!chat.length)h+=`<div class="chips">${SUGGEST.map(s=>`<button type="button" class="chip">${esc(T(s))}</button>`).join("")}</div>`;
  log.innerHTML=h;
  log.querySelectorAll(".chip").forEach(b=>b.onclick=()=>send(b.textContent));
  log.scrollTop=log.scrollHeight;
}

async function send(text){
  text=(text||"").trim();
  if(!text||chatBusy)return;
  chat.push({role:"user",text});chatBusy=true;saveChat();renderChat();
  $("apolloq").value="";fitInput();
  let reply;
  if(!APOLLO_API){
    await new Promise(r=>setTimeout(r,900));
    reply=T("I'm still learning to talk! My chat opens very soon. Until then, the map and the search box above have everything in my notebook.");
  }else{
    // Wired up in step two.
    reply=T("Something went wrong on my side. Try again in a moment.");
  }
  chat.push({role:"assistant",text:reply});chatBusy=false;saveChat();renderChat();
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
