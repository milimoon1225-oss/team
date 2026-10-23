# Creativa Mila: activar pedidos y cuentas

Estado: código preparado para Supabase. Los archivos SQL se prueban en una base local aislada; todavía deben ejecutarse en tu proyecto de Supabase. No se han creado cuentas ni cambiado datos remotos.

## Cuentas del equipo

No se necesitan cuatro correos nuevos. Cada persona puede usar uno que ya tenga. Se crea una cuenta de la aplicación por persona; estas cuentas no necesitan acceso al panel de administración de Supabase.

| Persona | Rol | Acceso preparado |
| --- | --- | --- |
| L. Virginia | administracion | Registrar y consultar pedidos, ver totales y adelantos, asignar diseñadores y confirmar entregas |
| Milagros | disenador | Consultar pedidos propios asignados, iniciar diseño y marcar listo |
| Ángel | disenador | Consultar pedidos propios asignados, iniciar diseño y marcar listo |
| Alvis | disenador | Consultar pedidos propios asignados, iniciar diseño y marcar listo |

La caja completa, cobros posteriores y gestión de clientes tienen pendiente su interfaz. Su acceso corresponderá a administración. Los diseñadores no reciben precios ni pagos en la consulta del panel.

## Activación, en orden

1. En Supabase abre **SQL Editor → New query**. Copia y ejecuta el contenido de `supabase/activar-pedidos.sql`.
2. En **Authentication → Users → Add user → Create new user**, crea primero la cuenta de L. Virginia con el correo elegido y una contraseña propia. Confirma el correo mediante la opción del panel si está disponible. No pegues contraseñas en el chat, el código ni los archivos SQL.
3. Abre `supabase/autorizar-equipo.sql`, reemplaza `REEMPLAZAR_POR_TU_CORREO` por ese mismo correo y ejecútalo en SQL Editor. Para Virginia conserva `L. Virginia` y `administracion`.
4. Repite los pasos 2 y 3 para cada diseñador cuando tengas sus correos. En el archivo cambia nombre y rol a `disenador`. No es necesario tener las cuatro cuentas para probar un primer pedido como Virginia.
5. Si no hay tipos de trabajo, revisa y ejecuta `supabase/tipos-iniciales.sql`. Contiene los ejemplos del diseño anterior; no borra los existentes.
6. Abre la aplicación e ingresa con la cuenta de Virginia. Registra un pedido sin archivo, con categoría y tipo, precio y adelanto. El mensaje de éxito aparecerá después de la confirmación de Supabase.
7. Recarga la página: el pedido debe seguir apareciendo. En Supabase revisa `clientes`, `trabajos` y, si hubo adelanto, `pagos`.
8. Asigna un diseñador en la lista. Ingresa con su cuenta en otro navegador: verá solo sus pedidos, sin importes. Al marcar uno listo, actualiza el panel de Virginia para ver el cambio.

## Qué cambia en la base

Se usan las tablas existentes y la columna `diseñador_id` que ya existe. Un esquema privado guarda la lista de usuarios autorizados y los identificadores de reintento. Las funciones públicas exigen sesión y comprueban el rol. Se retiran los permisos directos del navegador sobre clientes, trabajos y pagos: el acceso se hace mediante esas funciones. No se desactiva RLS ni se añade acceso anónimo a pedidos.

El cliente, el pedido y el adelanto se registran en la misma transacción. Si falla una parte, no se confirma ninguna. Si se pierde la respuesta, el botón permite reintentar con el mismo identificador mientras mantengas la pantalla abierta. No recargues durante un envío sin confirmar; primero usa el botón de confirmación.

No se generan asientos en movimientos_caja todavía; los adelantos se guardan en pagos. La subida de imágenes/PDF está deshabilitada y señalada como pendiente hasta configurar Storage. La lista se actualiza al abrir la aplicación o al pulsar Actualizar pedidos; todavía no es en tiempo real.

## Verificación realizada

Pruebas en PostgreSQL local (PGlite): guardar y volver a leer, importes y hora local, reintento sin duplicados, rollback si falla el pago, reutilización del cliente con mismo nombre y teléfono, acceso denegado a no autorizados, separación entre diseñadores, restricción de importes, asignación solo por administración y transiciones de estado.

La prueba final con el Supabase real depende de ejecutar el SQL y crear al menos la cuenta de administración.
