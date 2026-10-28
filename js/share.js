// Share the trip as a PDF: one 1080x1350 notebook page per day, drawn on a
// canvas, with a tappable link over every place (it opens in Google Maps) and
// over the site address. The PDF is written here by hand, one JPEG per page
// plus link annotations, so there's no library to load. On a phone it goes to
// the share sheet; where sharing files isn't supported it downloads instead.
// Arabic draws right to left with the Arabic faces.
const SH={W:1080,H:1350,pad:72};
const shImg=src=>new Promise(ok=>{const i=new Image();i.onload=()=>ok(i);i.onerror=()=>ok(null);i.src=src});
const placeLink=p=>p.url||"https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(`${p.n} ${CITIES[p.city].n} Japan`);

// refs: day refs like "0.1"; null means every day with stops.
async function sharePdf(refs){
  const days=[];let num=0;
  trip.stays.forEach((s,a)=>s.days.forEach((d,b)=>{num++;const ps=d.ids.map(k=>BYKEY.get(k)).filter(Boolean);
    if(ps.length&&(!refs||refs.includes(a+"."+b)))days.push({ps,s,num,t:d.t})}));
  if(!days.length){toast(T("Add some places first"));return}
  toast(T("Making your PDF…"));
  try{
    const pages=[];for(const d of days)pages.push(await dayPage(d.ps,d.s,d.num,d.t));
    const one=days.length===1,title=one?T("Day {n}",{n:days[0].num}):(trip.name||T("My Japan trip"));
    const blob=pdfFrom(pages,title),name=one?`tabi-neko-day-${days[0].num}.pdf`:"tabi-neko-trip.pdf";
    const file=new File([blob],name,{type:"application/pdf"});
    if(navigator.canShare&&navigator.canShare({files:[file]})){
      try{await navigator.share({files:[file],title,text:T("Planned with Tabi Neko. Tap a place to open it in Google Maps.")})}
      catch(e){if(e&&e.name!=="AbortError")throw e}
    }else{
      const u=URL.createObjectURL(blob),l=document.createElement("a");l.href=u;l.download=name;document.body.appendChild(l);l.click();l.remove();
      setTimeout(()=>URL.revokeObjectURL(u),4000);toast(T("PDF saved ✓"));
    }
  }catch(e){toast(T("Couldn't make the PDF. Try again?"))}
}

// A canvas page plus the link boxes on it, in canvas pixels.
async function dayPage(ps,stay,num,title){
  const links=[],c=await dayPicture(ps,stay,num,title,links);
  const bin=atob(c.toDataURL("image/jpeg",.9).split(",")[1]),jpg=new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++)jpg[i]=bin.charCodeAt(i);
  return {jpg,w:c.width,h:c.height,links};
}

// The smallest PDF that does the job: a catalog, a page tree, and per page a
// content stream that paints its JPEG plus one link annotation per box.
// Pages are drawn at half size, so 1080x1350 px is 540x675 pt.
function pdfFrom(pages,title){
  const enc=new TextEncoder(),parts=[],offs=[];let len=0;
  const put=x=>{const b=typeof x==="string"?enc.encode(x):x;parts.push(b);len+=b.length};
  const str=t=>"("+String(t).replace(/[\\()]/g,m=>"\\"+m).replace(/[^\x20-\x7e]/g,"")+")";
  let n=3;const plan=pages.map(p=>({p,page:n++,cont:n++,img:n++,ann:p.links.map(()=>n++)}));
  const info=n++;
  const obj=(id,body)=>{offs[id]=len;put(`${id} 0 obj\n`);(Array.isArray(body)?body:[body]).forEach(put);put("\nendobj\n")};
  put("%PDF-1.4\n%\xe2\xe3\xcf\xd3\n");
  obj(1,"<< /Type /Catalog /Pages 2 0 R >>");
  obj(2,`<< /Type /Pages /Kids [${plan.map(q=>q.page+" 0 R").join(" ")}] /Count ${plan.length} >>`);
  plan.forEach(({p,page,cont,img,ann})=>{
    const W=p.w/2,H=p.h/2,draw=`q ${W} 0 0 ${H} 0 0 cm /Im0 Do Q`;
    obj(page,`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /XObject << /Im0 ${img} 0 R >> >> /Contents ${cont} 0 R${ann.length?` /Annots [${ann.map(a=>a+" 0 R").join(" ")}]`:""} >>`);
    obj(cont,[`<< /Length ${draw.length} >>\nstream\n`,draw,"\nendstream"]);
    obj(img,[`<< /Type /XObject /Subtype /Image /Width ${p.w} /Height ${p.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.jpg.length} >>\nstream\n`,p.jpg,"\nendstream"]);
    p.links.forEach((l,i)=>{const x1=l.x/2,x2=(l.x+l.w)/2,y1=H-(l.y+l.h)/2,y2=H-l.y/2;
      obj(ann[i],`<< /Type /Annot /Subtype /Link /Rect [${x1} ${y1} ${x2} ${y2}] /Border [0 0 0] /A << /S /URI /URI ${str(l.url)} >> >>`)});
  });
  // the title can be Arabic, so it goes in as UTF-16 hex, which PDF readers expect for non-ASCII text
  const u16=t=>"<FEFF"+[...String(t)].map(ch=>{const c=ch.codePointAt(0);
    if(c<0x10000)return c.toString(16).padStart(4,"0");const v=c-0x10000;return((v>>10)+0xD800).toString(16)+((v&0x3FF)+0xDC00).toString(16)}).join("").toUpperCase()+">";
  obj(info,`<< /Title ${u16(title)} /Creator (Tabi Neko) >>`);
  const xref=len,count=n;
  put(`xref\n0 ${count}\n0000000000 65535 f \n`);
  for(let i=1;i<count;i++)put(String(offs[i]).padStart(10,"0")+" 00000 n \n");
  put(`trailer\n<< /Size ${count} /Root 1 0 R /Info ${info} 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return new Blob(parts,{type:"application/pdf"});
}

async function dayPicture(ps,stay,num,title,links=[]){
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
    links.push({x:pad,y,w:W-pad*2,h:rowH,url:placeLink(p)});
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
  const host=location.host||"tabi-neko.vercel.app";
  x.fillStyle="#F14E24";x.font=`800 28px ${F.body}`;x.fillText(host,X(W-pad),H-46);
  links.push({x:ar?pad:W/2,y:H-120,w:W/2-pad,h:90,url:location.origin&&location.origin!=="null"?location.origin:"https://tabi-neko.vercel.app"});

  return c;
}
function rrect(x,a,b,w,h,r){x.beginPath();x.moveTo(a+r,b);x.arcTo(a+w,b,a+w,b+h,r);x.arcTo(a+w,b+h,a,b+h,r);x.arcTo(a,b+h,a,b,r);x.arcTo(a,b,a+w,b,r);x.closePath()}
function fit(x,t,w){if(x.measureText(t).width<=w)return t;while(t.length>1&&x.measureText(t+"…").width>w)t=t.slice(0,-1);return t+"…"}
