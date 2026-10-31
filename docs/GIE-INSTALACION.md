# GIE · Creativa Operaciones

Guía de instalación y primer inicio · Windows x64

Versión 0.3.1 · Entrega preliminar · Actualizada el 30 de octubre de 2026.

Para una persona que abre Creativa por primera vez. Sigue la ruta del ejecutable si solo quieres usarla; elige la ruta del código fuente si vas a desarrollar. La IA es opcional en ambas.

## Antes de empezar

- Usar el ejecutable: una computadora Windows x64. Descarga el portable oficial; no necesitas instalar Git, Node.js, Python ni una base de datos externa.
- Ejecutar las fuentes: Git y Node.js 24 LTS con npm, conexión para descargar dependencias y el motor Electron, y una terminal abierta en la carpeta del proyecto.
- Usar IA: Ollama instalado y abierto, más el modelo qwen3.5:4b descargado. Para este conjunto utiliza Windows 10 22H2 o Windows 11. Se recomiendan 16 GB de RAM y 15 GB libres durante la preparación; no son mínimos certificados.
Las operaciones se guardan localmente. La cuenta de GitHub solo es necesaria si vas a publicar cambios; no se exige para descargar este repositorio público ni para abrir Creativa.

Rama de la aplicación: feat/escritorio-local. Copia documental: docs/guia-instalacion-onboarding.

