// Tabi Neko app logic. Data lives in data/*.js, loaded before this file.

const store={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}}};
let city=store.get("tabineko-city")||"tokyo"; if(!CITIES[city])city="tokyo";
let active=new Set(Object.keys(CATS)),selected=null,area=null,zoomTo=null,halalOnly=false;
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
// Folds the Arabic letters people type interchangeably (أ/إ/آ/ا, ة/ه, ى/ي)
// so a search matches however it is spelled. Every swap is one character for
// one character, so hl() can still map match positions back onto the original.
const LOW=s=>(s||"").toLowerCase().replace(/[أإآ]/g,"ا").replace(/ة/g,"ه").replace(/ى/g,"ي");

// ---- language ----
// English is written inline and is also the lookup key, so a string missing
// from data/ar/ui.js falls back to English instead of breaking. The Arabic
// files are only fetched for someone who picks Arabic, see setLang() below.
let lang=document.documentElement.lang==="ar"&&typeof AR!=="undefined"?"ar":"en";
const isAR=()=>lang==="ar";
const AR_ON=()=>typeof AR!=="undefined"&&!!AR.places;
const fill=(s,v)=>v?s.replace(/\{(\w+)\}/g,(_,k)=>v[k]):s;
const T=(s,v)=>fill(isAR()&&AR.ui[s]||s,v);
// A field of a data entry in the current language, e.g. D(place,"tip").
const D=(o,f)=>isAR()&&o._ar&&o._ar[f]||o[f];
const AREA=a=>isAR()&&AR.areas[a]||a;
const ML=s=>isAR()&&AR.map[s]||s;
// Arabic counts change the noun's form with the number: 1 and 2 have their own
// words, 3–10 take the plural and 11 and up the singular. forms = [one, two,
// three-to-ten, eleven-plus]; en = [one, many].
const N=(n,en,ar)=>!isAR()?`${n} ${n===1?en[0]:en[1]}`:n===1?ar[0]:n===2?ar[1]:`${n} ${n<=10?ar[2]:ar[3]}`;
const PL={spot:[["spot","spots"],["مكان واحد","مكانان","أماكن","مكانًا"]],trip:[["trip","trips"],["رحلة واحدة","رحلتان","رحلات","رحلة"]],
  app:[["app","apps"],["تطبيق واحد","تطبيقان","تطبيقات","تطبيقًا"]],place:[["place","places"],["مكان واحد","مكانان","أماكن","مكانًا"]]};
const NP=(n,k)=>N(n,...PL[k]);
// Prices, times and ranges stay in Latin digits in the Arabic text. Left loose
// in a right-to-left line the bidi algorithm swaps the two ends of a range
// ("¥15–18k" shows as "18k–15¥"), so each run is wrapped in invisible
// left-to-right isolate marks and reads exactly as it does in English.
const LTR_RUN=/[~≈]?[¥$€]?[a-zA-Z]*\d[\d.,:%]*[a-zA-Z+]*(?:\s?[–~-]\s?[¥$€]?\d[\d.,:%]*[a-zA-Z+]*)*/g;
const iso=v=>typeof v==="string"?v.replace(LTR_RUN,"\u2066$&\u2069"):Array.isArray(v)?v.map(iso):v;
const isoAll=set=>{for(const k in set){const o=set[k];for(const f in o)o[f]=iso(o[f])}};
// Hangs each entry's Arabic on it as _ar, keyed the same way the files are.
function attachAR(){
  if(!AR.iso){[AR.places,AR.trips,AR.apps,AR.crew,AR.album].forEach(isoAll);AR.iso=true}
  P.forEach(p=>p._ar=AR.places[p.city+"|"+p.n]);
  TRIPS.forEach(t=>t._ar=AR.trips[t.n]);TGROUPS.forEach(g=>g._ar=AR.tgroups[g.k]);
  APPS.forEach(a=>a._ar=AR.apps[a.n]);AGROUPS.forEach(g=>g._ar=AR.agroups[g.k]);
  CREW.forEach(m=>m._ar=AR.crew[m.n]);ALBUM.forEach(m=>m._ar=AR.album[m.t]);
  HOODS.forEach(h=>h._ar=AR.hoods&&AR.hoods[h.city+"|"+h.area]);
  for(const k in CITIES)CITIES[k]._ar=AR.cities[k];for(const k in CATS)CATS[k]._ar={n:AR.cats[k]};
}
if(AR_ON())attachAR();
const visible=p=>active.has(p.cat)&&(!area||p.area===area)&&(!halalOnly||p.halal);
const SCRIB="M14 34 C 10 12, 70 4, 120 8 C 170 12, 196 26, 186 46 C 176 64, 90 68, 40 60 C 6 54, 4 30, 30 18 C 44 12, 60 10, 78 9";
const UNDER="M2 6 C 30 2, 60 9, 90 4 S 140 7, 160 3";

// Pin numbers and ids are derived from the order of P, per city.
const cnt={};P.forEach(p=>{cnt[p.city]=(cnt[p.city]||0)+1;p.num=String(cnt[p.city]).padStart(2,"0");p.id=p.city+"-"+p.num});

function renderCities(){
  const ks=Object.keys(CITIES).filter(k=>P.some(p=>p.city===k));let h="";
  if(!ks.includes(city))city=ks[0];
  ks.forEach((k,i)=>{const c=CITIES[k],n=P.filter(p=>p.city===k).length;
    h+=`<button class="cityb" id="city-${k}" data-k="${k}" aria-pressed="${k===city}"><svg viewBox="0 0 200 70" preserveAspectRatio="none" aria-hidden="true"><path d="${SCRIB}"/></svg><b>${D(c,"n")}</b><small><bdi>${c.jp}</bdi> · <bdi>${NP(n,"spot")}</bdi></small></button>`;
  });
  $("cities").innerHTML=h;
  $("cities").querySelectorAll(".cityb").forEach(b=>b.onclick=()=>{if(b.dataset.k===city)return;city=b.dataset.k;store.set("tabineko-city",city);selected=null;area=null;zoomTo=null;halalOnly=false;renderAll()});
}
// Tokyo has 35 neighbourhoods, which wrapped to four rows of pills and pushed
// the map below the fold, so the list lives in a dropdown with its own filter
// box. Picking an area re-renders this row from scratch, which drops the panel
// and all its handlers with it — that is why nothing here needs tearing down.
function closeAreas(){
  const pan=$("apanel");if(!pan||pan.hidden)return;
  pan.hidden=true;$("atrig").setAttribute("aria-expanded","false");$("aq").value="";
}
function renderAreas(){
  const pts=P.filter(p=>p.city===city),cn=D(CITIES[city],"n");
  const c=n=>pts.filter(p=>p.area===n).length;
  const names=[...new Set(pts.map(p=>p.area))].sort((x,y)=>c(y)-c(x)||x.localeCompare(y));
  // "everywhere" carries the empty string so one code path covers clearing too.
  const opts=[{n:T("everywhere"),a:"",c:pts.length},...names.map(n=>({n:AREA(n),a:n,c:c(n)}))];
  const sel=opts.find(o=>o.a===(area||""))||opts[0];
  $("areas").innerHTML=`<span class="lead">${esc(T("in {c}:",{c:cn}))}</span><div class="adrop">`+
    `<button class="atrig" id="atrig" type="button" aria-haspopup="listbox" aria-controls="apanel" aria-expanded="false"${area?' data-on="1"':""}>`+
      `<b>${esc(sel.n)}</b><small>${sel.c}</small>`+
      `<svg viewBox="0 0 16 10" aria-hidden="true"><path d="M1.6 2.2 8 7.8 14.4 2.2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`+
    `</button>`+
    `<div class="apanel" id="apanel" hidden>`+
      `<div class="asbox">`+
        `<svg class="mag" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M15.8 15.8 21 21" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`+
        `<input id="aq" type="text" autocomplete="off" spellcheck="false" placeholder="${esc(T("which part of {c}?",{c:cn}))}" aria-label="${esc(T("Filter areas"))}" role="combobox" aria-expanded="true" aria-controls="alist" aria-autocomplete="list">`+
      `</div>`+
      `<div class="alist" id="alist" role="listbox" aria-label="${esc(T("Areas in {c}",{c:cn}))}"></div>`+
    `</div></div>`;

  const trig=$("atrig"),pan=$("apanel"),inp=$("aq"),list=$("alist");
  let shown=opts,cur=-1;
  const pick=a=>{area=a||null;selected=null;zoomTo=null;renderAreas();renderMap();renderList()};
  const mark=()=>{[...list.children].forEach((el,i)=>el.setAttribute("aria-selected",i===cur));
    const el=cur>-1&&list.children[cur];
    if(el){inp.setAttribute("aria-activedescendant",el.id);el.scrollIntoView({block:"nearest"})}
    else inp.removeAttribute("aria-activedescendant")};
  function draw(){
    const q=LOW(inp.value).trim();
    shown=q?opts.filter(o=>LOW(o.n).includes(q)):opts;
    // Pre-select the top hit while filtering so Enter picks the obvious one,
    // but leave nothing selected on the unfiltered list.
    cur=q&&shown.length?0:-1;
    list.innerHTML=shown.length?shown.map((o,i)=>
      `<button class="ao" id="ao-${i}" type="button" role="option" aria-selected="false" data-a="${esc(o.a)}" data-i="${i}"${o.a===(area||"")?' data-cur="1"':""}><span>${hl(o.n,q?[q]:[])}</span><small>${o.c}</small></button>`
    ).join(""):`<p class="qnone">${T("No area by that name.")}</p>`;
    list.querySelectorAll(".ao").forEach(el=>{
      el.onmouseenter=()=>{cur=+el.dataset.i;mark()};
      el.onclick=()=>pick(el.dataset.a)});
    mark();
  }
  const open=()=>{pan.hidden=false;trig.setAttribute("aria-expanded","true");draw();
    const at=list.querySelector('[data-cur="1"]');if(at)at.scrollIntoView({block:"nearest"});
    inp.focus()};
  trig.onclick=()=>pan.hidden?open():closeAreas();
  trig.onkeydown=e=>{if((e.key==="ArrowDown"||e.key==="Enter"||e.key===" ")&&pan.hidden){e.preventDefault();open()}};
  inp.oninput=draw;
  inp.onkeydown=e=>{
    if(e.key==="Escape"){e.preventDefault();closeAreas();trig.focus();return}
    if(e.key==="Tab"){closeAreas();return}
    if(!shown.length)return;
    if(e.key==="ArrowDown"){e.preventDefault();cur=(cur+1)%shown.length;mark()}
    else if(e.key==="ArrowUp"){e.preventDefault();cur=(cur-1+shown.length)%shown.length;mark()}
    else if(e.key==="Enter"){e.preventDefault();pick(shown[cur>-1?cur:0].a)}
  };
}
// Each category wears its own sticker, tilted a different way so the row reads
// as things stuck onto the page rather than a toolbar. The art is cut out of the
// same sheets a photo-less place falls back to, so the row matches the cards.
// "Halal only" keeps the plain dot — it is not a category and has no sticker.
const TILT=[-5,4,-3,5.5,-4.5,3,-2.5];
function renderFilters(){
  $("filters").innerHTML=`<span class="lead">${T("show me:")}</span>`+Object.entries(CATS).map(([k,c],i)=>`<button class="f" id="f-${k}" data-k="${k}" aria-pressed="${active.has(k)}" style="--c:var(--${k});--r:${TILT[i%TILT.length]}deg"><img class="fi" src="assets/icons/${k}.png" alt="" width="26" height="26">${D(c,"n")}</button>`).join("")+(P.some(p=>p.city===city&&p.halal)?`<button class="f halalf" id="f-halal" aria-pressed="${halalOnly}" style="--c:#4F7A1E"><i></i>${T("Halal only")}</button>`:"");
  const hb=$("f-halal");if(hb)hb.onclick=()=>{halalOnly=!halalOnly;zoomTo=null;selected=null;renderFilters();renderMap();renderList()};
  $("filters").querySelectorAll(".f[data-k]").forEach(b=>b.onclick=()=>{const k=b.dataset.k,all=Object.keys(CATS);
    if(active.has(k)&&active.size===all.length)active=new Set([k]);
    else if(active.has(k)){active.delete(k);if(!active.size)active=new Set(all)}
    else active.add(k);zoomTo=null;renderFilters();renderMap();renderList()});
}
// trim ignores that fraction of places at each edge, so a handful of far-out
// spots (Disney, USJ) stop shrinking the centre where almost everything is.
// Those places are then drawn as tabs on the border rather than dropped.
// Osaka needs a wider cut than the rest: its outliers come in pairs (teamLab
// Nagai sits beside Sumiyoshi in the south, USJ beside Kaiyukan in the west),
// so a 3% quantile drops one of each pair and the survivor still sets the frame.
const TRIM={osaka:.05};
function fitBox(list,W,H,min=.03,trim=0){
  if(!list.length)return BOX[city];
  const lat=list.map(p=>p.lat).sort((a,b)=>a-b),lo=list.map(p=>p.lng).sort((a,b)=>a-b);
  const t=list.length>=12?trim:0,q=(a,f)=>a[Math.round((a.length-1)*f)];
  let n=q(lat,1-t),s=q(lat,t),e=q(lo,1-t),w=q(lo,t);
  const k=Math.cos(((n+s)/2)*Math.PI/180);
  let la=Math.max(n-s,min),ln=Math.max((e-w)*k,min);
  la*=1.12;ln*=1.12;
  if(ln/la>W/H)la=ln*H/W;else ln=la*W/H;
  const cl=(n+s)/2,cg=(e+w)/2;
  return {n:cl+la/2,s:cl-la/2,w:cg-ln/2/k,e:cg+ln/2/k};
}
const ARC=(cx,cy,r,a0,a1)=>{const x0=cx+r*Math.cos(a0),y0=cy+r*Math.sin(a0),x1=cx+r*Math.cos(a1),y1=cy+r*Math.sin(a1);
  return `M${x0.toFixed(1)} ${y0.toFixed(1)} A${r.toFixed(1)} ${r.toFixed(1)} 0 ${a1-a0>Math.PI?1:0} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`};
