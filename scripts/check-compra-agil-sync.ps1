# Chequeo de salud del pipeline de snapshot de Compra Agil.
# Pensado para que un panel/dashboard externo del notebook lo consuma de 3 formas:
#  - JSON:      scripts/sync-status.json
#  - Texto:     salida estandar (stdout)
#  - Exit code: 0 = ok, 1 = warn (revisar), 2 = error

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$result = [ordered]@{
  checkedAt     = (Get-Date).ToString("o")
  repo          = @{ ahead = $null; behind = $null }
  lastRun       = @{ line = $null }
  scheduledTask = @{ status = $null; lastResult = $null }
  status        = "ok"
  messages      = @()
}

# 1. El repo local esta al dia con origin/master?
try {
  git fetch origin master --quiet 2>$null
  $counts = (git rev-list --left-right --count HEAD...origin/master) -split "\s+"
  $ahead = [int]$counts[0]
  $behind = [int]$counts[1]
  $result.repo.ahead = $ahead
  $result.repo.behind = $behind

  if ($behind -gt 0) {
    $result.status = "warn"
    $result.messages += "El repo esta $behind commit(s) detras de origin/master (falta git pull)."
  }
  if ($ahead -gt 0) {
    $result.status = "warn"
    $result.messages += "El repo tiene $ahead commit(s) locales sin pushear."
  }
} catch {
  $result.status = "error"
  $result.messages += "No se pudo verificar git: $($_.Exception.Message)"
}

# 2. Como termino la ultima corrida de update-compra-agil.cmd?
$logPath = Join-Path $PSScriptRoot "update-compra-agil.log"
if (Test-Path $logPath) {
  $lastFinish = Get-Content $logPath | Select-String "Finalizado" | Select-Object -Last 1
  if ($lastFinish) {
    $result.lastRun.line = $lastFinish.Line.Trim()
    if ($lastFinish.Line -notmatch "codigo 0") {
      $result.status = "error"
      $result.messages += "La ultima corrida de update-compra-agil.cmd termino con error."
    }
  } else {
    $result.messages += "El log existe pero no tiene ninguna corrida finalizada todavia."
  }
} else {
  $result.messages += "No existe scripts/update-compra-agil.log (la tarea programada no ha corrido aun)."
}

# 3. Esta sana la tarea programada?
try {
  $task = schtasks /query /tn "LicitaBoard - Snapshot Compra Agil" /fo list /v 2>$null
  if ($task) {
    $lastResult = (($task | Select-String "^Last Result") -split ":", 2)[1].Trim()
    $taskStatus = (($task | Select-String "^Status") -split ":", 2)[1].Trim()
    $result.scheduledTask.lastResult = $lastResult
    $result.scheduledTask.status = $taskStatus
    if ($lastResult -ne "0") {
      $result.status = "error"
      $result.messages += "La tarea programada termino su ultima corrida con codigo $lastResult."
    }
  } else {
    $result.messages += "No se encontro la tarea programada 'LicitaBoard - Snapshot Compra Agil'."
  }
} catch {
  $result.messages += "No se pudo consultar schtasks: $($_.Exception.Message)"
}

if ($result.messages.Count -eq 0) {
  $result.messages += "Todo sincronizado: repo al dia, ultimo deploy OK, tarea programada OK."
}

$jsonPath = Join-Path $PSScriptRoot "sync-status.json"
$result | ConvertTo-Json -Depth 5 | Out-File -FilePath $jsonPath -Encoding utf8

Write-Host "=== LicitaBoard / Compra Agil - estado de sincronizacion ==="
Write-Host "Estado: $($result.status.ToUpper())"
foreach ($m in $result.messages) { Write-Host "- $m" }
Write-Host ""
Write-Host "JSON: $jsonPath"

switch ($result.status) {
  "ok"    { exit 0 }
  "warn"  { exit 1 }
  default { exit 2 }
}
