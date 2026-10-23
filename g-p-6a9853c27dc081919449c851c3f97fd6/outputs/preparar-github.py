from pathlib import Path
import shutil, json, re

root = Path(__file__).resolve().parents[1]
dest = root / 'github' / 'team'
if not (dest / '.git').is_dir():
    raise SystemExit('Primero debe existir el clon del repositorio de destino.')

def copiar(origen, destino):
    src, out = root / origen, dest / destino
    out.parent.mkdir(parents=True, exist_ok=True)
    if src.is_dir():
        shutil.copytree(src, out, dirs_exist_ok=True)
    else:
        shutil.copy2(src, out)

for folder in ['src', 'public']:
    copiar(f'caja-config-app/{folder}', f'caja-config-app/{folder}')
for name in ['package.json','package-lock.json','index.html','vite.config.js','build-pwa.mjs','.env.example','CAJA-SIN-CONEXION.md','PRUEBA-DEL-EQUIPO.md']:
    copiar(f'caja-config-app/{name}', f'caja-config-app/{name}')
for file in (root/'caja-config-app').glob('verificar*.mjs'):
    copiar(file.relative_to(root), file.relative_to(root))
for name in ['main.cjs','seguridad.cjs','package.json','package-lock.json','scripts','test','LEEME.md']:
    copiar(f'creativa-escritorio/{name}', f'creativa-escritorio/{name}')
for file in (root/'pedido-validacion').glob('probar-*.mjs'):
    copiar(file.relative_to(root), file.relative_to(root))
for name in ['package.json','pnpm-lock.yaml']:
    copiar(f'pedido-validacion/{name}', f'pedido-validacion/{name}')
copiar('pedido-update/src/services/pedidoService.js','pedido-validacion/fixtures/pedidoService.js')

mapping = {
 'pedido-update/supabase/activar-pedidos.sql':'supabase/migrations/001-pedidos.sql',
 'adjuntos-update/codigos-y-archivos.sql':'supabase/migrations/002-adjuntos.sql',
 'clientes-update/activar-clientes.sql':'supabase/migrations/003-clientes.sql',
 'pagos-update/activar-abonos.sql':'supabase/migrations/004-abonos.sql',
 'caja-config-app/activar-caja-config.sql':'supabase/migrations/005-caja-configuracion.sql',
 'caja-config-app/activar-disenadores.sql':'supabase/migrations/006-disenadores.sql',
 'caja-config-app/activar-reportes.sql':'supabase/migrations/007-reportes.sql',
 'caja-config-app/activar-caja-offline.sql':'supabase/migrations/008-caja-offline.sql',
 'pedido-update/supabase/autorizar-equipo.sql':'supabase/plantillas/autorizar-equipo.sql',
 'pedido-update/supabase/tipos-iniciales.sql':'supabase/plantillas/tipos-iniciales.sql',
}
for src, out in mapping.items(): copiar(src,out)
for file in (dest/'pedido-validacion').glob('*.mjs'):
    text = file.read_text(encoding='utf-8')
    for src, out in mapping.items(): text = text.replace('../'+src,'../'+out)
    text = text.replace('../pedido-update/src/services/pedidoService.js','./fixtures/pedidoService.js')
    file.write_text(text,encoding='utf-8')

for file in list((dest/'caja-config-app').glob('verificar*.mjs'))+[dest/'creativa-escritorio/test/aplicacion.mjs']:
    text = file.read_text(encoding='utf-8')
    text = re.sub(r"'file:///C:/Users/MILAGROS/[^']+/playwright/index.mjs'", "'playwright'", text)
    text = text.replace("'C:/Users/MILAGROS/creativa-mila/.env.local'", "new URL('./.env.local', import.meta.url)")
    file.write_text(text,encoding='utf-8')
for file in (dest/'caja-config-app').glob('*.md'):
    text=file.read_text(encoding='utf-8')
    for src,out in mapping.items(): text=text.replace(Path(src).name,'../'+out)
    file.write_text(text,encoding='utf-8')
readme=dest/'creativa-escritorio/LEEME.md'
text=readme.read_text(encoding='utf-8').replace('Los scripts de prueba de esta máquina referencian su Playwright disponible; en otra máquina hay que ajustar esa importación.', 'Instala las herramientas de prueba con `npm ci` desde la raíz del repositorio. Las pruebas importan Playwright como dependencia normal.')
readme.write_text(text,encoding='utf-8')
print('Código copiado sin .env.local, .git de Sites, dependencias, builds ni instaladores.')
