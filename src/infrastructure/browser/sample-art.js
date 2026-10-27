// Dibujos locales y tipografía del sistema: no requiere imágenes ni fuentes externas.
function text(ctx, value, x, y, size, color, family='Georgia, serif', maxWidth=760) {
  ctx.fillStyle=color;ctx.font=`${size}px ${family}`;ctx.textAlign='center';ctx.fillText(value,x,y,maxWidth);
}
function leaf(ctx,x,y,size,angle,color) {
  ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(0,0);ctx.quadraticCurveTo(size,-size,size*2,0);ctx.quadraticCurveTo(size,size,0,0);ctx.fill();ctx.restore();
}
function motif(ctx,s,w,h) {
  ctx.strokeStyle=s.accent;ctx.lineWidth=2;
  if(s.motif==='botanical') {
    for(const [x,y,flip] of [[w*.07,h*.06,1],[w*.93,h*.94,-1]]) {
      ctx.save();ctx.translate(x,y);ctx.scale(flip,flip);
      ctx.beginPath();ctx.moveTo(0,0);ctx.quadraticCurveTo(w*.22,h*.03,w*.25,h*.25);ctx.stroke();
      for(let i=0;i<7;i++){leaf(ctx,w*.032*i,h*.028*i,w*.035,i%2?-.8:.65,s.soft);}
      ctx.restore();
    }
  } else if(s.motif==='stars') {
    for(let i=0;i<34;i++) {const x=((i*173+79)%997)/997*w,y=((i*257+41)%991)/991*h;if(x>w*.2&&x<w*.8&&y>h*.2&&y<h*.83)continue;const r=i%3===0?7:3;ctx.beginPath();ctx.moveTo(x-r,y);ctx.lineTo(x+r,y);ctx.moveTo(x,y-r);ctx.lineTo(x,y+r);ctx.stroke();}
    ctx.beginPath();ctx.arc(w*.5,h*.23,w*.12,Math.PI*1.1,Math.PI*1.9);ctx.stroke();
  } else if(s.motif==='clouds') {
    ctx.fillStyle=s.soft;for(let i=0;i<6;i++){ctx.beginPath();ctx.ellipse(w*(i%3)*.47,h*(i<3?.08:.96),w*.23,h*.065,0,0,Math.PI*2);ctx.fill();}
    ctx.beginPath();ctx.moveTo(w*.5,h*.18);ctx.lineTo(w*.5,h*.29);ctx.moveTo(w*.46,h*.22);ctx.lineTo(w*.54,h*.22);ctx.stroke();
  } else if(s.motif==='mountains') {
    ctx.fillStyle=s.soft;ctx.beginPath();ctx.moveTo(0,h*.9);ctx.lineTo(w*.18,h*.72);ctx.lineTo(w*.32,h*.86);ctx.lineTo(w*.49,h*.68);ctx.lineTo(w*.7,h*.89);ctx.lineTo(w*.86,h*.74);ctx.lineTo(w,h*.9);ctx.lineTo(w,h);ctx.lineTo(0,h);ctx.fill();
    ctx.beginPath();ctx.arc(w*.5,h*.18,22,0,Math.PI*2);ctx.stroke();
  } else if(s.motif==='arches') {
    ctx.strokeStyle=s.soft;ctx.lineWidth=28;for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(w*.93,h*.14,w*(.19+i*.055),0,Math.PI*2);ctx.stroke();}
  } else if(s.motif==='rings') {
    ctx.strokeStyle=s.soft;ctx.lineWidth=8;for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(w*.9,h*.76,65+i*30,0,Math.PI*2);ctx.stroke();}
  } else if(s.motif==='dots') {
    ctx.fillStyle=s.soft;for(let i=0;i<36;i++){const x=(i%12)*w/11,y=i<12?h*.06:i<24?h*.12:h*.94;ctx.beginPath();ctx.arc(x,y,5,0,Math.PI*2);ctx.fill();}
  } else {
    for(let i=0;i<3;i++){ctx.strokeRect(25+i*12,25+i*12,w-50-i*24,h-50-i*24);}
  }
}

export function paintSample(ctx, sample, slot, width, height, revision=2) {
  const s=sample,w=width,h=height,card=s.model==='card';
  ctx.fillStyle=s.bg;ctx.fillRect(0,0,w,h);motif(ctx,s,w,h);
  ctx.strokeStyle=s.accent;ctx.lineWidth=1.5;ctx.strokeRect(36,36,w-72,h-72);
  const front=slot==='front'||slot==='cover'||slot==='outsideLeft'||(s.model==='gatefold'&&slot==='outsideRight');
  text(ctx,front?s.subtitle:card?'HECHO PARA CONECTAR':slot==='backCover'?'GRACIAS POR ACOMPAÑARNOS':'UNA CELEBRACIÓN PARA RECORDAR',w*.5,h*.18,card?20:18,s.accent,'sans-serif',w*.78);
  if(front) {
    const size=card?72:s.id==='graduacion-andina'?49:67;
    const title=s.model==='gatefold'?(slot==='outsideLeft'?[s.title[0]]:[s.title.at(-1)]):s.title;
    title.forEach((line,i)=>text(ctx,line,w*.5,h*.41+i*(card?83:102),size,s.ink,'Georgia, serif',w*.76));
    text(ctx,card?s.place:s.event,w*.5,h*.77,card?24:22,s.accent,'sans-serif',w*.77);
  } else if(card) {
    text(ctx,s.title.join(' '),w*.5,h*.36,44,s.ink,'Georgia, serif',w*.78);
    [s.contact,s.email,s.place].forEach((line,i)=>text(ctx,line,w*.5,h*.51+i*42,i===0?25:22,s.ink,'sans-serif',w*.78));
  } else if(slot==='insideLeft') {
    s.message.forEach((line,i)=>text(ctx,line,w*.5,h*.39+i*70,40,s.ink,'Georgia, serif',w*.78));
    text(ctx,'Tu presencia hace especial este día.',w*.5,h*.72,23,s.accent,'sans-serif',w*.78);
  } else if(slot==='insideRight'||(s.model==='invitation'&&slot==='back')) {
    text(ctx,s.category,w*.5,h*.35,52,s.ink);
    [s.event,s.detail,s.place,'Confirma tu asistencia · Datos de ejemplo'].forEach((line,i)=>text(ctx,line,w*.5,h*.47+i*70,i===0?28:22,s.ink,'sans-serif',w*.78));
  } else if(slot==='insideCenter') {
    text(ctx,s.title.join(' '),w*.5,h*.35,46,s.ink);
    [s.category,s.event,'Nos encantará celebrar contigo.'].forEach((line,i)=>text(ctx,line,w*.5,h*.48+i*82,i===1?26:24,s.ink,'sans-serif',w*.78));
  } else if(slot==='outsideRight') {
    text(ctx,'Comparte este momento',w*.5,h*.37,38,s.ink);
    [s.place,'Información de ejemplo','Confirma tu asistencia'].forEach((line,i)=>text(ctx,line,w*.5,h*.5+i*65,23,s.ink,'sans-serif',w*.78));
  } else {
    ['Los mejores recuerdos','se comparten.'].forEach((line,i)=>text(ctx,line,w*.5,h*.44+i*75,42,s.ink));
    text(ctx,s.title.join(' '),w*.5,h*.68,29,s.accent);
  }
  text(ctx,`MUESTRA · DATOS FICTICIOS${revision===1?' · PROPUESTA INICIAL':''}`,w*.5,h*.895,card?16:15,s.ink,'sans-serif',w*.78);
}
