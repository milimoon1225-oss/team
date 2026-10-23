from pathlib import Path
import json, base64, shutil
from PIL import ImageFont

ROOT = Path(__file__).resolve().parents[1]
C = dict(navy='#132D43', teal='#006B64', mint='#E5F3EE', cream='#F8F6F1', white='#FFFFFF', ink='#172C3B', muted='#5B6B75', line='#D8E0E3', blue='#075DCC', pink='#CF1672', yellow='#F6D965', green='#216B44', red='#B43A36')
SCREENS=[]
FONTS={}
def font(size,weight):
    key=(size,weight>=600)
    if key not in FONTS: FONTS[key]=ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf' if key[1] else 'C:/Windows/Fonts/arial.ttf',size)
    return FONTS[key]
def wrap(s,w,size,weight):
    out=[]
    for line in s.split('\n'):
        words=line.split(' '); row=''
        for word in words:
            candidate=(row+' '+word).strip()
            if row and font(size,weight).getlength(candidate)>w: out.append(row);row=word
            else: row=candidate
        out.append(row)
    return '\n'.join(out)
def rect(nodes,x,y,w,h,fill=C['white'],radius=0,stroke=None,name='Superficie',**kw):
    n=dict(type='rect',name=name,x=x,y=y,w=w,h=h,fill=fill,radius=radius,**kw)
    if stroke: n['stroke']=stroke
    nodes.append(n);return n
def text(nodes,s,x,y,w,size=16,color=C['ink'],weight=400,align='left',name=None,**kw):
    s=wrap(s,w,size,weight);lh=round(size*1.3)
    n=dict(type='text',name=name or s.replace('\n',' ')[:70],text=s,x=x,y=y,w=w,h=lh*len(s.split('\n'))+2,fontSize=size,lineHeight=lh,weight=weight,color=color,align=align,**kw)
    nodes.append(n);return n
def image(nodes,asset,x,y,w,h): nodes.append(dict(type='image',name='Logo original '+asset,asset=asset,x=x,y=y,w=w,h=h))
def group(nodes,x,y,w,h,name,fill=None,target=None,radius=0,stroke=None):
    n=dict(type='group',name=name,x=x,y=y,w=w,h=h,children=[],radius=radius)
    if fill:n['fill']=fill
    if stroke:n['stroke']=stroke
    if target:n['target']=target
    nodes.append(n);return n['children']
def btn(nodes,s,x,y,w=200,target=None,secondary=False,h=50):
    n=group(nodes,x,y,w,h,'Botón / '+s,C['white'] if secondary else C['teal'],target,8,C['line'] if secondary else None)
    text(n,s,12,(h-22)/2,w-24,16,C['ink'] if secondary else C['white'],700,'center')
def pill(nodes,s,x,y,w=150,fill=C['mint'],color=C['teal']):
    rect(nodes,x,y,w,30,fill,15);text(nodes,s,x+10,y+6,w-20,12,color,700,'center')
def field(nodes,label,value,x,y,w,target=None):
    text(nodes,label,x,y,w,13,C['muted'],700)
    g=group(nodes,x,y+24,w,50,label,C['white'],target,7,C['line']);text(g,value,14,14,w-28,16)
def rule(nodes,x,y,w):rect(nodes,x,y,w,1,C['line'])
def note(nodes,s,x,y,w,fill=C['mint'],color=C['teal']):
    st=wrap(s,w-32,14,400);h=round(14*1.3)*len(st.split('\n'))+32
    rect(nodes,x,y,w,h,fill,8);text(nodes,st,x+16,y+16,w-32,14,color);return h
def badge(nodes,n,x,y):
    nodes.append(dict(type='ellipse',name='Paso '+str(n),x=x,y=y,w=34,h=34,fill=C['teal']))
    text(nodes,str(n),x,y+7,34,15,C['white'],700,'center')
