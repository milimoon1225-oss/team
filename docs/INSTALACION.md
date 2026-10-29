# Instalación, desarrollo y entrega

## Usuario de Windows

1. Descarga `Creativa-Operaciones-0.3.1-x64-Portable.exe` desde `distribucion/windows/` de esta misma rama, o desde la [Release de escritorio](https://github.com/milimoon1225-oss/team/releases/tag/desktop-v0.3.1).
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

La versión utilizada de Electron puede descargar su motor en el primer arranque. Para preparar explícitamente ese motor antes de abrir la aplicación o ejecutar las pruebas:

```sh
npm run setup:desktop
```

`npm run dev` sirve únicamente para desarrollo de pantallas. La entrega de escritorio se abre con `npm start` o con el ejecutable empaquetado.

## Compilar Windows

En Windows x64:

```sh
npm ci
npm run setup:desktop
npm run lint
npm test
npm run test:desktop
npm run test:samples
npm run dist:win
npm run checksums
```

`release/` contendrá los ejecutables y `SHA256SUMS.txt`. Las salidas de `release/` se ignoran en Git. Esta entrega incluye una copia explícita del portable y su SHA-256 en `distribucion/windows/`. Compilar Windows desde Linux puede requerir herramientas auxiliares; la ruta recomendada y automatizada es el flujo Windows del repositorio.

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

## Estado de esta entrega

El flujo Windows generó instalador y portable 0.3.1. La prueba del `.exe` empaquetado y del portable terminó en PASS con Ollama y Qwen3.5:4b reales, incluyendo texto, imagen y reapertura del pedido cifrado. Consulta [VALIDACION-MODELO.md](VALIDACION-MODELO.md).

La instalación interactiva del instalador NSIS se debe comprobar en la computadora de destino. La integración automatizada utiliza perfiles temporales; no modifica los datos de la imprenta.

El portable de `distribucion/windows/` utiliza Git LFS. Para descargarlo directamente sin herramientas de desarrollo, utiliza el archivo adjunto de la Release. Para compilar desde el código, basta con las fuentes, Node.js y las dependencias indicadas.

## Validación del asistente en la entrega 0.3.1

La aplicación conserva las funciones de gestión aunque falte Ollama. Para activar IA en la computadora de destino: instala Ollama, abre su servicio y ejecuta `ollama pull qwen3.5:4b` una vez con internet. El modelo no está dentro del `.exe`; después de descargarlo se utiliza localmente.

Desde Asistente → Más opciones y ayuda → Comprobar modelo local se realiza una inferencia real. Detectar el nombre del modelo instalado ya no se presenta como prueba suficiente de funcionamiento. El tiempo mostrado corresponde a la comprobación en esa computadora.

La integración automatizada y sus resultados distinguen pruebas del código, del paquete y del portable. Consulta `test-output/` o el artefacto de evidencia del flujo Windows. La versión anterior 0.3.0 no incorpora este diagnóstico nuevo.
