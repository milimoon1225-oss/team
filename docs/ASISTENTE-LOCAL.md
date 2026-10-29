# Asistente local

El chat ayuda a buscar pedidos, identificar trabajos bloqueados, navegar al diseño o aprobación faltantes y preparar propuestas. También dispone de revisión de archivos, comparación de versiones, consulta de manuales, extracción de encargos, mensajes al cliente, cálculo orientativo y capacidad de trabajo. Las acciones disponibles respetan el rol y los datos de la sesión.

## Instalar el modelo opcional

Instala Ollama en la computadora y ejecuta:

```sh
ollama pull qwen3.5:4b
```

La descarga inicial requiere internet y espacio en disco. Después, Ollama y el modelo pueden funcionar sin conexión. Debe estar activo su servicio local en `127.0.0.1:11434`. No se descargan modelos al abrir Creativa y no se incluyen sus pesos en Git ni en el instalador.

El tiempo de respuesta depende del procesador, memoria y GPU. El cliente solicita una sola tarea a la vez, limita el contexto y no mantiene el modelo cargado tras terminar. El sistema funciona sin modelo; los análisis de IA muestran un aviso si Ollama no responde.

## Uso

Abre Asistente y prueba «qué falta», «busca a María» o «abre caja». Desde un pedido, solicita revisar el archivo o preparar un mensaje de confirmación. El chat ofrece accesos al pedido y a la sección pertinente. Revisa siempre las propuestas antes de aplicarlas.

Los cálculos financieros y las comprobaciones verificables se hacen en el código, no se aceptan importes inventados por el modelo. La IA interpreta preguntas, analiza contenido y redacta; no reemplaza la aprobación del cliente ni confirma operaciones de caja. No genera imágenes profesionales ni edita archivos de CorelDRAW. Los manuales PDF deben contener texto; no se incluye OCR de documentos escaneados.

Las conversaciones son temporales. Los manuales y fichas guardados por el usuario se incluyen en el respaldo cifrado. Bloquear el espacio cancela solicitudes y oculta los datos de la sesión.

## Comprobación real del modelo (0.3.1)

«Comprobar modelo local» consulta Ollama y envía una pregunta ficticia a Qwen3.5:4b. Solo indica que respondió correctamente si recibe una consulta estructurada válida. La prueba no utiliza datos de clientes. Si falta el modelo, muestra el comando de descarga; si Ollama no responde o falla la inferencia, muestra el error. La primera carga puede tardar.

Para comprobar el paquete, primero genera la distribución y asegúrate de tener Ollama activo con `qwen3.5:4b`. Ejecuta `npm run test:package:model`. La prueba utiliza un perfil temporal: comprueba que está ejecutando `app.asar`, usa el puente IPC real, prepara un encargo ficticio, analiza una imagen con fecha conocida y reinicia la aplicación para comprobar la persistencia. Guarda resultados JSON y, cuando el entorno gráfico lo permite, una captura en `test-output/`.

En Windows también puedes comprobar el portable distribuible:

```powershell
$env:CREATIVA_PACKAGED_EXE = (Resolve-Path 'release/Creativa-Operaciones-0.3.1-x64-Portable.exe').Path
npm run test:package:model
```

La marca `--creativa-autoprueba` y un perfil temporal explícito habilitan únicamente el aislamiento de datos y la evidencia de diagnóstico. La ejecución normal conserva el perfil habitual.

El flujo Windows prepara Ollama en el runner, descarga el modelo y comprueba tanto el `.exe` empaquetado como el portable. Los artefactos de entrega se conservan únicamente si esas pruebas pasan. Un fallo no se convierte en una entrega validada. Las pruebas con modelos simulados siguen separadas de esta integración real.
