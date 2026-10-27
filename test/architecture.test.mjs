import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const {parse}=createRequire(require.resolve('eslint'))('espree');
const root=fileURLToPath(new URL('../src/',import.meta.url));
const allowed={domain:['domain'],application:['domain','application'],infrastructure:['domain','infrastructure'],presentation:['domain','application','presentation']};
async function scripts(dir){const result=[];for(const e of await readdir(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())result.push(...await scripts(p));else if(/\.(js|jsx)$/.test(e.name))result.push(p);}return result;}
function walk(node,visit){if(!node||typeof node!=='object')return;visit(node);for(const value of Object.values(node)){if(Array.isArray(value))for(const child of value)walk(child,visit);else if(value&&typeof value==='object')walk(value,visit);}}
test('dependencias entre capas: dominio y aplicación independientes; interfaz sin SDK ni repositorio concreto',async()=>{
  const violations=[];
  for(const [layer,targets] of Object.entries(allowed))for(const file of await scripts(path.join(root,layer))){
    const ast=parse(await readFile(file,'utf8'),{ecmaVersion:'latest',sourceType:'module',ecmaFeatures:{jsx:true}});
    walk(ast,node=>{
      const source=['ImportDeclaration','ExportNamedDeclaration','ExportAllDeclaration','ImportExpression'].includes(node.type)?node.source?.value:null;
      if(source){
        if(source.startsWith('.')){const target=path.relative(root,path.resolve(path.dirname(file),source)).split(path.sep)[0];if(!targets.includes(target))violations.push(`${path.relative(root,file)} -> ${source}`);}
        else if(!(layer==='presentation'&&(source==='react'||(path.relative(root,file).startsWith('presentation/preview/renderer/')&&(source==='three'||source.startsWith('three/addons/'))))) && !(path.relative(root,file)==='infrastructure/assistant/media.js' && ['pdfjs-dist/build/pdf.mjs','pdfjs-dist/build/pdf.worker.min.mjs?url'].includes(source)))violations.push(`${layer} importa ${source}`);
      }
      if(layer==='presentation'&&node.type==='Identifier'&&['supabase','indexedDB','localStorage','FileReader'].includes(node.name))violations.push(`Interfaz con acceso directo a ${node.name}`);
    });
  }
  assert.deepEqual(violations,[]);
});
