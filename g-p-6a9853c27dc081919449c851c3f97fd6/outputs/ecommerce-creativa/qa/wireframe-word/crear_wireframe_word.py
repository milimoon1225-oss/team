from pathlib import Path
import json
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK, WD_TAB_ALIGNMENT
from docx.enum.section import WD_SECTION_START
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

QA = Path(__file__).resolve().parent
ROOT = QA.parents[1]
OUT = ROOT/'Wireframe-ecommerce-Creativa-A4.docx'
DATA = json.loads((QA/'wireframe-data.json').read_text(encoding='utf-8'))
CLIENT = Path('C:/Users/MILAGROS/Downloads/Imagen de ChatGPT 25 sept 2026, 12_08_13.png')
DEVELOPER = Path('C:/Users/MILAGROS/Downloads/Logotipo tecnológico STAR117 en azul.png')
BLUE = RGBColor.from_string('073A8C')
GRAY = RGBColor.from_string('666666')
doc = Document()
doc.core_properties.title = 'Wireframe del comercio electrónico de Creativa Impresos'
doc.core_properties.subject = 'Wireframe comercial en A4 con portada y nuevo logotipo de la desarrolladora'
doc.core_properties.author = 'Leydy Milagros Quispe Cornejo; Johan Israel Apaza Flores; Rainer Alex Cuno Enriquez'

for style in doc.styles:
    for border in list(style.element.iter(qn('w:pBdr'))): border.getparent().remove(border)
    for fonts in style.element.iter(qn('w:rFonts')):
        for key in list(fonts.attrib):
            if key.endswith('Theme'): del fonts.attrib[key]
        for key in ['ascii','hAnsi','eastAsia','cs']: fonts.set(qn('w:'+key),'Arial')
for name in ['Normal','Title','Heading 1','Heading 2','Header','Footer']:
    st=doc.styles[name]
    st.font.name='Arial'; st.font.size=Pt(10); st.font.color.rgb=RGBColor(0,0,0)
    pf=st.paragraph_format
    pf.space_before=pf.space_after=Pt(0)
    pf.line_spacing=1
    pf.widow_control=True
    pf.first_line_indent=Pt(0)
doc.styles['Title'].font.bold=True
doc.styles['Title'].paragraph_format.keep_with_next=True
doc.styles['Heading 1'].font.bold=True
doc.styles['Heading 1'].font.size=Pt(16)
doc.styles['Heading 1'].paragraph_format.keep_with_next=True
normal=doc.styles['Normal']
lang=OxmlElement('w:lang');lang.set(qn('w:val'),'es-PE')
normal.element.get_or_add_rPr().append(lang)

def setup(s, cover=False):
    s.page_width=Pt(595.27559055); s.page_height=Pt(841.88976378)
    s.left_margin=s.right_margin=Pt(30)
    s.top_margin=Pt(34 if cover else 78)
    s.bottom_margin=Pt(30)
    s.header_distance=Pt(9)
    s.footer_distance=Pt(11)

def para(text='',size=10,bold=False,color=None,center=False,before=0,after=0,line=None,style=None):
    p=doc.add_paragraph(style=style)
    p.alignment=WD_ALIGN_PARAGRAPH.CENTER if center else WD_ALIGN_PARAGRAPH.LEFT
    pf=p.paragraph_format;pf.space_before=Pt(before);pf.space_after=Pt(after)
    if line:pf.line_spacing=Pt(line)
    r=p.add_run(text);r.font.name='Arial';r.font.size=Pt(size);r.bold=bold
    if color:r.font.color.rgb=color
    return p

def image(path,width,center=True,before=0,after=0,description=''):
    p=doc.add_paragraph()
    p.alignment=WD_ALIGN_PARAGRAPH.CENTER if center else WD_ALIGN_PARAGRAPH.LEFT
    p.paragraph_format.space_before=Pt(before);p.paragraph_format.space_after=Pt(after)
    p.paragraph_format.line_spacing=1
    r=p.add_run();shape=r.add_picture(str(path),width=Pt(width))
    shape._inline.docPr.set('descr',description)
    return p

setup(doc.sections[0],True)
# The cover uses native Word text and the two unmodified source logos.
image(DEVELOPER,150,before=0,after=5,description='Nuevo logotipo de la empresa desarrolladora de software')
para('DESARROLLADORA DE SOFTWARE',9,bold=True,color=BLUE,center=True,after=18,line=12)
para('Universidad Nacional de Juliaca',16,bold=True,color=BLUE,center=True,after=8,line=20)
para('Curso: Negocios Electrónicos',11,center=True,after=24,line=14)
para('Wireframe del comercio electrónico\nde Creativa Impresos',22,bold=True,center=True,after=18,line=27,style='Title')
image(CLIENT,380,after=8,description='Logotipo de Corporación Gráfica Creativa Impresos empresa cliente')
para('EMPRESA CLIENTE | CREATIVA IMPRESOS',9,bold=True,color=BLUE,center=True,after=19,line=12)
para('INTEGRANTES',9,bold=True,color=BLUE,center=True,after=7,line=12)
for name in ['Leydy Milagros Quispe Cornejo','Johan Israel Apaza Flores','Rainer Alex Cuno Enriquez']:
    para(name,11,center=True,line=19)
