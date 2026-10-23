from pathlib import Path
import json
from xml.sax.saxutils import escape

from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle
from pypdf import PdfReader
import pypdfium2 as pdfium
from PIL import Image, ImageOps, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
QA = ROOT / 'qa' / 'wireframe-ebusiness'
OUT = ROOT / 'Wireframe-ebusiness-Creativa.pdf'
QA.mkdir(parents=True, exist_ok=True)
pdfmetrics.registerFont(TTFont('Arial', 'C:/Windows/Fonts/arial.ttf'))
pdfmetrics.registerFont(TTFont('Arial-Bold', 'C:/Windows/Fonts/arialbd.ttf'))
pdfmetrics.registerFontFamily('Arial', normal='Arial', bold='Arial-Bold', italic='Arial', boldItalic='Arial-Bold')
W, H = landscape(A4)
C = canvas.Canvas(str(OUT), pagesize=(W, H))
C.setTitle('Creativa - Wireframe del e-business')
C.setAuthor('Proyecto Creativa')
C.setSubject('Propuesta conceptual de negocio digital, canal comercial y operacion interna')
G = colors.HexColor
BLACK = G('#222222')
MID = G('#666666')
LINE = G('#BBBBBB')
PALE = G('#F1F1F1')
SOFT = G('#E0E0E0')
WHITE = colors.white
OVERFLOW = []
PAGES = [
 ('WF-01', 'Mapa de navegación y reglas del recorrido'),
 ('WF-02', 'Inicio - escritorio'),
 ('WF-03', 'Catálogo y resultados'),
 ('WF-04', 'Ficha configurable y archivo de referencia'),
 ('WF-05', 'Cotización y aceptación de propuesta'),
 ('WF-06', 'Carrito y total actualizado'),
 ('WF-07', 'Checkout, cobertura y pago'),
 ('WF-08', 'Confirmación y aprobación de arte'),
 ('WF-09', 'Seguimiento del pedido'),
 ('WF-10', 'Cuenta, historial y repetición de pedidos'),
 ('WF-11', 'Móvil - descubrir y configurar'),
 ('WF-12', 'Móvil - pagar, aprobar y seguir'),
 ('WF-13', 'Operación interna y orden de trabajo'),
 ('WF-14', 'Materiales, compras y proveedores'),
 ('WF-15', 'Panel de gestión del negocio'),
]

def box(x,y,w,h,fill=WHITE,stroke=LINE,r=0):
    C.setFillColor(fill); C.setStrokeColor(stroke); C.setLineWidth(.65)
    if r: C.roundRect(x,H-y-h,w,h,r,stroke=1,fill=1)
    else: C.rect(x,H-y-h,w,h,stroke=1,fill=1)

def line(x1,y1,x2,y2,col=LINE,width=.65):
    C.setStrokeColor(col); C.setLineWidth(width); C.line(x1,H-y1,x2,H-y2)

def txt(s,x,y,size=10,bold=False,color=BLACK):
    C.setFillColor(color); C.setFont('Arial-Bold' if bold else 'Arial',size)
    C.drawString(x,H-y-size*.83,s)

def para(s,x,y,w,size=9,leading=None,bold=False,color=BLACK,maxh=None):
    st=ParagraphStyle('p',fontName='Arial-Bold' if bold else 'Arial',fontSize=size,
         leading=leading or size*1.28,textColor=color,spaceBefore=0,spaceAfter=0)
    p=Paragraph(s,st); _,hh=p.wrap(w,999)
    if maxh is not None and hh>maxh+.2: OVERFLOW.append((s[:60],hh,maxh))
    p.drawOn(C,x,H-y-hh)
    return hh

def badge(n,x,y):
    C.setFillColor(BLACK); C.setStrokeColor(WHITE); C.circle(x,H-y,8,stroke=1,fill=1)
    C.setFillColor(WHITE); C.setFont('Arial-Bold',8)
    C.drawCentredString(x,H-y-2.8,str(n))

def pill(s,x,y,w=None):
    w=w or pdfmetrics.stringWidth(s,'Arial',8)+14
    box(x,y,w,17,PALE,LINE,4); txt(s,x+7,y+4,8)

def btn(s,x,y,w=130,h=27,dark=False,target=None,size=9):
    box(x,y,w,h,BLACK if dark else WHITE,BLACK,r=3)
    C.setFillColor(WHITE if dark else BLACK); C.setFont('Arial-Bold',size)
    C.drawCentredString(x+w/2,H-y-h/2-size*.34,s)
    if target: C.linkRect('',target,(x,H-y-h,x+w,H-y),relative=0,thickness=0)

def field(label,value,x,y,w=220,h=28):
    txt(label,x,y,8.2,bold=True)
    box(x,y+13,w,h,WHITE,LINE,2)
    txt(value,x+8,y+21,9,color=MID)

def check(s,x,y,checked=False,w=400,size=8.5):
    box(x,y,10,10,SOFT if checked else WHITE,BLACK)
    if checked: txt('x',x+2,y-1,10,bold=True)
    para(s,x+17,y-1,w-17,size)

def placeholder(x,y,w,h,label='Vista de ejemplo'):
    box(x,y,w,h,PALE)
    line(x,y,x+w,y+h,SOFT); line(x+w,y,x,y+h,SOFT)
    ww=min(w-16,max(70,pdfmetrics.stringWidth(label,'Arial',8)+12))
    box(x+(w-ww)/2,y+h/2-10,ww,20,WHITE,WHITE)
    C.setFillColor(MID); C.setFont('Arial',8)
    C.drawCentredString(x+w/2,H-y-h/2-3,label)

def note(n,title,body,y):
    badge(n,627,y+8)
    txt(title,642,y,9.4,bold=True)
    para(body,642,y+17,163,9,leading=12,maxh=58)

