$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot
$ErrorActionPreference = "Stop"
$launcherLog = Join-Path $projectRoot ".pokedeal-launcher.log"

function Write-ServiceLog([string]$message, [string]$level = "INFO") {
  Add-Content -LiteralPath $launcherLog -Value ("{0} [{1}] {2}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss.fff"), $level, $message) -Encoding UTF8
}

# Le démarrage est bloqué si le fichier de prix quotidien n'est pas valide ou
# s'il est trop ancien. La sortie est conservée pour l'interface de prévol.
Write-ServiceLog "Contrôle Cardmarket avant démarrage."
& npm.cmd run cardmarket:ensure-current *> ".pokedeal-startup.log"
if ($LASTEXITCODE -ne 0) {
  Write-ServiceLog "Contrôle Cardmarket échoué (code $LASTEXITCODE)." "ERROR"
  throw "Le contrôle Cardmarket a échoué. Consulte .pokedeal-startup.log."
}
Write-ServiceLog "Contrôle Cardmarket validé." "OK"

function Start-ManagedProcess([string]$name,[string]$command,[string]$logFile){
  $pidPath=Join-Path $projectRoot ".pokedeal-$name.pid"
  if(Test-Path -LiteralPath $pidPath){
    $existing=[int](Get-Content -LiteralPath $pidPath -ErrorAction SilentlyContinue)
    if($existing -and (Get-Process -Id $existing -ErrorAction SilentlyContinue)){Write-ServiceLog "$name déjà actif (PID $existing).";return}
    Remove-Item -LiteralPath $pidPath -Force -ErrorAction SilentlyContinue
    Write-ServiceLog "PID périmé retiré pour $name." "WARN"
  }
  $logPath=Join-Path $projectRoot $logFile
  Set-Content -LiteralPath $logPath -Value ("PokéDeal $name démarré le {0}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss")) -Encoding UTF8
  $process=Start-Process -FilePath "cmd.exe" -ArgumentList "/d","/s","/c","$command >> `"$logPath`" 2>&1" -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru
  Set-Content -LiteralPath $pidPath -Value $process.Id
  Start-Sleep -Milliseconds 600
  if($process.HasExited){
    Remove-Item -LiteralPath $pidPath -Force -ErrorAction SilentlyContinue
    Write-ServiceLog "$name s'est arrêté immédiatement (code $($process.ExitCode))." "ERROR"
    throw "$name n'a pas démarré. Consulte $logFile."
  }
  Write-ServiceLog "$name démarré (PID $($process.Id), journal $logFile)." "OK"
}
Start-ManagedProcess "dev" "npm run dev" ".pokedeal-dev.log"
Start-ManagedProcess "processor" "npm run pipeline:continuous" ".pokedeal-processor.log"
Start-ManagedProcess "cardmarket" "npm run cardmarket:sync:continuous" ".pokedeal-cardmarket.log"
Write-ServiceLog "Tous les services PokéDeal sont démarrés." "OK"
