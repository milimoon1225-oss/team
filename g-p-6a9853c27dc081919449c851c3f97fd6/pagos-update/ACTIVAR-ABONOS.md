# Abonos y cancelación de saldo

Ejecuta todo `supabase/activar-abonos.sql` en una consulta nueva del SQL Editor del proyecto y espera Success. Después recarga la aplicación.

En Trabajos o en el historial de un cliente, pulsa **Ver / registrar pagos**. Escribe el monto que acabas de recibir y selecciona el método, o pulsa **Cobrar saldo completo**. Confirma con **Registrar pago**.

Cada abono se suma a los pagos anteriores. El saldo disminuye; el estado del trabajo no cambia. La entrega se confirma por separado. También puedes cobrar un saldo pendiente después de haber entregado el pedido.

El historial conserva importe, fecha, método y observación. Esta función registra pagos nuevos; no permite borrar o corregir pagos anteriores. No cambia el precio del trabajo.

Si se pierde la conexión, usa **Confirmar pago pendiente**. El mismo intento se conserva al recargar esta pestaña para evitar duplicados. Antes de iniciar otro cobro desde otro dispositivo, consulta el historial.

La actualización conserva los pagos existentes y restringe el acceso a administración. Las pruebas locales usan datos simulados; la comprobación real requiere ejecutar el SQL.
