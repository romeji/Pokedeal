$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot

# Le démarrage est bloqué si le fichier de prix quotidien n'est pas valide ou
# s'il est trop ancien. La sortie est conservée pour l'interface de prévol.
& npm.cmd run cardmarket:ensure-current *> ".pokedeal-startup.log"
if ($LASTEXITCODE -ne 0) {
  throw "Le contrôle Cardmarket a échoué. Consulte .pokedeal-startup.log."
}

function Start-ManagedProcess([string]$name,[string]$command,[string]$logFile){
  $pidPath=Join-Path $projectRoot ".pokedeal-$name.pid"
  if(Test-Path -LiteralPath $pidPath){$existing=[int](Get-Content -LiteralPath $pidPath -ErrorAction SilentlyContinue);if($existing -and (Get-Process -Id $existing -ErrorAction SilentlyContinue)){return}}
  $process=Start-Process -FilePath "cmd.exe" -ArgumentList "/c","$command > $logFile 2>&1" -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru
  Set-Content -LiteralPath $pidPath -Value $process.Id
}
Start-ManagedProcess "dev" "npm run dev" ".pokedeal-dev.log"
Start-ManagedProcess "processor" "npm run pipeline:continuous" ".pokedeal-processor.log"
Start-ManagedProcess "cardmarket" "npm run cardmarket:sync:continuous" ".pokedeal-cardmarket.log"