[Repositorio y rama de Creativa](https://github.com/milimoon1225-oss/team/tree/feat/escritorio-local)

## 1. Abrir el ejecutable (.exe)

Esta es la ruta más corta para usar Creativa, sin trabajar con código.

1. Abre la publicación oficial de la versión 0.3.1. Busca la sección Assets, al final de la página.
2. Descarga Creativa-Operaciones-0.3.1-x64-Portable.exe. El archivo publicado ocupa 112 931 898 bytes, aproximadamente 108 MiB.
3. Abre el Explorador de archivos y entra en Descargas, o en la carpeta donde guardaste el archivo.
4. Haz doble clic en el portable y espera a que aparezca la pantalla de preparación. El portable se ejecuta directamente; no tiene un asistente de instalación.

[Abrir la publicación oficial y sus archivos](https://github.com/milimoon1225-oss/team/releases/tag/desktop-v0.3.1)

[Descargar el portable Windows x64 0.3.1](https://github.com/milimoon1225-oss/team/releases/download/desktop-v0.3.1/Creativa-Operaciones-0.3.1-x64-Portable.exe)

![Figura 1. Descargas reales de la publicación oficial. Elige el archivo que termina en Portable.exe.](capturas-gie/02-release-oficial.jpg)

*Figura 1. Descargas reales de la publicación oficial. Elige el archivo que termina en Portable.exe.*

Alternativa: la misma publicación contiene Creativa-Operaciones-0.3.1-x64-Instalador.exe. Si eliges esa opción, ejecútalo, sigue su asistente y abre Creativa desde el acceso directo creado.

La publicación está marcada como preliminar. La instalación interactiva del instalador debe comprobarse en el equipo de destino.

## 2. Elegir cómo empezar

### Para conocer las pantallas

Pulsa Explorar demostración. Se cargarán pedidos, precios y diseños ficticios para recorrer la aplicación. En esta versión, los cambios de la demostración duran hasta salir: no la uses para registrar trabajo que necesites conservar.

### Para guardar tu trabajo

1. En Preparar esta computadora, escribe el nombre de la persona responsable.
2. Elige un PIN local de 6 a 12 dígitos y repítelo en el segundo campo.
3. Pulsa Preparar y comenzar. En las siguientes aperturas, entra con ese mismo PIN.

![Figura 2. Pantalla real del primer inicio de Creativa 0.3.1. La demostración y la preparación permanente son opciones distintas.](capturas-gie/03-preparar-computadora.png)

*Figura 2. Pantalla real del primer inicio de Creativa 0.3.1. La demostración y la preparación permanente son opciones distintas.*

Conserva el PIN: protege los datos cifrados y permite descifrar tus respaldos. Para recuperar información de otra computadora, usa Restaurar respaldo cifrado desde un perfil vacío.

## 3. Ejecutar desde el código fuente

### 3.1. Preparar Git y Node.js

1. Instala Git para Windows desde su sitio oficial. Mantén habilitado su uso desde la línea de comandos.
2. Instala Node.js 24 LTS para Windows x64 con npm. En la página de descargas selecciona la línea 24 LTS; la rama del proyecto recomienda esa versión.
3. Cierra las terminales que estaban abiertas durante la instalación y abre una nueva PowerShell desde Inicio.

Comprueba que las herramientas respondan ejecutando estos comandos, uno por uno:

```powershell
git --version
node --version
npm.cmd --version
```

Deben aparecer números de versión. La comprobación de esta guía utilizó Git 2.54.0, Node.js 24.16.0 y npm 11.13.0. No necesitas que las versiones menores coincidan exactamente.

[Descargar Git para Windows](https://git-scm.com/install/windows)

[Descargar Node.js y seleccionar 24 LTS](https://nodejs.org/en/download)

![Figura 3. Rama real feat/escritorio-local seleccionada en GitHub. Esta guía utiliza esa rama, no main.](capturas-gie/01-rama-github.jpg)

*Figura 3. Rama real feat/escritorio-local seleccionada en GitHub. Esta guía utiliza esa rama, no main.*

## 3.2. Descargar, preparar y abrir

1. Elige una carpeta para el proyecto. En PowerShell puedes entrar, por ejemplo, a Documentos con el primer comando siguiente.
2. Clona la rama feat/escritorio-local y entra en la carpeta Creativa-Escritorio.
3. Instala las dependencias con npm.cmd ci y prepara Electron con npm.cmd run setup:desktop. La primera preparación necesita internet; espera a que cada comando termine.
4. Ejecuta el diagnóstico. Si no hay errores de dependencias o de Electron, abre la aplicación con npm.cmd start.

```powershell
cd "$HOME\Documents"
git clone --single-branch --branch feat/escritorio-local https://github.com/milimoon1225-oss/team.git Creativa-Escritorio
cd Creativa-Escritorio
npm.cmd ci
npm.cmd run setup:desktop
npm.cmd run diagnostico
npm.cmd start
```

Ejecuta cada línea por separado. El diagnóstico puede avisar que falta Ollama o el portable de Git LFS; esos avisos no impiden compilar y abrir las fuentes. Corrige cualquier resultado ERROR antes de continuar.

npm.cmd start compila y abre Electron; mantén la terminal abierta. No necesitas Supabase ni archivos .env. Para esta edición usa start, no dev.

![Figura 4. Creativa ejecutada desde las fuentes y abierta en demostración. Todos los pedidos e importes que se ven son ficticios.](capturas-gie/04-inicio-demostracion.png)

*Figura 4. Creativa ejecutada desde las fuentes y abierta en demostración. Todos los pedidos e importes que se ven son ficticios.*

## 4. Preparar la IA local (opcional)

Puedes registrar pedidos y usar las funciones locales sin preparar IA. Ollama y los pesos del modelo no están incluidos dentro del .exe de Creativa.

1. Instala Ollama para Windows desde el sitio oficial y ábrelo. No cierres su servicio mientras utilizas las funciones con IA.
2. Descarga Preparar-IA.cmd desde la misma publicación oficial de Creativa y ejecútalo con doble clic.
3. Si el modelo no está disponible, el preparador pregunta antes de descargar qwen3.5:4b, de aproximadamente 3,3 GB. Necesitas internet y espacio libre durante esa descarga.
4. Espera a que el preparador termine su consulta real. Después abre el Asistente de Creativa y entra en Más opciones y ayuda → Comprobar modelo local.

La confirmación esperada en Creativa es «Qwen3.5:4b respondió correctamente». Si el servicio no responde o falta el modelo, sigue la solución de la sección 5; no confundas tenerlo descargado con haber comprobado una respuesta.

[Descargar Ollama para Windows](https://ollama.com/download/windows)

[Descargar Preparar-IA.cmd](https://github.com/milimoon1225-oss/team/releases/download/desktop-v0.3.1/Preparar-IA.cmd)

### Alternativa para quien usa la terminal

Con Ollama instalado y abierto, puedes descargar el modelo manualmente:

```powershell
ollama pull qwen3.5:4b
```

Si ejecutas las fuentes, comprueba una respuesta real desde la raíz de Creativa-Escritorio:

```powershell
npm.cmd run diagnostico -- --modelo
```

Después de preparar el modelo, la gestión y la IA local pueden funcionar sin internet. El primer arranque del modelo puede tardar. Ollama documenta Windows 10 22H2 o posterior y al menos 4 GB para su instalación, además del espacio del modelo.

[Requisitos oficiales de Ollama en Windows](https://docs.ollama.com/windows)

## 5. Problemas comunes y su solución

Busca el mensaje que ves y aplica la solución de la tabla. Vuelve a ejecutar únicamente el paso que falló.

| Problema | Qué hacer |
| --- | --- |
| git, node o npm no se reconocen | Comprueba la instalación de Git y de Node.js con npm. Cierra y abre PowerShell. Repite los comandos de versión. |
| PowerShell bloquea npm.ps1 | Usa npm.cmd en los comandos de esta guía. No necesitas cambiar la política global de ejecución. |
| npm indica ENOENT o no encuentra package.json | Entra con cd en Creativa-Escritorio. Ejecuta dir y comprueba que package.json esté en esa carpeta. |
| Falta el motor Electron o no abre desde las fuentes | Con internet, ejecuta npm.cmd run setup:desktop y después npm.cmd run diagnostico. Si la descarga falla, revisa la conexión o el proxy y vuelve a intentarlo. |
| El .exe descargado es muy pequeño o no se puede ejecutar | Puede ser un puntero de Git LFS. Descarga el portable de la Release. Si necesitas obtenerlo por Git y tienes Git LFS instalado, ejecuta git lfs install y git lfs pull dentro del repositorio. |
| Windows identifica al editor como desconocido | Esta entrega no tiene firma comercial. Verifica que provenga de la publicación oficial y comprueba SHA256SUMS.txt. Si una política bloquea el archivo, solicita autorización al responsable del equipo. |
| Ollama no responde o falta qwen3.5:4b | Instala y abre Ollama. Ejecuta Preparar-IA.cmd o descarga el modelo con ollama pull qwen3.5:4b. Repite la comprobación real desde el Asistente. |
| Los cambios de prueba desaparecen al salir | La demostración de esta versión es temporal. Para conservar trabajo, prepara un espacio con nombre y PIN desde la pantalla inicial. |

No elimines carpetas de datos reales para resolver errores de instalación. Si el dispositivo está administrado por una organización, solicita ayuda a su responsable cuando una política impida ejecutar el programa.

## 6. Comprobar el resultado y conservar los datos

- Al ejecutar el portable o npm.cmd start aparece la pantalla de Creativa, no una solicitud de conexión a Supabase.
- Explorar demostración permite recorrer las pantallas con datos ficticios y muestra claramente el modo temporal.
- Para trabajo permanente, la preparación con responsable y PIN permite volver a abrir el mismo espacio de esta computadora.
- Si elegiste utilizar IA, el modelo solo se considera preparado cuando la comprobación devuelve una respuesta correcta.
### Dónde queda la información

Los datos de trabajo se guardan por usuario de Windows en %APPDATA%\Creativa-Operaciones. El portable utiliza esa misma ubicación: copiar solamente el .exe a otra computadora no traslada tus pedidos.

Antes de cambiar de equipo, descarga un respaldo cifrado desde Configuración y conserva su PIN. Restáuralo en un perfil vacío del equipo nuevo. Los respaldos no fusionan espacios ya existentes. Ollama y Qwen se preparan por separado en cada computadora.

### Comprobaciones para quien desarrolla

Desde la raíz del proyecto puedes ejecutar las revisiones existentes:

```powershell
npm.cmd run lint
npm.cmd test
npm.cmd run build
```

Para generar tu propio instalador y portable en Windows, utiliza npm.cmd run dist:win. Los archivos generados quedan en release/. Este paso es opcional: no hace falta recompilar si utilizas el portable publicado.

### Referencias de esta versión

[Guía de instalación mantenida en la rama de la aplicación](https://github.com/milimoon1225-oss/team/blob/feat/escritorio-local/docs/INSTALACION.md)

[Publicación 0.3.1 y sumas de verificación](https://github.com/milimoon1225-oss/team/releases/tag/desktop-v0.3.1)

Esta guía acompaña la versión 0.3.1 de la rama feat/escritorio-local. Las capturas corresponden a una ejecución real con ejemplos ficticios.
