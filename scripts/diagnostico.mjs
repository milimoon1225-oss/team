// Diagnóstico de la copia de desarrollo. No instala ni descarga componentes.
import { readFile, access, open, statfs } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { createOllamaClient } from '../src/infrastructure/assistant/ollama-client.js';

const root=fileURLToPath(new URL('../',import.meta.url));
const manifest=JSON.parse(await readFile(path.join(root,'package.json'),'utf8'));
const full=process.argv.includes('--modelo');
const rows=[];
function add(estado,comprobacion,detalle){rows.push({estado,comprobacion,detalle});}
const [major,minor]=process.versions.node.split('.').map(Number);
add(major>22||(major===22&&minor>=12)?'OK':'ERROR','Node.js',`${process.versions.node}; recomendado: Node.js 24 LTS. Solo es necesario para desarrollar.`);
add('INFO','Entorno',`${process.platform} ${process.arch}. La descarga publicada es para Windows x64.`);
const missing=[];
for(const name of Object.keys({...manifest.dependencies,...manifest.devDependencies})){
  try{await access(path.join(root,'node_modules',name,'package.json'));}catch{missing.push(name);}
}
add(missing.length?'ERROR':'OK','Dependencias',missing.length?`Faltan: ${missing.join(', ')}. Ejecuta npm ci.`:'Las dependencias declaradas están presentes.');
try {
  const relative=(await readFile(path.join(root,'node_modules/electron/path.txt'),'utf8')).trim();
  const executable=process.env.ELECTRON_OVERRIDE_DIST_PATH?path.join(process.env.ELECTRON_OVERRIDE_DIST_PATH,relative):path.join(root,'node_modules/electron/dist',relative);
  await access(executable);add('OK','Motor Electron','Está descargado para este entorno.');
}catch{add('ERROR','Motor Electron','Ejecuta npm run setup:desktop con conexión a internet.');}
add('INFO','Memoria',`${(os.totalmem()/1024**3).toFixed(1)} GiB físicos. Para trabajar con IA se recomiendan 16 GB; no es un mínimo certificado.`);
try{const fs=await statfs(root);add('INFO','Disco',`${(Number(fs.bavail)*Number(fs.bsize)/1024**3).toFixed(1)} GiB libres. Para la primera preparación completa se recomiendan 15 GB libres, incluidos Ollama, Qwen y archivos temporales.`);}catch{/* Algunas plataformas no proporcionan esta información. */}
if(process.platform==='linux'&&!process.env.DISPLAY&&!process.env.WAYLAND_DISPLAY)add('AVISO','Escritorio gráfico','No se detecta una sesión gráfica. npm start necesita escritorio; las pruebas automatizadas utilizan su configuración propia.');
let file;
try {
  file=await open(path.join(root,'distribucion/windows/Creativa-Operaciones-0.3.1-x64-Portable.exe'),'r');const sample=Buffer.alloc(180);await file.read(sample,0,sample.length,0);
  if(sample.toString().startsWith('version https://git-lfs.github.com/spec/v1'))add('AVISO','Portable descargado','Es un puntero Git LFS. Para abrir el .exe descarga la Release o ejecuta git lfs pull. Esto no impide compilar las fuentes.');
}catch{/* El ejecutable distribuido no es necesario para desarrollar. */}finally{await file?.close();}
try {
  const client=createOllamaClient();const status=await client.status();
  if(!status.models.length)add(full?'ERROR':'AVISO','IA local','Ollama responde, pero falta qwen3.5:4b. Ejecuta ollama pull qwen3.5:4b.');
  else if(full){const result=await client.verify();if(!result.ready)throw new Error('El modelo no superó la prueba.');add('OK','IA local',`Qwen3.5:4b respondió correctamente en ${(result.milliseconds/1000).toFixed(1)} s.`);}
  else add('INFO','IA local','Qwen3.5:4b está instalado. Para probar una respuesta real: npm run diagnostico -- --modelo.');
}catch(error){add(full?'ERROR':'AVISO','IA local',`${error.message} Instala y abre Ollama. La gestión de pedidos puede funcionar sin IA.`);}
const ok=!rows.some(row=>row.estado==='ERROR');
if(process.argv.includes('--json'))console.log(JSON.stringify({version:manifest.version,scope:full?'desarrollo e IA real':'desarrollo; IA informativa',ok,checks:rows},null,2));
else {console.table(rows);console.log(ok?(full?'Entorno de desarrollo y respuesta de IA comprobados.':'Base de desarrollo preparada. Consulta los avisos antes de abrir la app.'):'Faltan preparativos. Sigue los pasos indicados y repite el diagnóstico.');}
process.exitCode=ok?0:1;
