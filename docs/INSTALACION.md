# Instalación, desarrollo y revisión en otra laptop

## Requisitos

El ejecutable publicado es para **Windows x64**. Para utilizar Creativa junto con Ollama, usa Windows 10 22H2 o Windows 11. La integración automática existente se realizó en Windows Server 2025 x64.

Para IA se recomiendan 16 GB de RAM y 15 GB libres durante la preparación inicial. Son recomendaciones, no mínimos certificados. La GPU dedicada es opcional para el modelo; se comprobó inferencia en CPU. La vista 3D utiliza WebGL y ofrece vista plana cuando el renderizador no está disponible.

Ollama documenta Windows 10 22H2 o posterior y al menos 4 GB para su instalación; Qwen añade aproximadamente 3.3 GB. Las dependencias de desarrollo y los archivos temporales requieren espacio adicional. Fuentes: [Ollama en Windows](https://docs.ollama.com/windows), [instalación de Electron](https://www.electronjs.org/docs/latest/tutorial/installation).

## Revisar la aplicación como usuario

1. Descarga [Portable.exe 0.3.1](https://github.com/milimoon1225-oss/team/releases/download/desktop-v0.3.1/Creativa-Operaciones-0.3.1-x64-Portable.exe) o el instalador de la [Release](https://github.com/milimoon1225-oss/team/releases/tag/desktop-v0.3.1).
2. Abre el portable, o instala Creativa con el instalador. No requiere Node.js, Python, npm, Git ni Supabase.
3. Usa **Explorar demostración** para recorrer las muestras o crea el responsable local y su PIN.
4. Instala [Ollama](https://ollama.com/download/windows) y ábrelo para utilizar IA.
5. Ejecuta [Preparar-IA.cmd](https://github.com/milimoon1225-oss/team/releases/download/desktop-v0.3.1/Preparar-IA.cmd). Si falta Qwen pregunta antes de descargarlo; la preparación requiere internet. Si Ollama no está instalado indica su enlace oficial. Comprueba una respuesta real al terminar.
6. Desde el chat, pulsa **Más opciones y ayuda → Comprobar modelo local**.

La app y su modelo ya preparado pueden trabajar sin internet. La entrega actual no incluye Ollama ni los pesos del modelo dentro del `.exe`. El preparador usa CMD y PowerShell incluidos en Windows; no modifica sus políticas de ejecución ni instala lenguajes.

Los ejecutables no tienen firma comercial. Windows puede identificar el editor como desconocido. La instalación interactiva y las condiciones del equipo de destino deben comprobarse allí.

## Revisar el código como programador

Instala Git y Node.js 24 LTS, con npm. En una terminal:

```sh
git clone --single-branch --branch feat/escritorio-local https://github.com/milimoon1225-oss/team.git Creativa-Escritorio
cd Creativa-Escritorio
npm ci
npm run setup:desktop
npm run diagnostico
npm start
```

En PowerShell, si se bloquea `npm.ps1`, utiliza `npm.cmd` en los mismos comandos, por ejemplo `npm.cmd ci` y `npm.cmd start`. No necesitas cambiar la política global de ejecución. En Linux utiliza `npm`.

La rama es un proyecto independiente. No necesita las carpetas anteriores, una cuenta de Supabase, PostgreSQL, Python ni `.env`. `npm start` compila y abre Electron. `npm run dev` sirve para desarrollo de pantallas y no es el comando para abrir la app de escritorio.

`npm run setup:desktop` descarga el motor Electron de este entorno. La instalación inicial de dependencias y motor necesita conexión. [Electron documenta también su descarga diferida](https://www.electronjs.org/docs/latest/tutorial/installation).

Para comprobar IA en el entorno de desarrollo, con Ollama instalado y abierto:

```sh
ollama pull qwen3.5:4b
npm run diagnostico -- --modelo
```

El diagnóstico no instala componentes. Con `--modelo` falla si falta el servicio, el modelo o una respuesta válida. Sin esa opción, esos problemas se muestran como avisos porque no impiden usar la gestión sin IA.

## Git LFS y el ejecutable

La copia de `distribucion/windows/` usa Git LFS. Para obtenerla al clonar, instala Git LFS y ejecuta `git lfs install` antes de clonar, o `git lfs pull` dentro de la copia existente. Un archivo de unos pocos bytes que comienza por `version https://git-lfs.github.com/spec/v1` es un puntero, no el ejecutable.

Puedes compilar las fuentes sin descargar ese portable. Para abrir un `.exe` sin herramientas de desarrollo, utiliza la Release. No intentes ejecutar un puntero LFS ni el `.exe` Windows directamente en Linux/macOS.

## Pruebas y compilación Windows

Desde la raíz del repositorio:

```sh
npm run lint
npm test
npm run build
npm run dist:win
npm run checksums
npm run test:package
```

`npm run test:package` abre `release/win-unpacked/Creativa Operaciones.exe` en un perfil temporal. Para comprobar Qwen real, con el modelo ya preparado:

```sh
npm run test:package:model
```

Para comprobar el portable generado, en PowerShell:

```powershell
$env:CREATIVA_PACKAGED_EXE = (Resolve-Path 'release/Creativa-Operaciones-0.3.1-x64-Portable.exe').Path
npm run test:package:model
```

Las pruebas de control nativo `test:desktop` y `test:samples` se ejecutan en Linux. En el runner Windows se observó un bloqueo del depurador de ese control; la revisión Windows usa las pruebas del ejecutable final por CDP. La compilación Windows se recomienda hacer en Windows, o mediante Actions → **Escritorio Windows**.

Las salidas de `release/` se ignoran en Git. La distribución seleccionada está en `distribucion/windows/`. Los perfiles de `test-output/` contienen datos ficticios y no sustituyen los respaldos de la imprenta.

## Datos, respaldo y traslado

Los datos se guardan en `%APPDATA%\Creativa-Operaciones`, por usuario de Windows. La edición portable usa esa misma ubicación: copiar el `.exe` no traslada pedidos ni modelos.

Antes de cambiar de equipo, descarga un respaldo cifrado desde Configuración y conserva el PIN. Restaura desde la pantalla inicial de un perfil vacío; la aplicación rechaza sobrescribir otra copia. Los respaldos no fusionan bases. La demostración es temporal.

Ollama y Qwen se preparan por separado en el equipo nuevo. No elimines perfiles reales para realizar pruebas: las pruebas automatizadas crean sus propios perfiles temporales.

## Qué está validado

El `.exe` empaquetado y el portable 0.3.1 pasaron pruebas con Qwen real, texto e imagen, guardado de pedido, 3D y reapertura. Véanse [los informes](VALIDACION-MODELO.md). Esto no certifica todos los equipos o imágenes. La instalación interactiva del instalador NSIS y la configuración física de impresión se revisan en el destino.
