# Solo CI: usa el runtime temporal del runner y datos ficticios.
$ErrorActionPreference = 'Stop'
if (-not $env:RUNNER_TEMP -or -not $env:GITHUB_WORKSPACE) { throw 'Esta prueba se ejecuta en el runner Windows de GitHub.' }
$ollama = (Get-Command ollama.exe -ErrorAction Stop).Source
if (-not $ollama.StartsWith($env:RUNNER_TEMP, [StringComparison]::OrdinalIgnoreCase)) { throw 'Se esperaba el runtime temporal de Ollama, no una instalación del usuario.' }
$evidence = Join-Path $env:GITHUB_WORKSPACE 'test-output'
$helper = Join-Path $env:GITHUB_WORKSPACE 'distribucion\windows\Preparar-IA.cmd'
$results = @()
try {
  $preparedPid = [int](Get-Content (Join-Path $evidence 'ollama-servidor.pid'))
  $prepared = Get-Process -Id $preparedPid -ErrorAction SilentlyContinue
  if ($prepared -and $prepared.Path -ieq $ollama) { Stop-Process -Id $prepared.Id }
  Start-Sleep -Seconds 3
  & cmd.exe /d /c $helper --comprobar 2>&1 | Tee-Object -FilePath (Join-Path $evidence 'preparador-sin-servicio.log')
  if ($LASTEXITCODE -ne 2) { throw 'El preparador debía detectar que Ollama no está abierto.' }
  $results += @{ caso = 'Servicio ausente detectado sin descargar ni iniciar programas'; resultado = 'PASS' }
  $diagnosticMissing = & node scripts/diagnostico.mjs --modelo --json
  $missingExit = $LASTEXITCODE
  $diagnosticMissing | Set-Content -Encoding utf8 (Join-Path $evidence 'diagnostico-sin-servicio.json')
  if ($missingExit -ne 1) { throw 'El diagnóstico con --modelo debía fallar sin el servicio.' }
  $results += @{ caso = 'Diagnóstico exige servicio para IA real'; resultado = 'PASS' }
  & cmd.exe /d /c $helper --preparar 2>&1 | Tee-Object -FilePath (Join-Path $evidence 'preparador-inicio.log')
  if ($LASTEXITCODE -ne 0) { throw 'El preparador no pudo iniciar el servicio y comprobar la respuesta.' }
  $results += @{ caso = 'Preparador inicia Ollama y verifica una inferencia real'; resultado = 'PASS' }
  & cmd.exe /d /c $helper --comprobar 2>&1 | Tee-Object -FilePath (Join-Path $evidence 'preparador-comprobacion.log')
  if ($LASTEXITCODE -ne 0) { throw 'Falló la comprobación de la IA ya preparada.' }
  $results += @{ caso = 'Comprobación repetible sin instalaciones ni descargas'; resultado = 'PASS' }
  $diagnostic = & node scripts/diagnostico.mjs --modelo --json
  $diagnosticExit = $LASTEXITCODE
  $diagnostic | Set-Content -Encoding utf8 (Join-Path $evidence 'diagnostico-laptop-preparada.json')
  if ($diagnosticExit -ne 0) { throw 'El diagnóstico no confirmó la laptop preparada.' }
  $results += @{ caso = 'Fuentes, Electron y respuesta real de Qwen preparados'; resultado = 'PASS' }
} finally {
  $results | ConvertTo-Json -Depth 5 | Set-Content -Encoding utf8 (Join-Path $evidence 'revision-preparacion.json')
  Get-Process -Name ollama -ErrorAction SilentlyContinue | Where-Object { $_.Path -ieq $ollama } | ForEach-Object { Stop-Process -Id $_.Id -ErrorAction SilentlyContinue }
}