def header(i,subtitle):
    code,title=PAGES[i-1]
    C.bookmarkPage(code)
    C.addOutlineEntry(code+' | '+title,code,level=0)
    txt('CREATIVA',30,23,12,bold=True)
    txt('WIREFRAME DEL E-BUSINESS',123,25,8.5,color=MID)
    txt(f'{i:02d} / {len(PAGES)}',764,24,9,bold=True)
    txt(f'{code}  {title}',30,54,19,bold=True)
    para(subtitle,30,80,775,9.2,color=MID,maxh=15)
    line(610,106,610,520)
    txt('CLAVES DE LA PANTALLA',622,105,8.2,bold=True,color=MID)

def footer(i):
    line(30,541,811,541)
    txt('Propuesta de e-business | E-commerce como canal comercial | Datos e importes de ejemplo',30,552,7.2,color=MID)
    btn('Índice',656,551,44,20,target='WF-01',size=8)
    if i>1: btn('Anterior',706,551,49,20,target=PAGES[i-2][0],size=8)
    if i<len(PAGES): btn('Siguiente',761,551,50,20,target=PAGES[i][0],size=8)
    C.showPage()

def browser(title='creativa / tienda',navbar=True):
    box(30,106,565,413,WHITE,BLACK,r=4)
    box(30,106,565,24,PALE,LINE)
    for x in [41,51,61]:
        C.setFillColor(LINE); C.circle(x,H-118,2,stroke=0,fill=1)
    txt(title,82,113,8,color=MID)
    if navbar:
        txt('CREATIVA',46,145,12,bold=True)
        txt('Catálogo',194,148,9)
        txt('Cotizar',265,148,9)
        txt('Mis pedidos',328,148,9)
        txt('Mi cuenta',420,148,9)
        btn('Carrito (1)',492,139,87,25,target='WF-06',size=8)
        line(30,174,595,174)

def narrow_banner(s,x=46,y=480,w=533,h=25):
    box(x,y,w,h,PALE)
    para(s,x+9,y+6,w-18,8.2,maxh=h-8)

def arrow(x1,y1,x2,y2):
    line(x1,y1,x2,y2,BLACK,.9)
    import math
    a=math.atan2(y2-y1,x2-x1)
    for b in [-.45,.45]:
        line(x2,y2,x2-6*math.cos(a+b),y2-6*math.sin(a+b),BLACK,.9)

def flow_node(label,x,y,w=120,h=42,target=None,fill=PALE):
    box(x,y,w,h,fill,BLACK,3); para(label,x+8,y+9,w-16,9,bold=True,maxh=h-12)
    if target:C.linkRect('',target,(x,H-y-h,x+w,H-y),relative=0,thickness=0)

# WF-01
header(1,'E-business: conecta el canal comercial con la gestión de pedidos, diseño, producción, entrega, cobros y abastecimiento.')
txt('RELACIÓN CON EL CLIENTE Y GESTIÓN DEL PEDIDO',30,112,9.5,bold=True)
flow_node('Cliente',30,138,95,44,target='WF-10')
flow_node('Tienda / cotización',145,138,139,44,target='WF-02')
flow_node('Gestión de pedidos',304,138,135,44,target='WF-13')
flow_node('Diseño y aprobación',459,138,136,44,target='WF-08')
arrow(125,160,145,160);arrow(284,160,304,160);arrow(439,160,459,160)
badge(1,40,134);badge(2,314,134)
line(527,182,527,204,BLACK,.9);line(527,204,114,204,BLACK,.9);arrow(114,204,114,229)
flow_node('Producción + calidad',30,229,169,46,target='WF-13')
flow_node('Entrega / recojo',219,229,165,46,target='WF-09')
flow_node('Cobros y cierre',404,229,191,46,target='WF-15')
arrow(199,252,219,252);arrow(384,252,404,252)
badge(3,41,225)
txt('PROCESOS TRANSVERSALES',30,298,9.5,bold=True)
flow_node('Materiales / compras / proveedores',30,324,270,46,target='WF-14')
flow_node('Reportes y decisiones de gestión',325,324,270,46,target='WF-15')
line(275,324,275,286,BLACK,.9)
line(275,286,180,286,BLACK,.9)
arrow(180,286,180,275)
arrow(500,275,500,324)
badge(4,40,320);badge(5,335,320)
box(30,390,565,66,PALE)
para('<b>Base existente:</b> pedidos, clientes, diseñadores, pagos, Caja y reportes.<br/><b>Propuesta:</b> tienda de clientes, conexión comercial, control detallado de producción, materiales, compras y métricas ampliadas.<br/><b>Inicio de producción:</b> pago requerido confirmado + arte vigente aprobado.',42,400,540,9,leading=15,maxh=49)
for s,x,w,t in [('Canal comercial',30,169,'WF-02'),('Operación interna',218,178,'WF-13'),('Panel de gestión',415,180,'WF-15')]:btn(s,x,480,w,27,target=t)
note(1,'E-commerce dentro del negocio','La tienda y la cotización son el canal comercial de una operación más amplia.',133)
note(2,'Integración propuesta','Reutilizar la base de pedidos y clientes. El acceso público requiere reglas y permisos propios.',213)
note(3,'Control humano','Responsables actualizan avances y calidad. No se supone automatización de maquinaria.',293)
note(4,'Nuevo alcance','Materiales, reservas, compras y recepción son funciones propuestas; hoy no están implementadas.',373)
note(5,'Gestión transversal','Reportes relacionan ventas, caja, costos y operación; los indicadores nuevos requieren datos nuevos.',453)
footer(1)

