// Share a day of the trip as a picture: a 1080x1350 notebook page with the
// day's stops, made on a canvas in the browser. On a phone it goes to the
// share sheet (WhatsApp, Snapchat...); where sharing files isn't supported it
// downloads instead. Arabic draws right to left with the Arabic faces.
const SH={W:1080,H:1350,pad:72};
const shImg=src=>new Promise(ok=>{const i=new Image();i.onload=()=>ok(i);i.onerror=()=>ok(null);i.src=src});

async function shareDay(ref){
  const[a,b]=ref.split(".").map(Number),s=trip.stays[a];if(!s)return;
  const num=trip.stays.slice(0,a).reduce((n,x)=>n+x.days.length,0)+b+1,day=s.days[b];
  const ps=day.ids.map(k=>BYKEY.get(k)).filter(Boolean);if(!ps.length)return;
  toast(T("Making your picture…"));
  try{
    const blob=await dayPicture(ps,s,num,day.t);
    const name=`tabi-neko-day-${num}.png`,file=new File([blob],name,{type:"image/png"});
    if(navigator.canShare&&navigator.canShare({files:[file]})){
      try{await navigator.share({files:[file],title:T("Day {n}",{n:num}),text:T("My day in {c}, planned with Tabi Neko",{c:D(CITIES[s.city],"n")})})}
      catch(e){if(e&&e.name!=="AbortError")throw e}
    }else{
      const u=URL.createObjectURL(blob),l=document.createElement("a");l.href=u;l.download=name;document.body.appendChild(l);l.click();l.remove();
      setTimeout(()=>URL.revokeObjectURL(u),4000);toast(T("Picture saved ✓"));
    }
  }catch(e){toast(T("Couldn't make the picture. Try again?"))}
}