def art(nodes,x,y,w,h,kind='cards'):
    """Original native-vector product studies; not actual customer print samples."""
    bg={'cards':'#E5ECE5','flyer':'#EFE2D6','labels':'#F2DFE9','banner':'#DEE7F4'}.get(kind,'#E5ECE5')
    g=group(nodes,x,y,w,h,'Muestra gráfica / '+kind,bg,radius=12)
    if kind=='cards':
        rect(g,w*.16,h*.23,w*.66,h*.53,'#CAD8CB',8)
        rect(g,w*.13,h*.19,w*.66,h*.53,'#FFFEF8',7)
        text(g,'tinta',w*.2,h*.27,w*.5,max(20,int(w*.09)),C['navy'],700)
        text(g,'ESTUDIO CREATIVO',w*.2,h*.5,w*.47,max(7,int(w*.024)),C['muted'],700)
        rect(g,w*.51,h*.56,w*.37,h*.29,C['teal'],5)
        text(g,'Hazte recordar.',w*.54,h*.63,w*.31,max(9,int(w*.032)),C['white'],700)
        for i,col in enumerate([C['blue'],C['pink'],C['yellow']]):rect(g,w*.2+i*14,h*.65,9,9,col,4)
    elif kind=='flyer':
        rect(g,w*.24,h*.12,w*.52,h*.76,'#CBB8A8',3)
        rect(g,w*.21,h*.09,w*.52,h*.76,'#F7CD50',3)
        text(g,'IDEAS\nQUE SE\nVEN.',w*.27,h*.18,w*.4,max(18,int(w*.078)),C['navy'],800)
        rect(g,w*.27,h*.68,w*.29,h*.05,C['navy'],2)
    elif kind=='labels':
        for yy in [.17,.55]:
            for xx in [.17,.53]:
                g.append(dict(type='ellipse',name='Etiqueta circular',x=w*xx,y=h*yy,w=w*.25,h=w*.25,fill=C['white']))
                text(g,'hola.',w*xx,h*yy+w*.065,w*.25,max(12,int(w*.043)),C['pink'],700,'center')
    else:
        rect(g,w*.33,h*.08,w*.35,h*.76,C['navy'],3)
        text(g,'TU\nMARCA\nAQUÍ',w*.37,h*.18,w*.28,max(14,int(w*.055)),C['white'],700)
        rect(g,w*.37,h*.66,w*.25,h*.07,C['yellow'],3)
        rect(g,w*.29,h*.85,w*.43,h*.025,C['muted'],3)

def shell(id,title,subtitle='',mobile=False,height=1100,active=''):
    w=390 if mobile else 1440;n=[];s=dict(id=('m-' if mobile else 'd-')+id,name=title,width=w,height=height,device='mobile' if mobile else 'desktop',nodes=n)
    SCREENS.append(s);p='m-' if mobile else 'd-';m=24 if mobile else 80
    rect(n,0,0,w,height,C['cream'])
    rect(n,0,0,w,28,C['navy']);text(n,'PROTOTIPO · productos e importes de ejemplo',m,6,w-2*m,11,C['white'],400,'center')
    rect(n,0,28,w,80,C['white']);image(n,'creativa',m,44,150 if mobile else 190,50)
    if mobile:
        text(n,'Catálogo',192,61,70,13,C['ink'],700,target=p+'catalogo')
        text(n,'Pedido',286,61,70,13,C['ink'],700,target=p+'cuenta')
    else:
        for x,label,dest in [(395,'Inicio','inicio'),(480,'Productos','catalogo'),(602,'Cotiza tu idea','cotizacion'),(760,'Sigue tu pedido','cotizacion-pagada' if id in ['cotizacion-aceptada','cotizacion-pagada'] else 'seguimiento')]:
            text(n,label,x,61,150,15,C['teal'] if active==dest else C['muted'],700 if active==dest else 400,target=p+dest)
        text(n,'Mi cuenta',1090,61,110,15,C['ink'],700,target=p+'cuenta');btn(n,'Carrito  ·  0' if id=='carrito-vacio' else 'Carrito  ·  1',1210,45,150,p+('carrito-vacio' if id=='carrito-vacio' else 'carrito'),True,46)
    if title:
        text(n,'Inicio  /  '+title,m,132,w-2*m,12,C['muted'],target=p+'inicio')
        ht=text(n,title,m,152 if mobile else 166,w-2*m,28 if mobile else 38,C['ink'],700)
        if subtitle:text(n,subtitle,m,ht['y']+ht['h']+12 if mobile else 222,w-2*m,15 if mobile else 17,C['muted'])
    return s,n,p,m,w
def footer(n,y,w,mobile=False):
    rect(n,0,y,w,170 if mobile else 148,C['white']);rule(n,24 if mobile else 80,y,w-(48 if mobile else 160))
    image(n,'creativa',24 if mobile else 80,y+22,150,50)
    text(n,'Tu idea, bien impresa.',24 if mobile else 290,y+30,210,15,C['ink'],700)
    text(n,'Demostración académica · Sin cobros ni pedidos reales',24 if mobile else 290,y+90 if mobile else y+58,w-48 if mobile else 640,12,C['muted'])
    if not mobile:image(n,'developer',1190,y+16,150,100)

