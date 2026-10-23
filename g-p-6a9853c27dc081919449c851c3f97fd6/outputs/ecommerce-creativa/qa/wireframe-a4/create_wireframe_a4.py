from pathlib import Path
from copy import copy
import ast
import json
import hashlib

from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph
from reportlab.lib.utils import ImageReader
from pypdf import PdfReader, PdfWriter, Transformation
from pypdf.generic import RectangleObject
from pypdf.annotations import Link
import pypdfium2 as pdfium
from PIL import Image, ImageDraw

QA=Path(__file__).resolve().parent
ROOT=QA.parents[1]
SOURCE=ROOT/'Wireframe-ecommerce-Creativa.pdf'
SOURCE_SCRIPT=ROOT/'qa'/'wireframe'/'create_wireframe.py'
OUT=ROOT/'Wireframe-ecommerce-Creativa-A4.pdf'
PREVIEW=ROOT/'Portada-wireframe-ecommerce-Creativa-A4.png'
CLIENT=Path('C:/Users/MILAGROS/Downloads/Imagen de ChatGPT 25 sept 2026, 12_08_13.png')
DEVELOPER=Path('C:/Users/MILAGROS/AppData/Local/Temp/codex-clipboard-28eaf4f9-cbdf-4d15-ad9b-f076428adc8c.png')
QA.mkdir(parents=True,exist_ok=True)
original_hash=hashlib.sha256(SOURCE.read_bytes()).hexdigest()
logo_hashes={str(p):hashlib.sha256(p.read_bytes()).hexdigest() for p in [CLIENT,DEVELOPER]}
pdfmetrics.registerFont(TTFont('Arial','C:/Windows/Fonts/arial.ttf'))
pdfmetrics.registerFont(TTFont('Arial-Bold','C:/Windows/Fonts/arialbd.ttf'))
pdfmetrics.registerFontFamily('Arial',normal='Arial',bold='Arial-Bold',italic='Arial',boldItalic='Arial-Bold')
W,H=A4
BLACK=colors.HexColor('#222222');MID=colors.HexColor('#666666')
LINE=colors.HexColor('#C4C4C4');BLUE=colors.HexColor('#073A8C');CYAN=colors.HexColor('#00ACDF')
WHITE=colors.white
overflow=[]

tree=ast.parse(SOURCE_SCRIPT.read_text(encoding='utf-8'))
PAGES=[];DATA={};current=None
for node in tree.body:
    if isinstance(node,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='PAGES' for t in node.targets):
        PAGES=ast.literal_eval(node.value)
    if isinstance(node,ast.Expr) and isinstance(node.value,ast.Call) and isinstance(node.value.func,ast.Name):
        call=node.value
        if call.func.id=='header':
            current=ast.literal_eval(call.args[0]);DATA[current]={'subtitle':ast.literal_eval(call.args[1]),'notes':[]}
        elif call.func.id=='note' and current is not None:
            DATA[current]['notes'].append(tuple(ast.literal_eval(a) for a in call.args[:3]))
assert len(PAGES)==12 and len(DATA)==12
assert all(len(v['notes'])==5 for v in DATA.values())
# Referencias estables tras incorporar la portada; no cambia la fuente anterior.
DATA[2]['notes']=[(n,t,b.replace('La página 11 adapta','La vista WF-11 adapta')) for n,t,b in DATA[2]['notes']]

def txt(c,s,x,y,size=10,bold=False,color=BLACK):
    c.setFillColor(color);c.setFont('Arial-Bold' if bold else 'Arial',size)
    c.drawString(x,H-y-size*.83,s)

def para(c,s,x,y,w,size=9,leading=None,bold=False,color=BLACK,maxh=None,align=0):
    p=Paragraph(s,ParagraphStyle('p',fontName='Arial-Bold' if bold else 'Arial',fontSize=size,
                 leading=leading or size*1.28,textColor=color,alignment=align))
    _,hh=p.wrap(w,1000)
    if maxh is not None and hh>maxh+.1:overflow.append((s[:60],hh,maxh))
    p.drawOn(c,x,H-y-hh)
    return hh

def logo(c,path,x,y,w):
    im=Image.open(path);hh=w*im.height/im.width
    c.drawImage(ImageReader(str(path)),x,H-y-hh,width=w,height=hh,mask='auto',preserveAspectRatio=True)
    return hh

def line(c,x1,y1,x2,y2,color=LINE,width=.6):
    c.setStrokeColor(color);c.setLineWidth(width);c.line(x1,H-y1,x2,H-y2)

def button(c,s,x,y,w,target):
    c.setFillColor(WHITE);c.setStrokeColor(LINE);c.roundRect(x,H-y-18,w,18,3,stroke=1,fill=1)
    c.setFillColor(BLACK);c.setFont('Arial',7.3);c.drawCentredString(x+w/2,H-y-12,s)
    c.linkRect('',target,(x,H-y-18,x+w,H-y),relative=0,thickness=0)