async function dayPicture(ps,stay,num,title){
  const{W,H,pad}=SH,ar=isAR(),c=document.createElement("canvas");c.width=W;c.height=H;
  const x=c.getContext("2d");x.direction=ar?"rtl":"ltr";
  const X=v=>ar?W-v:v,L=ar?"right":"left",R=ar?"left":"right";
  const F={disp:'"Bagel Fat One","Baloo Display",sans-serif',body:'"Nunito","Baloo Bhaijaan 2",sans-serif',hand:'"Patrick Hand","Marhey",cursive'};
  await Promise.all([`400 80px ${F.disp}`,`800 40px ${F.body}`,`400 40px ${F.body}`,`400 40px ${F.hand}`].map(f=>document.fonts.load(f,ar?"ابجد":"Abc").catch(()=>{})));
  const imgs=await Promise.all([shImg("assets/cat.png"),shImg("assets/logo.png"),...ps.map(p=>shImg(p.photo||CATS[p.cat].img))]);
  const[cat,logo]=imgs,pics=imgs.slice(2);
  const css=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim()||"#888";
  const col=p=>{const v=css("--"+p.cat);return v.startsWith("var(")?css(v.slice(4,-1)):v};

  // paper, ruled lines, tape
  x.fillStyle="#FAF4E8";x.fillRect(0,0,W,H);
  x.fillStyle="#FFFDF7";rrect(x,36,36,W-72,H-72,28);x.fill();
  x.save();x.translate(W/2,40);x.rotate(-.04);x.fillStyle="rgba(255,209,59,.6)";x.fillRect(-90,-18,180,40);x.restore();

  // header: Apollo, day, title, city, stats
  if(cat){const h=230,w=cat.width*h/cat.height;x.save();x.translate(ar?pad+w/2:W-pad-w/2,pad+h/2+6);if(ar)x.scale(-1,1);x.rotate(ar?-.05:.05);x.drawImage(cat,-w/2,-h/2,w,h);x.restore()}
  x.textAlign=L;x.textBaseline="alphabetic";
  x.fillStyle="#1D52A0";x.font=`400 34px ${F.hand}`;x.fillText(T("a day in {c}",{c:D(CITIES[stay.city],"n")}),X(pad),pad+40);
  x.fillStyle="#F14E24";x.font=`400 104px ${F.disp}`;x.fillText(T("Day {n}",{n:num}),X(pad),pad+150);
  if(title){x.fillStyle="#3F2116";x.font=`400 44px ${F.hand}`;x.fillText(fit(x,title,W-pad*2-260),X(pad),pad+204)}
  let km=0;for(let i=1;i<ps.length;i++)km+=KM(ps[i-1],ps[i]);
  if(stay.home&&ps.length)km+=KM(stay.home,ps[0])+KM(ps[ps.length-1],stay.home);
  const halal=ps.filter(p=>p.halal).length;
  const stats=[T(ps.length===1?"1 stop":"{n} stops",{n:ps.length}),km?T("~{n} km",{n:km.toFixed(1)}):"",halal?T("{n} halal",{n:halal}):""].filter(Boolean).join("  ·  ");
  x.fillStyle="#8C6F60";x.font=`700 30px ${F.body}`;x.fillText(stats,X(pad),pad+(title?250:204));

  // stops: up to 8 rows, the rest summarised
  const top=pad+(title?300:254),bottom=H-150,max=8,shown=ps.slice(0,ps.length>max?max-1:max);
  const rowH=Math.min(ps.length<=3?190:124,(bottom-top)/Math.max(shown.length+(ps.length>max?1:0),1)),ph=rowH-22,big=rowH>150;
  // ruled notebook lines, only in the space the stops leave empty
  const used=top+(shown.length+(ps.length>max?1:0))*rowH+20;
  x.strokeStyle="#EFE3D2";x.lineWidth=2;for(let y=used+40;y<H-150;y+=56){x.beginPath();x.moveTo(70,y);x.lineTo(W-70,y);x.stroke()}
  shown.forEach((p,i)=>{
    const y=top+i*rowH,cy=y+rowH/2,cl=col(p);
    if(i<shown.length-1){x.strokeStyle="#C9B8A6";x.setLineDash([6,8]);x.lineWidth=3;x.beginPath();x.moveTo(X(pad+26),cy+26);x.lineTo(X(pad+26),cy+rowH-26);x.stroke();x.setLineDash([])}
    x.fillStyle=cl;x.beginPath();x.arc(X(pad+26),cy,26,0,7);x.fill();
    x.fillStyle="#fff";x.font=`800 26px ${F.body}`;x.textAlign="center";x.fillText(String(i+1),X(pad+26),cy+9);
    const px=ar?W-pad-70-ph:pad+70;
    x.save();x.translate(px+ph/2,cy);x.rotate((i%2?1:-1)*.03);
    x.fillStyle="#fff";x.shadowColor="rgba(63,33,22,.18)";x.shadowBlur=10;x.shadowOffsetY=3;x.fillRect(-ph/2-6,-ph/2-6,ph+12,ph+12);x.shadowColor="transparent";
    const im=pics[ps.indexOf(p)];
    if(im){const s=Math.min(im.width,im.height),cover=!!p.photo;
      if(cover)x.drawImage(im,(im.width-s)/2,(im.height-s)/2,s,s,-ph/2,-ph/2,ph,ph);
      else{x.fillStyle=cl+"33";x.fillRect(-ph/2,-ph/2,ph,ph);const r=Math.min(ph*.85/im.width,ph*.85/im.height);x.drawImage(im,-im.width*r/2,-im.height*r/2,im.width*r,im.height*r)}}
    x.restore();
    const tx=ar?px-28:px+ph+28,tw=W-pad-(ar?W-px+28:px+ph+28)-10;
    x.textAlign=L;x.fillStyle="#3F2116";x.font=`800 ${big?50:rowH>100?40:34}px ${F.body}`;x.fillText(fit(x,p.n,tw),tx,cy-4);
    const meta=[D(CATS[p.cat],"n"),AREA(p.area)].join(" · ");
    x.fillStyle="#8C6F60";x.font=`400 ${big?32:rowH>100?28:24}px ${F.body}`;x.fillText(fit(x,meta,tw-(p.halal?150:0)),tx,cy+(big?44:34));
    if(p.halal){const w=x.measureText(fit(x,meta,tw-150)).width;x.fillStyle="#4F7A1E";x.font=`800 ${big?32:rowH>100?28:24}px ${F.body}`;
      x.fillText(p.hl==="friendly"?"  "+T("Muslim-friendly"):"  "+T("✓ halal"),ar?tx-w:tx+w,cy+(big?44:34))}
  });
  if(ps.length>max){const y=top+shown.length*rowH+rowH/2+10;x.textAlign=L;x.fillStyle="#8C6F60";x.font=`400 38px ${F.hand}`;
    x.fillText(T("+ {n} more stops",{n:ps.length-shown.length}),X(pad+70),y)}

  // footer
  x.strokeStyle="#E7D9C6";x.lineWidth=2;x.setLineDash([8,8]);x.beginPath();x.moveTo(70,H-128);x.lineTo(W-70,H-128);x.stroke();x.setLineDash([]);
  if(logo){const h=78,w=logo.width*h/logo.height;x.drawImage(logo,ar?W-pad-w:pad,H-112,w,h)}
  x.textAlign=R;x.fillStyle="#3F2116";x.font=`400 34px ${F.hand}`;x.fillText(T("planned with Tabi Neko"),X(W-pad),H-82);
  x.fillStyle="#F14E24";x.font=`800 28px ${F.body}`;x.fillText(location.host||"tabi-neko.vercel.app",X(W-pad),H-46);

  return new Promise((ok,no)=>c.toBlob(b=>b?ok(b):no(new Error("toBlob")),"image/png"));
}
function rrect(x,a,b,w,h,r){x.beginPath();x.moveTo(a+r,b);x.arcTo(a+w,b,a+w,b+h,r);x.arcTo(a+w,b+h,a,b+h,r);x.arcTo(a,b+h,a,b,r);x.arcTo(a,b,a+w,b,r);x.closePath()}
function fit(x,t,w){if(x.measureText(t).width<=w)return t;while(t.length>1&&x.measureText(t+"…").width>w)t=t.slice(0,-1);return t+"…"}