def home(mob):
    s,n,p,m,w=shell('inicio','',mobile=mob,height=1880 if mob else 1500,active='inicio');s['name']='Inicio';s['flowStart']=True
    if not mob:
        pill(n,'CREATIVA IMPRESOS',80,156,190)
        text(n,'Tus ideas merecen\nuna buena impresión.',80,215,680,58,C['navy'],700)
        text(n,'Dale forma a tu marca con impresos que se sienten tan bien como se ven.',80,395,580,22,C['muted'])
        btn(n,'Explorar productos  →',80,494,244,p+'catalogo');btn(n,'Cotizar mi idea',340,494,198,p+'cotizacion',True)
        art(n,800,156,560,440)
        pill(n,'Papel · Color · Detalle',832,558,220,C['white'],C['navy'])
        for i,(a,b) in enumerate([('Configura a tu medida','Elige formato, material y acabado.'),('Aprueba antes de imprimir','Revisa tu diseño con tranquilidad.'),('Sigue cada paso','Tu pedido siempre a la vista.')]):
            x=80+i*435;badge(n,i+1,x,653);text(n,a,x+50,652,350,18,C['ink'],700);text(n,b,x+50,682,350,14,C['muted'])
        text(n,'Pequeños detalles. Grandes marcas.',80,777,1000,36,C['ink'],700)
        text(n,'Encuentra el formato que necesita tu próxima idea.',80,831,900,17,C['muted'])
        for i,(name,kind,desc) in enumerate([('Tarjetas de presentación','cards','Tu primer contacto, inolvidable.'),('Volantes y flyers','flyer','Haz circular tu próxima campaña.'),('Etiquetas adhesivas','labels','El toque final de tu producto.'),('Gran formato','banner','Tu marca con más presencia.')]):
            x=80+i*325;art(n,x,885,305,220,kind);text(n,name,x,1124,305,19,C['ink'],700);text(n,desc,x,1155,305,14,C['muted']);text(n,'Ver productos  →',x,1194,290,15,C['teal'],700,target=p+('catalogo' if i<3 else 'cotizacion'))
        footer(n,1352,w)
    else:
        pill(n,'CREATIVA IMPRESOS',24,140,185)
        text(n,'Tus ideas merecen\nuna buena\nimpresión.',24,194,342,38,C['navy'],700)
        text(n,'Dale forma a tu marca con impresos hechos para destacar.',24,363,342,18,C['muted'])
        btn(n,'Explorar productos  →',24,446,342,p+'catalogo');btn(n,'Cotizar mi idea',24,508,342,p+'cotizacion',True)
        art(n,24,590,342,278)
        text(n,'Tu marca empieza\npor un buen detalle.',24,926,342,29,C['ink'],700)
        for i,(name,kind) in enumerate([('Tarjetas de presentación','cards'),('Volantes y flyers','flyer')]):
            yy=1030+i*290;art(n,24,yy,342,190,kind);text(n,name,24,yy+208,342,20,C['ink'],700);text(n,'Ver productos  →',24,yy+242,342,15,C['teal'],700,target=p+'catalogo')
        footer(n,1710,w,True)

def catalog(mob):
    s,n,p,m,w=shell('catalogo','Encuentra tu próximo impreso','Productos de muestra para explorar el recorrido.',mob,1660 if mob else 1220,'catalogo')
    if mob:
        field(n,'Buscar productos','Tarjetas, volantes, etiquetas…',24,298,342)
        pill(n,'Todos los productos',24,396,175);pill(n,'A medida',210,396,155,C['white'],C['muted'])
        for i,(a,k,b) in enumerate([('Tarjetas de presentación','cards','500 unidades · S/ 85.00'),('Volantes A5','flyer','Solicita un presupuesto'),('Etiquetas personalizadas','labels','Solicita un presupuesto')]):
            y=462+i*334;art(n,24,y,342,206,k);text(n,a,24,y+220,342,19,C['ink'],700);text(n,b,24,y+251,342,15,C['muted']);text(n,'Configurar  →' if i==0 else 'Cotizar  →',24,y+281,342,15,C['teal'],700,target=p+('producto' if i==0 else 'cotizacion'))
        footer(n,1490,w,True)
    else:
        field(n,'Buscar productos','Tarjetas, volantes, etiquetas…',80,290,1280)
        rect(n,80,404,250,610,C['white'],12);text(n,'Categorías',104,432,200,18,C['ink'],700)
        for i,v in enumerate(['Todos los productos','Identidad de marca','Publicidad impresa','Etiquetas y empaques','Gran formato']):
            if i==0:rect(n,96,475,218,44,C['mint'],6)
            text(n,v,110,486+i*58,204,14,C['teal'] if i==0 else C['muted'],700 if i==0 else 400)
        note(n,'¿Algo diferente?\nCuéntanos tu idea y prepara un pedido a medida.',100,815,210);text(n,'Solicitar cotización  →',104,943,210,14,C['teal'],700,target=p+'cotizacion')
        for i,(a,k,b) in enumerate([('Tarjetas de presentación','cards','500 unidades · S/ 85.00'),('Volantes A5','flyer','Precio según configuración'),('Etiquetas personalizadas','labels','Precio según configuración')]):
            x=360+i*340;art(n,x,404,320,285,k);pill(n,'Compra directa' if i==0 else 'A cotizar',x,714,145);text(n,a,x,765,315,22,C['ink'],700);text(n,b,x,839,315,15,C['muted']);btn(n,'Configurar' if i==0 else 'Solicitar cotización',x,891,320,p+('producto' if i==0 else 'cotizacion'),i!=0)
        footer(n,1072,w)

