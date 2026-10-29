# Abrir Creativa en otra laptop Windows

## Lo que necesitas

- Windows 10 22H2 o Windows 11 de 64 bits (x64).
- Para trabajar con Qwen se recomiendan 16 GB de RAM y 15 GB libres durante la primera preparación. Son recomendaciones de uso, no mínimos certificados.
- Internet para descargar los archivos iniciales. Después, los pedidos, caja, reportes, vista previa y modelo local pueden utilizarse sin internet.
- Ollama instalado y abierto para utilizar las funciones de IA.

El `.exe` de Creativa incluye su motor Electron. El usuario no necesita instalar Node.js, Python, npm, Git, Supabase, CorelDRAW ni Photoshop para abrirlo. CorelDRAW/Photoshop se utilizan aparte para crear los diseños y exportarlos como imagen o PDF.

## Preparación una sola vez

1. Descarga el portable de la [Release 0.3.1](https://github.com/milimoon1225-oss/team/releases/tag/desktop-v0.3.1). Para esta descarga no necesitas Git LFS.
2. Abre el `.exe`. Usa **Explorar demostración** para ver las muestras, o crea tu espacio con responsable y PIN.
3. Para activar IA, instala [Ollama para Windows](https://ollama.com/download/windows) y ábrelo desde Inicio.
4. Descarga `Preparar-IA.cmd` de esta misma carpeta o de la Release y ejecútalo con doble clic. Comprueba el servicio, inicia Ollama si encuentra su instalación, solicita confirmación antes de descargar Qwen3.5:4b cuando falta y prueba una respuesta real. La descarga del modelo es de aproximadamente 3.3 GB; puede tardar.
5. En Creativa, abre **Asistente → Más opciones y ayuda → Comprobar modelo local**. Debe mostrar que Qwen respondió correctamente.

El preparador utiliza CMD y PowerShell incluidos en Windows. No cambia la política de ejecución de PowerShell ni instala lenguajes. Si falta Ollama, muestra su enlace oficial de instalación. No instala Ollama automáticamente.

## Alternativa con comandos

Con Ollama ya instalado y abierto, en PowerShell:

```powershell
ollama pull qwen3.5:4b
ollama ls
```

Si quieres comprobar el servicio sin iniciar programas ni descargar modelos:

```powershell
.\Preparar-IA.cmd --comprobar
```

Después de la primera preparación basta con abrir Ollama y Creativa. No necesitas ejecutar `npm start` para usar el `.exe`.

## Si clonaste el repositorio

El ejecutable usa Git LFS. Si su tamaño es de unos pocos bytes o contiene `version https://git-lfs.github.com/spec/v1`, es un puntero y no se puede abrir como aplicación. Descarga el `.exe` adjunto a la Release, o instala Git LFS y ejecuta `git lfs pull` dentro del repositorio. La copia portable real ocupa aproximadamente 108 MB.

## Datos y traslado

Cada usuario de Windows tiene su espacio local en `%APPDATA%\Creativa-Operaciones`. Copiar el `.exe` no copia los pedidos ni el modelo de IA. Usa Configuración → Descargar respaldo cifrado para trasladar los pedidos a un perfil vacío y conserva el PIN. La demostración contiene datos ficticios y es temporal.

## Alcance comprobado

El ejecutable empaquetado y el portable 0.3.1 pasaron pruebas automáticas en Windows Server 2025 x64 con Ollama y Qwen reales: pedido, 3D, diagnóstico del modelo, encargo ficticio, lectura de imagen y reapertura de los datos. Los resultados están en [VALIDACION-MODELO.md](../../docs/VALIDACION-MODELO.md).

La primera preparación necesita internet: los pesos del modelo y Ollama se instalan por separado del `.exe`. Esta entrega todavía no es un instalador que incluya toda la IA para una computadora sin conexión desde el primer momento.
