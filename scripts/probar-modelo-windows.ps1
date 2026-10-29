# Mantiene el servicio local en la misma sesión que las pruebas de ambos ejecutables.
$ErrorActionPreference = 'Stop'
$started = $null
$evidence = Join-Path $env:GITHUB_WORKSPACE 'test-output'
try {
  try { Invoke-RestMethod -Uri 'http://127.0.0.1:11434/api/tags' -TimeoutSec 5 | Out-Null }
  catch {
    $ollama = (Get-Command ollama.exe -ErrorAction Stop).Source
    $started = Start-Process -FilePath $ollama -ArgumentList 'serve' -PassThru -RedirectStandardOutput (Join-Path $evidence 'ollama-prueba-out.log') -RedirectStandardError (Join-Path $evidence 'ollama-prueba-error.log')
  }
  $ready = $false
  for ($attempt = 0; $attempt -lt 60; $attempt++) {
    try { Invoke-RestMethod -Uri 'http://127.0.0.1:11434/api/tags' -TimeoutSec 2 | Out-Null; $ready = $true; break } catch { Start-Sleep -Seconds 2 }
  }
  if (-not $ready) { throw 'Ollama no está disponible al comenzar la prueba.' }
  npm run test:package:model
  if ($LASTEXITCODE -ne 0) { throw 'Falló la integración del exe empaquetado con Qwen real.' }
  $env:CREATIVA_PACKAGED_EXE = (Resolve-Path 'release/Creativa-Operaciones-0.3.1-x64-Portable.exe').Path
  npm run test:package:model
  if ($LASTEXITCODE -ne 0) { throw 'Falló la integración del portable con Qwen real.' }
} finally {
  if ($started -and -not $started.HasExited) { Stop-Process -Id $started.Id }
}