def product(mob):
    s,n,p,m,w=shell('producto','Tarjetas de presentación','Un pequeño formato para una gran primera impresión.',mob,1780 if mob else 1230,'catalogo')
    if mob: x=24;y=700;fw=342;art(n,24,300,342,290)
    else: x=790;y=302;fw=570;art(n,80,302,650,500)
    if mob:pill(n,'Compra directa',24,623,145)
    else:pill(n,'Compra directa',80,837,145);text(n,'Papel con presencia. Color con intención.',80,900,650,27,C['ink'],700);text(n,'Muestra ilustrativa. La oferta y los acabados reales se validarán con la imprenta.',80,953,590,16,C['muted'])
    text(n,'Configura tu impresión',x,y,fw,24,C['ink'],700)
    field(n,'Formato','9 × 5 cm · Horizontal',x,y+55,fw)
    field(n,'Material y acabado','Couché 300 g · Mate · Ambas caras',x,y+148,fw)
    field(n,'Cantidad del recorrido de ejemplo','500 tarjetas',x,y+241,fw)
    text(n,'Tu diseño',x,y+341,fw,16,C['ink'],700)
    note(n,'Referencia de ejemplo: tarjetas-tinta.pdf\nRecibir un archivo no aprueba su impresión.',x,y+378,fw)
    text(n,'¿Necesitas ayuda con el diseño?',x,y+480,fw,14,C['teal'],700,target=p+'cotizacion')
    rule(n,x,y+525,fw);text(n,'Precio del producto',x,y+551,fw,14,C['muted']);text(n,'S/ 85.00',x,y+580,fw,36,C['ink'],700)
    text(n,'Importe de ejemplo. Entrega en el siguiente paso.',x,y+633,fw,13,C['muted'])
    btn(n,'Añadir al carrito  →',x,y+686,fw,p+'carrito')
    footer(n,1610 if mob else 1082,w,mob)

def cart(mob,empty=False):
    s,n,p,m,w=shell('carrito-vacio' if empty else 'carrito','Tu carrito','Revisa los detalles antes de continuar.',mob,1120 if mob else 980)
    if empty:
        art(n,m,300,342 if mob else 340,230);text(n,'Todavía no hay productos',m,580,342 if mob else 700,28,C['ink'],700);text(n,'Tu próxima idea puede empezar aquí.',m,665,w-2*m,17,C['muted']);btn(n,'Explorar productos',m,730,342 if mob else 300,p+'catalogo');footer(n,950 if mob else 832,w,mob);return
    x=24 if mob else 80;y=300;cw=342 if mob else 800
    rect(n,x,y,cw,380 if mob else 250,C['white'],12);art(n,x+20,y+20,130 if mob else 190,110 if mob else 165)
    tx=x+20 if mob else x+240;ty=y+150 if mob else y+26
    text(n,'Tarjetas de presentación',tx,ty,300 if mob else 490,21,C['ink'],700);text(n,'500 unid. · 9 × 5 cm\nCouché 300 g · Mate · Ambas caras',tx,ty+65,300 if mob else 490,15,C['muted']);text(n,'S/ 85.00',tx,ty+130,200,23,C['ink'],700)
    text(n,'Editar',tx,ty+183,100,14,C['teal'],700,target=p+'producto');text(n,'Eliminar',tx+150,ty+183,120,14,C['red'],700,target=p+'carrito-vacio')
    sx=24 if mob else 930;sy=710 if mob else 300;sw=342 if mob else 430
    rect(n,sx,sy,sw,250,C['white'],12);text(n,'Resumen',sx+24,sy+24,sw-48,22,C['ink'],700);text(n,'Productos',sx+24,sy+76,170,16,C['muted']);text(n,'S/ 85.00',sx+210,sy+76,sw-234,16,C['ink'],700,'right');text(n,'Entrega por confirmar',sx+24,sy+112,sw-48,14,C['muted']);btn(n,'Continuar compra  →',sx+24,sy+170,sw-48,p+'checkout')
    if not mob:note(n,'Tu archivo se revisará antes de enviarte el arte final para aprobación.',80,590,800);text(n,'← Seguir explorando',80,730,300,16,C['teal'],700,target=p+'catalogo')
    footer(n,1000 if mob else 832,w,mob)
    if mob:s['height']=1170