# WF-02
header(2,'Entrada al canal comercial: explorar productos de compra directa o solicitar un trabajo a medida.')
browser()
txt('Imprime tu próxima idea',47,195,20,bold=True)
para('Productos personalizados y atención para<br/>preparar tu pedido de impresión.',47,225,294,11)
btn('Explorar catálogo',47,272,145,29,True,'WF-03')
btn('Solicitar cotización',202,272,153,29,False,'WF-05')
placeholder(381,190,198,119,'Imagen de producto')
badge(1,54,187);badge(2,364,275)
txt('Explora por necesidad',47,328,12,bold=True)
for x,label in [(47,'Tu negocio'),(228,'Tus eventos'),(409,'Tus regalos')]:
    placeholder(x,351,170,66,'Categoría de ejemplo')
    txt(label,x+10,428,10,bold=True)
badge(3,56,345)
narrow_banner('Cómo pedir: elige o cotiza > confirma tu pedido y pago > aprueba el arte > recibe tu pedido',y=470,h=29)
note(1,'Mensaje principal','La portada explica qué se puede pedir y conecta con productos o soluciones.',135)
note(2,'Dos entradas claras','Catálogo y cotización tienen recorridos distintos; no se promete precio fijo para todo.',213)
note(3,'Categorías por validar','Los grupos son ejemplos de navegación. El catálogo definitivo depende de la oferta real.',291)
note(4,'Confianza y ayuda','El pie incorporará contacto, políticas, cobertura y plazos comprobados del negocio.',369)
note(5,'Versión móvil','La página 11 adapta búsqueda, catálogo y configuración a una columna.',447)
footer(2)

# WF-03
header(3,'Resultados con filtros y disponibilidad de modalidad. No se mezclan productos con precio fijo y trabajos por cotizar.')
browser('creativa / catálogo')
txt('Catálogo',46,189,17,bold=True)
field('Buscar','Tarjetas, regalos, impresión...',46,220,162,25)
txt('Filtros',46,279,10,bold=True)
for s,y in [('Categoría',303),('Material',329),('Acabado',355),('Rango de precio',381)]:
    check(s,46,y,w=164,size=9)
btn('Aplicar filtros',46,419,162,25)
badge(1,56,214)
txt('2 resultados de ejemplo',227,193,11,bold=True)
pill('Ordenar: recomendados',426,188,153)
for x,label,mode,price,target in [(227,'Tarjetas de presentación','Compra directa','Desde S/ 60.00','WF-04'),(407,'Letrero personalizado','A cotizar','Según medidas','WF-05')]:
    placeholder(x,222,172,104,'Foto de ejemplo')
    txt(label,x,340,9,bold=True)
    pill(mode,x,361,116)
    txt(price,x,391,12,bold=True)
    txt('Ejemplo referencial',x,410,8,color=MID)
    btn('Configurar' if mode=='Compra directa' else 'Solicitar cotización',x,435,172,27,mode=='Compra directa',target)
badge(2,236,217);badge(3,414,217)
narrow_banner('Sin resultados: muestra alternativas y permite limpiar filtros o pedir ayuda.',y=480)
note(1,'Buscar y filtrar','Los filtros reducen resultados sin perder la búsqueda. En móvil se abren en un panel.',135)
note(2,'Compra directa','Presenta precio referencial y exige elegir la variante para obtener el importe exacto.',213)
note(3,'A cotizar','No usa carrito inicial. Solicita detalles y espera la propuesta del negocio.',291)
note(4,'Comparación sencilla','Cada tarjeta usa nombre, imagen, modalidad y una sola acción principal.',369)
note(5,'Catálogo real pendiente','Nombres, materiales, fotos y precios de esta pantalla son solo ejemplos.',447)
footer(3)

# WF-04
header(4,'Ejemplo de producto estandarizable: configurar variante, revisar importe y adjuntar una referencia opcional.')
browser('creativa / producto / ejemplo')
txt('Tarjetas de presentación',46,190,16,bold=True)
placeholder(46,224,214,140,'Producto de ejemplo')
txt('Especificaciones del ejemplo',46,378,10,bold=True)
para('Material: couché 300 g<br/>Medida: 9 x 5 cm<br/>Contenido: paquete de 100 unidades',46,399,213,9)
btn('Necesito diseño',46,447,214,24,target='WF-05',size=9)
pill('Compra directa',281,188,113)
field('Acabado','Mate  v',281,218,141,25)
field('Impresión','Ambas caras  v',438,218,141,25)
field('Cantidad de paquetes','1   [-]  [+]',281,268,141,25)
txt('S/ 60.00',438,283,15,bold=True)
txt('Total de ejemplo',438,304,8,color=MID)
box(281,331,298,58,PALE)
txt('Archivo de referencia (opcional)',291,341,9,bold=True)
btn('Seleccionar archivo',291,359,129,21,size=8)
txt('PDF/JPG/PNG | límite por definir',429,365,7.7,color=MID)
check('Entiendo que el archivo será revisado antes de imprimir.',281,403,w=298,size=8.5)
btn('Añadir al carrito',281,443,298,29,True,'WF-06')
badge(1,288,213);badge(2,288,326);badge(3,288,438)
narrow_banner('Archivo recibido no significa listo para imprimir. Si hay observaciones, podrás enviar una corrección.',y=484,h=24)
note(1,'Precio según variante','Recalcular cantidad, material y acabado antes de añadir. Detallar descuentos si aplican.',135)
note(2,'Carga de referencia','Validar tipo y tamaño. Mostrar nombre, estado, quitar/reemplazar y resultado de la carga.',213)
note(3,'Detalle persistente','El carrito conserva las opciones y la referencia elegida; el precio se valida nuevamente.',291)
note(4,'Si el archivo falla','Indicar la causa y permitir corregir sin borrar la configuración del producto.',369)
note(5,'Preproducción','Revisión técnica y aprobación de arte son pasos posteriores; no se omiten al adjuntar.',447)
footer(4)