base_path=QA/'base-a4.pdf'
c=canvas.Canvas(str(base_path),pagesize=A4)
c.setTitle('Wireframe del comercio electrónico de Creativa Impresos - A4')
c.setAuthor('STAR1117 | Leydy Milagros Quispe Cornejo; Johan Israel Apaza Flores; Rainer Alex Cuno Enriquez')
c.setSubject('Wireframe académico de e-commerce; vistas A4 vertical con anotaciones')

# Portada: las dos marcas se insertan desde sus archivos originales, sin edición.
c.bookmarkPage('COVER');c.addOutlineEntry('Portada','COVER',level=0)
c.setFillColor(CYAN);c.rect(0,H-7,W,7,stroke=0,fill=1)
logo(c,DEVELOPER,212,28,171)
para(c,'DESARROLLADORA | STAR1117',30,155,W-60,8.7,bold=True,color=BLUE,align=1)
para(c,'Universidad Nacional de Juliaca',30,188,W-60,16,bold=True,color=BLUE,align=1)
para(c,'Curso: Negocios Electrónicos',30,218,W-60,11,align=1)
para(c,'Wireframe del comercio electrónico<br/>de Creativa Impresos',37,263,W-74,23,leading=29,bold=True,color=BLUE,maxh=65,align=1)
logo(c,CLIENT,106,346,383)
para(c,'EMPRESA CLIENTE | CREATIVA IMPRESOS',30,488,W-60,8.5,bold=True,color=BLUE,align=1)
line(c,180,515,W-180,515,CYAN,1)
para(c,'INTEGRANTES',30,539,W-60,9.2,bold=True,color=BLUE,align=1)
para(c,'Leydy Milagros Quispe Cornejo<br/>Johan Israel Apaza Flores<br/>Rainer Alex Cuno Enriquez',30,564,W-60,11.5,leading=24,align=1)
para(c,'DOCENTE',30,660,W-60,9.2,bold=True,color=BLUE,align=1)
para(c,'Roel Dante Gomez Apaza',30,683,W-60,11.5,align=1)
para(c,'Fecha de elaboración: 15 de octubre de 2026',30,738,W-60,9.5,align=1)
para(c,'Versión A4 vertical | Portada y 12 vistas comerciales',30,764,W-60,8.5,color=MID,align=1)
button(c,'Ver mapa y recorrido',222,799,151,'WF-01')
c.showPage()

for i,(code,title) in enumerate(PAGES,1):
    c.bookmarkPage(code);c.addOutlineEntry(code+' | '+title,code,level=0)
    logo(c,DEVELOPER,W-123,12,93)
    txt(c,'CREATIVA IMPRESOS',30,26,9,bold=True,color=BLUE)
    txt(c,'WIREFRAME E-COMMERCE',30,43,8,color=MID)
    txt(c,f'Pantalla {i:02d} / 12',30,60,8,color=MID)
    para(c,code+'  '+title,30,86,W-60,16.4,leading=19.4,bold=True,maxh=21)
    para(c,DATA[i]['subtitle'],30,115,W-60,8.2,leading=10.4,color=MID,maxh=22)
    line(c,30,548,W-30,548)
    txt(c,'ANOTACIONES DE LA PANTALLA',30,559,8.1,bold=True,color=MID)
    for idx,(num,ntitle,body) in enumerate(DATA[i]['notes']):
        col=idx%2;row=idx//2;x=30+col*277;y=582+row*66
        c.setFillColor(BLACK);c.circle(x+7,H-y-7,7,stroke=0,fill=1)
        c.setFillColor(WHITE);c.setFont('Arial-Bold',7.4);c.drawCentredString(x+7,H-y-9.5,str(num))
        para(c,ntitle,x+22,y,235,9.1,bold=True,maxh=13)
        para(c,body,x+22,y+16,235,8.7,leading=11.1,maxh=45)
    line(c,30,790,W-30,790)
    txt(c,'Propuesta conceptual | Productos, importes y plazos de ejemplo',30,801,7,color=MID)
    txt(c,f'{i+1:02d} / 13',30,821,7.3,bold=True)
    button(c,'Portada',329,810,49,'COVER')
    button(c,'Mapa',384,810,44,'WF-01')
    if i>1:button(c,'Anterior',434,810,61,PAGES[i-2][0])
    if i<12:button(c,'Siguiente',501,810,64,PAGES[i][0])
    c.showPage()
c.save()
assert not overflow,overflow

