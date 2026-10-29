# Validación de Qwen3.5:4b en el escritorio

La comprobación de la versión 0.3.1 envía una consulta real al modelo desde la aplicación empaquetada. No basta con encontrar el nombre de Qwen en la lista de Ollama. El diagnóstico distingue el modelo ausente, un error del servicio, una respuesta incorrecta y una respuesta válida.

## Casos que se comprueban

- Arranque del paquete real, identificado como aplicación empaquetada en `app.asar`.
- Perfil temporal separado de los datos de la imprenta.
- Diagnóstico del modelo mediante el botón de la aplicación y el puente IPC real.
- Clasificación de una pregunta sobre pedidos de mañana.
- Conversión de un mensaje ficticio en una propuesta de 150 invitaciones, conservando la fecha vacía cuando no se proporciona.
- Lectura de una imagen ficticia con los textos «MARIA Y JOSE» y «20/12/2025».
- Reinicio de la aplicación y recuperación del perfil cifrado.

El modelo es `qwen3.5:4b`; la prueba utiliza Ollama local y no sustituye sus respuestas con interceptores. La prueba no certifica precisión general para todas las imágenes o preguntas.

## Evidencia

La ejecución local en Linux terminó en PASS. Su resumen está en [evidencias/modelo-0.3.1-linux.json](evidencias/modelo-0.3.1-linux.json). La [comprobación Windows](https://github.com/milimoon1225-oss/team/actions/runs/40929101751) terminó en PASS con el `.exe` empaquetado y con el portable. Sus resúmenes son [exe](evidencias/modelo-0.3.1-windows-exe.json) y [portable](evidencias/modelo-0.3.1-windows-portable.json). Se utilizó Ollama 0.40.13 y el modelo qwen3.5:4b con digest `d8b0f5e9760cd1682034f292d7ef72ec46f432149be0df7574bf2d6e92e38c04`. Los informes completos y las capturas disponibles quedan en el artefacto de evidencia de esa ejecución.

## Cómo repetir la comprobación

En una computadora con el modelo ya descargado y Ollama abierto:

```sh
npm ci
npm run setup:desktop
npm run dist:win
npm run test:package:model
```

Para probar el portable en Windows PowerShell:

```powershell
$env:CREATIVA_PACKAGED_EXE = (Resolve-Path 'release/Creativa-Operaciones-0.3.1-x64-Portable.exe').Path
npm run test:package:model
```

La prueba utiliza datos ficticios y un PIN de prueba en un perfil nuevo. No se debe apuntar a un perfil real ni usar información de clientes para esta validación. Los pesos de Qwen no se incluyen en el `.exe`: deben instalarse una vez en la computadora de destino con `ollama pull qwen3.5:4b`.
