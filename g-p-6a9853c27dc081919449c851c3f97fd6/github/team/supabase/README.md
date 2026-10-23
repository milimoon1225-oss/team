# Supabase de Creativa

Estos archivos son las actualizaciones conservadas del proyecto existente. No son un volcado completo del servidor y no contienen datos de clientes, cobros o usuarios.

## Requisito previo

Debe existir el esquema base original con `public.clientes`, `categorias_trabajo`, `tipos_trabajo`, `trabajos`, `pagos` y `archivos_trabajo`. Su migración inicial no estaba disponible entre los archivos actuales y queda pendiente de exportar/documentar. Los esquemas `auth` y `storage` los administra Supabase. No copies a producción las tablas simplificadas de las pruebas PGlite.

## Orden de las actualizaciones

1. `migrations/001-pedidos.sql`
2. `migrations/002-adjuntos.sql`
3. `migrations/003-clientes.sql`
4. `migrations/004-abonos.sql`
5. `migrations/005-caja-configuracion.sql`
6. `migrations/006-disenadores.sql`
7. `migrations/007-reportes.sql`
8. `migrations/008-caja-offline.sql`

No ejecutes de nuevo Pedidos al final: Diseñadores actualiza su función de carga con la versión más reciente. No apliques todos los archivos automáticamente sobre un proyecto en uso; comprueba qué actualizaciones ya tiene. En el proyecto de Creativa, el paso que quedó pendiente en la entrega de escritorio fue la actualización de Caja sin conexión.

## Cuentas y catálogo

`plantillas/autorizar-equipo.sql` requiere crear primero la cuenta en Authentication y reemplazar el marcador de correo. Los roles internos son `administracion` y `disenador`, sin tildes. Mantén las cuentas individuales de cada persona.

`plantillas/tipos-iniciales.sql` es una semilla de ejemplos de trabajos: necesita categorías previamente creadas y no las crea por sí sola. Revísala antes de cargarla.

El acceso de cada función se comprueba en el servidor. Las claves secretas del proyecto se administran en Supabase y no forman parte de este repositorio.