# Área comercial vectorial, reubicada sin convertirla a una imagen pequeña.
reader=PdfReader(str(base_path));src=PdfReader(str(SOURCE));writer=PdfWriter()
writer.append(reader)
source_page_map={p.indirect_reference.idnum:i for i,p in enumerate(src.pages)}
source_h=float(src.pages[0].mediabox.height)
crop=RectangleObject([30,source_h-519,595,source_h-106])
scale=(W-60)/565
main_top=145
main_height=413*scale
tx=30-30*scale
ty=H-main_top-main_height-scale*float(crop.bottom)
tr=Transformation().scale(scale).translate(tx,ty)
pending_links=[]
for idx,source_page in enumerate(src.pages):
    page=copy(source_page)
    if '/Annots' in page:del page['/Annots']
    page.cropbox=RectangleObject(list(crop))
    writer.pages[idx+1].merge_transformed_page(page,tr,over=True)
    for ann in source_page.get('/Annots',[]):
        obj=ann.get_object()
        if obj.get('/Subtype')!='/Link' or '/Dest' not in obj:continue
        a,b,d,e=map(float,obj['/Rect'])
        if a>=30-.1 and d<=595+.1 and b>=float(crop.bottom)-.1 and e<=float(crop.top)+.1:
            dest=obj['/Dest'][0]
            target=source_page_map.get(dest.idnum)
            if target is not None:
                pending_links.append((idx+1,[a*scale+tx,b*scale+ty,d*scale+tx,e*scale+ty],target+1))

# Solo reemplaza las etiquetas tipográficas de marca por el logo original.
overlay_path=QA/'logos-interfaces.pdf'
o=canvas.Canvas(str(overlay_path),pagesize=A4)
o.showPage()
def source_rect(x,y,w,h):
    return x*scale+tx,H-(source_h-y)*scale-ty,w*scale,h*scale
for i in range(1,13):
    placements=[]
    if 2<=i<=10:placements=[(44,134,116,38,46,135,108)]
    if i in [11,12]:placements=[(x+11,142,94,31,x+13,143,82) for x in [30,225,421]]
    for x,y,w,h,lx,ly,lw in placements:
        dx,dy,dw,dh=source_rect(x,y,w,h)
        o.setFillColor(WHITE);o.rect(dx,H-dy-dh,dw,dh,stroke=0,fill=1)
        px,py,_,_=source_rect(lx,ly,1,1)
        logo(o,CLIENT,px,py,lw*scale)
    o.showPage()
o.save()
overlay=PdfReader(str(overlay_path))
for idx in range(13):writer.pages[idx].merge_page(overlay.pages[idx],over=True)
for source_index,rect,target in pending_links:
    added=writer.add_annotation(source_index,Link(rect=rect,target_page_index=target))
    added['/Dest'][0]=writer.pages[target].indirect_reference
writer.add_metadata({'/Title':'Wireframe del comercio electrónico de Creativa Impresos - A4',
 '/Author':'STAR1117 | Grupo del curso Negocios Electrónicos',
 '/Subject':'Universidad Nacional de Juliaca | Comercio electrónico | Elaboración: 15 octubre 2026'})
with OUT.open('wb') as f:writer.write(f)

final=PdfReader(str(OUT))
assert len(final.pages)==13
for p in final.pages:
    assert abs(float(p.mediabox.width)-W)<.02 and abs(float(p.mediabox.height)-H)<.02
page_ids={p.indirect_reference.idnum for p in final.pages}
links=[a.get_object() for p in final.pages for a in p.get('/Annots',[]) if a.get_object().get('/Subtype')=='/Link']
for a in links:
    dest=a.get('/Dest')
    if dest:assert dest[0].idnum in page_ids
assert hashlib.sha256(SOURCE.read_bytes()).hexdigest()==original_hash
assert all(hashlib.sha256(Path(p).read_bytes()).hexdigest()==v for p,v in logo_hashes.items())

pdf=pdfium.PdfDocument(str(OUT));thumbs=[]
for i in range(len(pdf)):
    im=pdf[i].render(scale=1.75).to_pil().convert('RGB')
    im.save(QA/f'page-{i+1:02d}.png')
    if i==0:im.save(PREVIEW)
    th=im.copy();th.thumbnail((372,527))
    tile=Image.new('RGB',(392,558),'#DDDDDD');tile.paste(th,((392-th.width)//2,10))
    ImageDraw.Draw(tile).text((12,540),'PORTADA' if i==0 else PAGES[i-1][0],fill='black')
    thumbs.append(tile)
for start in range(0,len(thumbs),6):
    sheet=Image.new('RGB',(392*3,558*2),'white')
    for j,tile in enumerate(thumbs[start:start+6]):sheet.paste(tile,((j%3)*392,(j//3)*558))
    sheet.save(QA/f'contact-{start+1:02d}-{min(start+6,len(thumbs)):02d}.png')
audit={'output':str(OUT),'preview':str(PREVIEW),'pages':13,'format':'A4 portrait',
       'vector_screen_scale':scale,'source_preserved_sha256':original_hash,'logos_preserved_sha256':logo_hashes,
       'links':len(links),'screen_links_rebuilt':len(pending_links),'paragraph_overflow':overflow,
       'rendered_pages':13,'visual_review':'pending'}
(QA/'audit.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(audit,ensure_ascii=False,indent=2))