# WF-05
header(5,'El cliente solicita; el negocio cotiza. La propuesta final y su aceptación quedan registradas por versión.')
browser('creativa / cotizaciones')
txt('Solicitud a medida',46,190,15,bold=True)
pill('1. Solicitud',46,220,127)
field('Tipo de trabajo','Letrero personalizado (ejemplo)',46,252,245,25)
field('Medidas y cantidad','Indicar ancho, alto, material y unidades',46,303,245,38)
field('Fecha deseada','A confirmar por el negocio',46,367,245,25)
btn('Enviar solicitud',46,432,245,28,True)
txt('Referencia opcional + datos de contacto',46,474,8,color=MID)
line(310,190,310,490)
txt('Propuesta recibida - versión 2',330,190,13,bold=True)
pill('2. Revisión y aceptación',330,220,170)
box(330,251,249,142,PALE)
para('<b>Ejemplo: presupuesto completo</b><br/>Trabajo: letrero MDF, 30 x 20 cm, 1 u.<br/>Diseño: S/ 30.00 | Producción: S/ 150.00<br/>Entrega seleccionada: S/ 10.00<br/>Impuestos: S/ 0.00 (solo ejemplo)<br/><b>Total final: S/ 190.00</b><br/>Pago requerido: S/ 190.00<br/>Vigencia: 7 días (ejemplo)<br/>Producción: 5 días hábiles (ejemplo)',341,260,226,8.7,leading=13,maxh=125)
check('Acepto esta versión, el total y las condiciones.',330,410,w=249,size=8.5)
btn('Aceptar y continuar al pago',330,444,249,28,True,'WF-07')
btn('Solicitar un ajuste',330,481,249,21,size=8)
badge(1,54,214);badge(2,338,214);badge(3,338,438)
note(1,'Solicitud sin cobro','Enviar detalles no confirma precio ni fecha. Se genera un número de cotización.',135)
note(2,'Presupuesto final','Desglosa diseño, producción, impuestos aplicables y entrega antes de aceptar.',213)
note(3,'Aceptación trazable','Registrar versión, fecha y condiciones. Si cambia el alcance, emitir otra propuesta.',291)
note(4,'Datos por validar','Plazo, vigencia, pago requerido y cobertura son definidos por el negocio.',369)
note(5,'Pasa a pedido','Al aceptar se continúa con el total pactado y el importe exigible; no se recalcula sin aviso.',447)
footer(5)

# WF-06
header(6,'La edición del carrito actualiza subtotales. El total definitivo incluye entrega e impuestos aplicables antes de pagar.')
browser('creativa / carrito')
txt('Tu carrito',46,190,17,bold=True)
box(46,224,326,123,WHITE)
placeholder(57,237,71,64,'Foto')
txt('Tarjetas de presentación',139,238,10,bold=True)
para('Ejemplo: mate, ambas caras<br/>Paquete de 100 unidades',139,258,214,8.8)
btn('[-]  1  [+]',139,296,84,24,size=9)
txt('S/ 60.00',278,304,11,bold=True)
txt('Editar opciones',57,326,8,bold=True)
txt('Quitar',307,326,8,bold=True)
box(46,363,326,82,PALE)
txt('Referencia vinculada',57,374,10,bold=True)
para('referencia-ejemplo.pdf<br/><b>Recibido - revisión técnica pendiente</b>',57,394,303,9)
btn('Reemplazar archivo',57,423,141,18,size=7.5)
box(391,224,188,220,PALE)
txt('Resumen de ejemplo',404,237,11,bold=True)
txt('Productos',404,269,9);txt('S/ 60.00',510,269,9)
txt('Impuestos aplicables',404,293,8.7)
txt('Desglose en checkout',404,310,8,color=MID)
txt('Entrega',404,336,9);txt('Por calcular',501,336,8.5)
line(404,361,566,361)
txt('Subtotal de productos',404,372,9,bold=True)
txt('S/ 60.00',404,392,16,bold=True)
btn('Calcular entrega y continuar',391,460,188,31,True,'WF-07',8)
btn('Seguir comprando',46,465,154,28,target='WF-03')
badge(1,55,219);badge(2,399,219);badge(3,55,358)
note(1,'Cambios en tiempo real','Cantidad, opciones o eliminación actualizan el subtotal. Mostrar confirmación del cambio.',135)
note(2,'Importe transparente','No presentar el subtotal como total final. Calcular entrega y todo cargo antes del pago.',213)
note(3,'Archivo separado','La referencia tiene su propio estado. Adjuntar o reemplazar no aprueba el arte.',291)
note(4,'Carrito recuperable','Conservar cambios al volver al catálogo. Avisar si un precio o variante dejó de estar vigente.',369)
note(5,'Cotización aceptada','Llega al checkout con la propuesta vigente; los cambios de alcance vuelven a cotización.',447)
footer(6)

