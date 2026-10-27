import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { appearanceOf, panelSize, previewLeaves, previewPose } from '../../../domain/preview.js';

const rad = THREE.MathUtils.degToRad;
const deg = THREE.MathUtils.radToDeg;
const clamp = THREE.MathUtils.clamp;

// Solo el adaptador visual conoce Three.js. No se modifican originales ni versiones.
export function createCardScene(host, { onCamera, onStatus, onFailure }) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'default' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 0.45;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.debug.onShaderError = () => onFailure('El controlador gráfico no pudo dibujar estos materiales. Puedes continuar en vista plana.');
  renderer.domElement.setAttribute('aria-label', 'Modelo 3D con materiales e iluminación');
  renderer.domElement.addEventListener('dragstart', e => e.preventDefault());
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#eef0e9');
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 6000);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.14;
  controls.rotateSpeed = 0.65;
  controls.zoomSpeed = 0.65;
  controls.minPolarAngle = rad(20); controls.maxPolarAngle = rad(160);
  controls.mouseButtons.RIGHT = null;
  controls.touches.TWO = THREE.TOUCH.DOLLY_ROTATE;
  const root = new THREE.Group(); scene.add(root);
  const hemisphere = new THREE.HemisphereLight('#ffffff', '#bdc5b8', 0.8); scene.add(hemisphere);
  const key = new THREE.DirectionalLight('#fff5e4', 3.4); key.castShadow = true;
  key.shadow.mapSize.set(1024,1024); key.shadow.bias = -0.00015; scene.add(key);
  const fill = new THREE.DirectionalLight('#e4edff', 1.4); scene.add(fill);
  const environment = new RoomEnvironment(), pmrem = new THREE.PMREMGenerator(renderer);
  const environmentMap = pmrem.fromScene(environment, 0.04);
  scene.environment = environmentMap.texture;
  environment.dispose(); pmrem.dispose();
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(3000,3000),new THREE.ShadowMaterial({ opacity:0.12 }));
  floor.rotation.x = -Math.PI/2; floor.receiveShadow = true; scene.add(floor);
  let disposed = false, frame = 0, revision = 0, baseDistance = 500, setting = false, currentConfig, opening = 25, currentCamera = { yaw:-18,pitch:-12,zoom:1 }, pointer = null;
  let meshes = [], resources = [], generationKey = null;
  const aborters = new Set();
  function schedule() { if (!frame && !disposed) frame = requestAnimationFrame(draw); }
  function draw() { frame = 0; if(disposed)return; const changed = controls.update(); renderer.render(scene,camera); if(changed)schedule(); }
  function cameraValue() {
    const p = camera.position.clone().sub(controls.target), distance = p.length();
    return { yaw: -deg(Math.atan2(p.x,p.z)), pitch: -deg(Math.asin(clamp(p.y/distance,-1,1))), zoom:clamp(baseDistance/distance,0.6,2.4) };
  }
  function change() { schedule(); if (!setting) { currentCamera = cameraValue(); onCamera(currentCamera); } }
  controls.addEventListener('change',change);
  function setCamera(value, force = false) {
    const previous = cameraValue();
    if(!force && Math.abs(previous.yaw-value.yaw)<0.005 && Math.abs(previous.pitch-value.pitch)<0.005 && Math.abs(previous.zoom-value.zoom)<0.005)return;
    currentCamera = value; setting = true;
    // Detener la inercia anterior antes de aplicar una vista explícita.
    controls.enableDamping = false; controls.update();
    const distance = baseDistance/value.zoom, pitch = rad(value.pitch), yaw = rad(value.yaw);
    camera.position.set(-Math.sin(yaw)*Math.cos(pitch)*distance,-Math.sin(pitch)*distance,Math.cos(yaw)*Math.cos(pitch)*distance);
    controls.target.set(0,0,0); controls.update(); controls.enableDamping = true; setting = false; schedule();
  }
  function cancelPointer() {
    if(pointer===null)return;
    const id = pointer; pointer = null;
    renderer.domElement.dispatchEvent(new PointerEvent('pointercancel',{pointerId:id,bubbles:true}));
  }
  const down = e => { if(e.button===0)pointer=e.pointerId; };
  const up = e => { if(e.pointerId===pointer)pointer=null; };
  const move = e => { if(e.pointerId===pointer && e.pointerType==='mouse' && !(e.buttons&1))cancelPointer(); };
  const lost = () => cancelPointer();
  renderer.domElement.addEventListener('pointerdown',down);
  renderer.domElement.addEventListener('pointerup',up);
  renderer.domElement.addEventListener('pointercancel',up);
  renderer.domElement.addEventListener('pointermove',move);
  renderer.domElement.addEventListener('lostpointercapture',lost);
  window.addEventListener('blur',lost);
  const visibility = () => { if(document.hidden)cancelPointer(); };
  document.addEventListener('visibilitychange',visibility);
  function contextLost(e) { e.preventDefault(); onFailure('El equipo perdió el contexto gráfico. Puedes continuar en vista plana.'); }
  renderer.domElement.addEventListener('webglcontextlost',contextLost);
  function release() {
    root.clear(); for(const resource of resources)resource.dispose(); resources=[]; meshes=[];
  }
  function image(url) {
    return new Promise((resolve,reject) => {
      if(disposed) { reject(new Error('Carga cancelada.'));return; }
      const img = new Image();
      const abort = () => { img.onload=null;img.onerror=null;img.src='';reject(new Error('Carga cancelada.')); };
      aborters.add(abort);
      img.onload = () => { aborters.delete(abort); resolve(img); };
      img.onerror = () => { aborters.delete(abort); reject(new Error('No se pudo cargar una cara o máscara. Vuelve a importarla.')); };
      img.src = url;
    });
  }
  function mappedCanvas(img, config, panel, maxSide, mask = false) {
    const ratio = config.widthMm/config.heightMm;
    const side = Math.min(maxSide, Math.max(img.width,img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1,Math.round(ratio>=1?side:side*ratio));
    canvas.height = Math.max(1,Math.round(ratio>=1?side/ratio:side));
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = mask?'#000':'#fff'; ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.translate(canvas.width/2,canvas.height/2); ctx.rotate(rad(panel.rotation));
    const swap = panel.rotation===90 || panel.rotation===270;
    const w = swap?canvas.height:canvas.width, h = swap?canvas.width:canvas.height;
    const scale = panel.fit==='cover'?Math.max(w/img.width,h/img.height):Math.min(w/img.width,h/img.height);
    ctx.drawImage(img,-img.width*scale/2,-img.height*scale/2,img.width*scale,img.height*scale);
    return canvas;
  }
  function texture(canvas, color, owned) {
    const tex = new THREE.CanvasTexture(canvas); tex.colorSpace=color?THREE.SRGBColorSpace:THREE.NoColorSpace;
    tex.anisotropy = Math.min(8,renderer.capabilities.getMaxAnisotropy());
    tex.minFilter = THREE.LinearMipmapLinearFilter; tex.magFilter = THREE.LinearFilter;
    owned.push(tex); return tex;
  }
  async function face(config,slot,owned) {
    const p = config.panels[slot], size = panelSize(config,slot), a = appearanceOf(config), material = new THREE.MeshPhysicalMaterial({ color:'#ffffff', roughness:{matte:0.88,satin:0.48,gloss:0.22}[a.finish], metalness:0, clearcoat:a.finish==='gloss'?1:0, clearcoatRoughness:0.16, envMapIntensity:0.35 });
    owned.push(material);
    const assetCount = Object.values(config.panels).reduce((n,panel) => n+1+Object.keys(panel.masks || {}).length,0);
    const masks = {}, maxSide = Math.min(4096,renderer.capabilities.maxTextureSize,Math.floor(Math.sqrt(24*1024*1024/Math.max(1,assetCount))));
    if(p?.url) {
      const img = await image(p.url); material.map = texture(mappedCanvas(img,size,p,maxSide),true,owned);
      for(const [effect,asset] of Object.entries(p.masks || {})) {
        const mask = await image(typeof asset==='string'?asset:asset.url);
        masks[effect] = mappedCanvas(mask,size,p,Math.min(maxSide,2048),true);
      }
    }
    if(a.paper==='textured' || masks.relief) {
      const canvas = document.createElement('canvas'); canvas.width=512;canvas.height=512;
      const ctx = canvas.getContext('2d');ctx.fillStyle='#000';ctx.fillRect(0,0,512,512);
      if(masks.relief)ctx.drawImage(masks.relief,0,0,512,512);
      const pixels = ctx.getImageData(0,0,512,512);
      let seed=137;
      for(let i=0;i<pixels.data.length;i+=4) {
        seed=(Math.imul(seed,1664525)+1013904223)>>>0;
        const grain = a.paper==='textured'?((seed>>>24)/255-0.5)*0.04:0;
        const height=(pixels.data[i]/255)*a.reliefStrength*(a.relief==='raised'?1:-1)*0.4;
        const v = Math.round(clamp(0.5+height+grain,0,1)*255);
        pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=v; pixels.data[i+3]=255;
      }
      ctx.putImageData(pixels,0,0); material.bumpMap=texture(canvas,false,owned);
      material.bumpScale = 0.3;
    }
    if(masks.varnish) { material.clearcoat=1;material.clearcoatMap=texture(masks.varnish,false,owned);material.clearcoatRoughness=0.07; }
    const geometry = new THREE.PlaneGeometry(size.widthMm,size.heightMm); owned.push(geometry);
    const mesh = new THREE.Mesh(geometry,material);mesh.castShadow=true;mesh.receiveShadow=true;
    if(masks.foil) {
      const foil = new THREE.MeshPhysicalMaterial({ color:a.foil==='gold'?'#d5a84a':'#d5dbe1',metalness:1,roughness:0.23,envMapIntensity:1.6,alphaMap:texture(masks.foil,false,owned),bumpMap:material.bumpMap,bumpScale:material.bumpScale,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1 });
      owned.push(foil);const overlay = new THREE.Mesh(geometry,foil);overlay.position.z=0.012;mesh.add(overlay);
    }
    return mesh;
  }
  function pose() {
    if(!currentConfig)return;
    const p = previewPose(currentConfig,opening);
    root.position.x = -p.centerX;
    const positions=previewLeaves(currentConfig,opening);
    for(const leaf of meshes){const layout=positions.find(item=>item.id===leaf.userData.leafId);if(layout){leaf.position.set(layout.anchorX,0,layout.offsetZ);leaf.rotation.y=rad(layout.rotationY);}}
    schedule();
  }
  function lights(config) {
    const a = appearanceOf(config), span = Math.max(previewPose(config,180).widthMm,config.heightMm), angle=rad(a.lightAngle);
    renderer.toneMappingExposure = a.lighting==='neutral'?0.45:a.lighting==='side'?0.65:0.5;
    key.position.set(Math.sin(angle)*span,a.lighting==='side'?span*0.12:span,Math.cos(angle)*span);
    key.intensity=a.lightIntensity*(a.lighting==='studio'?2:1.6);
    hemisphere.intensity=a.lighting==='side'?0.45:0.8;
    fill.position.set(-span,span*0.3,span);fill.intensity=a.lighting==='studio'?0.65:0.3;
    key.shadow.camera.left=key.shadow.camera.bottom=-span;key.shadow.camera.right=key.shadow.camera.top=span;
    key.shadow.camera.far=span*6;key.shadow.camera.updateProjectionMatrix();
    floor.position.y=-config.heightMm/2-12;
  }
  function resize() {
    const width=Math.max(1,host.clientWidth),height=Math.max(1,host.clientHeight);
    renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();
    if(currentConfig) {
      const w=previewPose(currentConfig,180).widthMm,h=currentConfig.heightMm;
      baseDistance=Math.max(h/2/Math.tan(rad(16)),w/2/Math.tan(rad(16))/camera.aspect)*1.3;
      controls.minDistance=baseDistance/2.4;controls.maxDistance=baseDistance/0.6;
      setCamera(currentCamera,true);
    }
    schedule();
  }
  const observer = new ResizeObserver(resize); observer.observe(host);
  async function configure(config) {
    currentConfig=config;lights(config);pose();
    const a=appearanceOf(config);
    // Guardar/cargar cambia los objetos de metadatos, no necesariamente los píxeles.
    // Comparar sus fuentes evita serializar imágenes o recrear texturas idénticas.
    const sources=Object.entries(config.panels).flatMap(([slot,panel])=>[slot,panel.url,panel.fit,panel.rotation,
      ...Object.entries(panel.masks || {}).flatMap(([effect,asset])=>[effect,typeof asset==='string'?asset:asset.url])]);
    const nextKey=[config.model,config.widthMm,config.heightMm,config.thicknessMm,a.paper,a.finish,a.foil,a.relief,a.reliefStrength,...sources];
    if(generationKey && nextKey.length===generationKey.length && nextKey.every((value,i)=>value===generationKey[i]))return;
    generationKey=nextKey;const token=++revision, owned=[], leaves=[];
    for(const abort of aborters)abort(); aborters.clear();
    onStatus('loading');
    try {
      for(const layout of previewLeaves(config,opening)) {
        if(disposed || token!==revision)throw new Error('Carga cancelada.');
        const {front,back,width,centerX}=layout,leaf=new THREE.Group();leaf.userData.leafId=layout.id;
        const edgeMaterial=new THREE.MeshStandardMaterial({color:appearanceOf(config).paper==='textured'?'#ded5be':'#eee8db',roughness:0.9});
        const invisible=new THREE.MeshBasicMaterial({visible:false});
        const box=new THREE.BoxGeometry(width,config.heightMm,config.thicknessMm);owned.push(box,edgeMaterial,invisible);
        // El bloque aporta solo cantos: sus tapas competirían con el diseño en profundidad.
        const edge=new THREE.Mesh(box,[edgeMaterial,edgeMaterial,edgeMaterial,edgeMaterial,invisible,invisible]);edge.position.x=centerX;edge.castShadow=true;leaf.add(edge);
        const f=await face(config,front,owned);
        if(disposed || token!==revision)throw new Error('Carga cancelada.');
        const b=await face(config,back,owned);
        f.position.set(centerX,0,config.thicknessMm/2+0.002);
        b.rotation.y=Math.PI;b.position.set(centerX,0,-config.thicknessMm/2-0.002);leaf.add(f,b);
        leaves.push(leaf);
      }
      if(disposed || token!==revision) { for(const resource of owned)resource.dispose();return; }
      release();resources=owned;meshes=leaves;root.add(...leaves);pose();resize();
      host.dataset.textureCount=String(resources.filter(r=>r.isTexture).length);
      host.dataset.leafCount=String(leaves.length);
      host.dataset.textureRevision=String(token);
      onStatus('ready');
    } catch(error) {
      for(const resource of owned)resource.dispose();
      if(!disposed && token===revision) { generationKey=null;onFailure(error.message); }
    }
  }
  resize();
  return {
    configure,
    camera:setCamera,
    opening(value) { opening=value;pose(); },
    dispose() {
      disposed=true;revision++;cancelAnimationFrame(frame);observer.disconnect();
      for(const abort of aborters)abort();aborters.clear();
      window.removeEventListener('blur',lost);document.removeEventListener('visibilitychange',visibility);
      controls.removeEventListener('change',change);controls.dispose();release();
      renderer.domElement.removeEventListener('webglcontextlost',contextLost);
      floor.geometry.dispose();floor.material.dispose();environmentMap.dispose();renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();
    },
  };
}
