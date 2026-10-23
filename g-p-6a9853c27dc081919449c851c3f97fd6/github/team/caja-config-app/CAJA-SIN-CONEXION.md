# Creativa: prueba de escritorio y celular

Esta versión conserva la aplicación de pedidos, clientes, diseñadores, Caja y reportes. El celular puede seguir siendo el dispositivo principal; las PC remotas utilizan sus cuentas de diseñador y los mismos pedidos en Supabase. No necesitan que una PC de la imprenta permanezca encendida.

## Estado de esta entrega

- El programa Windows incluye la interfaz local y usa la misma base de datos que la web.
- La web puede instalarse desde el navegador del celular. Guarda la pantalla para abrirla sin internet después de una primera descarga completa.
- Caja sin conexión está preparada para prueba, pero requiere activar `../supabase/migrations/008-caja-offline.sql` en el proyecto Supabase existente. Hasta entonces, no permite preparar una copia ni recibir movimientos offline. La Caja habitual funciona como antes con internet.
- No se han modificado datos reales ni probado credenciales personales durante el desarrollo. Las pruebas usaron cuentas y pedidos ficticios.

## Activación por la propietaria del proyecto

1. Inicia sesión personalmente en Supabase y abre el proyecto **creativa-mila** (`mtsvbkncnnvzqnkhzrwz`).
2. Abre SQL Editor → nueva consulta.
3. Copia **todo** el archivo `../supabase/migrations/008-caja-offline.sql` de esta entrega y ejecútalo. Es una actualización incremental: añade el registro de sincronización y sus permisos; conserva pedidos, pagos y cierres existentes.
4. Debe terminar correctamente. Si aparece un error, conserva el mensaje y solicita revisión; no ejecutes las migraciones iniciales antiguas.
5. Entra en Creativa con administración y ve a Configuración → Caja sin conexión → Preparar / abrir Caja de este dispositivo.

No compartas la contraseña de Supabase, claves privadas ni la contraseña de Creativa para realizar estos pasos.

## Preparar el celular y una PC

Con internet y tu sesión de administración abierta, prepara cada dispositivo por separado. Elige un PIN de 6 a 12 dígitos y confirma que es un equipo de confianza. El PIN cifra la copia local de saldos y movimientos; es distinto de la contraseña de tu cuenta. No se almacena la contraseña en la copia. Si olvidas el PIN, no se puede recuperar el contenido cifrado sin él.

En el celular, abre la web publicada. En Android usa Instalar aplicación o Añadir a pantalla de inicio desde el menú del navegador; en iPhone usa Safari → Compartir → Añadir a pantalla de inicio. En Configuración, comprueba que se indique que la pantalla está guardada para abrir sin internet. Prepara Caja desde la aplicación instalada que usarás, pues una instalación o navegador diferente puede tener almacenamiento independiente.

En Windows abre el programa instalado. Prepara allí Caja aunque ya lo hayas hecho en el navegador: cada aplicación conserva su propia copia.

## Cuando se corte internet

Abre **Caja de este dispositivo** y escribe su PIN. Puedes registrar salidas (incluidos Almuerzos), otros ingresos y cobros de pedidos que se guardaron en la última copia. El mensaje “Guardado en este dispositivo” se muestra solo después de confirmar el guardado local.

Los saldos se consideran estimados hasta sincronizar. No cobres el mismo pedido simultáneamente desde el celular y la PC. Los movimientos aún no enviados no son visibles en los demás equipos.

Las copias permiten nuevos registros durante 7 días desde la última actualización online. Después puedes abrirlas, respaldarlas y sincronizar pendientes, pero debes actualizar antes de registrar nuevos movimientos. Esto no limita el piloto a 7 días: basta actualizar periódicamente con conexión.

Al volver internet, usa **Sincronizar pendientes**. Si Caja sigue abierta y desbloqueada, también intentará sincronizar al detectar que volvió la red. Se necesita la misma cuenta de administración y que siga autorizada. Si expiró la sesión, vuelve al inicio, entra con tu cuenta y regresa a Caja local.

Si otro equipo ya cobró el saldo, el día está cerrado o el registro necesita revisión, el movimiento permanece visible con su identificador. No se borra ni se vuelve a cobrar. Conserva su respaldo y revisa con administración cómo conciliarlo. Esta primera versión no ofrece un botón para eliminar o corregir automáticamente conflictos de dinero.

## Al cerrar el día

1. Sincroniza **el celular y la PC**, no solo uno de ellos.
2. Verifica que no tengan pendientes ni movimientos en revisión.
3. Consulta Caja habitual con internet, cuenta el efectivo y realiza el cierre.

El sistema puede comprobar los pendientes guardados en el dispositivo actual; no puede conocer los que siguen aislados en otro equipo sin internet. Por eso el cierre requiere esta revisión de ambos dispositivos. Los recibos se imprimen desde el sistema habitual con conexión. Se probó la generación de PDF; la impresión física con Epson o una térmica sigue pendiente.

## Qué conserva y qué no incluye todavía

Caja local conserva fecha y hora originales, monto, método, concepto e identificador de cada operación. La base de datos conserva además la fecha de sincronización. Reintentar la misma operación no duplica el dinero. Los datos locales están cifrados en IndexedDB y el acceso se bloquea tras 10 minutos de inactividad.

Los diseñadores remotos continúan necesitando internet para obtener pedidos nuevos, tomar trabajos, adjuntar archivos y compartir cambios. Esta entrega no convierte todos los módulos en funciones offline. Tampoco realiza cierres offline ni crea nuevos pedidos sin conexión.

No borres los datos del navegador ni desinstales la aplicación con movimientos pendientes. Descarga el respaldo cifrado al terminar cada jornada y conserva el PIN por separado. La recuperación de ese respaldo requiere asistencia; aún no hay una pantalla de importación. El almacenamiento local puede perderse si el dispositivo se daña o se elimina su perfil.

## Prueba recomendada antes de usar dinero real

Tras activar Supabase, prepara el celular y la PC. Usa un pedido de prueba identificado como tal: desconecta internet, registra una salida y un abono, cierra y vuelve a abrir la app, desbloquea con PIN y comprueba que siguen allí. Reconecta, sincroniza y revisa desde el otro equipo que cada registro aparece una sola vez. Comprueba también un recibo PDF y, cuando tengas impresora, una impresión real. Coordina los importes de prueba con administración para no mezclarlos con la Caja del día.
