# Contrato del prototipo

`design.json` contiene `{title,description,start,assets,screens}`. `assets` mapea clave a data URL PNG. Cada screen: `{id,name,width,height,device,flowStart?,nodes}`. Coordenadas relativas en píxeles.

Nodos: `{type,name,x,y,w,h,fill?,stroke?,strokeWidth?,radius?,opacity?,target?,children?}`.
- `rect`, `ellipse`: formas nativas.
- `text`: `text,fontSize,weight` (400/500/600/700/800), `color`, `align` (left/center/right), `lineHeight` en píxeles. `w,h` es caja fija. Fuente Arial para correspondencia navegador/Figma. Respetar saltos de línea.
- `image`: `asset` es clave de assets; usar ajuste contain/FIT.
- `group`: children relativos; contenedor sin relleno si falta fill. Puede tener target para interacción de clic.

`target` es ID de screen destino. Navegación simula un escenario; no captura datos ni cobra. Textos/formularios del canvas son editables como capas en Figma. La vista HTML es un visor de este mismo diseño, no una tienda real.

Figma: construir todos los frames antes de vincular destinos; nueva página por ejecución; no borrar nada existente. Cargar fuentes Arial Regular/Bold; mapear 400/500 a Regular, 600/700/800 a Bold. `setReactionsAsync` para enlaces. IDs internos de Figma se resuelven después de generar screens. Portada y UI kit no cuentan como compra. El marco 1440 puede exceder viewport vertical y debe poder desplazarse.

Vista HTML: diseño en SVG o DOM, navegación vía target y selector lateral, tamaños desktop/mobile, teclado y retorno. Logos embebidos, sin recursos remotos. No need publishing. Importación Figma desde plugin local (manifest+code+UI) con design.json embebido en code.js por builder posterior.