para('DOCENTE',9,bold=True,color=BLUE,center=True,before=18,after=6,line=12)
para('Roel Dante Gomez Apaza',11,center=True,line=15)
para('Fecha de elaboración: 15 de octubre de 2026',9,center=True,before=24,line=12)
para('A4 vertical | Portada y 12 vistas comerciales',8.5,color=GRAY,center=True,before=7,line=11)

section=doc.add_section(WD_SECTION_START.NEW_PAGE)
setup(section)
section.header.is_linked_to_previous=False
section.footer.is_linked_to_previous=False
header=section.header
hp=header.paragraphs[0]
hp.paragraph_format.line_spacing=Pt(1);hp.paragraph_format.space_after=Pt(0)
tb=header.add_table(rows=1,cols=2,width=Pt(535.2756))
tb.alignment=WD_TABLE_ALIGNMENT.CENTER;tb.autofit=False
tb.columns[0].width=Pt(438);tb.columns[1].width=Pt(97.2756)
for i,cell in enumerate(tb.rows[0].cells):
    cell.width=tb.columns[i].width
    cell.vertical_alignment=WD_CELL_VERTICAL_ALIGNMENT.CENTER
    tcpr=cell._tc.get_or_add_tcPr()
    borders=OxmlElement('w:tcBorders')
    for key in ['top','bottom','left','right','insideH','insideV']:
        edge=OxmlElement('w:'+key);edge.set(qn('w:val'),'nil');borders.append(edge)
    tcpr.append(borders)
    margins=OxmlElement('w:tcMar')
    for key in ['top','bottom','left','right']:
        e=OxmlElement('w:'+key);e.set(qn('w:w'),'0');e.set(qn('w:type'),'dxa');margins.append(e)
    tcpr.append(margins)
cp=tb.cell(0,0).paragraphs[0]
cp.paragraph_format.line_spacing=Pt(13)
r=cp.add_run('CREATIVA IMPRESOS');r.bold=True;r.font.size=Pt(9);r.font.color.rgb=BLUE
r=cp.add_run('\nWIREFRAME E-COMMERCE');r.font.size=Pt(8);r.font.color.rgb=GRAY
rp=tb.cell(0,1).paragraphs[0];rp.alignment=WD_ALIGN_PARAGRAPH.RIGHT
rp.paragraph_format.line_spacing=1
shape=rp.add_run().add_picture(str(DEVELOPER),width=Pt(88))
shape._inline.docPr.set('descr','Nuevo logotipo de la desarrolladora')
header.paragraphs[-1].paragraph_format.line_spacing=Pt(1)
fp=section.footer.paragraphs[0]
fp.paragraph_format.tab_stops.add_tab_stop(Pt(535.2756),WD_TAB_ALIGNMENT.RIGHT)
rr=fp.add_run('Propuesta conceptual | Productos e importes de ejemplo\t');rr.font.size=Pt(7);rr.font.color.rgb=GRAY
fld=OxmlElement('w:fldSimple');fld.set(qn('w:instr'),'PAGE')
rr=OxmlElement('w:r');tt=OxmlElement('w:t');tt.text='2';rr.append(tt);fld.append(rr);fp._p.append(fld)

for idx,(code,title) in enumerate(DATA['PAGES'],1):
    data=DATA['DATA'][str(idx)]
    if idx==1:
        data['subtitle']='Dos formas de pedir; una sola operación interna. El mapa resume los recorridos de compra, cotización y seguimiento.'
    p=para(f'{code}  {title}',16,bold=True,after=4,line=20,style='Heading 1')
    if idx>1:p.paragraph_format.page_break_before=True
    # Native titles, subtitles and notes remain editable in Word.
    subtitle=para(data['subtitle'],8.5,color=GRAY,after=6,line=10.5)
    subtitle.paragraph_format.keep_with_next=True
    image(QA/'screens'/f'screen-{idx:02d}.png',535.0,after=8,
          description=f'{code} {title} vista conceptual de la tienda')
    p=para('ANOTACIONES DE LA PANTALLA',8.8,bold=True,color=GRAY,after=5,line=11)
    p.paragraph_format.keep_with_next=True
    for number,ntitle,body in data['notes']:
        p=doc.add_paragraph()
        p.paragraph_format.line_spacing=Pt(11.5)
        p.paragraph_format.space_after=Pt(5)
        p.paragraph_format.keep_together=True
        r=p.add_run(f'{number}  {ntitle}. ');r.bold=True;r.font.size=Pt(9.2)
        r=p.add_run(body);r.font.size=Pt(9.2)

# Avoid inherited Word title borders and theme-font substitutions.
for p in doc.paragraphs:
    for bd in list(p._p.iter(qn('w:pBdr'))):bd.getparent().remove(bd)
doc.save(OUT)
info={'output':str(OUT),'sections':len(doc.sections),'views':len(DATA['PAGES']),
      'native_text_paragraphs':len(doc.paragraphs),'inline_images':len(doc.inline_shapes),
      'format':'A4 portrait','developer_logo':str(DEVELOPER)}
(QA/'word-build.json').write_text(json.dumps(info,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(info,ensure_ascii=False))