def checkout(mob,invoice=False):
    sid='factura' if invoice else 'checkout';s,n,p,m,w=shell(sid,'Completa tu pedido','Entrega, comprobante y pago en un solo lugar.',mob,1940 if (mob and invoice) else 1640 if mob else 1430 if invoice else 1170)
    x=24 if mob else 80;y=300;fw=342 if mob else 760
    text(n,'01   Datos de contacto',x,y,fw,22,C['ink'],700)
    field(n,'Nombre completo','Cliente de demostración',x,y+52,fw)
    field(n,'Correo electrónico','cliente@example.com',x,y+146,fw)
    text(n,'02   Entrega',x,y+259,fw,22,C['ink'],700)
    note(n,'Recojo en imprenta · S/ 0.00\nPunto y horario por confirmar con el negocio.',x,y+308,fw)
    text(n,'03   Comprobante',x,y+421,fw,22,C['ink'],700)
    btn(n,'Boleta',x,y+469,160,p+'checkout',invoice);btn(n,'Factura',x+180,y+469,162,p+'factura',not invoice)
    dy=0
    if invoice:
        field(n,'RUC','Ingresa 11 dígitos',x,y+545,fw);field(n,'Razón social','Nombre de la empresa',x,y+639,fw);field(n,'Dirección fiscal','Dirección registrada',x,y+733,fw);dy=300 if mob else 290
    sx=24 if mob else 910;sy=y+560+dy if mob else 300;sw=342 if mob else 450
    rect(n,sx,sy,sw,430,C['white'],12);text(n,'Tu pedido',sx+24,sy+24,sw-48,24,C['ink'],700)
    text(n,'500 tarjetas de presentación',sx+24,sy+78,sw-48,16);text(n,'Producto                         S/ 85.00\nRecojo en imprenta          S/ 0.00',sx+24,sy+124,sw-48,15,C['muted']);rule(n,sx+24,sy+191,sw-48)
    text(n,'Total',sx+24,sy+216,140,20,C['ink'],700);text(n,'S/ 85.00',sx+156,sy+208,sw-180,30,C['ink'],700,'right')
    text(n,'Importe final del escenario, sin cargos adicionales.',sx+24,sy+263,sw-48,13,C['muted'])
    btn(n,'Simular pago  →',sx+24,sy+330,sw-48,p+'confirmacion')
    sy2=sy+465; text(n,'Otros resultados de la demostración',sx,sy2,sw,13,C['muted'],700)
    text(n,'Pago en verificación',sx,sy2+36,sw,15,C['teal'],700,target=p+'pago-pendiente');text(n,'Pago no aprobado',sx,sy2+76,sw,15,C['red'],700,target=p+'pago-error')
    if not mob:note(n,'Los datos son ilustrativos. El prototipo no solicita números de tarjeta ni realiza cobros.',80,1145 if invoice else 920,760)
    footer(n,s['height']-(170 if mob else 148),w,mob)

def payment(mob,state):
    pending=state=='pago-pendiente';failed=state=='pago-error';title='Estamos verificando tu pago' if pending else 'El pago no se completó' if failed else '¡Tu pedido ya tiene forma!'
    s,n,p,m,w=shell(state,title,'Pedido de demostración CR-001',mob,1220 if mob else 1010)
    x=24 if mob else 300;fw=342 if mob else 840;y=330 if mob else 310
    rect(n,x,y,fw,390,C['white'],14);pill(n,'Pago pendiente' if pending else 'Pago no aprobado' if failed else 'Pago confirmado',x+24,y+24,190,'#FFF2DA' if pending else '#FBE5E5' if failed else C['mint'],C['red'] if failed else C['ink'] if pending else C['teal'])
    text(n,'S/ 85.00',x+24,y+89,fw-48,42,C['ink'],700)
    msg='El comprobante recibido todavía necesita validación. Tu pedido conserva el mismo código.' if pending else 'Puedes volver a intentar el pago sin duplicar el pedido.' if failed else 'El siguiente paso es revisar y aprobar el arte de tus tarjetas antes de imprimir.'
    text(n,msg,x+24,y+160,fw-48,17,C['muted'])
    btn(n,'Volver al pago' if failed else 'Ver arte para aprobar' if not pending else 'Ver mi pedido',x+24,y+300,fw-48,p+('checkout' if failed else 'arte' if not pending else 'seguimiento-pendiente'))
    note(n,'La producción requiere pago confirmado y aprobación del arte vigente.',x,y+430,fw)
    footer(n,s['height']-(170 if mob else 148),w,mob)

def approval(mob,checked=False):
    s,n,p,m,w=shell('arte-listo' if checked else 'arte','Revisa tu diseño','Pedido CR-001 · Arte v1 · Tarjetas de presentación',mob,1590 if mob else 1120)
    ax=24 if mob else 80;ay=300;aw=342 if mob else 720;art(n,ax,ay,aw,300 if mob else 470)
    pill(n,'VISTA PREVIA · ARTE V1',ax,ay+324 if mob else ay+493,235,C['white'],C['navy'])
    x=24 if mob else 870;y=704 if mob else 300;fw=342 if mob else 490
    text(n,'Cada detalle cuenta.',x,y,fw,28,C['ink'],700);text(n,'Comprueba nombres, textos, colores y márgenes antes de dar tu aprobación.',x,y+66,fw,17,C['muted'])
    for i,(a,b) in enumerate([('Pago','Confirmado'),('Arte','Pendiente de tu aprobación'),('Producción','Aún no iniciada')]):
        yy=y+177+i*67;text(n,a,x,yy,fw,13,C['muted']);text(n,b,x,yy+23,fw,17,C['ink'],700)
    g=group(n,x,y+404,fw,85,'Confirmación explícita de versión',C['mint'],p+('arte' if checked else 'arte-listo'),8)
    rect(g,16,19,22,22,C['teal'] if checked else C['white'],4,C['teal']);text(g,'✓' if checked else '',18,19,18,17,C['white'],700,'center');text(g,'Revisé el arte v1 y autorizo su impresión.',50,16,fw-65,15,C['ink'],700)
    btn(n,'Aprobar arte v1' if checked else 'Primero confirma la revisión',x,y+516,fw,p+'seguimiento' if checked else p+'arte-listo',not checked)
    btn(n,'Solicitar correcciones',x,y+580,fw,p+'correcciones',True)
    footer(n,s['height']-(170 if mob else 148),w,mob)

