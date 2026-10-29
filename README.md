# Creativa Operaciones

Aplicación de escritorio para una imprenta: pedidos, producción, diseños y aprobaciones, cobros, caja, costos y reportes. Incluye muestras de invitaciones en 3D y un asistente local opcional.

Los datos de trabajo se guardan cifrados en esta computadora. No necesita una cuenta ni un servidor externo para registrar operaciones. La demostración contiene datos ficticios y se descarta al salir.

## Requisitos para otra laptop

| Uso | Preparación |
| --- | --- |
| Abrir el `.exe` publicado | Windows x64. Para el conjunto con Ollama: Windows 10 22H2 o Windows 11. No requiere Node.js, Python, Git ni una base externa. |
| Usar la IA | Instalar y abrir Ollama; descargar `qwen3.5:4b` una vez. Se recomiendan 16 GB de RAM y 15 GB libres durante la preparación completa. No son mínimos certificados. |
| Trabajar con las fuentes | Git y Node.js **24 LTS**, con npm. Git LFS es necesario solo si quieres obtener el `.exe` al clonar. |
| Trabajo sin internet | Primero deben descargarse dependencias, motor y modelo. Después, el ejecutable y el modelo local funcionan sin conexión. |

La GPU dedicada no es obligatoria para la IA: la integración Windows se comprobó en CPU. Para 3D se necesita WebGL; si no está disponible, utiliza la vista plana.

## Abrir el ejecutable, sin programar

