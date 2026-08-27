$projectRoot = Split-Path -Parent $PSScriptRoot
function Stop-Tree([int]$processId){
  $children=Get-CimInstance Win32_Process -Filter "ParentProcessId=$processId" -ErrorAction SilentlyContinue
  foreach($child in $children){Stop-Tree ([int]$child.ProcessId)}
  Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
}
foreach($name in @("dev","processor","cardmarket")){$pidPath=Join-Path $projectRoot ".pokedeal-$name.pid";if(Test-Path -LiteralPath $pidPath){$managedId=[int](Get-Content -LiteralPath $pidPath -ErrorAction SilentlyContinue);if($managedId){Stop-Tree $managedId};Remove-Item -LiteralPath $pidPath -Force -ErrorAction SilentlyContinue}}