def corrections(mob):
    s,n,p,m,w=shell('correcciones','Solicita un ajuste','El arte necesita tu aprobación antes de pasar a producción.',mob,1160 if mob else 1070)
    x=24 if mob else 300;fw=342 if mob else 840;y=320
    field(n,'Versión observada','Arte v1 · Pedido CR-001',x,y,fw)
    text(n,'Observación de ejemplo',x,y+115,fw,14,C['muted'],700);rect(n,x,y+145,fw,150,C['white'],8,C['line']);text(n,'Aumentar el tamaño del nombre y revisar el margen inferior.',x+18,y+164,fw-36,17)
    note(n,'Después de revisar el ajuste, recibirás una nueva versión para aprobar.',x,y+330,fw)
    btn(n,'Enviar observación de ejemplo',x,y+455,fw,p+'seguimiento-correccion');text(n,'Volver al arte v1',x,y+535,fw,15,C['teal'],700,'center',target=p+'arte')
    footer(n,s['height']-(170 if mob else 148),w,mob)

def tracking(mob,mode='normal'):
    suffix='' if mode=='normal' else '-pendiente' if mode=='pending' else '-correccion';s,n,p,m,w=shell('seguimiento'+suffix,'Así va tu pedido','CR-001 · 500 tarjetas de presentación',mob,1640 if mob else 1120,'seguimiento')
    x=24 if mob else 80;y=300;fw=342 if mob else 800
    statuses=[('Pago','Pendiente' if mode=='pending' else 'Confirmado'),('Arte','Corrección solicitada' if mode=='correction' else 'Por aprobar' if mode=='pending' else 'V1 aprobado'),('Producción','En espera' if mode!='normal' else 'En producción')]
    for i,(a,b) in enumerate(statuses):
        xx=x if mob else x+i*435;yy=y+i*100 if mob else y;ww=fw if mob else 410
        rect(n,xx,yy,ww,84,C['white'],10);text(n,a,xx+20,yy+14,ww-40,13,C['muted']);text(n,b,xx+20,yy+39,ww-40,20,C['teal'] if mode=='normal' else C['ink'],700)
    yy=650 if mob else 440
    rect(n,x,yy,fw,446,C['white'],12);text(n,'El camino de tu impresión',x+24,yy+24,fw-48,23,C['ink'],700)
    steps=[('Pedido registrado','Configuración y archivo recibidos.'),('Revisión de diseño','Nueva versión pendiente.' if mode=='correction' else 'Aprobación pendiente.' if mode=='pending' else 'Arte v1 aprobado.'),('Producción','Se habilita al cumplir pago y arte.' if mode!='normal' else 'Preparando la impresión.'),('Listo para recoger','Te avisaremos cuando esté listo.')]
    for i,(a,b) in enumerate(steps):
        sy=yy+86+i*83;badge(n,i+1,x+24,sy);text(n,a,x+74,sy,fw-100,18,C['ink'],700);text(n,b,x+74,sy+29,fw-100,14,C['muted'])
    xx=24 if mob else 930;ny=1135 if mob else 440;nw=342 if mob else 430
    note(n,'El plazo de entrega se confirma después de la revisión. La fecha de este recorrido aún está por definir.',xx,ny,nw)
    btn(n,'Ver estado del pago' if mode=='pending' else 'Ver mis pedidos',xx,ny+150,nw,p+('pago-pendiente' if mode=='pending' else 'cuenta'),True)
    if mode=='pending':text(n,'Pago confirmado (simulación)',xx,ny+220,nw,14,C['teal'],700,target=p+'confirmacion')
    footer(n,s['height']-(170 if mob else 148),w,mob)

