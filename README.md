# Creativa Operaciones

Aplicación de escritorio para una imprenta: pedidos, producción, diseños y aprobaciones, cobros, caja, costos y reportes. Incluye muestras de invitaciones en 3D y un asistente local opcional.

Los datos de trabajo se guardan cifrados en esta computadora. No necesita una cuenta ni un servidor externo para registrar operaciones. La demostración contiene datos ficticios y se descarta al salir.

## Abrir la aplicación

Descarga el [portable para Windows x64 (.exe)](https://github.com/milimoon1225-oss/team/raw/refs/heads/feat/escritorio-local/distribucion/windows/Creativa-Operaciones-0.3.0-x64-Portable.exe) incluido en `distribucion/windows/` de esta misma rama. También está disponible en la [Release de escritorio 0.3.0](https://github.com/milimoon1225-oss/team/releases/tag/desktop-v0.3.0). No requiere Node.js. Incluye el archivo SHA256SUMS.txt para verificar la descarga.

Esta entrega es preliminar: el portable se generó y se revisó su paquete, pero todavía debe probarse en Windows real. El instalador NSIS se podrá generar mediante el flujo Windows del repositorio. La entrega portable y su suma SHA-256 están versionadas en `distribucion/windows/`; el código fuente permanece visible en esta misma rama.

En el primer inicio, elige el responsable y un PIN de 6 a 12 dígitos, o pulsa **Explorar demostración**. Guarda el PIN y realiza respaldos desde Configuración.

## Ejecutar desde el código fuente

Requisitos: Node.js 24 LTS, npm y un entorno de escritorio. Para compilar Windows se recomienda Windows x64.

```sh
git clone --branch feat/escritorio-local https://github.com/milimoon1225-oss/team.git
cd team
npm ci
npm start
```

Si ya tienes esta copia de trabajo, entra al directorio que contiene `package.json` y ejecuta `npm ci` y `npm start`.

`npm start` compila la interfaz y abre una ventana Electron. React dibuja las pantallas dentro de la aplicación; el usuario final no inicia un servidor ni abre una dirección en el navegador.

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

## Verificar y generar instaladores

```sh
npm run lint
npm test
npm run test:desktop
npm run test:samples
npm run dist:win
npm run checksums
```

- `dist/`: interfaz compilada; se genera desde `src/`.
- `release/`: salidas de compilación; se ignoran en Git. La copia de entrega del portable y su SHA-256 sí se versionan en `distribucion/windows/`.
- `test-output/`: perfiles temporales y evidencias de las pruebas; no se publican.

El flujo de GitHub Actions compila en Windows y conserva los ejecutables como artefactos descargables; no crea Releases por sí solo. La publicación y la comprobación de instalación en un Windows real son pasos separados.

## Asistente y trabajo sin conexión

Pedidos, caja, reportes, archivos y vista 3D funcionan sin internet. Para las funciones con IA, instala Ollama y descarga una vez `qwen3.5:4b`. Luego el modelo funciona localmente; no se incluye su peso en el instalador. Las consultas directas y las validaciones del negocio no necesitan cargar el modelo.

Consulta [instalación y respaldos](docs/INSTALACION.md), [arquitectura](docs/ARQUITECTURA.md), [asistente local](docs/ASISTENTE-LOCAL.md) y [vista 3D](docs/VISTA-3D.md).

## Alcance de esta edición

Es un espacio local por computadora, con responsable y PIN. No implementa colaboración entre varias computadoras ni administración de cuentas compartidas. Los respaldos sirven para recuperación o traslado a un perfil vacío; no fusionan bases. La aplicación limita cada copia a 75 MB de datos antes del cifrado, por lo que conviene usar imágenes y PDF optimizados.

El recibo es interno; no sustituye comprobantes tributarios. La vista 3D es una aproximación visual de materiales y luz, y no garantiza el color o acabado físico de impresión.