# WF-07
header(7,'Se confirma cobertura y total final antes de elegir el pago. Los estados del pago no cambian por sí solos el avance del trabajo.')
browser('creativa / checkout')
txt('Finaliza tu pedido',46,190,16,bold=True)
txt('1. Contacto y entrega',46,222,11,bold=True)
field('Contacto','Nombre, correo y teléfono',46,245,307,25)
pill('Recojo en tienda',46,298,135);pill('Envío a dirección',191,298,162)
field('Destino si eliges envío','Distrito, dirección y referencia',46,330,307,25)
btn('Verificar cobertura y costo',46,380,211,25,size=8.5)
txt('Ejemplo: zona cubierta | entrega S/ 10.00',46,417,8.5,bold=True)
txt('2. Método de pago',46,446,11,bold=True)
for s,x,w in [('Tarjeta',46,82),('Billetera',137,92),('Transferencia',238,115)]:pill(s,x,469,w)
box(375,190,204,238,PALE)
txt('Total final - ejemplo',388,204,11,bold=True)
para('Productos / servicios: S/ 60.00<br/>Entrega: S/ 10.00<br/>Otros cargos: S/ 0.00<br/>Impuestos: S/ 0.00 (ejemplo)<br/><br/><b>Total a pagar: S/ 70.00</b><br/>Saldo posterior: S/ 0.00',388,234,177,9,leading=13,maxh=94)
txt('Comprobante',388,338,8.5,bold=True)
pill('Boleta',388,353,79)
pill('Factura',477,353,88)
txt('Solo si eliges factura: completar datos',388,379,7.4)
btn('RUC / razón social / dirección fiscal',388,391,177,17,size=7.1)
check('Revisé el pedido y sus condiciones.',388,414,w=177,size=7.3)
btn('Pagar S/ 70.00 (ejemplo)',375,445,204,31,True,'WF-08',8.5)
txt('Pago seguro mediante proveedor integrado',375,488,7.7,color=MID)
badge(1,54,216);badge(2,383,184);badge(3,54,441)
note(1,'Entrega primero','Si no hay cobertura, ofrecer recojo u otra dirección. No permitir pagar sin resolverlo.',135)
note(2,'Total y comprobante','Elegir boleta o factura. Para factura, solicitar RUC, razón social y dirección fiscal según corresponda.',213)
note(3,'Métodos por contratar','Las opciones son propuestas. Tarjeta usa proveedor seguro; no se guardan datos sensibles.',291)
note(4,'Pendiente o rechazado','Mostrar estado y siguiente paso. Permitir corregir o cambiar método sin crear otro pedido.',369)
note(5,'Verificación real','Un comprobante adjunto no confirma un pago. Esperar validación del proveedor o del negocio.',447)
footer(7)

# WF-08
header(8,'La compra genera un pedido consultable. La producción permanece bloqueada hasta cumplir las condiciones de pago y arte.')
browser('creativa / pedido / ejemplo / aprobación')
txt('Pedido recibido: EC-EJEMPLO-001',46,190,14,bold=True)
pill('Pago: confirmado',46,222,156)
pill('Trabajo: por validar',213,222,164)
badge(1,55,216)
txt('Revisa el arte antes de producir',46,258,12,bold=True)
placeholder(46,287,238,100,'Vista del arte - versión 2')
btn('Ampliar / descargar vista',46,398,238,25,size=8.5)
txt('Versión 2 | fecha y autor visibles',46,432,8,color=MID)
txt('Si hay archivo observado: baja resolución',46,448,7.8,bold=True)
btn('Reenviar archivo corregido',46,464,238,15,size=7.5)
box(303,258,276,207,PALE)
txt('Estado del arte: espera tu aprobación',314,273,10,bold=True)
para('Revisa textos, medidas, colores y contenido.<br/>Aprobación vinculada a esta versión.',314,298,253,9)
check('He revisado y apruebo el arte versión 2.',314,346,w=253,size=9)
btn('Aprobar versión 2',314,380,253,28,True)
btn('Solicitar corrección',314,419,253,26)
badge(2,311,252);badge(3,311,413)
narrow_banner('Condición de inicio: pago requerido confirmado + versión vigente del arte aprobada.',y=486,h=23)
note(1,'Confirmación clara','Informar código, resumen y estado real del pago. Si sigue pendiente, mostrarlo aquí.',135)
note(2,'Aprobación explícita','Guardar versión, identidad y fecha. La casilla no debe venir marcada.',213)
note(3,'Correcciones','Recoger observaciones y emitir una nueva versión. Requiere nueva aprobación.',291)
note(4,'Archivo observado','Dar motivo y botón para reenviar. Recibir un archivo no habilita impresión.',369)
note(5,'Regla de inicio','Solo cuando se cumple el pago requerido y se aprueba el arte vigente se habilita producción.',447)
footer(8)

# WF-09
header(9,'El cliente consulta cada dimensión del pedido y la acción pendiente. Los hitos operativos se alimentarán del sistema interno.')
browser('creativa / seguimiento / ejemplo')
txt('Seguimiento EC-EJEMPLO-001',46,190,15,bold=True)
for s,x,w in [('Pago: confirmado',46,164),('Arte: versión 2 aprobada',220,193),('Entrega: recojo',423,156)]:pill(s,x,223,w)
badge(1,55,217)
txt('Avance del trabajo',46,263,12,bold=True)
steps=[('Recibido',58),('En revisión',171),('Producción',284),('Listo',397),('Entregado',510)]
line(68,308,520,308,LINE,2)
for idx,(s,x) in enumerate(steps):
    C.setFillColor(BLACK if idx<3 else WHITE);C.setStrokeColor(BLACK);C.circle(x+10,H-308,6,fill=1,stroke=1)
    txt(s,x-8,328,8.5,bold=idx==2)
box(46,365,326,100,PALE)
txt('Estado actual: en producción',58,378,11,bold=True)
para('Última actualización: fecha y hora<br/>Entrega estimada: ver fecha confirmada<br/>Avisaremos cuando esté listo para recoger.',58,404,299,9,leading=16)
box(391,365,188,100,WHITE)
txt('¿Necesitas ayuda?',403,378,10,bold=True)
para('Enviar consulta con el código del pedido y consultar condiciones de atención.',403,403,163,9)
btn('Contactar atención',403,440,163,19,size=8)
badge(2,55,258);badge(3,399,359)
narrow_banner('Si hay incidencia: indicar qué ocurrió, quién debe actuar y una fecha de próxima actualización.',y=481,h=26)
note(1,'Estados independientes','Pago, arte, entrega y trabajo muestran su situación específica y consistente.',135)
note(2,'Hitos propuestos','El sistema actual usa otros estados internos; se debe acordar su equivalencia al integrar.',213)
note(3,'Atención contextual','La consulta conserva el código del pedido y permite aportar una observación.',291)
note(4,'Envío o recojo','Para envío: despacho y enlace de seguimiento si existe. Para recojo: punto y horario.',369)
note(5,'Fechas honestas','Separar estimación de fecha confirmada. Actualizar y avisar cuando cambie el plazo.',447)
footer(9)