def quote(mob,proposal=False):
    s,n,p,m,w=shell('propuesta' if proposal else 'cotizacion','Tu propuesta está lista' if proposal else 'Cuéntanos tu idea','Cotización de ejemplo CT-001 · Sin cobro al solicitar.',mob,1510 if mob else 1180,'cotizacion')
    x=24 if mob else 80;y=300;fw=342 if mob else 760
    if proposal:
        pill(n,'PROPUESTA V1 · DEMO',x,y,225);text(n,'Un pedido a tu medida',x,y+65,fw,28,C['ink'],700)
        text(n,'500 tarjetas · Diseño y producción\n9 × 5 cm · Couché 300 g · Mate',x,y+125,fw,18,C['muted'])
        for i,(a,b) in enumerate([('Producción','S/ 85.00'),('Diseño','S/ 25.00'),('Recojo','S/ 0.00'),('Total de ejemplo','S/ 110.00')]):
            yy=y+235+i*60;text(n,a,x,yy,fw-135,16,C['muted']);text(n,b,x+fw-135,yy,135,18,C['ink'],700,'right');rule(n,x,yy+38,fw)
        note(n,'Propuesta v1. El pago requerido del escenario es S/ 110.00. Plazo y vigencia deben acordarse antes de una venta real.',x,y+510,fw)
        btn(n,'Aceptar propuesta v1',x,y+650,fw,p+'cotizacion-aceptada')
    else:
        field(n,'¿Qué necesitas imprimir?','Tarjetas con diseño personalizado',x,y,fw);field(n,'Cantidad aproximada','500 unidades',x,y+100,fw)
        text(n,'Describe tu idea',x,y+210,fw,13,C['muted'],700);rect(n,x,y+240,fw,136,C['white'],8,C['line']);text(n,'Busco una tarjeta sobria para mi emprendimiento. Necesito apoyo con el diseño.',x+16,y+258,fw-32,17)
        field(n,'Correo de contacto','cliente@example.com',x,y+410,fw);note(n,'Enviar esta solicitud no confirma un precio ni una fecha de entrega.',x,y+522,fw)
        btn(n,'Ver propuesta de ejemplo  →',x,y+640,fw,p+'propuesta')
    if not mob:
        art(n,920,300,440,330,'banner');text(n,'Hay ideas que no caben\nen una talla estándar.',920,674,440,29,C['ink'],700);text(n,'Cuéntanos formato, cantidad y objetivo. El detalle marca la diferencia.',920,774,430,18,C['muted'])
    footer(n,s['height']-(170 if mob else 148),w,mob)

def accepted(mob):
    s,n,p,m,w=shell('cotizacion-aceptada','Propuesta aceptada','CT-001 · Versión 1 · Escenario de demostración',mob,1250 if mob else 1050)
    x=24 if mob else 300;fw=342 if mob else 840;y=310
    note(n,'Diseño + 500 tarjetas · Total acordado S/ 110.00\nEntrega: recojo sin cargo en este escenario.',x,y,fw)
    text(n,'Ahora puedes continuar con el pago.',x,y+145,fw,28,C['ink'],700);text(n,'El importe conserva las condiciones de la propuesta aceptada. El diseño se enviará para aprobación antes de imprimir.',x,y+250,fw,18,C['muted'])
    btn(n,'Simular pago de S/ 110.00',x,y+410,fw,p+'cotizacion-pagada');btn(n,'Revisar propuesta',x,y+476,fw,p+'propuesta',True)
    footer(n,s['height']-(170 if mob else 148),w,mob)
    s,n,p,m,w=shell('cotizacion-pagada','Pago de propuesta confirmado','Pedido de demostración CR-002 · Cotización CT-001 v1',mob,1140 if mob else 1010)
    x=24 if mob else 300;fw=342 if mob else 840;y=330
    pill(n,'PAGO CONFIRMADO',x,y,210);text(n,'S/ 110.00',x,y+70,fw,42,C['ink'],700);text(n,'Tu diseño está en preparación.',x,y+160,fw,28,C['ink'],700);text(n,'Arte: pendiente de elaboración.\nProducción: en espera de tu aprobación.',x,y+270,fw,18,C['muted']);btn(n,'Ver mis pedidos',x,y+425,fw,p+'cuenta')
    footer(n,s['height']-(170 if mob else 148),w,mob)

def account(mob):
    s,n,p,m,w=shell('cuenta','Tu espacio creativo','Pedidos, diseños y próximas ideas en un mismo lugar.',mob,1620 if mob else 1280)
    x=24 if mob else 80;y=300;fw=342 if mob else 1280
    note(n,'Cuenta de demostración · cliente@example.com\nEsta vista muestra datos ficticios; no requiere iniciar sesión.',x,y,fw)
    text(n,'Mis pedidos',x,y+140,fw,26,C['ink'],700)
    for i,(a,b,c) in enumerate([('CR-001 · Tarjetas de presentación','500 unid. · S/ 85.00','En producción'),('CR-002 · Diseño y tarjetas','500 unid. + diseño · S/ 110.00','Diseño en preparación'),('CR-000 · Tarjetas de presentación','Pedido anterior de ejemplo','Entregado')]):
        yy=y+210+i*(280 if mob else 205);rect(n,x,yy,fw,250 if mob else 180,C['white'],12)
        text(n,a,x+24,yy+24,fw-48,20,C['ink'],700);text(n,b,x+24,yy+89,fw-48,15,C['muted']);pill(n,c,x+24,yy+127,190)
        btn(n,'Ver seguimiento' if i<2 else 'Volver a configurar',x+24 if mob else x+fw-300,yy+181 if mob else yy+62,fw-48 if mob else 276,p+('seguimiento' if i==0 else 'cotizacion-pagada' if i==1 else 'producto'),i==2)
    footer(n,s['height']-(170 if mob else 148),w,mob)

