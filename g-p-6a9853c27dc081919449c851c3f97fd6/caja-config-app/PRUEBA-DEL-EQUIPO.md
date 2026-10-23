# Prueba de un mes · Creativa Impresos

## Cómo empezar

1. Abre el enlace publicado desde el navegador del celular, tablet o computadora, con conexión a internet.
2. Entra con el correo y contraseña de tu cuenta de Creativa. Cada persona debe usar su propia cuenta.
3. Guarda el enlace en favoritos o crea un acceso directo en la pantalla de inicio.
4. Antes del primer día de trabajo, comprueba un pedido con administración y un diseñador: asignación, contacto, estado, pago y recibo.

La prueba dura un mes desde que el equipo empiece a usarla. Anoten aquí las fechas:

Inicio: __________  Revisión final: __________

No hay borrado ni bloqueo automático al cumplir el mes. Publicar la aplicación conserva la conexión a la misma base de datos; los pedidos existentes continúan allí. No es una base de pruebas independiente: cualquier pedido o pago registrado sí se guarda.

## Durante el trabajo

- Pulsa **Actualizar pedidos** para ver lo que otra persona acaba de registrar o cambiar.
- Si falla la conexión al guardar, usa el reintento del mismo formulario. Comprueba el resultado antes de crear otro pedido o pago.
- WhatsApp abre un mensaje preparado; revísalo y envíalo tú. Los archivos de diseño se adjuntan en WhatsApp.
- Se necesita internet. No se pueden registrar pedidos sin conexión.
- Los recibos son comprobantes internos de atención. La impresión depende del navegador y de la impresora disponible.
- En dispositivos compartidos, cierra sesión al terminar.

## Qué revisar cada semana

| Momento | Objetivo |
| --- | --- |
| Primer día | Confirmar acceso de administración y de cada diseñador en sus dispositivos. Revisar permisos y que el mismo pedido sea visible para las personas correspondientes. |
| Semana 1 | Registrar pedidos completos y anotar campos que falten, errores de fechas y dificultades desde el celular. |
| Semana 2 | Probar trabajos disponibles, asignación, contacto con clientes y entrega. Dos diseñadores no deben poder tomar el mismo trabajo. |
| Semana 3 | Comparar pagos, salidas, almuerzos y cierre de caja con el control habitual. Revisar que los pagos de la noche queden en el día correcto. |
| Semana 4 | Revisar reportes semanales/mensuales y recibos. Ordenar las mejoras: urgente, necesaria o para después. |

## Registro de observaciones

Copia este bloque cada vez que encuentres un problema o necesites una mejora. No anotes contraseñas ni información privada del cliente en capturas compartidas.

- Fecha y persona:
- Dispositivo (celular/computadora) y navegador:
- Sección:
- Código del pedido, si corresponde:
- Qué intentaba hacer:
- Qué esperaba que ocurriera:
- Qué ocurrió:
- Captura, si ayuda:
- Prioridad: impide trabajar / dificulta trabajar / sugerencia.
- Estado: pendiente / corregido / comprobado por el equipo.

Al final de cada semana, reúnen las observaciones y las traen a este chat para corregirlas. La aplicación no envía avisos automáticamente a este chat.

## Preparación de administración

- Confirmar que las cuentas estén autorizadas con rol `administracion` o `disenador` en Supabase. Crear un usuario en Authentication por sí solo no lo autoriza en la app.
- Verificar que estén activadas las actualizaciones de pedidos, archivos, abonos, clientes, Caja, diseñadores y Reportes. No volver a ejecutar scripts iniciales antiguos sobre una instalación actualizada.
- Acordar y comprobar un respaldo de la base de datos y de los archivos antes del piloto, y una frecuencia durante el mes. Este despliegue no configura respaldos automáticos.
- Comprobar en la base real la fecha de los adelantos: el esquema local original usa una fecha predeterminada que podría diferir de la hora de Lima. La revisión de código no confirma el valor instalado en Supabase.

## Para continuar el desarrollo

La fuente vigente está en `caja-config-app`. La publicación sirve solo el contenido compilado de `dist`; no publica el archivo `.env.local`, las capturas ni los scripts de pruebas. La clave pública de Supabase forma parte del frontend por diseño; nunca usar una clave secreta o de servicio en variables `VITE_`.

La autorización del equipo depende de Supabase y de sus políticas en la base real. Las pruebas locales comprueban la lógica de los scripts, pero no sustituyen la validación de las cuentas reales antes de iniciar el piloto.
