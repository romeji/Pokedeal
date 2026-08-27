$envPath = Join-Path (Split-Path -Parent $PSScriptRoot) ".env"
if (!(Test-Path -LiteralPath $envPath)) { throw ".env absent" }
$content = Get-Content -LiteralPath $envPath -Raw
function New-Secret {
  $bytes = New-Object byte[] 32
  $generator = [Security.Cryptography.RandomNumberGenerator]::Create()
  $generator.GetBytes($bytes)
  $generator.Dispose()
  return [Convert]::ToBase64String($bytes).Replace("+","-").Replace("/","_").TrimEnd("=")
}
if ($content -notmatch "(?m)^ADMIN_TOKEN=.+$") {
  $adminToken = New-Secret
  Add-Content -LiteralPath $envPath -Value "`r`nADMIN_TOKEN=`"$adminToken`""
}
if ($content -notmatch "(?m)^VINTRACK_INGEST_TOKEN=.+$") {
  $token = New-Secret
  Add-Content -LiteralPath $envPath -Value "`r`nVINTRACK_INGEST_TOKEN=`"$token`""
}
if ($content -notmatch "(?m)^POKEDEAL_BASE_URL=.+$") { Add-Content -LiteralPath $envPath -Value "POKEDEAL_BASE_URL=`"http://host.docker.internal:3000`"" }
if ($content -notmatch "(?m)^VINTED_REALTIME_ENABLED=.+$") { Add-Content -LiteralPath $envPath -Value "VINTED_REALTIME_ENABLED=`"true`"" }
