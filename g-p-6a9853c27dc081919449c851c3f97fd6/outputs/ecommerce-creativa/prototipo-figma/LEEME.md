# Creativa Impresos · Prototipo para Figma

**44 pantallas y estados:** 21 de escritorio, 21 de móvil, una portada con guía y un sistema visual. Incluye los logos originales que entregaste.

## Empieza aquí

- **Para probarlo ahora:** abre `Prototipo-Creativa.html` en tu navegador. Usa los botones del diseño y el selector superior. Funciona sin instalar nada.
- **Para editarlo en Figma:** abre Figma de escritorio, importa `figma-plugin/manifest.json` desde **Plugins → Development → Import plugin from manifest…**, ejecuta el plugin y pulsa **Generar prototipo en Figma**. Después usa **Presentar (▶)**. Las instrucciones completas están en `README-FIGMA.md`.

El paquete contiene código importable; todavía no es un archivo guardado en tu cuenta de Figma. La conexión de Figma de esta conversación no estaba activa al prepararlo.

## Recorridos

1. **Compra directa:** inicio → catálogo → tarjetas → carrito → datos y entrega → pago simulado → arte v1 → marcar revisión → aprobar → seguimiento.
2. **Cotización:** idea personalizada → propuesta v1 → aceptación → pago de la propuesta → diseño en preparación.
3. **Alternativas:** carrito vacío, factura, pago pendiente, pago no aprobado, correcciones del arte y pedidos anteriores.

Los escenarios usan un producto configurado de ejemplo: 500 tarjetas por S/ 85.00. La propuesta que incluye diseño suma S/ 110.00. El recojo no tiene cargo en la demostración. Los precios, formatos, materiales, alcance y plazos deben validarse con el negocio.

Es un prototipo guiado: los campos contienen ejemplos, los botones cambian de estado y los textos se editan como capas en Figma. No registra clientes, recibe archivos, procesa pagos ni se conecta al sistema de gestión. La tienda real se implementaría después.

## Código incluido

| Archivo | Para qué sirve |
| --- | --- |
| `figma-plugin/manifest.json` | Importar el plugin local en Figma. |
| `figma-plugin/code.js` | Código ejecutable con pantallas y logos incrustados. |
| `figma-plugin/runtime.js` | Generador de capas, fuentes, imágenes e interacciones. |
| `figma-plugin/ui.html` | Ventana de generación. |
| `design.json` | Contenido, estilos, posiciones y enlaces de las pantallas. |
| `preview-template.html` | Código de la vista previa navegable. |
| `build.py` | Regenera `code.js` y `Prototipo-Creativa.html` tras editar `design.json`. |

Para regenerar, ejecuta `python build.py` con Python 3; no requiere bibliotecas adicionales. Esto es opcional: el plugin y la vista previa ya vienen preparados.

## Edición y alcance

Los textos, botones y formas son nativos y editables en Figma. Los logos son imágenes originales incrustadas. Los campos del formulario se representan con formas y textos; las interacciones son enlaces entre estados. Cada ejecución crea una página nueva sin borrar las anteriores. La compra utiliza un recorrido de ejemplo con opciones prefijadas.

El paquete fue revisado como código y en su representación local. La ejecución dentro de Figma requiere importar el plugin y comprobar la presentación en esa aplicación.