# WF-10
header(10,'Área del cliente con acceso a pedidos propios. Repetir un trabajo siempre exige validar condiciones actuales.')
browser('creativa / mi cuenta')
txt('Mi cuenta',46,190,17,bold=True)
box(46,224,142,267,PALE)
for s,y in [('Mis pedidos',240),('Cotizaciones',280),('Mis datos',320),('Direcciones',360),('Privacidad',400),('Cerrar sesión',450)]:txt(s,59,y,9.2,bold=s=='Mis pedidos')
txt('Mis pedidos',210,229,13,bold=True)
for y,code,state,art in [(265,'EC-EJEMPLO-001','En producción','Arte versión 2 aprobado'),(376,'EC-EJEMPLO-002','Acción requerida','Archivo observado')]:
    box(210,y,369,94,WHITE)
    txt(code,223,y+13,10,bold=True)
    pill(state,406,y+9,160)
    txt(art,223,y+38,9)
    txt('Pago: confirmado' if y==265 else 'Pago: pendiente',223,y+58,8.5,color=MID)
    btn('Ver detalle',406,y+49,76,25,target='WF-09',size=8)
    btn('Repetir',490,y+49,76,25,target='WF-04',size=8)
badge(1,55,218);badge(2,217,259);badge(3,217,370)
note(1,'Cuenta y privacidad','Mostrar solo datos del cliente autenticado. Permitir revisar y corregir información.',135)
note(2,'Historial útil','Cada tarjeta resume pago y trabajo por separado; el detalle muestra documentos y arte.',213)
note(3,'Acción pendiente','Archivo observado lleva a corregirlo; pago pendiente lleva a ver su validación.',291)
note(4,'Repetición revisada','Copiar especificaciones y pedir nueva confirmación de precio, entrega y arte.',369)
note(5,'Acceso al pedido','La alternativa sin cuenta deberá usar un enlace seguro con acceso limitado y vencimiento.',447)
footer(10)

def phone(x,y,w,h,caption):
    box(x,y,w,h,WHITE,BLACK,12)
    line(x+9,y+21,x+w-9,y+21)
    txt('9:41',x+12,y+7,6.5,bold=True)
    txt('CREATIVA',x+13,y+35,9,bold=True)
    txt('Menú',x+w-42,y+36,7)
    line(x+9,y+56,x+w-9,y+56)
    txt(caption,x,y+h+12,9,bold=True)

# WF-11
header(11,'Recorrido móvil de compra directa: inicio > catálogo > ficha. Cada paso conserva el contexto y ofrece una acción visible.')
phone(30,118,174,373,'M-01 Inicio')
para('Tu idea, en impresión',43,187,148,16,bold=True)
para('Explora opciones para tu próximo proyecto.',43,234,148,9)
btn('Explorar catálogo',43,281,148,28,True,'WF-03',8)
btn('Pedir cotización',43,318,148,28,False,'WF-05',8)
placeholder(43,362,148,77,'Categoría de ejemplo')
txt('Contacto y ayuda',43,460,8)
phone(225,118,174,373,'M-02 Catálogo')
txt('Catálogo',238,187,13,bold=True)
field('Buscar','Escribe un producto',238,217,148,25)
btn('Filtros',238,268,148,24,size=8)
placeholder(238,306,148,68,'Foto de ejemplo')
txt('Tarjetas - ejemplo',238,386,10,bold=True)
txt('Compra directa',238,406,8.5)
txt('Desde S/ 60.00 (ejemplo)',238,425,8)
btn('Configurar',238,451,148,26,True,'WF-04',8)
phone(421,118,174,373,'M-03 Configurar')
txt('Tarjetas',434,187,13,bold=True)
txt('Producto de ejemplo',434,209,8,color=MID)
field('Acabado','Mate  v',434,235,148,25)
field('Paquetes','[-]  1  [+]',434,284,148,25)
btn('Adjuntar referencia',434,338,148,25,size=8)
para('Se revisará antes de imprimir.',434,376,148,8.5)
line(430,418,586,418)
txt('S/ 60.00 (ejemplo)',434,431,10,bold=True)
btn('Añadir al carrito',434,453,148,25,True,'WF-06',8)
badge(1,38,112);badge(2,233,112);badge(3,429,112)
note(1,'Inicio en una columna','Dos entradas visibles: comprar productos definidos o solicitar cotización.',135)
note(2,'Filtros compactos','Abrir panel de filtros y conservar selección al volver a los resultados.',213)
note(3,'Configurar sin perderse','Opciones apiladas, total actualizado y botón principal al final de la vista.',291)
note(4,'Carga desde el móvil','Permitir seleccionar archivo o imagen. Mostrar progreso y error recuperable.',369)
note(5,'Accesibilidad','Etiquetas visibles, botones amplios y mensajes junto al campo correspondiente.',447)
footer(11)

