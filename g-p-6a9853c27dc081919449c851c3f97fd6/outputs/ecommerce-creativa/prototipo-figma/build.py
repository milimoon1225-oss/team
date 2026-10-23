"""Regenera el plugin y la vista previa a partir de design.json. Python 3, sin dependencias."""
from pathlib import Path
import json

ROOT=Path(__file__).resolve().parent
data=json.loads((ROOT/'design.json').read_text(encoding='utf-8'))
encoded=json.dumps(data,ensure_ascii=False,separators=(',',':'))
runtime=(ROOT/'figma-plugin/runtime.js').read_text(encoding='utf-8')
(ROOT/'figma-plugin/code.js').write_text('const DESIGN = '+encoded+';\n'+runtime,encoding='utf-8')
template=(ROOT/'preview-template.html').read_text(encoding='utf-8')
marker='/*__DESIGN__*/'
if template.count(marker)!=1:raise ValueError('La plantilla debe contener un marcador de diseño.')
# Escape script end tags in inline data without altering rendered text.
html=template.replace(marker,encoded.replace('<','\\u003c').replace('\u2028','\\u2028').replace('\u2029','\\u2029'))
(ROOT/'Prototipo-Creativa.html').write_text(html,encoding='utf-8')
print('Plugin y vista previa generados. Pantallas:',len(data['screens']))