for mobile in [False,True]:
    home(mobile);catalog(mobile);product(mobile);quote(mobile);quote(mobile,True);accepted(mobile);cart(mobile);cart(mobile,True);checkout(mobile);checkout(mobile,True)
    for state in ['pago-pendiente','pago-error','confirmacion']:payment(mobile,state)
    approval(mobile);approval(mobile,True);corrections(mobile)
    for mode in ['normal','pending','correction']:tracking(mobile,mode)
    account(mobile)

n=[];cover=dict(id='guia',name='Lee primero · Guía del prototipo',device='reference',width=1440,height=1160,nodes=n);SCREENS.insert(0,cover)
rect(n,0,0,1440,1160,C['cream']);rect(n,0,0,1440,16,C['teal']);image(n,'creativa',80,70,350,117);image(n,'developer',1120,55,230,153)
text(n,'DE LA IDEA A LA IMPRESIÓN',80,235,1000,16,C['teal'],700);text(n,'Creativa\nE-commerce',80,290,1100,82,C['navy'],700)
text(n,'Prototipo navegable · Escritorio y móvil',80,518,1100,29,C['muted']);btn(n,'Abrir escritorio  →',80,596,290,'d-inicio');btn(n,'Abrir móvil  →',390,596,250,'m-inicio',True)
text(n,'Qué puedes probar',80,722,600,26,C['ink'],700)
text(n,'Catálogo → configuración → carrito → pago simulado → revisión del arte → seguimiento. También incluye cotización, correcciones y estados de pago.',80,780,760,20,C['muted'])
text(n,'Capas editables en Figma',940,724,400,24,C['ink'],700);text(n,'Textos, formas y botones nativos. Logos originales incrustados. Cada ejecución crea una página nueva.',940,775,400,18,C['muted'])
note(n,'Alcance: recorrido guiado con datos ficticios. Los campos muestran ejemplos, no reciben datos reales. Precios, catálogo y plazos requieren validación comercial. Sin pasarela de pago ni conexión al sistema interno.',80,963,1280)
n=[];kit=dict(id='sistema-visual',name='Sistema visual · Colores y componentes',device='reference',width=1440,height=1050,nodes=n);SCREENS.append(kit);rect(n,0,0,1440,1050,C['cream']);text(n,'Un sistema con identidad.',80,80,1200,52,C['navy'],700);text(n,'Base visual de la tienda Creativa',80,160,1100,22,C['muted'])
for i,(label,col) in enumerate([('Marino',C['navy']),('Verde',C['teal']),('Papel',C['cream']),('Magenta',C['pink']),('Cian',C['blue']),('Amarillo',C['yellow'])]):
    x=80+i*217;rect(n,x,250,196,130,col,10,C['line']);text(n,label,x,398,190,19,C['ink'],700);text(n,col,x,433,190,14,C['muted'])
text(n,'Tipografía / Arial',80,520,700,32,C['ink'],700);text(n,'Clara, cercana y fácil de leer.',80,579,700,23,C['muted']);btn(n,'Acción principal',80,670,260,'d-catalogo');btn(n,'Acción secundaria',365,670,260,'d-inicio',True);pill(n,'Estado confirmado',80,765,200);field(n,'Etiqueta del campo','Valor del ejemplo',760,550,550)
note(n,'Espaciado: 8, 16, 24, 40 y 80 px.\nBotones: 50 px de alto.\nPantallas: 1440 px y 390 px de ancho.',760,700,550)

def dataurl(path):return 'data:image/png;base64,'+base64.b64encode(Path(path).read_bytes()).decode()
assets={'creativa':dataurl('C:/Users/MILAGROS/Downloads/Imagen de ChatGPT 25 sept 2026, 12_08_13.png'),'developer':dataurl('C:/Users/MILAGROS/Downloads/Logotipo tecnológico STAR117 en azul.png')}
DESIGN=dict(title='Creativa Impresos · Prototipo e-commerce',description='Recorrido guiado de demostración. Sin pagos reales.',start='d-inicio',assets=assets,screens=SCREENS)
ROOT.mkdir(parents=True,exist_ok=True);(ROOT/'design.json').write_text(json.dumps(DESIGN,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
print(json.dumps({'screens':len(SCREENS),'desktop':sum(s['device']=='desktop' for s in SCREENS),'mobile':sum(s['device']=='mobile' for s in SCREENS),'json_bytes':(ROOT/'design.json').stat().st_size}))
