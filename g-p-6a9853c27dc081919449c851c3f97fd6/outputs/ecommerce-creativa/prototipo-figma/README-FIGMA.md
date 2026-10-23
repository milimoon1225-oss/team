# Prototipo de e-commerce · Creativa Impresos

Este paquete contiene el código para crear el prototipo en **Figma Design**, con pantallas de escritorio y móvil, logotipos originales, textos y formas editables, y botones que conectan los recorridos de compra, cotización, aprobación de diseño y seguimiento.

## Abrirlo en Figma

1. Descomprime el paquete en una carpeta de tu computadora. Conserva juntos los archivos de `figma-plugin`.
2. Abre la **aplicación de escritorio de Figma** e inicia sesión. Crea un archivo de **Figma Design** o abre uno donde tengas permiso de edición.
3. En el menú de Figma, entra a **Plugins → Development → Import plugin from manifest…**. También puede aparecer al hacer clic derecho en el lienzo, dentro de **Plugins / Select plugins → Development**.
4. Selecciona **`figma-plugin/manifest.json`** de este paquete. Se importan el código y la ventana de generación; no necesitas instalar dependencias.
5. Ejecuta **Creativa Impresos · Prototipo e-commerce** desde **Plugins → Development**, o búscalo en el menú de acciones.
6. Pulsa **Generar prototipo en Figma** y espera el mensaje de confirmación.
7. Cierra la ventana del plugin. La pantalla inicial queda seleccionada. Pulsa **Presentar (▶)** para navegar. Puedes elegir el recorrido de escritorio o móvil en los flujos del prototipo.

Figma crea una página nueva en cada ejecución; conserva las páginas anteriores. Los botones de las pantallas funcionan dentro de **Presentar**. En el lienzo puedes seleccionar y editar sus capas. Las pantallas largas tienen desplazamiento vertical, con una ventana de hasta 900 px en escritorio y 844 px en móvil; su contenido completo está en la capa `Contenido editable`.

Si tu instalación pide un ID de plugin, usa **Plugins → Development → New plugin…**, elige **Figma design / Custom UI** y crea uno local. Conserva el `id` que Figma genere, copia los demás campos de nuestro `manifest.json` a ese manifiesto y reemplaza `code.js` y `ui.html` con los de este paquete. El ID de publicación se asigna en Figma; el paquete no inventa uno.

## Qué se puede editar y probar

- Los títulos, precios de muestra, etiquetas y párrafos son capas de texto nativas.
- Tarjetas, botones, campos y contenedores son formas y marcos nativos. Los logotipos son las imágenes PNG originales.
- Los enlaces son interacciones nativas de Figma. Se puede cambiar su destino desde la pestaña **Prototype**.
- El prototipo muestra escenarios de ejemplo. Los formularios simulan estados; no reciben datos reales, no suben archivos, no cobran y no crean pedidos en el sistema de gestión.
- El importe de ejemplo y las condiciones ilustradas deben validarse con la imprenta antes de desarrollar la tienda real.
- La portada y la guía visual son material de referencia, aparte de los flujos de compra.

La fuente prevista es **Arial**. Si Figma no la puede cargar, el plugin prueba **Inter**, **Roboto** y otras fuentes disponibles en el editor. En ese caso informa la sustitución para revisar los saltos de línea.

## Archivos

| Archivo | Uso |
|---|---|
| `figma-plugin/manifest.json` | Archivo que se selecciona al importar el plugin. |
| `figma-plugin/code.js` | Código completo listo para ejecutar, con diseño y logos incluidos. |
| `figma-plugin/ui.html` | Ventana del plugin con progreso y resultado. |
| `figma-plugin/runtime.js` | Código fuente del importador, por si se desea modificarlo. |
| `design.json` | Datos de pantallas, capas, estilos, destinos e imágenes. |

Se entrega un **plugin local con código fuente**, no un archivo `.fig` ni un enlace ya creado en tu cuenta. Al ejecutarlo, el diseño se incorpora al archivo de Figma que tengas abierto. El manifiesto bloquea las conexiones de red del plugin y los logotipos están incrustados; la aplicación de Figma mantiene su funcionamiento y sincronización habituales.

## Verificación y límites

La estructura de datos y los enlaces se validan antes de crear la página. El importador usa las API públicas de Figma para imágenes, fuentes, marcos, interacciones y puntos de inicio. La ejecución dentro de tu sesión de Figma y la presentación final deben comprobarse después de importar; una prueba automatizada con una API simulada no sustituye esa revisión.

Si ocurre un error después de comenzar, la nueva página queda identificada como **generación incompleta**. El mensaje indica el motivo. Cierra el plugin, resuelve el problema y vuelve a ejecutarlo; la página parcial queda disponible para revisar.

## Documentación oficial de referencia

- [Importar y ejecutar un plugin local en Figma de escritorio](https://help.figma.com/hc/en-us/articles/38457121114263-Create-a-Figma-Design-plugin-with-the-Figma-MCP-server-and-agentic-tools).
- [Manifiesto del plugin y permisos de red](https://developers.figma.com/docs/plugins/manifest/).
- [API de Figma: fuentes, imágenes y cambio de página](https://developers.figma.com/docs/plugins/api/figma/).
- [Interacciones de prototipo](https://developers.figma.com/docs/plugins/api/Reaction/) y [acciones de navegación](https://developers.figma.com/docs/plugins/api/Action/).
- [Puntos de inicio del prototipo](https://developers.figma.com/docs/plugins/api/properties/PageNode-flowstartingpoints/).

Documentación consultada el 20 de octubre de 2026. Paquete revisado el 22 de octubre de 2026.
