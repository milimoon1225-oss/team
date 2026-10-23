import { cp, mkdir, readFile, writeFile, readdir, lstat, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const origen = path.resolve(raiz, '../caja-config-app/dist');
const destino = path.join(raiz, 'web');
const html = await readFile(path.join(origen, 'index.html'), 'utf8');
if (!html.includes('type="module"') || html.includes('/src/main')) throw new Error('Primero compila caja-config-app. No se empaqueta el servidor de desarrollo.');

async function inspeccionar(carpeta) {
  const archivos = [];
  for (const nombre of await readdir(carpeta)) {
    const ruta = path.join(carpeta, nombre);
    const info = await lstat(ruta);
    if (info.isSymbolicLink()) throw new Error('La web compilada no debe contener enlaces simbólicos.');
    if (info.isDirectory()) archivos.push(...await inspeccionar(ruta));
    else if (info.isFile()) archivos.push(ruta);
  }
  return archivos;
}
const archivos = await inspeccionar(origen);
if (path.dirname(destino) !== raiz || path.basename(destino) !== 'web') throw new Error('Destino inesperado.');
await rm(destino, { recursive: true, force: true });
await mkdir(destino, { recursive: true });
await cp(origen, destino, { recursive: true, dereference: false });
const huellas = {};
for (const archivo of archivos) huellas[path.relative(origen, archivo).replaceAll('\\', '/')] = createHash('sha256').update(await readFile(archivo)).digest('hex');
await writeFile(path.join(destino, 'version-escritorio.json'), JSON.stringify({ compilado: new Date().toISOString(), archivos: huellas }, null, 2));
console.log(`Interfaz local preparada: ${archivos.length} archivos.`);