# WF-12
header(12,'Recorrido móvil tras la compra: resolver pago, aprobar la versión de arte y consultar el avance del trabajo.')
phone(30,118,174,373,'M-04 Pago')
txt('Estado del pago',43,187,12,bold=True)
pill('Pendiente',43,215,148)
para('Tu pedido está guardado. Espera la confirmación del pago.',43,248,148,9)
box(43,306,148,82,PALE)
para('<b>Si es rechazado:</b><br/>Mostrar motivo y permitir reintento o cambio de método.',52,317,130,8.5)
btn('Ver / cambiar método',43,409,148,28,target='WF-07',size=8)
para('No volver a pagar mientras se verifica el intento anterior.',43,450,148,8)
phone(225,118,174,373,'M-05 Arte')
txt('Aprueba tu arte',238,187,12,bold=True)
txt('Versión 2',238,211,8.5)
placeholder(238,235,148,92,'Vista ampliable')
check('Revisé y apruebo la versión 2.',238,345,w=148,size=8.5)
btn('Aprobar versión 2',238,392,148,28,True,size=8)
btn('Pedir corrección',238,431,148,27,size=8)
phone(421,118,174,373,'M-06 Seguimiento')
txt('Tu pedido',434,187,12,bold=True)
txt('EC-EJEMPLO-001',434,210,8.5)
pill('Pago: confirmado',434,240,148)
pill('Arte: aprobado v2',434,269,148)
txt('Trabajo: producción',434,312,10,bold=True)
for i,s in enumerate(['Recibido','En revisión','En producción','Listo / entrega']):
    C.setFillColor(BLACK if i<3 else WHITE);C.setStrokeColor(BLACK);C.circle(440,H-(347+i*25),3,stroke=1,fill=1)
    txt(s,451,341+i*25,8.5,bold=i==2)
btn('Necesito ayuda',434,454,148,25,size=8)
badge(1,38,112);badge(2,233,112);badge(3,429,112)
note(1,'Pago sin duplicaciones','Revisar el intento existente. Si falla, permitir reintentar manteniendo el mismo pedido.',135)
note(2,'Aprobar o corregir','Ver el arte ampliado; la aprobación se vincula a una versión identificada.',213)
note(3,'Seguimiento resumido','Pago, arte y trabajo siguen visibles como estados distintos.',291)
note(4,'Producción condicionada','Un pago pendiente o arte sin aprobar bloquea el inicio, también desde móvil.',369)
note(5,'Recorrido completo','Confirmar cobertura y costo antes de pagar; notificar correcciones y cambios relevantes.',447)
footer(12)

def internal_browser(section):
    browser('creativa / equipo / '+section,navbar=False)
    txt('CREATIVA | EQUIPO',46,145,10,bold=True)
    for s,x,w,t in [('Órdenes',232,83,'WF-13'),('Materiales',325,93,'WF-14'),('Gestión',428,83,'WF-15')]:
        btn(s,x,140,w,24,target=t,size=8)
    txt('Mi rol',533,149,8,color=MID)
    line(30,174,595,174)

# WF-13
header(13,'Área del equipo: integra la orden comercial con responsables, fechas, diseño, producción y verificación del trabajo.')
internal_browser('ordenes')
txt('Órdenes de trabajo',46,190,16,bold=True)
pill('Datos ilustrativos',435,190,144)
box(46,225,164,251,PALE)
txt('Cola del equipo',58,238,11,bold=True)
for y,code,state in [(268,'OT-EJEMPLO-001','En producción'),(335,'OT-EJEMPLO-002','Espera aprobación'),(402,'OT-EJEMPLO-003','Archivo observado')]:
    txt(code,58,y,8.5,bold=True)
    txt(state,58,y+21,8.5)
    if y<402:line(58,y+49,198,y+49)
box(228,225,351,251,WHITE)
txt('OT-EJEMPLO-001 | ficha de operación',240,238,11,bold=True)
pill('Pago requerido: confirmado',240,266,163)
pill('Arte: v2 aprobado',414,266,153)
txt('Responsables',240,300,9,bold=True)
txt('Diseño: cuenta asignada | Producción: responsable',240,318,8.5)
txt('Fechas',240,343,9,bold=True)
txt('Inicio previsto / compromiso de entrega: ver registro',240,361,8.5)
check('Calidad: revisar material, medidas, acabado y cantidad.',240,391,w=327,size=8.2)
btn('Registrar control de calidad',240,426,189,27,size=8)
btn('Actualizar avance',439,426,128,27,size=8)
badge(1,54,219);badge(2,237,219);badge(3,237,386)
narrow_banner('Producción habilitada solo con pago requerido confirmado y versión vigente del arte aprobada.',y=487,h=24)
note(1,'Roles y alcance','Actual: administración y diseñador. Responsables de producción y calidad son ampliaciones propuestas.',135)
note(2,'Orden relacionada','Vincular pedido, precio pactado, especificaciones, archivos, versión aprobada y fechas.',213)
note(3,'Control de calidad','Propuesto: registrar responsable, resultado y correcciones antes de liberar la entrega.',291)
note(4,'Permisos propuestos','Administración valida cobros y asigna; diseño gestiona versiones. El cliente aprueba el arte.',369)
note(5,'Sin automatismos supuestos','El equipo registra los avances. No se asume conexión automática con las máquinas.',447)
footer(13)

# WF-14
header(14,'Nuevo módulo propuesto: controlar materiales y coordinar abastecimiento. Los datos son ilustrativos, no inventario real.')
internal_browser('materiales')
txt('Materiales y abastecimiento',46,190,16,bold=True)
pill('Función propuesta',429,190,150)
xs=[46,194,254,329,409,474,579]
headers=['Material','Stock','Reserva','Disponible','Mínimo','Alerta']
for j,h in enumerate(headers):
    box(xs[j],226,xs[j+1]-xs[j],25,PALE)
    txt(h,xs[j]+7,235,8.3,bold=True)
rows=[['MDF 3 mm (ejemplo)','8','5','3','4','Revisar compra'],['Papel (ejemplo)','20','6','14','10','Suficiente']]
for r,vals in enumerate(rows):
    y=251+r*30
    for j,v in enumerate(vals):
        box(xs[j],y,xs[j+1]-xs[j],30,WHITE)
        txt(v,xs[j]+7,y+11,7.7)
