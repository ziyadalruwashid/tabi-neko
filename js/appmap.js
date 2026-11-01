// The app's real map, on the Map tab: MapLibre over OpenFreeMap tiles
// (OpenStreetMap data, free, no key), in Tabi Neko's paper colours. Pinch to
// zoom, your location, pins that gather into numbered circles, swipeable
// place cards along the bottom and a list you pull up.
//
// Only in the app layout (see js/appshell.js), and only loaded the first
// time the Map tab opens. With no internet, or if the map can't start, the
// tab quietly falls back to the drawn map and list of the website.
(function(){
if(!IS_APP)return;

const STYLE="https://tiles.openfreemap.org/styles/liberty";
const LIB="assets/vendor/maplibre/maplibre-gl";
const INK="#3F2116",PAPER="#F4EEE2";
const COL={food:"#E8A800",coffee:"#9A6233",experience:"#7B5EA7",shrine:"#F14E24",views:"#1D52A0",shop:"#E8607A",nature:"#5E9A3E",streets:"#2E8C88"};
const SVG=d=>`<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const I_SEARCH='<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',I_LOC='<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="7"/>',
  I_LIST='<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',I_X='<path d="M6 6l12 12M18 6 6 18"/>';

let gl=null,ready=false,failed=false,loading=null,sel=null,cat=null,halal=false,me=null,meMark=null,selMark=null,listOpen=false,shownCity=null,steer=false,q="";
// The map sits in its own box that is never redrawn; the search, filters,
// cards and list are a layer on top (ui) that is.
const host=document.createElement("div");host.id="amap";host.hidden=true;document.body.appendChild(host);
host.map=()=>gl; // for tests and debugging
const glBox=document.createElement("div");glBox.id="amap-gl";host.appendChild(glBox);
const ui=document.createElement("div");ui.className="mp-ui";host.appendChild(ui);

// ---- loading ----
function ensure(){
  if(loading)return loading;
  loading=new Promise((ok,no)=>{
    const css=document.createElement("link");css.rel="stylesheet";css.href=LIB+".css";document.head.appendChild(css);
    const s=document.createElement("script");s.src=LIB+".js";s.onload=ok;s.onerror=no;document.head.appendChild(s);
  }).then(start,fail);
  return loading;
}
function start(){
  if(!window.maplibregl)return fail();
  try{
    const b=BOX[city]||BOX.tokyo;shownCity=city;
    gl=new maplibregl.Map({container:glBox,style:STYLE,bounds:[[b.w,b.s],[b.e,b.n]],fitBoundsOptions:{padding:40},
      attributionControl:{compact:true},dragRotate:false,pitchWithRotate:false,maxZoom:18});
    gl.touchZoomRotate.disableRotation();
    gl.on("load",onLoad);
    gl.on("error",()=>{if(!ready)fail()});
    // A slow or blocked connection gets the drawn map instead of a blank one.
    setTimeout(()=>{if(!ready)fail()},12000);
  }catch(e){fail()}
}
function fail(){
  if(ready||failed)return;failed=true;
  try{if(gl)gl.remove()}catch(e){}gl=null;
  document.documentElement.classList.remove("gl-ok","on-map");host.hidden=true;
  if(isMapTab())toast(T("No connection for the full map, so here's the drawn one."));
}

// ---- the map's look and data ----
function restyle(){
  for(const l of gl.getStyle().layers){const id=l.id;
    try{
      if(l.type==="background")gl.setPaintProperty(id,"background-color",PAPER);
      else if(l.type==="fill"&&/water|ocean|river/.test(id))gl.setPaintProperty(id,"fill-color","#BFDCEA");
      else if(l.type==="line"&&/water|river|stream|canal/.test(id))gl.setPaintProperty(id,"line-color","#BFDCEA");
      else if(l.type==="fill"&&/park|grass|wood|forest|landcover|landuse_(park|cemetery)/.test(id))gl.setPaintProperty(id,"fill-color","#D9E8C6");
      else if(l.type==="fill"&&/building/.test(id))gl.setPaintProperty(id,"fill-color","#EADFCC");
      else if(l.type==="fill-extrusion")gl.setLayoutProperty(id,"visibility","none");
      if(l.type==="symbol"&&/^poi/.test(id))gl.setLayoutProperty(id,"visibility","none");
      // Labels in Latin letters, like the place names: station and area names
      // a visitor can match to the signs and to Google Maps.
      else if(l.type==="symbol"&&l.layout&&l.layout["text-field"])
        gl.setLayoutProperty(id,"text-field",["coalesce",["get","name:en"],["get","name_en"],["get","name:latin"],["get","name"]]);
    }catch(e){}
  }
}
const shown=()=>P.filter(p=>(!cat||p.cat===cat)&&(!halal||p.halal));
const geo=()=>({type:"FeatureCollection",features:shown().map(p=>({type:"Feature",geometry:{type:"Point",coordinates:[p.lng,p.lat]},properties:{id:p.id,color:COL[p.cat]||INK}}))});
function onLoad(){
  ready=true;restyle();
  document.documentElement.classList.add("gl-ok");
  gl.addSource("places",{type:"geojson",data:geo(),cluster:true,clusterRadius:46,clusterMaxZoom:15});
  gl.addLayer({id:"clu",type:"circle",source:"places",filter:["has","point_count"],
    paint:{"circle-color":INK,"circle-radius":["step",["get","point_count"],17,10,21,30,25],"circle-stroke-color":"#FFFDF7","circle-stroke-width":3}});
  gl.addLayer({id:"clu-n",type:"symbol",source:"places",filter:["has","point_count"],
    layout:{"text-field":["get","point_count_abbreviated"],"text-font":["Noto Sans Bold"],"text-size":14,"text-allow-overlap":true},paint:{"text-color":"#FFFFFF"}});
  gl.addLayer({id:"pt",type:"circle",source:"places",filter:["!",["has","point_count"]],
    paint:{"circle-color":["get","color"],"circle-radius":["interpolate",["linear"],["zoom"],10,6,15,10],"circle-stroke-color":"#FFFFFF","circle-stroke-width":2.5}});
  gl.on("click","clu",e=>{const f=e.features[0];
    gl.getSource("places").getClusterExpansionZoom(f.properties.cluster_id).then(z=>gl.easeTo({center:f.geometry.coordinates,zoom:z+.3}),()=>{})});
  gl.on("click","pt",e=>pick(e.features[0].properties.id,true));
  for(const l of ["clu","pt"]){gl.on("mouseenter",l,()=>gl.getCanvas().style.cursor="pointer");gl.on("mouseleave",l,()=>gl.getCanvas().style.cursor="")}
  gl.on("moveend",()=>{if(steer){steer=false;return}cards()});
  cards();
}

// ---- the panel around the map ----
function render(){
  const cities=TRIP_CITIES.filter(c=>c!=="ise");
  ui.innerHTML=`<div class="mp-top">
      <div class="mp-search">${SVG(I_SEARCH)}<input type="search" id="mp-q" placeholder="${esc(T("Search the map…"))}" autocomplete="off" enterkeyhint="search" value="${esc(q)}">
        ${q?`<button type="button" class="mp-qx" aria-label="${esc(T("Clear search"))}">${SVG(I_X)}</button>`:""}</div>
      <div class="mp-res" hidden></div>
      <div class="mp-chips">
        <button type="button" class="mp-ch mp-city">${esc(D(CITIES[shownCity||city],"n"))} ▾</button>
        <button type="button" class="mp-ch${!cat&&!halal?" on":""}" data-c="">${T("All")}</button>
        <button type="button" class="mp-ch hal${halal?" on":""}" data-h="1">${T("Halal ✓")}</button>
        ${Object.keys(CATS).map(k=>`<button type="button" class="mp-ch${cat===k?" on":""}" data-c="${k}"><i style="background:${COL[k]}"></i>${esc(D(CATS[k],"n"))}</button>`).join("")}
      </div>
      <div class="mp-cities" hidden>${cities.map(c=>`<button type="button" data-city="${c}">${esc(D(CITIES[c],"n"))}</button>`).join("")}</div>
    </div>
    <div class="mp-fabs"><button type="button" class="mp-fab mp-list" aria-label="${esc(T("List"))}">${SVG(I_LIST)}</button>
      <button type="button" class="mp-fab mp-loc" aria-label="${esc(T("My location"))}">${SVG(I_LOC)}</button></div>
    <div class="mp-peek"><div class="mp-cards"></div></div>
    <div class="mp-sheet" aria-hidden="true"><button type="button" class="mp-grab" aria-label="${esc(T("Close the list"))}"><i></i></button><header><b></b><small></small></header><div class="mp-ul"></div></div>`;
  const $$=s=>host.querySelector(s);
  const box=$$("#mp-q"),res=$$(".mp-res");
  box.oninput=()=>{q=box.value;search(res)};
  box.onfocus=()=>{if(q)search(res)};
  box.onkeydown=e=>{if(e.key==="Enter"){const b=res.querySelector("button");if(b)b.click();box.blur()}};
  if($$(".mp-qx"))$$(".mp-qx").onclick=()=>{q="";render();cards()};
  host.querySelectorAll(".mp-ch[data-c]").forEach(b=>b.onclick=()=>{cat=b.dataset.c||null;if(!b.dataset.c)halal=false;refilter()});
  $$(".mp-ch.hal").onclick=()=>{halal=!halal;refilter()};
  $$(".mp-city").onclick=()=>{const m=$$(".mp-cities");m.hidden=!m.hidden};
  host.querySelectorAll(".mp-cities button").forEach(b=>b.onclick=()=>goCity(b.dataset.city));
  $$(".mp-loc").onclick=locate;
  $$(".mp-list").onclick=()=>openList(!listOpen);
  $$(".mp-grab").onclick=()=>openList(false);
  // Pull the list up or down by its handle.
  let y0=null;const sh=$$(".mp-sheet");
  sh.addEventListener("touchstart",e=>{if(e.target.closest(".mp-grab,header"))y0=e.touches[0].clientY},{passive:true});
  sh.addEventListener("touchend",e=>{if(y0===null)return;const dy=e.changedTouches[0].clientY-y0;y0=null;if(dy>50)openList(false)},{passive:true});
  const pk=$$(".mp-peek");let py=null;
  pk.addEventListener("touchstart",e=>{py=e.touches[0].clientY},{passive:true});
  pk.addEventListener("touchend",e=>{if(py===null)return;const dy=e.changedTouches[0].clientY-py;py=null;if(dy<-50)openList(true)},{passive:true});
  // Swiping the cards walks the map from place to place.
  const cs=$$(".mp-cards");let t;
  cs.addEventListener("scroll",()=>{clearTimeout(t);t=setTimeout(()=>{const c=centred(cs);if(c&&c!==sel)pick(c,false,true)},140)},{passive:true});
  host.addEventListener("click",e=>{if(!e.target.closest(".mp-city,.mp-cities"))$$(".mp-cities").hidden=true;if(!e.target.closest(".mp-search,.mp-res"))res.hidden=true});
}
function search(res){
  const w=LOW(q.trim());if(!w){res.hidden=true;return}
  const hits=P.filter(p=>LOW(p.n).includes(w)||LOW(AREA(p.area)).includes(w)||LOW(p.area).includes(w)).slice(0,8);
  res.hidden=false;
  res.innerHTML=hits.length?hits.map(p=>`<button type="button" data-id="${p.id}"><img src="${p.photo||CATS[p.cat].img}" alt=""><span><b><bdi>${esc(p.n)}</bdi></b><small>${esc(D(CITIES[p.city],"n"))} · ${esc(AREA(p.area))}</small></span></button>`).join("")
    :`<p>${esc(T("Nothing found. Try another word."))}</p>`;
  res.querySelectorAll("button").forEach(b=>b.onclick=()=>{res.hidden=true;host.querySelector("#mp-q").blur();
    const p=P.find(x=>x.id===b.dataset.id);if(p.city!==shownCity){shownCity=p.city;render()}
    if((cat&&p.cat!==cat)||(halal&&!p.halal)){cat=null;halal=false;refilter()}
    pick(p.id,true)});
}
function refilter(){render();if(ready){gl.getSource("places").setData(geo());cards()}}
function goCity(c){shownCity=c;city=c;store.set("tabineko-city",c);render();const b=BOX[c];if(ready&&b)gl.fitBounds([[b.w,b.s],[b.e,b.n]],{padding:40,duration:900})}

// Places in view, nearest the middle first, as cards and as the list.
function inView(){
  if(!ready)return [];
  const bb=gl.getBounds(),c=gl.getCenter(),mid={lat:c.lat,lng:c.lng};
  return shown().filter(p=>bb.contains([p.lng,p.lat])).map(p=>[p,KM(mid,p)]).sort((a,b)=>a[1]-b[1]).map(a=>a[0]);
}
const card=p=>`<button type="button" class="mp-card${p.id===sel?" on":""}" data-id="${p.id}">
  <img src="${p.photo||CATS[p.cat].img}" alt="" loading="lazy"${p.photo?"":` class="art"`}>
  <span><b><bdi>${esc(p.n)}</bdi></b><small>${esc(D(CATS[p.cat],"n"))} · ${esc(AREA(p.area))}</small>
  ${p.halal?`<em>${p.hl==="friendly"?T("Muslim-friendly"):T("halal ✓")}</em>`:D(p,"cost")?`<em class="c">${esc(D(p,"cost"))}</em>`:""}</span></button>`;
function cards(keep){
  const cs=host.querySelector(".mp-cards");if(!cs)return;
  let ps=inView().slice(0,25);
  if(sel){const s=P.find(p=>p.id===sel);if(s&&!ps.includes(s)&&!keep)sel=null;else if(s&&!ps.includes(s))ps=[s,...ps.slice(0,24)]}
  cs.innerHTML=ps.map(card).join("");
  host.querySelector(".mp-peek").classList.toggle("empty",!ps.length);
  cs.querySelectorAll(".mp-card").forEach(b=>b.onclick=()=>openPlace(b.dataset.id));
  if(listOpen)list();
}
function centred(cs){
  const r=cs.getBoundingClientRect(),mid=r.left+r.width/2;let best=null,bd=1e9;
  cs.querySelectorAll(".mp-card").forEach(c=>{const b=c.getBoundingClientRect(),d=Math.abs(b.left+b.width/2-mid);if(d<bd){bd=d;best=c.dataset.id}});
  return best;
}
// Picking a place: its photo stands up on the map, its card comes to the middle.
function pick(id,fromMap,fromCards){
  const p=P.find(x=>x.id===id);if(!p||!ready)return;
  sel=id;
  if(!selMark){const el=document.createElement("button");el.type="button";el.className="mp-sel";el.onclick=()=>openPlace(sel);
    selMark=new maplibregl.Marker({element:el,anchor:"bottom"})}
  selMark.getElement().innerHTML=`<img src="${p.photo||CATS[p.cat].img}" alt="${esc(p.n)}">`;
  selMark.getElement().style.setProperty("--c",COL[p.cat]);
  selMark.setLngLat([p.lng,p.lat]).addTo(gl);
  const cs=host.querySelector(".mp-cards");
  if(!fromCards){
    if(!cs.querySelector(`[data-id="${CSS.escape(id)}"]`))cards(true);
    const c=cs.querySelector(`[data-id="${CSS.escape(id)}"]`);if(c)c.scrollIntoView({inline:"center",block:"nearest",behavior:fromMap?"instant":"smooth"});
  }
  cs.querySelectorAll(".mp-card").forEach(c=>c.classList.toggle("on",c.dataset.id===id));
  steer=true;gl.easeTo({center:[p.lng,p.lat],zoom:Math.max(gl.getZoom(),fromMap?gl.getZoom():14.5),duration:500});
}
function locate(){
  if(!navigator.geolocation)return toast(T("Couldn't find where you are."));
  navigator.geolocation.getCurrentPosition(pos=>{
    me={lat:pos.coords.latitude,lng:pos.coords.longitude};
    if(!meMark){const el=document.createElement("span");el.className="mp-me";meMark=new maplibregl.Marker({element:el})}
    meMark.setLngLat([me.lng,me.lat]).addTo(gl);
    gl.flyTo({center:[me.lng,me.lat],zoom:15,duration:900});
  },()=>toast(T("Couldn't find where you are.")),{enableHighAccuracy:true,timeout:10000,maximumAge:60000});
}
function openList(o){listOpen=o;host.classList.toggle("listing",o);host.querySelector(".mp-sheet").setAttribute("aria-hidden",String(!o));if(o)list()}
function list(){
  const ps=inView().slice(0,60),sh=host.querySelector(".mp-sheet");
  const from=me||(()=>{const c=gl.getCenter();return {lat:c.lat,lng:c.lng}})();
  sh.querySelector("header b").textContent=T("In this part of the map");
  sh.querySelector("header small").textContent=T(ps.length===1?"1 place":"{n} places",{n:ps.length})+(me?" · "+T("nearest to you first"):"");
  sh.querySelector(".mp-ul").innerHTML=ps.map(p=>`<div class="mp-li"><button type="button" class="mp-li-go" data-id="${p.id}">
      <img src="${p.photo||CATS[p.cat].img}" alt="" loading="lazy"${p.photo?"":` class="art"`}><span><b><bdi>${esc(p.n)}</bdi></b>
      <small><i style="background:${COL[p.cat]}"></i>${esc(D(CATS[p.cat],"n"))} · ${esc(distText(KM(from,p)))}</small>${p.halal?`<em>${p.hl==="friendly"?T("Muslim-friendly"):T("halal ✓")}</em>`:""}</span></button>
      <button type="button" class="mp-add${inTrip(PKEY(p))?" on":""}" data-k="${esc(PKEY(p))}" aria-label="${esc(T("＋ Add to my trip"))}">${inTrip(PKEY(p))?"✓":"＋"}</button></div>`).join("")
    ||`<p class="mp-none">${esc(T("No places here with these filters. Zoom out or try another filter."))}</p>`;
  sh.querySelectorAll(".mp-li-go").forEach(b=>b.onclick=()=>openPlace(b.dataset.id));
  sh.querySelectorAll(".mp-add").forEach(b=>b.onclick=()=>{const k=b.dataset.k;
    if(inTrip(k))removeKey(k);else{trip.ideas.push(k);toast(T("Added to your trip ✓"))}
    saveTrip();b.classList.toggle("on",inTrip(k));b.textContent=inTrip(k)?"✓":"＋"});
}

// ---- showing it with the Map tab ----
const isMapTab=()=>!$("home").hidden;
function sync(){
  const on=isMapTab()&&!failed;
  host.hidden=!on;document.documentElement.classList.toggle("on-map",on);
  if(!on)return;
  // Explore's "See all" and categories set the filters before switching here.
  const want=active.size===1?[...active][0]:null;
  if(want!==cat||halalOnly!==halal){cat=want;halal=halalOnly}
  if(shownCity!==city)shownCity=city;render();
  ensure();
  if(ready){gl.resize();gl.getSource("places").setData(geo());const b=BOX[city];
    if(b&&!gl.getBounds().contains([(b.w+b.e)/2,(b.s+b.n)/2]))gl.fitBounds([[b.w,b.s],[b.e,b.n]],{padding:40,duration:0});cards()}
}
const _show=show;show=function(t,q){_show(t,q);sync()};
const _setLang=setLang;setLang=function(l){_setLang(l);if(isMapTab())sync()};
sync();
})();
