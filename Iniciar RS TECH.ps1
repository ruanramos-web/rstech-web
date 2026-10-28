$ErrorActionPreference = 'Stop'
$serverPath = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot 'server.mjs'))
$nodePath = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
if (-not (Test-Path -LiteralPath $nodePath)) {
  Write-Host 'Nao encontrei o Node.js usado pelo site neste computador.' -ForegroundColor Red
  exit 1
}

# Encerra somente um processo Node usando o runtime do site e escutando na porta 3000.
$listeners = @(Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique)
foreach ($processId in $listeners) {
  $processInfo = Get-Process -Id $processId -ErrorAction SilentlyContinue
  if ($processInfo -and $processInfo.ProcessName -eq 'node' -and $processInfo.Path -and $processInfo.Path.Equals($nodePath, [System.StringComparison]::OrdinalIgnoreCase)) {
    Stop-Process -Id $processId -Force
    Start-Sleep -Milliseconds 500
  }
}

$remaining = @(Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue)
if ($remaining.Count -gt 0) {
  Write-Host 'A porta 3000 esta ocupada por outro programa. Feche o servidor antigo da RS TECH ou o programa que usa essa porta e tente novamente.' -ForegroundColor Yellow
  exit 1
}

Start-Process -FilePath $nodePath -ArgumentList ('"' + $serverPath + '"') -WorkingDirectory $PSScriptRoot -WindowStyle Hidden
Start-Sleep -Seconds 2
$started = $false
try {
  $response = Invoke-WebRequest -Uri 'http://localhost:3000/api/my/requests' -UseBasicParsing -TimeoutSec 5
  $started = $response.StatusCode -ne 404
} catch {
  if ($_.Exception.Response) { $started = ([int]$_.Exception.Response.StatusCode -ne 404) }
}
if (-not $started) {
  Write-Host 'O servidor atualizado da RS TECH nao respondeu. Verifique o Node.js e tente novamente.' -ForegroundColor Red
  exit 1
}
Start-Process 'http://localhost:3000/login.html?next=%2F'
Write-Host 'Servidor da RS TECH iniciado e atualizado.' -ForegroundColor Green
