# Activar fotos, PDF y códigos de pedido

1. Abre `supabase/codigos-y-archivos.sql` y copia todo su contenido.
2. En el SQL Editor de tu proyecto Supabase, abre una consulta nueva, pega el contenido y pulsa Run.
3. Espera el mensaje `Success. No rows returned` y actualiza la aplicación.
4. Registra un trabajo con una foto o PDF pequeño. Verifica el mensaje y abre el archivo desde la lista de trabajos. Recarga para comprobar que sigue allí.

Los pedidos existentes se conservan y reciben códigos como TR-00000001. El código previo queda guardado en codigo_anterior. Los códigos nuevos se asignan automáticamente; un registro fallido puede dejar un salto en la numeración.

Se admite un archivo de referencia por nuevo pedido, hasta 10 MB: JPG, PNG, WebP, HEIC, HEIF o PDF. Administración puede subirlo y verlo; el diseñador asignado puede verlo. Los enlaces de consulta duran cinco minutos; pulsa nuevamente Ver para obtener uno nuevo. Algunos navegadores no muestran HEIC directamente.

Esta actualización requiere haber ejecutado activar-pedidos.sql. No hace falta volver a ejecutar ese archivo anterior. Las pruebas locales no crean pedidos en tu base real. La comprobación final de subida requiere ejecutar esta actualización en Supabase.