1. Descarga el [portable Windows x64 0.3.1](https://github.com/milimoon1225-oss/team/releases/download/desktop-v0.3.1/Creativa-Operaciones-0.3.1-x64-Portable.exe) de la [Release](https://github.com/milimoon1225-oss/team/releases/tag/desktop-v0.3.1).
2. Abre el archivo. Elige **Explorar demostración** o prepara un responsable y PIN.
3. Para las funciones con IA, instala [Ollama para Windows](https://ollama.com/download/windows) y ábrelo.
4. Ejecuta [Preparar-IA.cmd](https://github.com/milimoon1225-oss/team/releases/download/desktop-v0.3.1/Preparar-IA.cmd). Si falta el modelo solicita confirmación para descargarlo y comprueba una respuesta real. No requiere Node.js ni Python.
5. En el chat, utiliza **Más opciones y ayuda → Comprobar modelo local**.

Guía completa: [abrir en otra laptop](distribucion/windows/LEEME-OTRA-LAPTOP.md). El preparador no instala Ollama automáticamente y la entrega no incluye los pesos de Qwen. La preparación inicial necesita internet.

El mismo portable está en `distribucion/windows/` mediante Git LFS, junto con su SHA-256. Si descargaste un puntero pequeño en vez del archivo, descarga la Release o ejecuta `git lfs pull` con Git LFS instalado. La versión real ocupa aproximadamente 108 MB.

## Abrir desde el código en una laptop de desarrollo

Instala Git y Node.js 24 LTS. En la terminal:

```sh
git clone --single-branch --branch feat/escritorio-local https://github.com/milimoon1225-oss/team.git Creativa-Escritorio
cd Creativa-Escritorio
npm ci
npm run setup:desktop
npm run diagnostico
npm start
```

En PowerShell, si se bloquea `npm.ps1`, utiliza `npm.cmd` en los mismos comandos, por ejemplo `npm.cmd ci` y `npm.cmd start`. No necesitas cambiar la política global de ejecución. En Linux utiliza `npm`.

La última instrucción abre Electron. El código no depende de las otras carpetas del equipo original. No necesitas ejecutar servidores externos ni configurar archivos `.env`. Si solo vas a compilar las fuentes, el portable distribuido no es necesario.

Para activar y comprobar IA en la laptop de desarrollo, con Ollama instalado y abierto:

```sh
ollama pull qwen3.5:4b
npm run diagnostico -- --modelo
```

`diagnostico` revisa dependencias, motor Electron, memoria, disco y disponibilidad del servicio. Con `--modelo` exige una respuesta real de Qwen. No instala ni descarga componentes. Sin esa opción, la falta de IA se muestra como aviso y permite seguir preparando la gestión local.

## Estructura

```text
src/
  domain/            Reglas del negocio y cálculos
  application/       Casos de uso, sesión y contratos
  infrastructure/    Cifrado, almacenamiento, archivos y modelo local
  presentation/      Pantallas, chat y representación 3D
  bootstrap/         Conexión de casos de uso y adaptadores
  main.jsx           Entrada de la interfaz
desktop/             Proceso principal, ventanas y puentes Electron
distribucion/windows/ Portable .exe y SHA-256 de esta entrega
public/brand/        Recursos gráficos incluidos
test/                Pruebas del negocio, arquitectura e integración
scripts/             Arranque y sumas de verificación
docs/                Arquitectura y guías
.github/workflows/   Verificación y compilación Windows
package.json         Dependencias, comandos y empaquetado
package-lock.json    Versiones reproducibles
```

## Verificar y compilar Windows

Desde una laptop Windows x64, después de instalar las dependencias:

```sh
npm run setup:desktop
npm run lint
npm test
npm run build
npm run dist:win
npm run checksums
npm run test:package
```

Para comprobar el `.exe` empaquetado con el modelo real, abre Ollama con `qwen3.5:4b` instalado y ejecuta `npm run test:package:model`. La prueba usa un perfil temporal, separado de tus pedidos.

Las pruebas `test:desktop` y `test:samples` utilizan el control de Electron desde el código y se verifican en Linux. Para revisar Windows utiliza las pruebas del paquete final indicadas arriba; evitan el bloqueo del depurador observado en el runner Windows.

- `dist/`: interfaz compilada.
- `release/`: instalador, portable y checksums generados; no se versionan.
- `distribucion/windows/`: entrega seleccionada, preparador de IA y guía de otra laptop.
- `test-output/`: perfiles temporales y evidencias de pruebas; no se publican como datos de producción.

El flujo **Escritorio Windows** compila y prueba el `.exe` y el portable con Qwen real. El instalador NSIS se genera; la instalación interactiva se debe comprobar en el equipo de destino.

## Asistente y trabajo sin conexión

Pedidos, caja, reportes, archivos y vista 3D funcionan sin internet. Para las funciones con IA, instala Ollama y descarga una vez `qwen3.5:4b`. Luego el modelo funciona localmente; no se incluye su peso en el instalador. Las consultas directas y las validaciones del negocio no necesitan cargar el modelo.

Consulta [instalación y respaldos](docs/INSTALACION.md), [arquitectura](docs/ARQUITECTURA.md), [asistente local](docs/ASISTENTE-LOCAL.md) y [vista 3D](docs/VISTA-3D.md).

## Alcance de esta edición

Es un espacio local por computadora, con responsable y PIN. No implementa colaboración entre varias computadoras ni administración de cuentas compartidas. Los respaldos sirven para recuperación o traslado a un perfil vacío; no fusionan bases. La aplicación limita cada copia a 75 MB de datos antes del cifrado, por lo que conviene usar imágenes y PDF optimizados.

El recibo es interno; no sustituye comprobantes tributarios. La vista 3D es una aproximación visual de materiales y luz, y no garantiza el color o acabado físico de impresión.

## Comprobación del asistente en la entrega 0.3.1

En Asistente → Más opciones y ayuda → Comprobar modelo local se ejecuta una consulta real. Qwen no está incluido en el `.exe`: instala y abre Ollama y descarga `qwen3.5:4b` una vez en la computadora donde utilizarás Creativa. Después puede trabajar sin internet.

La [validación Windows](https://github.com/milimoon1225-oss/team/actions/runs/40929101751) pasó sobre el commit `c12ba5496a7e738b1002b30641b81afe4a5d611b`. Consulta los [casos y evidencias](docs/VALIDACION-MODELO.md). Los ejecutables distribuidos conservan los hashes de los archivos probados.

Si quieres descargar el `.exe` al clonar el repositorio, instala Git LFS y ejecuta `git lfs install` antes de clonar, o `git lfs pull` después. Las fuentes y su compilación no dependen del ejecutable distribuido.

La [preparación de otra laptop](https://github.com/milimoon1225-oss/team/actions/runs/40937070523) también se verificó en Windows: servicio apagado, inicio desde el preparador, respuestas reales y diagnóstico del entorno. El código probado del preparador corresponde a `259f8e429b31b25184f4cc96c8fde913bdfdb8f5`.