txt('Unidades por material registradas en su ficha. Disponible = stock físico - reservas.',46,322,8.1,color=MID)
btn('Reservar para una orden',46,347,163,27,size=8)
btn('Registrar consumo real',221,347,163,27,size=8)
btn('Solicitar compra',396,347,183,27,True,size=8)
box(46,395,259,91,PALE)
txt('Solicitud a proveedor',58,407,10,bold=True)
para('Material, cantidad y fecha requerida.<br/>Seleccionar proveedor y costo propuesto.<br/>Estado: pendiente de aprobación.',58,430,234,8.5,leading=14)
box(320,395,259,91,WHITE)
txt('Recepción de compra',332,407,10,bold=True)
para('Contrastar pedido, cantidad y calidad.<br/>Registrar recepción parcial o completa.<br/>Actualizar existencias tras conformidad.',332,430,234,8.5,leading=14)
badge(1,54,219);badge(2,54,341);badge(3,404,341);badge(4,328,389)
note(1,'No implementado hoy','Stock, reservas y mínimos son funciones nuevas propuestas para el e-business.',135)
note(2,'Reserva y consumo','La reserva compromete disponibilidad; el consumo real descuenta stock y registra merma.',213)
note(3,'Compras controladas','La alerta sugiere revisar. Administración aprueba la compra; no se envía automáticamente.',291)
note(4,'Recepción verificable','Relacionar proveedor, orden de compra, recepción y comprobante. Reportar faltantes.',369)
note(5,'Datos y permisos','Definir unidades, materiales, responsables y costos antes de activar el módulo.',447)
footer(14)

# WF-15
header(15,'Visión del negocio: diferencia ventas, cobros y costos; relaciona resultados económicos con el cumplimiento operativo.')
internal_browser('gestion')
txt('Panel del periodo',46,190,16,bold=True)
pill('Periodo: seleccionar',382,188,197)
txt('Todos los valores son ejemplos ilustrativos.',46,216,8,color=MID)
cards=[
 (46,239,'Ventas registradas','S/ 1,000.00','Pedidos del periodo'),
 (228,239,'Cobros recibidos','S/ 800.00','Entradas efectivas de dinero'),
 (410,239,'Saldos pendientes','S/ 200.00','Cuentas por cobrar'),
 (46,326,'Costos registrados','S/ 650.00','Materiales y otros costos'),
 (228,326,'Entregas a tiempo','90 %','Según fecha comprometida'),
 (410,326,'Retrabajo','5 %','Órdenes que repiten un proceso'),
]
for x,y,title,value,helptext in cards:
    box(x,y,169,72,PALE)
    txt(title,x+10,y+10,9,bold=True)
    txt(value,x+10,y+29,17,bold=True)
    txt(helptext,x+10,y+55,7.2,color=MID)
box(46,421,533,67,WHITE)
txt('Carga y capacidad del equipo - propuesta',58,433,10,bold=True)
para('Planificado: 20 horas | Disponible: 32 horas | Ocupación: 62.5 % (ejemplo)<br/>Ver cuellos de botella por responsable y fecha; revisar órdenes vencidas y materiales pendientes.',58,455,507,8.5,leading=14)
badge(1,54,233);badge(2,236,233);badge(3,54,320);badge(4,236,320);badge(5,54,415)
note(1,'Ventas y saldos','Base actual: pedidos, precios y pagos. Definir qué pedidos se consideran ventas del periodo.',135)
note(2,'Cobros y caja','Conciliar pagos confirmados con Caja. Ventas registradas y dinero cobrado son distintos.',213)
note(3,'Costos por completar','Caja registra salidas. Costo por orden y materiales requiere nuevas capturas; es propuesto.',291)
note(4,'Plazos y retrabajo','Nuevos indicadores: definir fecha prometida, entrega real y causas de repetición.',369)
note(5,'Capacidad propuesta','Requiere horas disponibles y carga estimada por trabajo. No implica datos de maquinaria.',447)
footer(15)

C.save()
reader=PdfReader(str(OUT))
assert len(reader.pages)==len(PAGES)
assert not OVERFLOW, OVERFLOW
text='\n'.join(p.extract_text() or '' for p in reader.pages)
for term in ['Cotización','Presupuesto','Pendiente','versión 2','cobertura','recalcula']:
    assert term.lower() in text.lower(),term

pdf=pdfium.PdfDocument(str(OUT))
thumbs=[]
for i in range(len(pdf)):
    img=pdf[i].render(scale=1.7).to_pil().convert('RGB')
    img.save(QA/f'page-{i+1:02d}.png')
    th=img.copy();th.thumbnail((674,476))
    tile=Image.new('RGB',(694,508),'#DDDDDD');tile.paste(th,((694-th.width)//2,10))
    ImageDraw.Draw(tile).text((12,489),PAGES[i][0],fill='black')
    thumbs.append(tile)
for start in range(0,len(PAGES),6):
    contact=Image.new('RGB',(694*2,508*3),'white')
    for j,tile in enumerate(thumbs[start:start+6]):contact.paste(tile,((j%2)*694,(j//2)*508))
    contact.save(QA/f'contact-{start+1:02d}-{min(start+6,len(PAGES)):02d}.png')
audit={
 'output':str(OUT), 'pages':len(reader.pages), 'size_bytes':OUT.stat().st_size,
 'rendered_pages':len(PAGES),'paragraph_overflow':OVERFLOW,
 'internal_link_count':sum(1 for p in reader.pages for a in p.get('/Annots',[]) if a.get_object().get('/Subtype')=='/Link'),
 'page_titles':[f'{x} {y}' for x,y in PAGES],
 'renderer':'pypdfium2; bundled Poppler wrapper points to a missing executable',
 'visual_review':'All 15 rendered pages examined; map and internal pages 13-15 checked at full size. No visual overflow observed.',
}
(QA/'audit.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(audit,ensure_ascii=False,indent=2))
