# Solo para la validación automática en un runner Windows desechable.
$ErrorActionPreference = 'Stop'
$toolDir = Join-Path $env:RUNNER_TEMP 'creativa-ollama'
$modelDir = Join-Path $env:RUNNER_TEMP 'creativa-modelos'
New-Item -ItemType Directory -Force -Path $toolDir, $modelDir | Out-Null
$apiHeaders = @{ Accept = 'application/vnd.github+json'; 'User-Agent' = 'Creativa-CI' }
if ($env:GH_TOKEN) { $apiHeaders.Authorization = "Bearer $env:GH_TOKEN" }
# Usar la versión del runtime con la que se validó esta entrega.
$release = Invoke-RestMethod -Headers $apiHeaders 'https://api.github.com/repos/ollama/ollama/releases/tags/v0.40.13'
$asset = $release.assets | Where-Object name -eq 'ollama-windows-amd64.zip' | Select-Object -First 1
if (-not $asset) { throw 'No se encontró el paquete Windows oficial de Ollama.' }
$archive = Join-Path $env:RUNNER_TEMP 'creativa-ollama.zip'
Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $archive
Expand-Archive -Path $archive -DestinationPath $toolDir -Force
$ollama = Join-Path $toolDir 'ollama.exe'
if (-not (Test-Path $ollama)) { throw 'El paquete de Ollama no contiene ollama.exe.' }
$env:OLLAMA_MODELS = $modelDir
$env:OLLAMA_HOST = '127.0.0.1:11434'
$env:OLLAMA_NUM_PARALLEL = '1'
$env:OLLAMA_MAX_LOADED_MODELS = '1'
$env:OLLAMA_CONTEXT_LENGTH = '4096'
"OLLAMA_MODELS=$modelDir" | Out-File -Append -Encoding utf8 $env:GITHUB_ENV
"OLLAMA_HOST=$env:OLLAMA_HOST" | Out-File -Append -Encoding utf8 $env:GITHUB_ENV
$toolDir | Out-File -Append -Encoding utf8 $env:GITHUB_PATH
$evidence = Join-Path $env:GITHUB_WORKSPACE 'test-output'
New-Item -ItemType Directory -Force -Path $evidence | Out-Null
$server = Start-Process -FilePath $ollama -ArgumentList 'serve' -PassThru -RedirectStandardOutput (Join-Path $evidence 'ollama-out.log') -RedirectStandardError (Join-Path $evidence 'ollama-error.log')
$server.Id | Set-Content -Encoding ascii (Join-Path $evidence 'ollama-servidor.pid')
$ready = $false
for ($attempt = 0; $attempt -lt 60; $attempt++) {
  try { Invoke-RestMethod 'http://127.0.0.1:11434/api/tags' | Out-Null; $ready = $true; break } catch { Start-Sleep -Seconds 2 }
}
if (-not $ready) { throw 'Ollama no pudo iniciar en el runner.' }
& $ollama pull qwen3.5:4b
if ($LASTEXITCODE -ne 0) { throw 'No se pudo descargar Qwen3.5:4b.' }
$models = Invoke-RestMethod 'http://127.0.0.1:11434/api/tags'
if (-not ($models.models | Where-Object name -eq 'qwen3.5:4b')) { throw 'Qwen3.5:4b no quedó instalado.' }
@{ release = $release.tag_name; models = $models.models } | ConvertTo-Json -Depth 6 | Set-Content -Encoding utf8 (Join-Path $evidence 'ollama-runtime.json')
