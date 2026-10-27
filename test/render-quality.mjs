import { createRequire } from 'node:module';
import { readdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('playwright');
const scene=(await readdir(new URL('../dist/assets/',import.meta.url))).find(n=>/^scene-.*\.js$/.test(n));
const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader']});
try {
  const page=await browser.newPage({viewport:{width:700,height:440}});await page.goto('http://127.0.0.1:5177/');
  await page.evaluate(async scene=>{
    const {createCardScene}=await import(`/assets/${scene}`);
    const host=document.createElement('div');host.style='position:fixed;inset:0;width:700px;height:440px;z-index:99999;background:white';document.body.appendChild(host);
    const canvas=document.createElement('canvas');canvas.width=900;canvas.height=500;const ctx=canvas.getContext('2d');
    ['#000000','#526454','#808080','#24464c','#ffffff'].forEach((color,i)=>{ctx.fillStyle=color;ctx.fillRect(i*180,0,180,500);});
    const panel={url:canvas.toDataURL(),rotation:0,fit:'contain'};
    const view=createCardScene(host,{onCamera:()=>{},onStatus:s=>host.dataset.status=s,onFailure:e=>{throw new Error(e);}});
    await view.configure({schema:1,model:'card',widthMm:90,heightMm:50,thicknessMm:0.35,panels:{front:panel,back:panel}});view.camera({yaw:0,pitch:0,zoom:1});
  },scene);
  await page.waitForTimeout(500);const png=await page.screenshot();
  const pixels=await page.evaluate(async data=>{const b=await createImageBitmap(await (await fetch(`data:image/png;base64,${data}`)).blob());const c=document.createElement('canvas');c.width=b.width;c.height=b.height;const ctx=c.getContext('2d');ctx.drawImage(b,0,0);return [135,243,350,458,566].map(x=>[...ctx.getImageData(x,220,1,1).data].slice(0,3));},png.toString('base64'));
  const colors=[[0,0,0],[82,100,84],[128,128,128],[36,70,76],[255,255,255]];
  console.log({source:colors,rendered:pixels});
  assert.ok(pixels[0].every(v=>v<55),'El negro debe conservar contraste en luz neutra.');assert.ok(pixels[4].every(v=>v>235),'El papel blanco debe seguir claro.');
  for(const index of [1,2,3])assert.ok(pixels[index].every((v,c)=>Math.abs(v-colors[index][c])<20),'La iluminación neutra no debe lavar los colores de referencia.');
  await writeFile(new URL('../test-output/color-neutro.png',import.meta.url),png);
} finally {await browser.close();}
