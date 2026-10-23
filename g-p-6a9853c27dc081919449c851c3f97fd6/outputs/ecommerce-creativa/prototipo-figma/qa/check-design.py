from pathlib import Path
import json
root=Path(__file__).resolve().parents[1]
d=json.loads((root/'design.json').read_text('utf8'))
ids={s['id'] for s in d['screens']};errors=[];links=0;layers=0
def walk(nodes,ww,hh,sid):
    global links,layers
    for node in nodes:
        layers+=1
        if node.get('target'):
            links+=1
            if node['target'] not in ids:errors.append((sid,'missing target',node['target']))
        if node['x']<-.5 or node['y']<-.5 or node['x']+node['w']>ww+.5 or node['y']+node['h']>hh+.5:
            errors.append((sid,'outside bounds',node['name'],[node['x'],node['y'],node['w'],node['h']],[ww,hh]))
        if node.get('children'):walk(node['children'],node['w'],node['h'],sid+'/'+node['name'])
for s in d['screens']:
    walk(s['nodes'],s['width'],s['height'],s['id'])
    for i,n in enumerate(s['nodes']):
        if n['type']=='rect' and n['w']==s['width'] and n['fill']=='#FFFFFF' and n['y']>700:
            for prev in s['nodes'][1:i]:
                if prev['y']+prev['h']>n['y']-16:errors.append((s['id'],'footer collision',prev['name']))
out=dict(screens=len(ids),layers=layers,links=links,errors=errors)
(root/'qa/design-audit.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),'utf8')
print(json.dumps(out,ensure_ascii=True,indent=2))
