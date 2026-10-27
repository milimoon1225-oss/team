# Instalación, desarrollo y entrega

## Usuario de Windows

1. Descarga `Creativa-Operaciones-0.3.0-x64-Portable.exe` de la [Release de escritorio](https://github.com/milimoon1225-oss/team/releases/tag/desktop-v0.3.0).
2. Ejecuta el portable con tu usuario de Windows. No requiere instalar Node.js.
3. Elige un responsable y PIN, o explora primero la demostración.
4. Crea un pedido de prueba, bloquea y vuelve a abrir el espacio para comprobar el guardado.
5. Descarga un respaldo cifrado desde Configuración y guárdalo fuera de la computadora.

La edición portable abre sin instalar. Guarda sus datos en el perfil del usuario de Windows, no junto al ejecutable: copiar solo el `.exe` no traslada los pedidos.

Los ejecutables de esta configuración no tienen firma comercial. Windows puede mostrar una advertencia de editor desconocido. Para una distribución empresarial conviene firmar el instalador y verificarlo en una máquina Windows limpia.

## Desarrollo

Requisitos: Node.js 24 LTS, npm y escritorio gráfico. Desde la raíz que contiene `package.json`:

```sh
npm ci
npm start
```

Si el entorno de desarrollo ha deshabilitado los scripts de instalación, completa la descarga de Electron:

```sh
node node_modules/electron/install.js
```

`npm run dev` sirve únicamente para desarrollo de pantallas. La entrega de escritorio se abre con `npm start` o con el ejecutable empaquetado.

## Compilar Windows

En Windows x64:

```sh
npm ci
npm run lint
npm test
npm run test:desktop
npm run test:samples
npm run dist:win
npm run checksums
```

`release/` contendrá los ejecutables y `SHA256SUMS.txt`. No deben añadirse al commit. Compilar Windows desde Linux puede requerir herramientas auxiliares; la ruta recomendada y automatizada es el flujo Windows del repositorio.

En GitHub: abre Actions → **Escritorio Windows** → Run workflow sobre la rama publicada. Descarga el artefacto generado. Para entregar al público, crea una Release y adjunta los `.exe` y el archivo SHA-256. Ese procedimiento requiere publicar previamente la rama; no se ejecuta por reorganizar las fuentes.

## Respaldos y traslado

- Descarga el respaldo desde Configuración antes de una actualización importante.
- Conserva el PIN por separado: no hay recuperación de una clave perdida.
- En otra computadora o perfil vacío, introduce el PIN del respaldo en la pantalla inicial y selecciona Restaurar respaldo cifrado.
- Si ya hay una copia, la aplicación rechaza la restauración para no sobrescribirla. No elimina ni fusiona los datos existentes.
- La demostración es temporal y no permite generar un respaldo de producción.

En Windows, el perfil está habitualmente en `%APPDATA%\Creativa-Operaciones`. Usa el respaldo de la aplicación para trasladar información; no manipules los archivos internos mientras esté abierta.

## Validación antes de entregar

Comprueba en Windows: instalación y portable, creación de pedido, cobro y saldo, cierre de caja, diseño y aprobación, vista 3D y ventana de cliente, impresión/PDF, bloqueo y reapertura, respaldo/restauración en un perfil vacío. Prueba también sin red y sin Ollama para confirmar que la gestión sigue disponible. El modelo local se valida por separado cuando esté instalado.

## Estado de esta preparación

Se generó el portable Windows x64 de la versión 0.3.0 y su suma SHA-256. Se revisó el contenido del paquete y se validaron los flujos principales y las muestras mediante Electron en Linux. El ejecutable Windows aún necesita una prueba en Windows real.

El instalador NSIS no terminó de generarse en este equipo Linux porque no tiene Wine. No se conserva el archivo parcial como entrega. Puede generarse con `npm run dist:win` en Windows o mediante el flujo automatizado. Para generar únicamente el portable: `npm run dist:portable`.
