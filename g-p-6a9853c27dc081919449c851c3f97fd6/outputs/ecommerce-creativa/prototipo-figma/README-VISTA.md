# Vista previa del prototipo Creativa

Abre `Prototipo-Creativa.html` con doble clic en Chrome, Edge u otro navegador. El archivo final contiene el diseño y los logotipos; funciona sin conexión y no necesita instalar nada.

- Usa **Escritorio** o **Móvil** para cambiar el tamaño del diseño. Cuando existe la pantalla equivalente, se conserva el paso del recorrido.
- Usa el selector **Pantalla** para visitar cualquier vista del tamaño seleccionado.
- Haz clic en los botones del diseño para avanzar. **Atrás** vuelve al paso anterior y **Reiniciar** regresa al inicio del recorrido.
- Activa **Mostrar zonas activas** para ver todos los enlaces del prototipo.
- También puedes recorrer las acciones con **Tab** y abrirlas con **Enter** o la barra espaciadora.
- Desplázate hacia abajo para consultar las pantallas completas. El diseño de escritorio se ajusta al ancho disponible y la vista móvil mantiene el ancho de un teléfono.

Los campos y productos muestran un escenario de demostración. Esta vista no captura datos, procesa pagos ni genera pedidos. Los textos y elementos del diseño se pueden editar en Figma después de importar el proyecto con el complemento incluido.

## Modificar la vista

`preview-template.html` es la plantilla de autoría. Si modificas `design.json` o la plantilla, ejecuta `python build.py` para regenerar el archivo. La versión entregada ya está preparada.

Para insertar JSON de forma segura dentro del bloque JavaScript, escapa los caracteres `<`, U+2028 y U+2029 en la cadena serializada como `\u003c`, `\u2028` y `\u2029`. No alteres el contenido original de `design.json`. La plantilla no solicita recursos de internet ni ejecuta los textos del diseño como código.
