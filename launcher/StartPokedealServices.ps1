$projectRoot = Split-Path -Parent $PSScriptRoot
function Start-ManagedProcess([string]$name,[string]$command,[string]$logFile){
  $pidPath=Join-Path $projectRoot ".pokedeal-$name.pid"
  if(Test-Path -LiteralPath $pidPath){$existing=[int](Get-Content -LiteralPath $pidPath -ErrorAction SilentlyContinue);if($existing -and (Get-Process -Id $existing -ErrorAction SilentlyContinue)){return}}
  $process=Start-Process -FilePath "cmd.exe" -ArgumentList "/c","$command > $logFile 2>&1" -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru
  Set-Content -LiteralPath $pidPath -Value $process.Id
}
Start-ManagedProcess "dev" "npm run dev" ".pokedeal-dev.log"
Start-ManagedProcess "processor" "npm run pipeline:continuous" ".pokedeal-processor.log"
