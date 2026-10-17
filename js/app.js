// Tabi Neko app logic. Data lives in data/*.js, loaded before this file.

const store={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}}};
let city=store.get("tabineko-city")||"tokyo"; if(!CITIES[city])city="tokyo";
let active=new Set(Object.keys(CATS)),selected=null,area=null,zoomTo=null,halalOnly=false;
const $=id=>document.getElementById(id);
const visible=p=>active.has(p.cat)&&(!area||p.area===area)&&(!halalOnly||p.halal);
const SCRIB="M14 34 C 10 12, 70 4, 120 8 C 170 12, 196 26, 186 46 C 176 64, 90 68, 40 60 C 6 54, 4 30, 30 18 C 44 12, 60 10, 78 9";
const UNDER="M2 6 C 30 2, 60 9, 90 4 S 140 7, 160 3";

// Pin numbers and ids are derived from the order of P, per city.
const cnt={};P.forEach(p=>{cnt[p.city]=(cnt[p.city]||0)+1;p.num=String(cnt[p.city]).padStart(2,"0");p.id=p.city+"-"+p.num});

function renderCities(){
  const ks=Object.keys(CITIES).filter(k=>P.some(p=>p.city===k));let h="";
  if(!ks.includes(city))city=ks[0];
  ks.forEach((k,i)=>{const c=CITIES[k],n=P.filter(p=>p.city===k).length;
    h+=`<button class="cityb" id="city-${k}" data-k="${k}" aria-pressed="${k===city}"><svg viewBox="0 0 200 70" preserveAspectRatio="none" aria-hidden="true"><path d="${SCRIB}"/></svg><b>${c.n}</b><small>${c.jp} · ${n} spots</small></button>`;
  });
  $("cities").innerHTML=h;
  $("cities").querySelectorAll(".cityb").forEach(b=>b.onclick=()=>{if(b.dataset.k===city)return;city=b.dataset.k;store.set("tabineko-city",city);selected=null;area=null;zoomTo=null;halalOnly=false;renderAll()});
}
function renderAreas(){
  const pts=P.filter(p=>p.city===city),names=[...new Set(pts.map(p=>p.area))];
  const c=n=>pts.filter(p=>p.area===n).length;
  $("areas").innerHTML=`<span class="lead">in ${CITIES[city].n}:</span><button class="a" id="a-all" aria-pressed="${!area}">everywhere <small>${pts.length}</small></button>`+
    names.sort((x,y)=>c(y)-c(x)||x.localeCompare(y)).map((n,i)=>`<button class="a" id="a-${i}" data-a="${n}" aria-pressed="${area===n}">${n} <small>${c(n)}</small></button>`).join("");
  $("a-all").onclick=()=>{area=null;selected=null;zoomTo=null;renderAreas();renderMap();renderList()};
  $("areas").querySelectorAll("[data-a]").forEach(b=>b.onclick=()=>{area=area===b.dataset.a?null:b.dataset.a;selected=null;zoomTo=null;renderAreas();renderMap();renderList()});
}
function renderFilters(){
  $("filters").innerHTML=`<span class="lead">show me:</span>`+Object.entries(CATS).map(([k,c])=>`<button class="f" id="f-${k}" data-k="${k}" aria-pressed="${active.has(k)}" style="--c:var(--${k})"><i></i>${c.n}</button>`).join("")+(P.some(p=>p.city===city&&p.halal)?`<button class="f halalf" id="f-halal" aria-pressed="${halalOnly}" style="--c:#4F7A1E"><i></i>Halal only</button>`:"");
  const hb=$("f-halal");if(hb)hb.onclick=()=>{halalOnly=!halalOnly;zoomTo=null;selected=null;renderFilters();renderMap();renderList()};
  $("filters").querySelectorAll(".f[data-k]").forEach(b=>b.onclick=()=>{const k=b.dataset.k,all=Object.keys(CATS);
    if(active.has(k)&&active.size===all.length)active=new Set([k]);
    else if(active.has(k)){active.delete(k);if(!active.size)active=new Set(all)}
    else active.add(k);zoomTo=null;renderFilters();renderMap();renderList()});
}
// trim ignores that fraction of places at each edge, so a handful of far-out
// spots (Disney, USJ) stop shrinking the centre where almost everything is.
// Those places are then drawn as tabs on the border rather than dropped.
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
function renderMap(){
  const pts=P.filter(p=>p.city===city),W=600,H=480,G=GEO[city],c=CITIES[city];
  const vis=pts.filter(p=>visible(p)&&!p.nomap);
  if(zoomTo&&selected){const sp=pts.find(p=>p.id===selected);if(sp&&(sp.lat>zoomTo.n||sp.lat<zoomTo.s||sp.lng<zoomTo.w||sp.lng>zoomTo.e))zoomTo=null}
  const B=zoomTo||fitBox(vis.length?vis:pts,W,H,.03,.03);
  const E=EXTRA[city]||{streets:[],stations:[],marks:[],labels:[]};
  const k=Math.cos(((B.n+B.s)/2)*Math.PI/180),s=Math.min(W/((B.e-B.w)*k),H/(B.n-B.s));
  const ox=(W-(B.e-B.w)*k*s)/2,oy=(H-(B.n-B.s)*s)/2;
  const X=(a,b)=>ox+(b-B.w)*k*s,Y=(a,b)=>oy+(B.n-a)*s;
  const pl=a=>a.map(q=>X(q[0],q[1]).toFixed(1)+","+Y(q[0],q[1]).toFixed(1)).join(" ");
  const span=B.n-B.s,wide=span>.05,tight=span<.012;
  // Measured up here so the pin pass below can keep clear of the scale bar.
  const kmPx=s/111,km=kmPx>70?1:(kmPx>28?2:5),bar=km*kmPx;

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
  G.areas.forEach(([t,a,b])=>pool.push({t,x:X(a,b),y:Y(a,b),gate:false}));
  E.labels.forEach(([t,a,b])=>pool.push({t,x:X(a,b),y:Y(a,b),gate:true}));
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
  E.streets.forEach(([nm,pt])=>{g+=`<polyline points="${pl(pt)}" fill="none" stroke="#E2D2BC" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`;
    const a=pt[0],b=pt[pt.length-1],x1=X(a[0],a[1]),y1=Y(a[0],a[1]),x2=X(b[0],b[1]),y2=Y(b[0],b[1]);
    if(Math.hypot(x2-x1,y2-y1)<60)return;
    let ang=Math.atan2(y2-y1,x2-x1)*180/Math.PI;if(ang>90)ang-=180;if(ang<-90)ang+=180;
    const at=[.72,.5,.28,.86,.14].map(f=>[x1+(x2-x1)*f,y1+(y2-y1)*f])
      .find(([mx,my])=>mx>8&&mx<W-8&&my>8&&my<H-8&&freeAt(mx,my,13)&&rfree(mx,my,nm.length*7.4,15,ang,-5));
    if(!at)return;
    rtake(at[0],at[1],nm.length*7.4,15,ang,-5);
    lab+=`<text class="stn" transform="translate(${at[0].toFixed(1)},${at[1].toFixed(1)}) rotate(${ang.toFixed(1)})" text-anchor="middle" dy="-5" stroke="var(--land)" stroke-width="3" paint-order="stroke">${nm}</text>`});

  E.stations.forEach(([nm,a,b])=>{const x=X(a,b),y=Y(a,b);if(x<-20||x>W+20||y<-20||y>H+20)return;
    g+=`<rect x="${(x-5).toFixed(1)}" y="${(y-5).toFixed(1)}" width="10" height="10" rx="2.5" fill="var(--sheet)" stroke="var(--ink)" stroke-width="2"/>`;
    const p2=place(x,y,nm.length*7.4,15,SIDES);
    if(p2)lab+=`<text class="st" x="${p2.x.toFixed(1)}" y="${p2.y.toFixed(1)}" text-anchor="${p2.a}" stroke="var(--land)" stroke-width="4" paint-order="stroke">${nm}</text>`});

  const ICON={tower:'<path d="M0 -20 L5 6 L-5 6 Z M-3 -4 H3 M-4 1 H4" fill="var(--sheet)" stroke="var(--ink)" stroke-width="1.8" stroke-linejoin="round"/>',
    castle:'<path d="M-10 6 V-1 H10 V6 Z M-12 -1 L0 -8 L12 -1 Z M-7 -8 L0 -14 L7 -8 Z" fill="var(--sheet)" stroke="var(--ink)" stroke-width="1.6" stroke-linejoin="round"/>',
    temple:'<path d="M-11 -9 Q0 -12 11 -9 M-9 -5 H9 M-6 -9 V6 M6 -9 V6" fill="none" stroke="var(--lantern)" stroke-width="2.6" stroke-linecap="round"/>'};
  E.marks.forEach(([nm,a,b,t])=>{const x=X(a,b),y=Y(a,b);if(x<-20||x>W+20||y<-20||y>H+20)return;
    g+=`<g transform="translate(${x.toFixed(1)},${y.toFixed(1)})">${ICON[t]}</g>`;
    const p2=place(x,y,nm.length*7.4,15,[[0,22,"middle"],[0,32,"middle"],...SIDES]);
    if(p2)lab+=`<text class="lm" x="${p2.x.toFixed(1)}" y="${p2.y.toFixed(1)}" text-anchor="${p2.a}" stroke="var(--land)" stroke-width="4" paint-order="stroke">${nm}</text>`});

  if(G.loop&&wide){const L=G.loop,x=X(L.at[0],L.at[1]),y=Y(L.at[0],L.at[1]);
    if(freeAt(x,y,15))lab+=`<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" font-family="var(--hand)" font-size="16" fill="${L.c}" stroke="var(--land)" stroke-width="4" paint-order="stroke">${L.name}</text>`}
  // Water names slide along their own axis before giving up: the anchor in the data
  // is a nice spot in the bay, not the only one, and dropping the whole name because
  // one pin landed on it loses more than moving it does.
  G.wl.forEach(([t,a,b,rot])=>{const x0=X(a,b),y0=Y(a,b),w=t.length*8.5;
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
      lab+=`<image href="assets/${S.img}.png" x="${(x-S.w/2).toFixed(1)}" y="${(y-S.w*.8).toFixed(1)}" width="${S.w}" height="${S.w}" preserveAspectRatio="xMidYMid meet" transform="rotate(-6 ${x.toFixed(1)} ${y.toFixed(1)})"/><text x="${x.toFixed(1)}" y="${(y+S.w*.34).toFixed(1)}" text-anchor="middle" font-family="var(--hand)" font-size="16" fill="var(--ink)" stroke="var(--land)" stroke-width="4" paint-order="stroke">${S.note}</text>`}
  g+=lab;

  g+=`<g transform="translate(22,${H-20})"><rect x="0" y="-4" width="${(bar/2).toFixed(1)}" height="8" fill="var(--ink)" stroke="var(--ink)" stroke-width="1"/><rect x="${(bar/2).toFixed(1)}" y="-4" width="${(bar/2).toFixed(1)}" height="8" fill="var(--sheet)" stroke="var(--ink)" stroke-width="1"/><text x="${(bar+8).toFixed(1)}" y="5" font-family="var(--hand)" font-size="16" fill="var(--ink)">${km} km</text></g>`;
  g+=`<g transform="translate(${W-36},42)"><circle r="18" fill="var(--sheet)" opacity=".8"/><circle r="18" fill="none" stroke="var(--rule)" stroke-width="1.3"/><path d="M-13 0H13M0 -13V13" stroke="var(--rule)" stroke-width="1"/><path d="M0 -15L5 0L-5 0Z" fill="var(--lantern)"/><path d="M0 15L5 0L-5 0Z" fill="var(--ink)" opacity=".18"/><path d="M0 -15L5 0L0 15L-5 0Z" fill="none" stroke="var(--ink)" stroke-width="1.4" stroke-linejoin="round"/><text y="-20" text-anchor="middle" font-family="var(--hand)" font-weight="700" font-size="15" fill="var(--ink)">N</text></g>`;

  // Arrowhead at distance d along angle a, drawn upright then swung into place.
  const chev=(x,y,a,d)=>`<path d="M${(d-7).toFixed(1)} -6L${d} 0L${(d-7).toFixed(1)} 6" fill="none" stroke="var(--ink)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" opacity=".5" transform="rotate(${(a*180/Math.PI).toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}) translate(${x.toFixed(1)} ${y.toFixed(1)})"/>`;
  const pin=(p,x,y,ang)=>{const on=p.id===selected;let fl="";
    if(on){const{lw,lx,up,ly}=flag(p,x,y);
      fl=`<g transform="rotate(${up?-1.6:1.6} ${lx.toFixed(1)} ${(ly+12).toFixed(1)})"><path d="M${x.toFixed(1)} ${(up?y-18:y+18).toFixed(1)}V${(up?ly+24:ly).toFixed(1)}" stroke="var(--ink)" stroke-width="1.6"/>`
        +`<rect x="${(lx-lw/2).toFixed(1)}" y="${ly.toFixed(1)}" width="${lw.toFixed(1)}" height="25" rx="3" fill="var(--sheet)" stroke="var(--ink)" stroke-width="1.7"/>`
        +`<rect x="${(lx-lw/2).toFixed(1)}" y="${(ly+21).toFixed(1)}" width="${lw.toFixed(1)}" height="4" fill="var(--${p.cat})"/>`
        +`<text x="${lx.toFixed(1)}" y="${(ly+17).toFixed(1)}" text-anchor="middle" font-family="var(--hand)" font-weight="700" font-size="19" fill="var(--ink)">${p.n}</text></g>`}
    return `<g class="pin${on?" on":""}" data-id="${p.id}" tabindex="0" role="button" aria-label="${p.n}${ang===undefined?"":", further out past the edge"}">${ang===undefined?"":chev(x,y,ang,p.tier==="must"?24:19)}<ellipse cx="${x.toFixed(1)}" cy="${(y+14).toFixed(1)}" rx="7.5" ry="2.6" fill="var(--ink)" opacity=".16"/><g class="b">
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
    g+=`<g class="clu" data-g="${gi}" tabindex="0" role="button" aria-label="${n} places ${gr.off?"further out past the edge":"here"}, zoom in">${gr.off?chev(gr.x,gr.y,oang(gr),r+(must?14:7)):""}<ellipse cx="${gr.x.toFixed(1)}" cy="${(gr.y+r+1).toFixed(1)}" rx="${(r*.62).toFixed(1)}" ry="3" fill="var(--ink)" opacity=".16"/><g class="b">
      ${must?`<circle cx="${gr.x.toFixed(1)}" cy="${gr.y.toFixed(1)}" r="${(r+8).toFixed(1)}" fill="none" stroke="var(--lantern)" stroke-width="1.8" stroke-dasharray="3 3.5"/>`:""}
      <circle cx="${gr.x.toFixed(1)}" cy="${gr.y.toFixed(1)}" r="${r.toFixed(1)}" fill="var(--sheet)" stroke="var(--land)" stroke-width="3"/>
      ${ring}
      <text x="${gr.x.toFixed(1)}" y="${(gr.y+5).toFixed(1)}" text-anchor="middle" font-family="var(--body)" font-weight="700" font-size="14" fill="var(--ink)">${n}</text>
    </g>${gr.tag?`<text class="ml" x="${gr.tagX.toFixed(1)}" y="${gr.tagY.toFixed(1)}" text-anchor="middle" stroke="var(--land)" stroke-width="4" paint-order="stroke">${gr.tag}</text>`:""}</g>`;
  });
  g+=top;
  g+=`</g>`;
  $("mapsvg").innerHTML=g;
  $("mapsvg").querySelectorAll(".pin").forEach(el=>{const act=()=>select(el.dataset.id,true);el.onclick=act;el.onkeydown=e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();act()}}});
  $("mapsvg").querySelectorAll(".clu").forEach(el=>{const act=()=>{zoomTo=fitBox(groups[+el.dataset.g].m.map(it=>it.p),W,H,.006);renderMap()};el.onclick=act;el.onkeydown=e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();act()}}});
  $("unzoom").hidden=!zoomTo;$("unzoom").onclick=()=>{zoomTo=null;renderMap()};
  $("mapTitle").textContent=`${c.n}, ${c.nick}`;
  $("mapCount").textContent=zoomTo?"tap a pin for details":(groups.some(q=>q.m.length>1)?"tap a ring to zoom in":`${vis.length} spot${vis.length===1?"":"s"}`);
}
function renderList(){
  const pts=P.filter(p=>p.city===city&&visible(p));
  if(!pts.length){$("list").innerHTML=P.some(p=>p.city===city)?`<p class="empty">Nothing here with those filters yet. Try another neighborhood or category ↑</p>`:`<p class="empty">${CITIES[city].n} places are coming soon. Apollo is still taking notes.</p>`;return}
  $("list").innerHTML=pts.map((p,i)=>{const C=CATS[p.cat],q=encodeURIComponent(`${p.n} ${CITIES[p.city].n} Japan`),r=[-3,2.5,-1.5,3.5,-2.5,1.5][i%6];
    return `<article class="entry${p.id===selected?" on":""}" id="e-${p.id}" data-id="${p.id}" style="--c:var(--${p.cat})">
      <div class="pola" style="--r:${r}deg"><span class="tape${i%2?" pink":""}"></span>${p.photo?`<div class="ph photo"><img src="${p.photo}" alt="${p.n}" loading="lazy"></div>`:`<div class="ph"><img src="${C.img}" alt=""></div>`}<span class="cap">${p.cap}</span></div>
      <div class="txt">
        <div class="no">No. ${p.num}</div>
        <h3>${p.n}<small>${p.jp}</small></h3>
        <p class="meta"><span class="c"><i></i>${C.n}</span><span>${p.area}</span>${p.halal?`<span class="halal${p.hl==="friendly"?" mf":""}">${p.hl==="friendly"?"Muslim-friendly":"✓ halal"}</span>`:""}<span>${p.t}</span><span>${p.cost}</span><span>${p.dur}</span></p>
        <p class="note">${p.tip}${p.tier==="must"?` <span class="dontskip">don't skip this<svg viewBox="0 0 162 10" preserveAspectRatio="none"><path d="${UNDER}" fill="none" stroke="#F14E24" stroke-width="2" stroke-linecap="round"/></svg></span>`:""}</p>
        <a class="go" href="${p.url||"https://www.google.com/maps/search/?api=1&query="+q}" target="_blank" rel="noopener">Open in Google Maps</a>${p.book?`<a class="go book" href="${p.book}" target="_blank" rel="noopener">Book on ${/getyourguide/.test(p.book)?"GetYourGuide":/klook/.test(p.book)?"Klook":"the site"} ↗</a>`:""}${p.also?`<p class="also">also in: ${p.also.map(([l,qq])=>`<a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(qq)}" target="_blank" rel="noopener">${l}</a>`).join(" · ")}</p>`:""}
      </div>
    </article>`}).join("");
  $("list").querySelectorAll(".entry").forEach(el=>el.onclick=e=>{if(e.target.closest("a"))return;select(el.dataset.id,false)});
}
function select(id,fromMap){
  selected=selected===id?null:id;renderMap();renderList();
  if(selected&&fromMap){const el=$("e-"+id);if(el)el.scrollIntoView({behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",block:"center"})}
}
function renderAll(){renderCities();renderAreas();renderFilters();renderMap();renderList()}
function renderApps(){
  $("appgroups").innerHTML=AGROUPS.map(G=>{const list=APPS.filter(a=>a.g===G.k);
    return `<section class="agroup${G.k==="halal"?" halal":""}"><div><span class="kicker">${list.length} app${list.length>1?"s":""}</span><h2>${G.t}</h2><p class="why">${G.why}</p></div><div class="apps">${list.map((a,i)=>`<article class="app" style="--c:var(${G.c});--r:${[-4,3,-2,5][i%4]}deg">${a.icon?`<img class="tile ico" src="${a.icon}" alt="" width="52" height="52" loading="lazy">`:`<span class="tile" aria-hidden="true">${a.n.replace(/^(Your |An |Japan Travel by )/,"")[0].toUpperCase()}</span>`}<div><h3>${a.n}<small>${a.tag}</small></h3><p>${a.what}</p><p class="tip">${a.tip}</p>${a.ios||a.android?`<div class="stores">${a.ios?`<a class="store" href="${a.ios}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m0 0-5-5m5 5 5-5M5 20h14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>App Store</a>`:""}${a.android?`<a class="store" href="${a.android}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m0 0-5-5m5 5 5-5M5 20h14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>Google Play</a>`:`<span class="store off">Not on Android</span>`}</div>`:""}</div></article>`).join("")}</div></section>`}).join("");
}
function renderTrips(){
  $("tripgroups").innerHTML=TGROUPS.map(G=>{const list=TRIPS.filter(t=>t.h===G.k);
    return `<section class="agroup"><div><span class="kicker">${list.length} trips</span><h2>${G.t}</h2><p class="why">${G.why}</p></div><div class="trips">${list.map((t,i)=>`<article class="trip" style="--r:${[-1.2,.9,-.6,1.4][i%4]}deg"><span class="tape"></span><div class="th"><span class="tn">${String(i+1).padStart(2,"0")}</span><h3>${t.n}<small>${t.jp}</small></h3></div><p class="best">${t.best}</p><dl class="facts"><div><dt>getting there</dt><dd>${t.go}</dd></div><div><dt>one way</dt><dd>${t.time} · ${t.cost}</dd></div><div><dt>plan for</dt><dd>${t.day}</dd></div></dl><p class="pass"><b>Pass?</b> ${t.ps}</p><p class="see"><b>Don't miss:</b> ${t.see.join(" · ")}</p><p class="hfood"><b>Halal food:</b> ${t.halal}</p><p class="tip">${t.tip}</p><div class="stores"><a class="store" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(t.q)}" target="_blank" rel="noopener">Open in Google Maps ↗</a>${t.book?`<a class="store" href="${t.book}" target="_blank" rel="noopener">Book a tour on GetYourGuide ↗</a>`:""}${t.city&&CITIES[t.city]&&P.some(p=>p.city===t.city)?`<button class="store go-city" data-c="${t.city}">See our ${CITIES[t.city].n} page →</button>`:""}</div></article>`).join("")}</div></section>`}).join("");
  $("tripgroups").querySelectorAll(".go-city").forEach(b=>b.onclick=()=>{city=b.dataset.c;store.set("tabineko-city",city);selected=null;area=null;zoomTo=null;halalOnly=false;renderAll();show("map")});
}
function show(target){
  const pg=["apps","trips"].includes(target)?target:null;
  $("home").hidden=!!pg;$("apps").hidden=pg!=="apps";$("trips").hidden=pg!=="trips";
  document.querySelectorAll(".top nav a").forEach(a=>a.classList.toggle("cur",a.dataset.go===(pg||"map")));
  if(pg){window.scrollTo(0,0);return}
  const el=target&&document.getElementById(target);
  if(el)requestAnimationFrame(()=>el.scrollIntoView({behavior:"smooth",block:"start"}));else window.scrollTo(0,0);
}
document.querySelectorAll('a[href^="#"]').forEach(a=>{
  const t=a.getAttribute("href").slice(1);a.dataset.go=t;
  a.addEventListener("click",e=>{e.preventDefault();show(t);try{history.replaceState(null,"","#"+t)}catch(_){}});
});

renderAll();renderApps();renderTrips();
(function(){const b=$("tomap"),m=document.querySelector(".mapwrap");if(!b||!m)return;
  b.onclick=()=>m.scrollIntoView({behavior:"smooth",block:"start"});
  const upd=()=>{const r=m.getBoundingClientRect();b.classList.toggle("show",!$("home").hidden&&r.bottom<0)};
  addEventListener("scroll",upd,{passive:true});upd();})();

addEventListener("hashchange",()=>show(location.hash.slice(1)));
if(location.hash==="#apps"||location.hash==="#trips")show(location.hash.slice(1));else document.querySelector('.top nav a[data-go="map"]').classList.add("cur");
