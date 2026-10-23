const fs = require('fs');
const path = require('path');
const {pathToFileURL} = require('url');
const {chromium} = require('C:/Users/MILAGROS/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname,'..');
const design = JSON.parse(fs.readFileSync(path.join(root,'design.json'),'utf8'));
async function main(){
  const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--disable-gpu']});
  const page=await browser.newPage({viewport:{width:1520,height:1100},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  const output=path.join(__dirname,'browser');fs.mkdirSync(output,{recursive:true});
  const requested=['d-inicio','d-catalogo','d-producto','m-inicio','m-checkout','m-factura','m-arte','m-seguimiento'];
  const captures=[];
  for(const id of requested){
    const screen=design.screens.find(s=>s.id===id);
    if(!screen){captures.push({id,missing:true});continue;}
    await page.goto(pathToFileURL(path.join(root,'Prototipo-Creativa.html')).href+'#'+id);
    await page.waitForSelector('.canvas-svg');
    await page.screenshot({path:path.join(output,id+'.png'),fullPage:true});
    const dimensions=await page.evaluate(()=>({viewport:innerWidth,page:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,links:document.querySelectorAll('[data-target]').length,title:document.getElementById('screen-title').textContent}));
    captures.push({id,...dimensions});
  }
  // Validate every screen can render without script errors or horizontal overflow.
  const render=[];
  for(const screen of design.screens){
    await page.goto(pathToFileURL(path.join(root,'Prototipo-Creativa.html')).href+'#'+screen.id);
    await page.waitForSelector('.canvas-svg');
    const state=await page.evaluate(()=>({page:document.documentElement.scrollWidth,viewport:innerWidth,title:document.getElementById('screen-title').textContent,links:document.querySelectorAll('[data-target]').length}));
    render.push({id:screen.id,...state});
  }
  await page.setViewportSize({width:390,height:844});
  await page.goto(pathToFileURL(path.join(root,'Prototipo-Creativa.html')).href+'#m-inicio');
  await page.screenshot({path:path.join(output,'m-inicio-mobile-viewport.png'),fullPage:true});
  const narrow=await page.evaluate(()=>({page:document.documentElement.scrollWidth,viewport:innerWidth}));
  const result={errors,captures,render,narrow};
  fs.writeFileSync(path.join(output,'audit.json'),JSON.stringify(result,null,2));
  console.log(JSON.stringify(result));
  await browser.close();
}
main().catch(error=>{console.error(error.stack);process.exitCode=1});
