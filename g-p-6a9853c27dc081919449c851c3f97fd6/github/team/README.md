# Creativa Impresos

Sistema de trabajo para una imprenta: recepción de pedidos, clientes, asignación de diseños, cobros, Caja, reportes y recibos. Incluye la aplicación web para celulares y computadoras y una versión de escritorio para Windows.

## Dónde está el código

| Carpeta | Contenido |
| --- | --- |
| `caja-config-app/src/` | Aplicación React: pantallas, componentes, estilos y servicios. |
| `caja-config-app/public/` | Logotipo, iconos y manifiesto de instalación móvil. |
| `caja-config-app/src/offline/` | Caja local cifrada con PIN y sincronización. |
| `creativa-escritorio/` | Aplicación Electron para Windows y scripts del instalador. |
| `supabase/migrations/` | Actualizaciones SQL de permisos y funciones del servidor. |
| `supabase/plantillas/` | Plantillas para autorizar al equipo y cargar tipos de trabajo. |
| `pedido-validacion/` | Pruebas de SQL en una base aislada en memoria. |

La web y el escritorio usan el mismo proyecto Supabase. Los diseñadores remotos necesitan internet para recibir y actualizar pedidos. El celular puede ser el dispositivo principal de administración.

## Ejecutar la web

Requisitos: Node.js 22.12 o superior (recomendado Node 24), npm y acceso al proyecto Supabase configurado de Creativa.

```sh
git clone https://github.com/milimoon1225-oss/team.git
cd team/caja-config-app
npm ci
```

Copia `.env.example` a `.env.local` y completa:

```dotenv
VITE_SUPABASE_URL=https://TU_PROYECTO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=TU_CLAVE_PUBLICA
```

Usa únicamente la clave **pública / publishable** del proyecto en la aplicación. Las contraseñas de las cuentas y las claves `service_role` o secretas no van aquí ni se suben al repositorio.

```sh
npm run dev
```

Abre la dirección que muestre Vite, normalmente `http://localhost:5173`. Para compilar:

```sh
npm run build
```

El resultado queda en `caja-config-app/dist/`. Este repositorio no publica ni cambia automáticamente el sitio del equipo.

## Aplicación de escritorio

Primero configura y compila la web. Después, desde `creativa-escritorio`:

```sh
npm ci
npm run prepare:web
npm start
```

En Windows, `npm run dist` genera el instalador y la versión portátil de 64 bits en `creativa-escritorio/release/`. Los instaladores no se incluyen en Git porque son archivos generados de gran tamaño. El programa todavía no está firmado digitalmente ni incorpora actualizaciones automáticas.

`creativa-escritorio/seguridad.cjs` restringe las conexiones y adjuntos al Supabase de Creativa. Si se migra a otro proyecto Supabase, debe actualizarse también ese host antes de compilar escritorio.

## Base de datos y estado del piloto

Consulta [supabase/README.md](supabase/README.md) antes de ejecutar SQL. Los scripts conservados son actualizaciones del proyecto existente; **no constituyen todavía una instalación completa en una base vacía**. Falta exportar o documentar el esquema base original y las categorías iniciales. No se incluyen datos de clientes, pedidos ni cuentas de Authentication.

Caja sin conexión requiere aplicar la actualización `008-caja-offline.sql` y preparar cada dispositivo con una sesión de administración y un PIN. El código de la aplicación bloquea esa preparación si la actualización no está activa. Esta copia no confirma que se haya aplicado en el proyecto real.

Los cierres, los recibos y la creación de pedidos siguen requiriendo internet. Antes del cierre, se deben sincronizar tanto el celular como la PC. Los conflictos quedan visibles para revisión y no se corrigen borrando o duplicando el dinero. Consulta la [guía de Caja sin conexión](caja-config-app/CAJA-SIN-CONEXION.md).

## Pruebas

Desde la raíz del repositorio:

```sh
npm ci
npm run test:db
npm run test:desktop
```

Las pruebas de base de datos usan PGlite con tablas y usuarios ficticios, sin conectarse a Supabase real. `pedido-validacion/fixtures/pedidoService.js` conserva el servicio usado por los casos históricos; el servicio actual de la aplicación está en `caja-config-app/src/services/pedidoService.js`.

Las pruebas manuales de navegador `caja-config-app/verificar*.mjs` usan Playwright, Microsoft Edge y un servidor de la web compilada en `127.0.0.1:5174`. Se ejecutan desde la raíz, salvo `verificar-offline.mjs`, que se ejecuta desde `caja-config-app`. Sustituyen las peticiones de la aplicación por datos ficticios. Algunas pruebas de interfaz históricas pueden requerir actualizar sus selectores cuando cambian las pantallas.

La prueba de escritorio se ejecuta con `npm run test:app` desde `creativa-escritorio`, después de preparar la web. Usa un perfil temporal. No se ha probado una impresora física en esta entrega.

## Archivos locales excluidos

Se excluyen `.env.local`, claves privadas, dependencias `node_modules`, compilaciones `dist`, instaladores, perfiles y registros de pruebas, y la configuración interna del alojamiento anterior. Se conservan los archivos de versiones de dependencias para facilitar la instalación reproducible.
