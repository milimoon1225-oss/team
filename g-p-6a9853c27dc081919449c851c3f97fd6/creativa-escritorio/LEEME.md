# Creativa Impresos para Windows — piloto 0.1.0

## Para usarla

Ejecuta el archivo terminado en `Instalador.exe` de la carpeta `release`. El instalador crea un acceso directo y se instala solo para tu usuario de Windows. La versión `Portable.exe` sirve para abrirla sin instalación. No ejecutes ambas a la vez. Windows de 64 bits es necesario.

Entra con la misma cuenta que utilizas en la web. Los diseñadores remotos pueden instalar el programa o seguir usando el enlace de Creativa; los pedidos se comparten mediante Supabase. La aplicación no necesita que una computadora de la imprenta funcione como servidor.

La interfaz está incluida en el programa y abre sin conexión. Para registrar dinero offline primero activa la actualización de Supabase y prepara Caja con un PIN: consulta `../caja-config-app/CAJA-SIN-CONEXION.md`. Los pedidos nuevos, archivos, reportes, cierre e impresión de recibos siguen requiriendo conexión en este piloto.

El instalador aún no tiene firma digital comercial. Windows puede mostrar que el editor no está verificado. Los archivos de esta entrega se generan directamente desde el código del proyecto. No se incluye actualización automática: una próxima versión requerirá un nuevo instalador. Sincroniza los dos dispositivos y guarda un respaldo antes de actualizar o cambiar de equipo.

## Almacenamiento

Los datos de esta app se conservan en `%APPDATA%/Creativa-Impresos`, separados del navegador. Reinstalar conserva esa carpeta; desinstalar no solicita borrarla. No la borres mientras existan movimientos pendientes. El PIN local es necesario para abrir el depósito cifrado y no sustituye el acceso de Supabase.

## Desarrollo y verificación

Esta carpeta tiene dependencias propias; no usa ni modifica la instalación de Node del proyecto web original. `npm ci` instala las versiones fijadas de Electron y electron-builder. Primero compila `../caja-config-app` y después ejecuta:

```text
npm run prepare:web
npm test
npm run test:app
npm run dist
```

Los scripts de prueba de esta máquina referencian su Playwright disponible; en otra máquina hay que ajustar esa importación. La prueba de aplicación utiliza un perfil temporal y bloquea solicitudes HTTPS; no inicia sesión ni escribe en Supabase real. Las pruebas verifican aislamiento del contenido, rutas, recursos locales, conservación del perfil y generación PDF. No se ha probado una impresora física.

La ventana usa `app://creativa`, sandbox, aislamiento de contexto y acceso a Node desactivado. Solo se abren en aplicaciones externas los enlaces permitidos de WhatsApp, teléfonos y adjuntos firmados del Supabase de Creativa. El contenido remoto no se carga como página principal del programa.