// The last map drawn, kept so a tap on it can be turned back into a lat/lng
// (dropping a pin for where you're staying, in js/trip.js).
let MAPP=null;
function renderMap(){
  const pts=P.filter(p=>p.city===city),W=600,H=480,G=GEO[city],c=CITIES[city];
  const vis=pts.filter(p=>visible(p)&&!p.nomap);
  if(zoomTo&&selected){const sp=pts.find(p=>p.id===selected);if(sp&&(sp.lat>zoomTo.n||sp.lat<zoomTo.s||sp.lng<zoomTo.w||sp.lng>zoomTo.e))zoomTo=null}
  const B=zoomTo||fitBox(vis.length?vis:pts,W,H,.03,TRIM[city]||.03);
  const E=EXTRA[city]||{streets:[],stations:[],marks:[],labels:[]};
  const k=Math.cos(((B.n+B.s)/2)*Math.PI/180),s=Math.min(W/((B.e-B.w)*k),H/(B.n-B.s));
  const ox=(W-(B.e-B.w)*k*s)/2,oy=(H-(B.n-B.s)*s)/2;
  const X=(a,b)=>ox+(b-B.w)*k*s,Y=(a,b)=>oy+(B.n-a)*s;
  MAPP={B,k,s,ox,oy};
  const pl=a=>a.map(q=>X(q[0],q[1]).toFixed(1)+","+Y(q[0],q[1]).toFixed(1)).join(" ");
  const span=B.n-B.s,wide=span>.05,tight=span<.012;
  // Measured up here so the pin pass below can keep clear of the scale bar.
  // Zoomed right in (a tight cluster, or Near me) a kilometre is wider than the
  // sheet, so the bar steps down to 500 m and 200 m.
  const kmPx=s/111,km=kmPx>350?.2:kmPx>140?.5:kmPx>70?1:(kmPx>28?2:5),bar=km*kmPx;

  // Pins are grouped first so every label below can dodge them.
  // A place the trimmed frame left outside the sheet is pulled onto the margin and
  // marked `off`, so it stays visible and clickable as an edge tab with a chevron
  // pointing the way it really lies. `off` pins only ever group with other `off`
  // pins — a tab on the margin is not in the same spot as a pin that lives there.
  // Only the trimmed overview pushes places off the sheet on purpose, so only it
  // gets tabs. In a cluster zoom the rest of the city is meant to be out of shot —
  // clamping there would ring the sheet with tabs for everything you zoomed past.
  const clamp=!zoomTo;
  const R=30,M=30,items=vis.map(p=>{
    const rx=X(p.lat,p.lng),ry=Y(p.lat,p.lng);
    if(!clamp||(rx>=0&&rx<=W&&ry>=0&&ry<=H))return {p,x:rx,y:ry};
    const x=Math.min(W-M,Math.max(M,rx)),y=Math.min(H-M,Math.max(M,ry));
    return {p,x,y,off:true,ang:Math.atan2(ry-y,rx-x)};
  }),groups=[];
  items.forEach(it=>{
    if(it.p.id===selected){groups.push({m:[it],x:it.x,y:it.y,sel:true,off:it.off});return}
    const gr=groups.find(q=>!q.sel&&q.off===it.off&&Math.hypot(q.x-it.x,q.y-it.y)<R);
    if(gr){gr.m.push(it);gr.x=gr.m.reduce((a,q)=>a+q.x,0)/gr.m.length;gr.y=gr.m.reduce((a,q)=>a+q.y,0)/gr.m.length}else groups.push({m:[it],x:it.x,y:it.y,off:it.off});
  });
  // Mean outward direction, so a tab holding several off places points sensibly.
  const oang=gr=>Math.atan2(gr.m.reduce((a,it)=>a+Math.sin(it.ang),0),gr.m.reduce((a,it)=>a+Math.cos(it.ang),0));
  // The scale bar and compass are drawn under the pins, so a pin landing on them
  // reads as part of the legend. Nudge marks off them, and off the paper's edge —
  // the tighter frame leaves more pins straddling it. Runs before `blobs` so the
  // label solver dodges where the marks actually end up.
  const FURN=[[16,H-34,28+bar+58,H-6],[W-62,6,W-8,66]];
  groups.forEach(gr=>{
    const must=gr.m.some(it=>it.p.tier==="must");
    // In `tight` mode a cluster fans its members out around this point, so the
    // radius to keep clear is the fan's reach, not the ring's.
    const r=gr.m.length===1?(must?20:14)
      :tight?16+gr.m.length*3+(must?20:14)
      :15+Math.min(9,gr.m.length*1.2)+(must?9:0);
    let x=Math.min(W-r-2,Math.max(r+2,gr.x)),y=Math.min(H-r-2,Math.max(r+2,gr.y));
    for(let pass=0;pass<2;pass++)FURN.forEach(([x0,y0,x1,y1])=>{
      if(x+r<=x0||x-r>=x1||y+r<=y0||y-r>=y1)return;
      const c=[[x,y0-r-2],[x,y1+r+2],[x0-r-2,y],[x1+r+2,y]]
        .filter(([a,b])=>a>=r+2&&a<=W-r-2&&b>=r+2&&b<=H-r-2);
      if(!c.length)return;
      const w=c.reduce((p,q)=>Math.hypot(q[0]-x,q[1]-y)<Math.hypot(p[0]-x,p[1]-y)?q:p);
      x=w[0];y=w[1];
    });
    gr.x=x;gr.y=y;
  });
  // Radii must match what the pin pass below actually paints, `must` ring included —
  // a must pin draws out to r=19 and a must cluster to r+9, so modelling either at
  // the plain body radius lets the label solver tuck names under the dashed ring.
  const blobs=[];
  groups.forEach((gr,gi)=>{
    const i=gr.sel?1e9:gi; // the selected pin is drawn last, so it covers everything
    const must=gr.m.some(it=>it.p.tier==="must");
    if(gr.m.length===1){blobs.push({i,x:gr.x,y:gr.y,r:gr.sel?24:must?21:15});return}
    if(tight){const rad=16+gr.m.length*3;gr.m.forEach((it,j)=>{const a=-Math.PI/2+j*2*Math.PI/gr.m.length;blobs.push({i,x:gr.x+rad*Math.cos(a),y:gr.y+rad*Math.sin(a),r:it.p.tier==="must"?21:15})});return}
    blobs.push({i,x:gr.x,y:gr.y,r:15+Math.min(9,gr.m.length*1.2)+(must?10:4)});
  });
  const taken=[];
  const free=(x,y,w,h)=>{
    if(x<3||y<3||x+w>W-3||y+h>H-3)return false;
    for(const b of blobs){const nx=Math.max(x,Math.min(b.x,x+w)),ny=Math.max(y,Math.min(b.y,y+h));if(Math.hypot(b.x-nx,b.y-ny)<b.r+2)return false}
    for(const t of taken)if(x<t.x+t.w&&x+w>t.x&&y<t.y+t.h&&y+h>t.y)return false;
    return true;
  };
  const freeAt=(x,y,rad)=>{for(const b of blobs)if(Math.hypot(b.x-x,b.y-y)<b.r+rad)return false;return true};
  // Try a few offsets around (px,py); returns the winning anchor or null.
  const place=(px,py,w,h,opts)=>{
    for(const[dx,dy,an]of opts){
      const tx=px+dx,ty=py+dy,bx=an==="start"?tx:an==="end"?tx-w:tx-w/2,by=ty-h*.8;
      if(free(bx,by,w,h)){taken.push({x:bx,y:by,w,h});return{x:tx,y:ty,a:an}}
    }
    return null;
  };
  // Street and water names are rotated and centred. Testing their whole length
  // matters — a centre-only test happily drops a pin halfway along the name — but an
  // axis-aligned box around rotated text grossly overstates it: a 120x15 name at 45°
  // becomes a 95x95 box and gets rejected everywhere. So walk the real baseline.
  // Walks the glyph box, not the baseline: `y` is a text baseline, so the ink sits
  // above it, and `dy` shifts it further. Reserving a band centred on the baseline
  // instead leaves the tops of the letters unclaimed, which is how a station name
  // ends up a few px inside the street name it crosses.
  const rpts=(x,y,w,rot,h,dy=0)=>{const a=rot*Math.PI/180,n=Math.max(2,Math.round(w/14)),o=[];
    const ly=dy-h*.275,ox=-ly*Math.sin(a),oy=ly*Math.cos(a);
    for(let i=0;i<=n;i++){const d=-w/2+w*i/n;o.push([x+d*Math.cos(a)+ox,y+d*Math.sin(a)+oy])}return o};
  const rfree=(x,y,w,h,rot,dy)=>rpts(x,y,w,rot,h,dy).every(([px,py])=>px>3&&px<W-3&&py>3&&py<H-3
    &&freeAt(px,py,h*.5+2)
    &&!taken.some(t=>px>t.x-7&&px<t.x+t.w+7&&py>t.y-h*.5&&py<t.y+t.h+h*.5));
  // Reserves 4px taller than the clearance test uses, to cover the stroke halo. Only
  // what the label reserves grows, not what it needs to find a slot, so this costs
  // no street labels.
  const rtake=(x,y,w,h,rot,dy)=>rpts(x,y,w,rot,h,dy).forEach(([px,py])=>taken.push({x:px-7,y:py-h/2-2,w:14,h:h+4}));
  const ring=d=>[[d,5,"start"],[-d,5,"end"],[0,-d,"middle"],[0,d*1.5,"middle"],[d*.7,-d*.7,"start"],[-d*.7,-d*.7,"end"],[d*.7,d*1.1,"start"],[-d*.7,d*1.1,"end"]];
  const SIDES=[...ring(10),...ring(19),...ring(30)];
  const HERE=[[0,0,"middle"],...ring(14),...ring(26),...ring(38)];
  const flag=(p,x,y)=>{const lw=Math.max(44,p.n.length*9.4)+16,up=y>58;
    return {lw,lx:Math.min(W-lw/2-4,Math.max(lw/2+4,x)),up,ly:up?y-48:y+26}};
  // The selected pin's name flag draws last and covers everything, so its box is
  // reserved before any label is placed.
  const sg=groups.find(q=>q.sel);
  if(sg){const f=flag(sg.m[0].p,sg.x,sg.y);taken.push({x:f.lx-f.lw/2,y:f.ly,w:f.lw,h:25})}

  // A cluster and the district label on top of it say the same thing, so the
  // cluster adopts the nearest unclaimed district name as its caption instead.
  const pool=[];
  G.areas.forEach(([t,a,b])=>pool.push({t:ML(t),x:X(a,b),y:Y(a,b),gate:false}));
  E.labels.forEach(([t,a,b])=>pool.push({t:ML(t),x:X(a,b),y:Y(a,b),gate:true}));
  if(!tight)groups.forEach((gr,gi)=>{
    if(gr.m.length<2||gr.off)return; // a clamped tab is not in the district it sits on
    const r=15+Math.min(9,gr.m.length*1.2);let best=null,bd=1e9;
    pool.forEach(q=>{if(q.used)return;const d=Math.hypot(q.x-gr.x,q.y-gr.y);if(d<bd&&d<r+48){bd=d;best=q}});
    if(!best)return;
    const w=best.t.length*9;
    // A caption can only be covered by marks drawn after its own cluster, so the
    // test is draw-order aware; without that, dense Tokyo rejects every slot.
    const slot=[[0,r+12],[0,-r-24],[-w*.4,r+12],[w*.4,r+12],[-w*.4,-r-24],[w*.4,-r-24],
      [-w*.8,r+12],[w*.8,r+12],[-w*.8,-r-24],[w*.8,-r-24],[-w/2-r-6,4],[w/2+r+6,4]]
      .map(([dx,dy])=>[gr.x-w/2+dx,gr.y+dy])
      .find(([x,y])=>y>3&&y+12<H-3&&x>3&&x+w<W-3
        &&!blobs.some(b=>b.i>gi&&Math.hypot(b.x-Math.max(x,Math.min(b.x,x+w)),b.y-Math.max(y,Math.min(b.y,y+12)))<b.r-3)
        &&!taken.some(t=>x<t.x+t.w&&x+w>t.x&&y<t.y+t.h&&y+12>t.y));
    if(!slot)return;
    best.used=true;gr.tag=best.t;gr.tagX=slot[0]+w/2;gr.tagY=slot[1]+10;
    taken.push({x:slot[0],y:slot[1],w,h:12});
  });

  let g=`<defs><clipPath id="cl"><rect width="${W}" height="${H}"/></clipPath>`
   +`<filter id="rough"><feTurbulence type="fractalNoise" baseFrequency=".03" numOctaves="2" seed="4"/><feDisplacementMap in="SourceGraphic" scale="4"/></filter>`
   +`<pattern id="grid" width="46" height="46" patternUnits="userSpaceOnUse"><path d="M46 0V46M0 46H46" fill="none" stroke="var(--rule)" stroke-width="1" opacity=".5"/></pattern>`
   +`<pattern id="wave" width="26" height="13" patternUnits="userSpaceOnUse"><path d="M0 9q6.5-6 13 0t13 0" fill="none" stroke="#8FB3D3" stroke-width="1.1" opacity=".6"/></pattern>`
   +`<pattern id="hatch" width="19" height="19" patternUnits="userSpaceOnUse"><path d="M3.5 13l6-6 6 6" fill="none" stroke="#9DB27A" stroke-width="1.1" opacity=".5"/></pattern>`
   +`</defs><g clip-path="url(#cl)">`;
  g+=`<rect width="${W}" height="${H}" fill="var(--land)"/><rect width="${W}" height="${H}" fill="url(#grid)"/>`;
  const hills=[...G.hills,...(E.hills||[])].map(pl),water=G.water.map(pl),parks=[...G.parks,...(E.parks||[])];
  // Only flat shapes go through the displacement filter. Pattern fills inside it
  // force Chrome to rasterize every tile and make the whole page unresponsive.
  g+=`<g filter="url(#rough)">`;
  hills.forEach(q=>g+=`<polygon points="${q}" fill="var(--hill)" stroke="#9DB27A" stroke-width="1.4" stroke-dasharray="2 5"/>`);
  water.forEach(q=>g+=`<polygon points="${q}" fill="var(--water)" stroke="#8FB3D3" stroke-width="1.6"/>`);
  [...G.rivers,...(E.rivers||[])].forEach(r=>g+=`<polyline points="${pl(r)}" fill="none" stroke="var(--water)" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/><polyline points="${pl(r)}" fill="none" stroke="#8FB3D3" stroke-width="1.2" stroke-dasharray="6 6"/>`);
  parks.forEach(([a,b,r])=>{const Rr=r*s;g+=`<ellipse cx="${X(a,b).toFixed(1)}" cy="${Y(a,b).toFixed(1)}" rx="${(Rr*1.15).toFixed(1)}" ry="${Rr.toFixed(1)}" fill="var(--park)" stroke="#9DB27A" stroke-width="1.3"/>`});
  if(G.loop&&wide){const L=G.loop;g+=`<polyline points="${pl(L.pts)}" fill="none" stroke="${L.c}" stroke-width="4" stroke-linejoin="round" opacity=".85"/>`;
    L.pts.slice(0,-1).forEach(q=>g+=`<circle cx="${X(q[0],q[1])}" cy="${Y(q[0],q[1])}" r="2.6" fill="var(--land)" stroke="${L.c}" stroke-width="1.6"/>`);}
  g+=`</g>`;
  hills.forEach(q=>g+=`<polygon points="${q}" fill="url(#hatch)"/>`);
  water.forEach(q=>g+=`<polygon points="${q}" fill="url(#wave)"/>`);
  parks.forEach(([a,b,r])=>{const Rr=r*s,x=X(a,b),y=Y(a,b);if(Rr<15)return;
    for(let i=0;i<7;i++){const a2=i*2.39996,rr=Rr*.6*Math.sqrt((i+.6)/7);
      g+=`<circle cx="${(x+rr*1.15*Math.cos(a2)).toFixed(1)}" cy="${(y+rr*Math.sin(a2)).toFixed(1)}" r="${Math.min(5,Rr*.12).toFixed(1)}" fill="#C4D79C"/>`}});

  let lab="";
  E.streets.forEach(([en,pt])=>{const nm=ML(en);g+=`<polyline points="${pl(pt)}" fill="none" stroke="#E2D2BC" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`;
    const a=pt[0],b=pt[pt.length-1],x1=X(a[0],a[1]),y1=Y(a[0],a[1]),x2=X(b[0],b[1]),y2=Y(b[0],b[1]);
    if(Math.hypot(x2-x1,y2-y1)<60)return;
    let ang=Math.atan2(y2-y1,x2-x1)*180/Math.PI;if(ang>90)ang-=180;if(ang<-90)ang+=180;
    const at=[.72,.5,.28,.86,.14].map(f=>[x1+(x2-x1)*f,y1+(y2-y1)*f])
      .find(([mx,my])=>mx>8&&mx<W-8&&my>8&&my<H-8&&freeAt(mx,my,13)&&rfree(mx,my,nm.length*7.4,15,ang,-5));
    if(!at)return;
    rtake(at[0],at[1],nm.length*7.4,15,ang,-5);
    lab+=`<text class="stn" transform="translate(${at[0].toFixed(1)},${at[1].toFixed(1)}) rotate(${ang.toFixed(1)})" text-anchor="middle" dy="-5" stroke="var(--land)" stroke-width="3" paint-order="stroke">${nm}</text>`});

  E.stations.forEach(([en,a,b])=>{const nm=ML(en);const x=X(a,b),y=Y(a,b);if(x<-20||x>W+20||y<-20||y>H+20)return;
    g+=`<rect x="${(x-5).toFixed(1)}" y="${(y-5).toFixed(1)}" width="10" height="10" rx="2.5" fill="var(--sheet)" stroke="var(--ink)" stroke-width="2"/>`;
    const p2=place(x,y,nm.length*7.4,15,SIDES);
    if(p2)lab+=`<text class="st" x="${p2.x.toFixed(1)}" y="${p2.y.toFixed(1)}" text-anchor="${p2.a}" stroke="var(--land)" stroke-width="4" paint-order="stroke">${nm}</text>`});

  const ICON={tower:'<path d="M0 -20 L5 6 L-5 6 Z M-3 -4 H3 M-4 1 H4" fill="var(--sheet)" stroke="var(--ink)" stroke-width="1.8" stroke-linejoin="round"/>',
    castle:'<path d="M-10 6 V-1 H10 V6 Z M-12 -1 L0 -8 L12 -1 Z M-7 -8 L0 -14 L7 -8 Z" fill="var(--sheet)" stroke="var(--ink)" stroke-width="1.6" stroke-linejoin="round"/>',
    temple:'<path d="M-11 -9 Q0 -12 11 -9 M-9 -5 H9 M-6 -9 V6 M6 -9 V6" fill="none" stroke="var(--lantern)" stroke-width="2.6" stroke-linecap="round"/>'};
  E.marks.forEach(([en,a,b,t])=>{const nm=ML(en);const x=X(a,b),y=Y(a,b);if(x<-20||x>W+20||y<-20||y>H+20)return;
    g+=`<g transform="translate(${x.toFixed(1)},${y.toFixed(1)})">${ICON[t]}</g>`;
    const p2=place(x,y,nm.length*7.4,15,[[0,22,"middle"],[0,32,"middle"],...SIDES]);
    if(p2)lab+=`<text class="lm" x="${p2.x.toFixed(1)}" y="${p2.y.toFixed(1)}" text-anchor="${p2.a}" stroke="var(--land)" stroke-width="4" paint-order="stroke">${nm}</text>`});

  if(G.loop&&wide){const L=G.loop,x=X(L.at[0],L.at[1]),y=Y(L.at[0],L.at[1]);
    if(freeAt(x,y,15))lab+=`<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" font-family="var(--hand)" font-size="16" fill="${L.c}" stroke="var(--land)" stroke-width="4" paint-order="stroke">${ML(L.name)}</text>`}
  // Water names slide along their own axis before giving up: the anchor in the data
  // is a nice spot in the bay, not the only one, and dropping the whole name because
  // one pin landed on it loses more than moving it does.
  G.wl.forEach(([en,a,b,rot])=>{const t=ML(en),x0=X(a,b),y0=Y(a,b),w=t.length*8.5;
    const ar=rot*Math.PI/180,dx=Math.cos(ar),dy=Math.sin(ar);
    const at=[0,.5,-.5,1,-1].map(f=>[x0+dx*w*f,y0+dy*w*f])
      .find(([x,y])=>x>10&&x<W-10&&y>10&&y<H-10&&freeAt(x,y,14)&&rfree(x,y,w,16,rot));
    if(!at)return;
    rtake(at[0],at[1],w,16,rot);
    lab+=`<text class="wl" transform="translate(${at[0].toFixed(1)},${at[1].toFixed(1)}) rotate(${rot})" text-anchor="middle">${t}</text>`});
  pool.forEach(q=>{if(q.used||(q.gate&&span>=.07))return;const p2=place(q.x,q.y,q.t.length*9,12,HERE);
    if(p2)lab+=`<text class="ml" x="${p2.x.toFixed(1)}" y="${p2.y.toFixed(1)}" text-anchor="${p2.a}" stroke="var(--land)" stroke-width="4" paint-order="stroke">${q.t}</text>`});
  if(G.sticker){const S=G.sticker,x=X(S.lat,S.lng),y=Y(S.lat,S.lng);
    if(x>S.w/2&&x<W-S.w/2&&y>0&&y<H&&freeAt(x,y,S.w*.55))
      lab+=`<image href="assets/${S.img}.png" x="${(x-S.w/2).toFixed(1)}" y="${(y-S.w*.8).toFixed(1)}" width="${S.w}" height="${S.w}" preserveAspectRatio="xMidYMid meet" transform="rotate(-6 ${x.toFixed(1)} ${y.toFixed(1)})"/><text x="${x.toFixed(1)}" y="${(y+S.w*.34).toFixed(1)}" text-anchor="middle" font-family="var(--hand)" font-size="16" fill="var(--ink)" stroke="var(--land)" stroke-width="4" paint-order="stroke">${ML(S.note)}</text>`}
  g+=lab;

  g+=`<g transform="translate(22,${H-20})"><rect x="0" y="-4" width="${(bar/2).toFixed(1)}" height="8" fill="var(--ink)" stroke="var(--ink)" stroke-width="1"/><rect x="${(bar/2).toFixed(1)}" y="-4" width="${(bar/2).toFixed(1)}" height="8" fill="var(--sheet)" stroke="var(--ink)" stroke-width="1"/><text x="${(bar+8).toFixed(1)}" y="5" font-family="var(--hand)" font-size="16" fill="var(--ink)">${km<1?T("{n} m",{n:km*1000}):T("{n} km",{n:km})}</text></g>`;
  g+=`<g transform="translate(${W-36},42)"><circle r="18" fill="var(--sheet)" opacity=".8"/><circle r="18" fill="none" stroke="var(--rule)" stroke-width="1.3"/><path d="M-13 0H13M0 -13V13" stroke="var(--rule)" stroke-width="1"/><path d="M0 -15L5 0L-5 0Z" fill="var(--lantern)"/><path d="M0 15L5 0L-5 0Z" fill="var(--ink)" opacity=".18"/><path d="M0 -15L5 0L0 15L-5 0Z" fill="none" stroke="var(--ink)" stroke-width="1.4" stroke-linejoin="round"/><text y="-20" text-anchor="middle" font-family="var(--hand)" font-weight="700" font-size="15" fill="var(--ink)">N</text></g>`;

  // Arrowhead at distance d along angle a, drawn upright then swung into place.
  const chev=(x,y,a,d)=>`<path d="M${(d-7).toFixed(1)} -6L${d} 0L${(d-7).toFixed(1)} 6" fill="none" stroke="var(--ink)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" opacity=".5" transform="rotate(${(a*180/Math.PI).toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}) translate(${x.toFixed(1)} ${y.toFixed(1)})"/>`;
  const pin=(p,x,y,ang)=>{const on=p.id===selected;let fl="";
    if(on){const{lw,lx,up,ly}=flag(p,x,y);
      fl=`<g transform="rotate(${up?-1.6:1.6} ${lx.toFixed(1)} ${(ly+12).toFixed(1)})"><path d="M${x.toFixed(1)} ${(up?y-18:y+18).toFixed(1)}V${(up?ly+24:ly).toFixed(1)}" stroke="var(--ink)" stroke-width="1.6"/>`
        +`<rect x="${(lx-lw/2).toFixed(1)}" y="${ly.toFixed(1)}" width="${lw.toFixed(1)}" height="25" rx="3" fill="var(--sheet)" stroke="var(--ink)" stroke-width="1.7"/>`
        +`<rect x="${(lx-lw/2).toFixed(1)}" y="${(ly+21).toFixed(1)}" width="${lw.toFixed(1)}" height="4" fill="var(--${p.cat})"/>`
        +`<text x="${lx.toFixed(1)}" y="${(ly+17).toFixed(1)}" text-anchor="middle" font-family="var(--hand)" font-weight="700" font-size="19" fill="var(--ink)">${p.n}</text></g>`}
    return `<g class="pin${on?" on":""}" data-id="${p.id}" tabindex="0" role="button" aria-label="${p.n}${ang===undefined?"":T(", further out past the edge")}">${ang===undefined?"":chev(x,y,ang,p.tier==="must"?24:19)}<ellipse cx="${x.toFixed(1)}" cy="${(y+14).toFixed(1)}" rx="7.5" ry="2.6" fill="var(--ink)" opacity=".16"/><g class="b">
      <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="13" fill="var(--${p.cat})" stroke="var(--sheet)" stroke-width="3"/>
      <text x="${x.toFixed(1)}" y="${(y+4).toFixed(1)}" text-anchor="middle" font-family="var(--body)" font-weight="700" font-size="11" fill="#fff">${+p.num}</text>
      ${p.tier==="must"?`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="19" fill="none" stroke="var(--lantern)" stroke-width="1.8" stroke-dasharray="3 3.5"/>`:""}
    </g>${fl}</g>`};

  const CK=Object.keys(CATS);
  let top="";
  groups.forEach((gr,gi)=>{
    if(gr.m.length===1){const h=pin(gr.m[0].p,gr.x,gr.y,gr.m[0].ang);if(gr.sel)top+=h;else g+=h;return}
    if(tight){const n=gr.m.length,rad=16+n*3;gr.m.forEach((it,i)=>{const a=-Math.PI/2+i*2*Math.PI/n;g+=pin(it.p,gr.x+rad*Math.cos(a),gr.y+rad*Math.sin(a),it.ang)});return}
    const n=gr.m.length,r=15+Math.min(9,n*1.2),must=gr.m.some(it=>it.p.tier==="must"),tally={};
    gr.m.forEach(it=>tally[it.p.cat]=(tally[it.p.cat]||0)+1);
    const ks=CK.filter(q=>tally[q]);
    let ring="";
    if(ks.length<2)ring=`<circle cx="${gr.x.toFixed(1)}" cy="${gr.y.toFixed(1)}" r="${r.toFixed(1)}" fill="none" stroke="var(--${ks[0]})" stroke-width="5"/>`;
    else{let a0=-Math.PI/2;ks.forEach(q=>{const sw=2*Math.PI*tally[q]/n,gap=Math.min(.11,sw*.3);
      ring+=`<path d="${ARC(gr.x,gr.y,r,a0+gap/2,a0+sw-gap/2)}" fill="none" stroke="var(--${q})" stroke-width="5" stroke-linecap="round"/>`;a0+=sw})}
    g+=`<g class="clu" data-g="${gi}" tabindex="0" role="button" aria-label="${esc(T(gr.off?"{n}, further out past the edge, zoom in":"{n} here, zoom in",{n:NP(n,"place")}))}">${gr.off?chev(gr.x,gr.y,oang(gr),r+(must?14:7)):""}<ellipse cx="${gr.x.toFixed(1)}" cy="${(gr.y+r+1).toFixed(1)}" rx="${(r*.62).toFixed(1)}" ry="3" fill="var(--ink)" opacity=".16"/><g class="b">
      ${must?`<circle cx="${gr.x.toFixed(1)}" cy="${gr.y.toFixed(1)}" r="${(r+8).toFixed(1)}" fill="none" stroke="var(--lantern)" stroke-width="1.8" stroke-dasharray="3 3.5"/>`:""}
      <circle cx="${gr.x.toFixed(1)}" cy="${gr.y.toFixed(1)}" r="${r.toFixed(1)}" fill="var(--sheet)" stroke="var(--land)" stroke-width="3"/>
      ${ring}
      <text x="${gr.x.toFixed(1)}" y="${(gr.y+5).toFixed(1)}" text-anchor="middle" font-family="var(--body)" font-weight="700" font-size="14" fill="var(--ink)">${n}</text>
    </g>${gr.tag?`<text class="ml" x="${gr.tagX.toFixed(1)}" y="${gr.tagY.toFixed(1)}" text-anchor="middle" stroke="var(--land)" stroke-width="4" paint-order="stroke">${gr.tag}</text>`:""}</g>`;
  });
  g+=top;
  // Where you're staying, from My trip: a little house with its name.
  (typeof tripHomes==="function"?tripHomes(city):[]).forEach(h=>{const x=X(h.lat,h.lng),y=Y(h.lat,h.lng);
    if(x>=0&&x<=W&&y>=0&&y<=H)g+=`<g class="homepin" transform="translate(${x.toFixed(1)},${y.toFixed(1)})" aria-hidden="true"><rect x="-14" y="-14" width="28" height="28" rx="8" fill="var(--sheet)" stroke="var(--ink)" stroke-width="2.2"/><text y="5.5" text-anchor="middle" font-size="15">🏠</text><text y="-21" text-anchor="middle" font-family="var(--hand)" font-weight="700" font-size="16" fill="var(--ink)" stroke="var(--land)" stroke-width="4" paint-order="stroke">${esc(h.n||T("your stay"))}</text></g>`});
  if(near&&nearKind==="me"){const x=X(near.lat,near.lng),y=Y(near.lat,near.lng);
    if(x>=0&&x<=W&&y>=0&&y<=H)g+=`<g class="me" transform="translate(${x.toFixed(1)},${y.toFixed(1)})" aria-hidden="true"><circle class="ping" r="18" fill="var(--shinkansen)" opacity=".18"/><circle r="7.5" fill="var(--shinkansen)" stroke="var(--sheet)" stroke-width="3"/><text y="-15" text-anchor="middle" font-family="var(--hand)" font-weight="700" font-size="16" fill="var(--shinkansen)" stroke="var(--land)" stroke-width="4" paint-order="stroke">${T("you are here")}</text></g>`}
  g+=`</g>`;
  $("mapsvg").innerHTML=g;
  $("mapsvg").querySelectorAll(".pin").forEach(el=>{const act=()=>select(el.dataset.id,true);el.onclick=act;el.onkeydown=e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();act()}}});
  $("mapsvg").querySelectorAll(".clu").forEach(el=>{const act=()=>{zoomTo=fitBox(groups[+el.dataset.g].m.map(it=>it.p),W,H,.006);renderMap()};el.onclick=act;el.onkeydown=e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();act()}}});
  $("unzoom").hidden=!zoomTo;$("unzoom").onclick=()=>{zoomTo=null;renderMap()};
  $("mapTitle").textContent=`${D(c,"n")}${T(", ")}${D(c,"nick")}`;
  $("mapCount").textContent=zoomTo?T("tap a pin for details"):(groups.some(q=>q.m.length>1)?T("tap a ring to zoom in"):NP(vis.length,"spot"));
}
// The list shows ten cards, then a "show more" button adds ten at a time.
// Any change to what's listed (city, area, categories, halal, Near me) starts
// back at ten, and a selected card that's further down always gets shown, so
// a pin, a search hit or a place Apollo names never lands on a hidden card.
const PAGE=10;let listMax=PAGE,listKey="";
function renderList(){
  let pts=P.filter(p=>p.city===city&&visible(p));
  if(near)pts=pts.map(p=>[p,KM(near,p)]).sort((a,b)=>a[1]-b[1]).map(a=>a[0]);
  const key=[city,area,[...active].sort().join(),halalOnly,!!near].join("|");
  if(key!==listKey){listKey=key;listMax=PAGE}
  const at=selected?pts.findIndex(p=>p.id===selected):-1;
  if(at>=listMax)listMax=Math.ceil((at+1)/PAGE)*PAGE;
  const total=pts.length;pts=pts.slice(0,listMax);
  if(!pts.length){$("list").innerHTML=P.some(p=>p.city===city)?`<p class="empty">${T("Nothing here with those filters yet. Try another neighborhood or category ↑")}</p>`:`<p class="empty">${T("{c} places are coming soon. Apollo is still taking notes.",{c:D(CITIES[city],"n")})}</p>`;return}
  $("list").innerHTML=pts.map((p,i)=>{const C=CATS[p.cat],q=encodeURIComponent(`${p.n} ${CITIES[p.city].n} Japan`),r=[-3,2.5,-1.5,3.5,-2.5,1.5][i%6];
    return `<article class="entry${p.id===selected?" on":""}" id="e-${p.id}" data-id="${p.id}" style="--c:var(--${p.cat})">
      <div class="pola" style="--r:${r}deg"><span class="tape${i%2?" pink":""}"></span>${p.photo?`<div class="ph photo"><img src="${p.photo}" alt="${p.n}" loading="lazy"></div>`:`<div class="ph"><img src="${C.img}" alt=""></div>`}<span class="cap">${D(p,"cap")}</span></div>
      <div class="txt">
        <div class="no">${T("No.")} ${p.num}</div>
        <h3>${p.n}<small>${p.jp}</small></h3>
        <p class="meta">${near?`<span class="dist">${distText(KM(near,p))}</span>`:""}<span class="c"><i></i>${D(C,"n")}</span><span>${AREA(p.area)}</span>${p.halal?`<span class="halal${p.hl==="friendly"?" mf":""}">${p.hl==="friendly"?T("Muslim-friendly"):T("✓ halal")}</span>`:""}<span>${D(p,"t")}</span><span>${D(p,"cost")}</span><span>${D(p,"dur")}</span></p>
        <p class="note">${D(p,"tip")}${p.tier==="must"?` <span class="dontskip">${T("don't skip this")}<svg viewBox="0 0 162 10" preserveAspectRatio="none"><path d="${UNDER}" fill="none" stroke="#F14E24" stroke-width="2" stroke-linecap="round"/></svg></span>`:""}</p>
        <a class="go" href="${p.url||"https://www.google.com/maps/search/?api=1&query="+q}" target="_blank" rel="noopener">${T("Open in Google Maps")}</a>${p.book?`<a class="go book" href="${p.book}" target="_blank" rel="noopener">${T("Book on {s} ↗",{s:/getyourguide/.test(p.book)?"GetYourGuide":/klook/.test(p.book)?"Klook":T("the site")})}</a>`:""}${p.also?`<p class="also">${T("also in:")} ${p.also.map(([l,qq])=>`<a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(qq)}" target="_blank" rel="noopener">${l}</a>`).join(" · ")}</p>`:""}
        ${typeof tripBtn==="function"?tripBtn(p):""}
      </div>
    </article>`}).join("");
  const left=total-pts.length;
  if(left>0)$("list").insertAdjacentHTML("beforeend",`<button class="more" id="more" type="button">${T("Show more")}<small>${esc(T("{n} more places",{n:left}))}</small></button>`);
  if($("more"))$("more").onclick=()=>{
    // Keep the reader's place: focus moves to the first new card.
    const first=pts.length;listMax+=PAGE;renderList();
    const el=$("list").querySelectorAll(".entry")[first];if(el){el.setAttribute("tabindex","-1");el.focus({preventScroll:true})}};
  $("list").querySelectorAll(".entry").forEach(el=>el.onclick=e=>{if(e.target.closest("a"))return;select(el.dataset.id,false)});
}
function select(id,fromMap){
  selected=selected===id?null:id;renderMap();renderList();
  if(selected&&fromMap){const el=$("e-"+id);if(el)el.scrollIntoView({behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",block:"center"})}
}
function renderAll(){renderCities();renderAreas();renderFilters();renderMap();renderList()}
function renderApps(){
  $("appgroups").innerHTML=AGROUPS.map(G=>{const list=APPS.filter(a=>a.g===G.k);
    return `<section class="agroup${G.k==="halal"?" halal":""}"><div><span class="kicker">${NP(list.length,"app")}</span><h2>${D(G,"t")}</h2><p class="why">${D(G,"why")}</p></div><div class="apps">${list.map((a,i)=>`<article class="app" style="--c:var(${G.c});--r:${[-4,3,-2,5][i%4]}deg">${a.icon?`<img class="tile ico" src="${a.icon}" alt="" width="52" height="52" loading="lazy">`:`<span class="tile" aria-hidden="true">${a.n.replace(/^(Your |An |Japan Travel by )/,"")[0].toUpperCase()}</span>`}<div><h3>${a.n}<small>${D(a,"tag")}</small></h3><p>${D(a,"what")}</p><p class="tip">${D(a,"tip")}</p>${a.ios||a.android?`<div class="stores">${a.ios?`<a class="store" href="${a.ios}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m0 0-5-5m5 5 5-5M5 20h14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>App Store</a>`:""}${a.android?`<a class="store" href="${a.android}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m0 0-5-5m5 5 5-5M5 20h14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>Google Play</a>`:`<span class="store off">${T("Not on Android")}</span>`}</div>`:""}</div></article>`).join("")}</div></section>`}).join("");
}
function renderTrips(){
  $("tripgroups").innerHTML=TGROUPS.map(G=>{const list=TRIPS.filter(t=>t.h===G.k);
    return `<section class="agroup"><div><span class="kicker">${NP(list.length,"trip")}</span><h2>${D(G,"t")}</h2><p class="why">${D(G,"why")}</p></div><div class="trips">${list.map((t,i)=>`<article class="trip" style="--r:${[-1.2,.9,-.6,1.4][i%4]}deg"><span class="tape"></span><div class="th"><span class="tn">${String(i+1).padStart(2,"0")}</span><h3>${D(t,"n")}<small>${t.jp}</small></h3></div><p class="best">${D(t,"best")}</p><dl class="facts"><div><dt>${T("getting there")}</dt><dd>${D(t,"go")}</dd></div><div><dt>${T("one way")}</dt><dd>${D(t,"time")} · ${D(t,"cost")}</dd></div><div><dt>${T("plan for")}</dt><dd>${D(t,"day")}</dd></div></dl><p class="pass"><b>${T("Pass?")}</b> ${D(t,"ps")}</p><p class="see"><b>${T("Don't miss:")}</b> ${D(t,"see").join(" · ")}</p><p class="hfood"><b>${T("Halal food:")}</b> ${D(t,"halal")}</p><p class="tip">${D(t,"tip")}</p><div class="stores"><a class="store" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(t.q)}" target="_blank" rel="noopener">${T("Open in Google Maps ↗")}</a>${t.book?`<a class="store" href="${t.book}" target="_blank" rel="noopener">${T("Book a tour on GetYourGuide ↗")}</a>`:""}${t.city&&CITIES[t.city]&&P.some(p=>p.city===t.city)?`<button class="store go-city" data-c="${t.city}">${T("See our {c} page →",{c:D(CITIES[t.city],"n")})}</button>`:""}</div></article>`).join("")}</div></section>`}).join("");
  $("tripgroups").querySelectorAll(".go-city").forEach(b=>b.onclick=()=>{city=b.dataset.c;store.set("tabineko-city",city);selected=null;area=null;zoomTo=null;halalOnly=false;renderAll();show("map")});
}
// Initials for a contributor with no photo yet: first letter of the first two
// words, so "Apollo" gives A and "Tabi Neko" gives TN.
const inits=n=>n.trim().split(/\s+/).slice(0,2).map(w=>w[0]).join("").toUpperCase();
// ---- neighbourhood cards ----
// One trading card per famous area. The front rates it; tapping flips it to
// the story and a don't-miss list. The halal count is worked out from the
// notebook itself, so it stays right as places are added.
const HSTAT=[["food","🍜","Food"],["shop","🛍️","Shopping"],["culture","⛩️","Culture"],["night","🌙","Nightlife"],["calm","🍃","Calm"]];
const HCOL={tokyo:"--lantern",kyoto:"--experience",osaka:"--food",nara:"--gem",kobe:"--shinkansen",kamakura:"--coffee"};
let hoodCity=null;
function renderHoods(){
  const cities=[...new Set(HOODS.map(h=>h.city))].filter(k=>CITIES[k]);
  if(!cities.includes(hoodCity))hoodCity=cities.includes(city)?city:cities[0];
  $("hcities").innerHTML=cities.map(k=>`<button type="button" role="tab" class="hcity" data-c="${k}" aria-selected="${k===hoodCity}" style="--c:var(${HCOL[k]||"--lantern"})">${esc(D(CITIES[k],"n"))}<small>${HOODS.filter(h=>h.city===k).length}</small></button>`).join("");
  $("hcities").querySelectorAll(".hcity").forEach(b=>b.onclick=()=>{hoodCity=b.dataset.c;renderHoods()});
  const list=HOODS.filter(h=>h.city===hoodCity);
  $("hgrid").innerHTML=list.map((h,i)=>{
    const here=P.filter(p=>p.city===h.city&&p.area===h.area),halal=here.filter(p=>p.halal).length;
    const miss=h.miss.map(n=>{const p=P.find(q=>q.n===n&&q.city===h.city);return p?`<li><button type="button" class="hgo" data-id="${p.id}">${esc(n)}</button></li>`:`<li>${esc(n)}</li>`}).join("");
    return `<article class="hcard" style="--c:var(${HCOL[h.city]||"--lantern"});--r:${[-1.6,1.2,-.8,1.8][i%4]}deg">
      <div class="hinner">
        <div class="hface hfront">
          <div class="htop"><span class="hno">No. ${String(i+1).padStart(2,"0")}<small>/${String(list.length).padStart(2,"0")}</small></span><h3>${esc(D(h,"n"))}<small>${esc(h.jp)}</small></h3></div>
          <div class="hph"><img src="${esc(h.photo)}" alt="" loading="lazy"${h.pos?` style="object-position:${esc(h.pos)}"`:""}><span class="hvibe">${esc(D(h,"vibe"))}</span></div>
          <ul class="hstats">${HSTAT.map(([k,ic,lb])=>`<li><span class="hl"><i aria-hidden="true">${ic}</i>${T(lb)}</span><span class="hbar" role="img" aria-label="${esc(T("{n} out of 5",{n:h.stats[k]}))}">${[1,2,3,4,5].map(n=>`<b class="${n<=h.stats[k]?"on":""}"></b>`).join("")}</span></li>`).join("")}</ul>
          <p class="hhalal${halal?"":" none"}">${halal===1?esc(T("✓ 1 halal spot in the notebook")):halal?esc(T("✓ {n} halal spots in the notebook",{n:halal})):esc(T("no halal spots in the notebook yet"))}</p>
          <p class="hbest"><b>${T("Best time:")}</b> ${esc(D(h,"best"))}</p>
          <p class="htip">${esc(D(h,"tip"))}</p>
          <button type="button" class="hflip">${T("Flip for the story")} ↻</button>
        </div>
        <div class="hface hback" aria-hidden="true">
          <h3>${esc(D(h,"n"))}<small>${esc(h.jp)}</small></h3>
          <p class="hstory">${esc(D(h,"story"))}</p>
          <p class="hmh">${T("Don't miss:")}</p><ul class="hmiss">${miss}</ul>
          ${here.length?`<button type="button" class="store harea">${esc(T("See the {n} places here →",{n:here.length}))}</button>`:""}
          <button type="button" class="hflip">↻ ${T("Back to the card")}</button>
        </div>
      </div></article>`}).join("");
  $("hgrid").querySelectorAll(".hcard").forEach((card,i)=>{
    const h=list[i],flip=()=>{const on=card.classList.toggle("flipped");
      card.querySelector(".hfront").setAttribute("aria-hidden",on);card.querySelector(".hback").setAttribute("aria-hidden",!on);
      const t=card.querySelector(on?".hback .hflip":".hfront .hflip");if(t)t.focus({preventScroll:true})};
    card.querySelectorAll(".hflip").forEach(b=>b.onclick=e=>{e.stopPropagation();flip()});
    card.onclick=e=>{if(e.target.closest("button,a"))return;flip()};
    const ha=card.querySelector(".harea");
    if(ha)ha.onclick=()=>{city=h.city;store.set("tabineko-city",city);area=h.area;active=new Set(Object.keys(CATS));halalOnly=false;selected=null;zoomTo=null;
      renderAll();show("map");try{history.replaceState(null,"","#map")}catch(_){}};
    card.querySelectorAll(".hgo").forEach(b=>b.onclick=()=>{show("map",true);try{history.replaceState(null,"","#map")}catch(_){}goPlace(b.dataset.id)});
  });
}
function renderCrew(){
  // Three ways to fill the polaroid, in order of preference: a real photo is
  // cropped to fill the square, a cutout sticker sits contained on the tinted
  // card the way a place with no photo falls back to its category sticker,
  // and with neither we print the person's initials.
  $("crewlist").innerHTML=`<section class="agroup"><div><span class="kicker">${T("{n} so far",{n:CREW.length})}</span><h2>${T("The crew")}</h2><p class="why">${T("Everyone who put something into this notebook.")}</p></div><div class="crew">${CREW.map((m,i)=>{const img=m.photo||m.art;return`<article class="member" style="--c:var(${m.c||"--lantern"});--r:${[-2.4,1.8,-1.2,2.6][i%4]}deg"><div class="pola"><span class="tape${i%2?" pink":""}"></span><div class="ph${m.photo?" photo":""}">${img?`<img src="${esc(img)}" alt="${esc(m.n)}" loading="lazy">`:`<span class="initial" aria-hidden="true">${esc(inits(m.n))}</span>`}</div>${m.cap?`<span class="cap">${esc(D(m,"cap"))}</span>`:""}</div><div class="txt"><h3>${esc(D(m,"n"))}${m.jp?`<small>${esc(m.jp)}</small>`:""}${m.role?`<em class="role">${esc(D(m,"role"))}</em>`:""}</h3><p>${esc(D(m,"what"))}</p>${m.tip?`<p class="tip">${esc(D(m,"tip"))}</p>`:""}${m.links&&m.links.length?`<div class="stores">${m.links.map(l=>`<a class="store" href="${esc(l[1])}" target="_blank" rel="noopener noreferrer">${esc(l[0])} ↗</a>`).join("")}</div>`:""}</div></article>`}).join("")}</div></section>`;
}
// The album is one horizontal scroll-snap strip, so a phone swipe turns the
// page natively and the arrows just scroll the strip by one page width. The
// counter reads the page back from scrollLeft rather than tracking its own
// index, so swipes, arrows and the keyboard can never disagree about it.
// In Arabic the strip runs right to left: page one sits at the right edge and
// scrollLeft counts down from 0, hence the abs() and the sign on the way back.
let albumGo=null;
function renderAlbum(){
  const book=$("albumbook"),n=ALBUM.length;
  if(!n){book.innerHTML=`<p class="appnote">${T("No pages yet. Apollo is still sorting the photos.")}</p>`;albumGo=null;return}
  book.innerHTML=`<div class="atrack" id="atrack" tabindex="0">${ALBUM.map((m,i)=>{const ph=m.photos.slice(0,4),c=m.city&&CITIES[m.city],caps=D(m,"caps")||[];
    return `<article class="apage" role="group" aria-roledescription="${esc(T("page"))}" aria-label="${esc(T("Page {i} of {n}",{i:i+1,n}))}"><div class="spread">`+
      `<div class="pics n${ph.length}">${ph.map(([src,cap0],j)=>{const cap=isAR()&&caps[j]||cap0;return `<figure class="pola" style="--r:${[-3,2.4,-1.6,3.2][(i+j)%4]}deg"><span class="tape${j%2?" pink":""}"></span><div class="ph photo"><img src="${esc(src)}" alt="${esc(cap||D(m,"t"))}" loading="lazy"></div>${cap?`<figcaption class="cap">${esc(cap)}</figcaption>`:""}</figure>`}).join("")}</div>`+
      `<div class="words"><span class="kicker">${[D(m,"date"),D(m,"where")].filter(Boolean).map(esc).join(" · ")}</span><h2>${esc(D(m,"t"))}${m.jp?`<small>${esc(m.jp)}</small>`:""}</h2><p class="memo">${esc(D(m,"note"))}</p>`+
      `${c&&P.some(p=>p.city===m.city)?`<button class="store go-city" data-c="${m.city}">${esc(T("See {c} on the map →",{c:D(c,"n")}))}</button>`:""}</div>`+
    `</div></article>`}).join("")}</div>`+
    `<div class="actrl"><button class="aturn" id="aprev" type="button" aria-label="${esc(T("Previous page"))}">${isAR()?"→":"←"}</button><span class="acount" id="acount" aria-live="polite"></span><button class="aturn" id="anext" type="button" aria-label="${esc(T("Next page"))}">${isAR()?"←":"→"}</button></div>`;
  const tr=$("atrack"),prev=$("aprev"),next=$("anext"),cnt=$("acount"),sign=isAR()?-1:1;
  const at=()=>Math.round(Math.abs(tr.scrollLeft)/(tr.clientWidth||1));
  const upd=()=>{const i=at();cnt.textContent=`${i+1} / ${n}`;prev.disabled=i<=0;next.disabled=i>=n-1};
  const go=d=>tr.scrollTo({left:sign*(at()+d)*tr.clientWidth,behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"});
  albumGo=go;
  prev.onclick=()=>go(-1);next.onclick=()=>go(1);
  tr.addEventListener("scroll",upd,{passive:true});upd();
  book.querySelectorAll(".go-city").forEach(b=>b.onclick=()=>{city=b.dataset.c;store.set("tabineko-city",city);selected=null;area=null;zoomTo=null;halalOnly=false;renderAll();show("map");try{history.replaceState(null,"","#map")}catch(_){}});
}
// Arrow keys turn the page from anywhere on the album, not only with the
// strip focused, but never while the user is typing in a box. Registered once
// out here because renderAlbum() reruns on every language switch. The arrow
// that points forward is ← in Arabic, matching the way the pages run.
addEventListener("keydown",e=>{
  if(!albumGo||$("memories").hidden||(e.key!=="ArrowLeft"&&e.key!=="ArrowRight")||e.metaKey||e.ctrlKey||e.altKey)return;
  const t=e.target.tagName;if(t==="INPUT"||t==="TEXTAREA"||e.target.isContentEditable)return;
  e.preventDefault();albumGo((e.key==="ArrowRight")!==isAR()?1:-1)});
// quiet=true swaps the page without moving the viewport, so a search jump can
// scroll to its own card instead of fighting this function for the scroll.
const PAGES=["trip","hoods","apps","trips","memories","crew","privacy","admin"];
function show(target,quiet){
  const pg=PAGES.includes(target)?target:null;
  $("home").hidden=!!pg;PAGES.forEach(k=>$(k).hidden=pg!==k);
  if(typeof syncApollo==="function")syncApollo();
  document.querySelectorAll(".top nav a").forEach(a=>a.classList.toggle("cur",a.dataset.go===(pg||"map")));
  if(quiet)return;
  if(pg){window.scrollTo(0,0);return}
  const el=target&&document.getElementById(target);
  if(el)requestAnimationFrame(()=>el.scrollIntoView({behavior:"smooth",block:"start"}));else window.scrollTo(0,0);
}
// While the page scrolls, hover effects on cards pause (see the CSS), so
// cards don't lift one after another as they slide under the pointer.
(function(){let t;addEventListener("scroll",()=>{document.documentElement.classList.add("scrolling");clearTimeout(t);
  t=setTimeout(()=>document.documentElement.classList.remove("scrolling"),150)},{passive:true})})();
// Phone menu: the three-line button opens the nav; picking a page, tapping
// outside or Escape closes it.
const burger=$("burger"),mainnav=$("mainnav");
const setMenu=o=>{mainnav.classList.toggle("open",o);burger.setAttribute("aria-expanded",o)};
burger.onclick=e=>{e.stopPropagation();setMenu(!mainnav.classList.contains("open"))};
mainnav.addEventListener("click",e=>{if(e.target.closest("a"))setMenu(false)});
document.addEventListener("click",e=>{if(!e.target.closest("#mainnav"))setMenu(false)});
addEventListener("keydown",e=>{if(e.key==="Escape"&&mainnav.classList.contains("open")){setMenu(false);burger.focus()}});
document.querySelectorAll('a[href^="#"]').forEach(a=>{
  const t=a.getAttribute("href").slice(1);a.dataset.go=t;
  a.addEventListener("click",e=>{e.preventDefault();show(t);try{history.replaceState(null,"","#"+t)}catch(_){}});
});

// ---- near me ----
// Your position comes from the browser and never leaves the phone: it is only
// used here to measure straight-line distances to the coordinates each place
// already has. watchPosition keeps them fresh while you walk; the list only
// re-sorts once you've moved 50 m, so it doesn't jitter under your thumb.
let near=null,nearWatch=null,nearNote=null,nearKind=null; // nearKind: "me", or "home" for Near my stay
const KM=(a,b)=>{const R=6371,r=Math.PI/180,dLa=(b.lat-a.lat)*r,dLo=(b.lng-a.lng)*r,
  h=Math.sin(dLa/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(dLo/2)**2;return 2*R*Math.asin(Math.sqrt(h))};
// Walking time assumes 4.8 km/h plus a quarter for streets not being straight
// lines, and is only offered up to 3 km; past that you're taking a train.
function distText(km){
  const d=km<1?T("{n} m",{n:Math.max(10,Math.round(km*100)*10)}):T("{n} km",{n:km<10?km.toFixed(1):Math.round(km)});
  const t=km<=3?d+" · "+T("~{n} min walk",{n:Math.max(1,Math.round(km*1.25/4.8*60))}):d;
  return isAR()?iso(t):t;
}
function setNear(){
  const b=$("nearb");b.setAttribute("aria-pressed",!!near&&nearKind==="me");b.disabled=nearWatch!==null&&!near;
  if(typeof homeBtn==="function")homeBtn();
  b.innerHTML=`<span aria-hidden="true">📍</span> ${nearWatch!==null&&!near?T("finding you…"):T("Near me")}`;
  const m=$("nearmsg");m.hidden=!nearNote;if(nearNote)m.textContent=T(nearNote[0],nearNote[1]);
}
function stopNear(note){
  if(nearWatch!==null)navigator.geolocation.clearWatch(nearWatch);
  const was=!!near;nearWatch=null;near=null;nearKind=null;nearNote=note||null;
  if(was){zoomTo=null;renderMap();renderList()}
  setNear();
}
function startNear(){
  if(!navigator.geolocation){stopNear(["Your browser can't share your location."]);return}
  // Switching over from Near my stay starts from scratch.
  if(nearKind==="home"){near=null;nearKind=null}
  nearNote=null;
  nearWatch=navigator.geolocation.watchPosition(pos=>{
    const me={lat:pos.coords.latitude,lng:pos.coords.longitude};
    if(near&&nearKind==="me"){if(KM(near,me)<.05)return;near=me;renderMap();renderList();return}
    // First fix: from home everything is ~8,000 km off, so rather than sort by
    // silly numbers, say so and switch the feature back off.
    const best=P.reduce((a,p)=>KM(me,p)<KM(me,a)?p:a),far=KM(me,best);
    if(far>50){stopNear(["You're {n} km from the nearest place. Apollo will find what's near you once you're in Japan.",{n:Math.round(far).toLocaleString("en")}]);return}
    near=me;nearKind="me";nearNote=["Nearest first. Your location stays on your phone."];
    if(best.city!==city){city=best.city;store.set("tabineko-city",city);area=null}
    selected=null;
    // Frame you and the closest handful of places, rather than the whole city.
    const close=P.filter(p=>p.city===city&&visible(p)&&!p.nomap).sort((a,b)=>KM(me,a)-KM(me,b)).slice(0,6);
    zoomTo=fitBox([me,...close],600,480,.008);
    renderAll();setNear();
    document.querySelector(".mapwrap").scrollIntoView({behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",block:"start"});
  },err=>stopNear([err.code===1?"Location is blocked for this site. Allow it in your browser settings, then try again.":"Couldn't find you just now. Try again in a moment."]),
  {enableHighAccuracy:true,maximumAge:30000,timeout:20000});
  setNear();
}
$("nearb").onclick=()=>nearWatch!==null?stopNear():startNear();
// Near my stay: the same nearest-first list, measured from where you're
// staying (set in My trip) rather than from your phone, so it works while
// you're still planning at home.
function startHome(h){
  if(nearWatch!==null)navigator.geolocation.clearWatch(nearWatch);
  nearWatch=null;near={lat:h.lat,lng:h.lng};nearKind="home";nearNote=["Nearest to where you're staying first."];
  if(h.city!==city){city=h.city;store.set("tabineko-city",city);area=null}
  selected=null;
  const close=P.filter(p=>p.city===city&&visible(p)&&!p.nomap).sort((a,b)=>KM(near,a)-KM(near,b)).slice(0,6);
  zoomTo=fitBox([near,...close],600,480,.008);
  renderAll();setNear();
  document.querySelector(".mapwrap").scrollIntoView({behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",block:"start"});
}
setNear();

// ---- language switch ----
// Fixed text in index.html is tagged data-i18n="key" (swaps its innerHTML) or
// data-i18n-attr="attr:key,..." (placeholders and labels). The English is read
// off the page the first time round, so index.html stays the English source.
const ORIG=new WeakMap();
function applyStatic(){
  document.querySelectorAll("[data-i18n],[data-i18n-attr]").forEach(el=>{
    if(!ORIG.has(el)){const o={html:el.innerHTML,attr:{}};
      (el.dataset.i18nAttr||"").split(",").filter(Boolean).forEach(pr=>{const a=pr.split(":")[0];o.attr[a]=el.getAttribute(a)});ORIG.set(el,o)}
    const o=ORIG.get(el);
    if(el.dataset.i18n)el.innerHTML=isAR()&&AR.html[el.dataset.i18n]||o.html;
    (el.dataset.i18nAttr||"").split(",").filter(Boolean).forEach(pr=>{const[a,k]=pr.split(":");el.setAttribute(a,isAR()&&AR.html[k]||o.attr[a])});
  });
  document.title=T("Tabi Neko");
  const b=$("langb");b.textContent=isAR()?"English":"عربي";b.lang=isAR()?"en":"ar";
  b.setAttribute("aria-label",isAR()?"Switch to English":"التبديل إلى العربية");
}
// The Arabic lives in two files fetched on first use. async=false keeps them
// running in order, since content.js adds to the AR object ui.js creates.
function loadAR(){
  if(!document.querySelector('link[href="'+AR_FONTS+'"]')){const l=document.createElement("link");l.rel="stylesheet";l.href=AR_FONTS;document.head.appendChild(l)}
  return Promise.all(["data/ar/ui.js","data/ar/content.js"].map(src=>new Promise((ok,no)=>{
    const el=document.createElement("script");el.src=src;el.async=false;el.onload=ok;el.onerror=no;document.head.appendChild(el)})))
    .then(attachAR);
}
function setLang(l){
  if(l==="ar"&&!AR_ON()){loadAR().then(()=>setLang("ar"),()=>{});return}
  lang=l;store.set("tabineko-lang",l);
  const h=document.documentElement;h.lang=l;h.dir=l==="ar"?"rtl":"ltr";
  closeAreas();applyStatic();buildIdx();setNear();
  renderAll();renderApps();renderTrips();renderCrew();renderAlbum();renderHoods();
  if(typeof renderApollo==="function")renderApollo();
  if(typeof renderTrip==="function")renderTrip();
  if(typeof userBtn==="function")userBtn();
}
$("langb").onclick=()=>setLang(isAR()?"en":"ar");
applyStatic();
renderAll();renderApps();renderTrips();renderCrew();renderAlbum();renderHoods();
(function(){const b=$("tomap"),m=document.querySelector(".mapwrap");if(!b||!m)return;
  b.onclick=()=>m.scrollIntoView({behavior:"smooth",block:"start"});
  const upd=()=>{const r=m.getBoundingClientRect();b.classList.toggle("show",!$("home").hidden&&r.bottom<0)};
  addEventListener("scroll",upd,{passive:true});upd();})();

// Search is a jump, not a filter. It looks across every city, because the place
// you half-remember is rarely in the city you happen to have open, and the rest
// of the UI is hard-gated to one city at a time.
// Once the Arabic is loaded the index holds both languages, so an Arabic
// reader typing an English name (or the reverse) still finds the place.
let IDX=[];
function buildIdx(){
  const both=(o,f)=>[o[f],o._ar&&o._ar[f]].filter(Boolean);
  IDX=P.map(p=>({p,name:LOW(p.n),jp:p.jp||"",area:LOW([p.area,AR_ON()&&AR.areas[p.area]].join(" ")),
    cat:LOW(both(CATS[p.cat],"n").join(" ")),cityn:both(CITIES[p.city],"n").map(LOW),
    rest:LOW([...both(p,"tip"),...both(p,"cap"),...both(p,"t")].join(" "))}));
}
buildIdx();

// Ranked so an exact name beats a word buried in a tip. 0 means "no match",
// and every typed word has to match something, so "kyoto coffee" narrows.
function score(e,w){
  if(e.name.startsWith(w))return 100;
  if(e.name.includes(w))return 70;
  if(e.jp.includes(w))return 60;
  if(e.cityn.some(c=>c.startsWith(w)))return 45;
  if(e.area.includes(w))return 40;
  if(e.cat.includes(w))return 30;
  if(e.rest.includes(w))return 10;
  return 0;
}
function searchPlaces(q){
  const terms=LOW(q).trim().split(/\s+/).filter(Boolean);
  if(!terms.length)return[];
  const out=[];
  IDX.forEach(e=>{let sc=0;
    for(const w of terms){const s=score(e,w);if(!s)return;sc+=s}
    if(e.p.city===city)sc+=5;
    out.push({e,sc})});
  return out.sort((a,b)=>b.sc-a.sc||a.e.name.localeCompare(b.e.name)).slice(0,8);
}
// Marks every matched run, so the user can see which word earned the hit.
function hl(s,terms){
  const n=LOW(s),m=new Array(s.length).fill(false);
  terms.forEach(w=>{for(let i=n.indexOf(w);i>-1;i=n.indexOf(w,i+w.length))
    for(let k=i;k<i+w.length;k++)m[k]=true});
  let out="",open=false;
  for(let i=0;i<s.length;i++){
    if(m[i]&&!open){out+="<mark>";open=true}
    if(!m[i]&&open){out+="</mark>";open=false}
    out+=esc(s[i])}
  return out+(open?"</mark>":"");
}
(function(){
  const box=$("q"),res=$("qres"),clr=$("qx");if(!box)return;
  let hits=[],cur=-1;
  const close=()=>{res.hidden=true;res.innerHTML="";box.setAttribute("aria-expanded","false");
    box.removeAttribute("aria-activedescendant");hits=[];cur=-1};
  const mark=()=>{res.querySelectorAll(".qr").forEach((el,i)=>el.setAttribute("aria-selected",i===cur));
    if(cur>-1){const el=res.children[cur];box.setAttribute("aria-activedescendant",el.id);
      el.scrollIntoView({block:"nearest"})}else box.removeAttribute("aria-activedescendant")};
  function draw(){
    const terms=LOW(box.value).trim().split(/\s+/).filter(Boolean);
    clr.hidden=!box.value;
    hits=searchPlaces(box.value);cur=-1;
    if(!box.value.trim()){close();return}
    if(!hits.length){
      res.innerHTML=`<p class="qnone">${T("Apollo hasn't been there yet.")}</p>`;
      res.hidden=false;box.setAttribute("aria-expanded","true");return}
    res.innerHTML=hits.map(({e},i)=>{const p=e.p,C=CATS[p.cat];
      return `<div class="qr" id="qr-${i}" role="option" aria-selected="false" data-i="${i}" style="--c:var(--${p.cat})">
        <i aria-hidden="true"></i>
        <span class="qn">${hl(p.n,terms)}${p.jp&&LOW(p.jp.trim())!==LOW(p.n.trim())?`<small>${esc(p.jp)}</small>`:""}</span>
        <span class="qm">${esc(D(CITIES[p.city],"n"))} · ${esc(AREA(p.area))} · ${esc(D(C,"n"))}${p.halal?` · <b>${T("halal")}</b>`:""}</span>
      </div>`}).join("");
    res.hidden=false;box.setAttribute("aria-expanded","true");
    res.querySelectorAll(".qr").forEach(el=>{
      el.onmouseenter=()=>{cur=+el.dataset.i;mark()};
      el.onclick=()=>pick(hits[+el.dataset.i].e.p)});
  }
  function pick(p){
    box.value="";close();clr.hidden=true;box.blur();
    if(p.city!==city){city=p.city;store.set("tabineko-city",city)}
    // A hit must never land on a card the filters are hiding, so clear every
    // filter that could be hiding it rather than guessing which one is.
    active=new Set(Object.keys(CATS));area=null;halalOnly=false;zoomTo=null;selected=null;
    renderCities();renderAreas();renderFilters();
    select(p.id,true);
  }
  box.oninput=draw;
  box.onfocus=()=>{if(box.value.trim())draw()};
  clr.onclick=()=>{box.value="";close();clr.hidden=true;box.focus()};
  box.onkeydown=e=>{
    if(e.key==="Escape"){box.value="";close();clr.hidden=true;box.blur();return}
    if(!hits.length)return;
    if(e.key==="ArrowDown"){e.preventDefault();cur=(cur+1)%hits.length;mark()}
    else if(e.key==="ArrowUp"){e.preventDefault();cur=(cur-1+hits.length)%hits.length;mark()}
    else if(e.key==="Enter"){e.preventDefault();pick(hits[cur>-1?cur:0].e.p)}
  };
  document.addEventListener("click",e=>{if(!e.target.closest(".search"))close()});
  // Registered here, once, rather than inside renderAreas — that function reruns
  // on every area, city and search pick, and would stack a listener each time.
  document.addEventListener("click",e=>{if(!e.target.closest(".adrop"))closeAreas()});
  // "/" is the web's search shortcut; ignore it while the user is typing elsewhere.
  // The box lives on the home page, so from Day trips or Apps we go back first.
  addEventListener("keydown",e=>{
    if(e.key!=="/"||e.metaKey||e.ctrlKey)return;
    const t=e.target.tagName;if(t==="INPUT"||t==="TEXTAREA"||e.target.isContentEditable)return;
    e.preventDefault();if($("home").hidden)show("map",true);box.focus()});
})();

addEventListener("hashchange",()=>show(location.hash.slice(1)));
if(PAGES.includes(location.hash.slice(1)))show(location.hash.slice(1));else document.querySelector('.top nav a[data-go="map"]').classList.add("cur");
