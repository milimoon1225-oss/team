@echo off
setlocal EnableExtensions
if "%~1"=="" goto ventana
TITLE Creativa - Preparar IA local
set "SOLO_COMPROBAR=0"
if /I "%~1"=="--comprobar" set "SOLO_COMPROBAR=1"
echo.
echo Creativa - Preparacion de Qwen3.5:4b en esta computadora
echo No requiere Node.js ni Python. Usa Ollama y PowerShell de Windows.
echo.
set "OLLAMA_EXE="
for /f "delims=" %%I in ('where ollama.exe 2^>nul') do if not defined OLLAMA_EXE set "OLLAMA_EXE=%%I"
if not defined OLLAMA_EXE if exist "%LOCALAPPDATA%\Programs\Ollama\ollama.exe" set "OLLAMA_EXE=%LOCALAPPDATA%\Programs\Ollama\ollama.exe"
call :consultar
if errorlevel 2 goto iniciar
if errorlevel 1 goto descargar
goto verificar

:iniciar
if "%SOLO_COMPROBAR%"=="1" goto falta_servicio
if not defined OLLAMA_EXE goto falta_ollama
echo Iniciando Ollama. Mantenlo abierto mientras uses la IA.
if exist "%LOCALAPPDATA%\Programs\Ollama\ollama app.exe" (
  start "" "%LOCALAPPDATA%\Programs\Ollama\ollama app.exe"
) else (
  start "Ollama para Creativa" /min "%OLLAMA_EXE%" serve
)
powershell.exe -NoProfile -Command "$ErrorActionPreference='Stop'; for($i=0;$i -lt 30;$i++){try{Invoke-RestMethod -Uri 'http://127.0.0.1:11434/api/tags' -TimeoutSec 2 | Out-Null;exit 0}catch{Start-Sleep -Seconds 2}};exit 2"
if errorlevel 1 goto falta_servicio
call :consultar
if errorlevel 2 goto falta_servicio
if errorlevel 1 goto descargar
goto verificar

:descargar
if "%SOLO_COMPROBAR%"=="1" goto falta_modelo
if not defined OLLAMA_EXE goto falta_ollama
echo Falta Qwen3.5:4b. La descarga del modelo es de aproximadamente 3.3 GB.
echo Se necesita internet durante esta preparacion inicial.
choice /C SN /N /M "Deseas descargarlo ahora? [S/N] "
if errorlevel 2 (
  echo Preparacion cancelada. Puedes usar la gestion sin IA.
  exit /b 3
)
"%OLLAMA_EXE%" pull qwen3.5:4b
if errorlevel 1 (
  echo No se pudo descargar el modelo. Revisa conexion y espacio disponible.
  exit /b 1
)
goto verificar

:verificar
echo Comprobando una respuesta real. La primera carga puede tardar.
powershell.exe -NoProfile -Command "$ErrorActionPreference='Stop';try{$b=@{model='qwen3.5:4b';stream=$false;think=$false;keep_alive=0;options=@{num_ctx=2048;num_predict=48;temperature=0};format=@{type='object';properties=@{estado=@{type='string';enum=@('listo')}};required=@('estado');additionalProperties=$false};messages=@(@{role='user';content='Responde con el JSON solicitado para comprobar el modelo local.'})};$r=Invoke-RestMethod -Uri 'http://127.0.0.1:11434/api/chat' -Method Post -ContentType 'application/json' -Body ($b | ConvertTo-Json -Depth 10 -Compress) -TimeoutSec 180;$a=$r.message.content | ConvertFrom-Json;if(-not $r.done -or $r.done_reason -eq 'length' -or $a.estado -ne 'listo'){throw 'El modelo no termino la prueba correctamente.'};Write-Host 'CORRECTO: Qwen3.5:4b respondio. Abre Creativa y comprueba el modelo desde el chat.';exit 0}catch{Write-Host ('No se completo la prueba: '+$_.Exception.Message);exit 1}"
exit /b %ERRORLEVEL%

:consultar
powershell.exe -NoProfile -Command "try{$r=Invoke-RestMethod -Uri 'http://127.0.0.1:11434/api/tags' -TimeoutSec 5;if(@($r.models | Where-Object {$_.name -eq 'qwen3.5:4b'}).Count -gt 0){exit 0};exit 1}catch{exit 2}"
exit /b %ERRORLEVEL%

:falta_ollama
echo Instala Ollama para Windows desde https://ollama.com/download/windows
echo Abre Ollama y vuelve a ejecutar este preparador. No necesitas instalar lenguajes.
exit /b 2

:falta_servicio
echo Ollama no responde en esta computadora. Instala o abre Ollama y vuelve a comprobar.
echo Descarga oficial: https://ollama.com/download/windows
exit /b 2

:falta_modelo
echo Ollama responde pero falta qwen3.5:4b.
echo Ejecuta este archivo sin --comprobar o utiliza: ollama pull qwen3.5:4b
exit /b 3

:ventana
call "%~f0" --preparar
set "RESULTADO=%ERRORLEVEL%"
echo.
pause
exit /b %RESULTADO%
