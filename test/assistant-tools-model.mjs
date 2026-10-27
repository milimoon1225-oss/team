import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {createOllamaClient} from '../src/infrastructure/assistant/ollama-client.js';
import {checkedBrief,checkedCitations,compareReferenceText} from '../src/domain/assistant/tools.js';
import {sampleImage} from './tool-fixtures.mjs';
const {chromium}=createRequire(import.meta.url)('playwright');
const browser=await chromium.launch({headless:true});let image;
try{const page=await browser.newPage();await page.goto('about:blank');image=await sampleImage(page,'MARIA Y JOSE','20/12/2025');}finally{await browser.close();}
const client=createOllamaClient(),results=[];
for(const task of ['brief','review','knowledge']){
  const started=Date.now();let output,error;
  try{
    if(task==='brief')output=checkedBrief(await client.analyze({task,payload:JSON.stringify({message:'Soy María. Necesito 150 invitaciones florales. Aún no confirmé fecha ni precio.'}),images:[]}), 'Soy María. Necesito 150 invitaciones florales. Aún no confirmé fecha ni precio.');
    if(task==='review'){const analysis=await client.analyze({task,payload:JSON.stringify({page:1}),images:[image]});output={...analysis,textComparison:compareReferenceText('Fecha confirmada: 20/12/2026',analysis.visibleText,'Lectura de IA')};if(!analysis.visibleText.includes('2025')||output.textComparison.status!=='review')throw new Error('La lectura visual no detectó la fecha de prueba de forma fiable.');}
    if(task==='knowledge'){
      const passages=[{id:'manual:1:0',title:'Manual ficticio',page:1,text:'Deja secar el papel veinte minutos antes del corte. Revisa la aprobación de la última versión antes de imprimir.'}];
      const answer=await client.analyze({task,payload:JSON.stringify({question:'¿Cuánto tiempo se deja secar el papel antes del corte?',passages}),images:[]});
      output={...answer,sources:checkedCitations(answer,passages)};
      if(!output.sources.length)throw new Error('El modelo no aportó una fuente para una pregunta respondible.');
    }
  }catch(e){error=e.message;}
  const result={task,milliseconds:Date.now()-started,pass:!error,output,error};results.push(result);console.log(JSON.stringify(result));
}
const directory=new URL('../test-output/',import.meta.url);await mkdir(directory,{recursive:true});await writeFile(new URL('assistant-tools-model.json',directory),JSON.stringify({model:'qwen3.5:4b',at:new Date().toISOString(),results},null,2));
if(results.some(result=>!result.pass))process.exitCode=1;
