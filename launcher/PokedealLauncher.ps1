Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot
$launcherLog = Join-Path $projectRoot ".pokedeal-launcher.log"

function Write-LauncherLog([string]$message, [string]$level = "INFO") {
  $line = "{0} [{1}] {2}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss.fff"), $level, $message
  Add-Content -LiteralPath $launcherLog -Value $line -Encoding UTF8
}

Write-LauncherLog "Ouverture du centre de démarrage (PowerShell $($PSVersionTable.PSVersion))."

$form = New-Object Windows.Forms.Form
$form.Text = "PokéDeal · Centre de démarrage"
$form.Size = New-Object Drawing.Size(780,880)
$form.MinimumSize = New-Object Drawing.Size(640,680)
$form.AutoScaleMode = [Windows.Forms.AutoScaleMode]::Dpi
$form.AutoScroll = $true
$form.StartPosition = "CenterScreen"
$form.BackColor = [Drawing.Color]::FromArgb(10,17,27)
$form.ForeColor = [Drawing.Color]::FromArgb(226,232,240)
$form.Font = New-Object Drawing.Font("Segoe UI",10)
$iconPath = Join-Path $PSScriptRoot "pokedeal.ico"
if (Test-Path -LiteralPath $iconPath) { $form.Icon = New-Object Drawing.Icon($iconPath) }

$title = New-Object Windows.Forms.Label
$title.Text = "◓  POKÉDEAL  ·  PRÉVOL"
$title.Font = New-Object Drawing.Font("Segoe UI Semibold",20)
$title.ForeColor = [Drawing.Color]::FromArgb(255,203,64)
$title.SetBounds(32,25,680,45); $form.Controls.Add($title)
$subtitle = New-Object Windows.Forms.Label
$subtitle.Text = "Centre Pokémon : contrôles, journaux et lancement des workers."
$subtitle.ForeColor = [Drawing.Color]::FromArgb(148,163,184)
$subtitle.SetBounds(34,72,680,28); $form.Controls.Add($subtitle)

$checks = @("Node.js et npm","Fichier .env","Docker / temps réel local","PostgreSQL partagé","Migrations Prisma","Données de conformité","Fichiers Cardmarket à jour","Tests automatiques","Qualité du code","Build de production")
$labels = @()
for($i=0;$i -lt $checks.Count;$i++){ $label=New-Object Windows.Forms.Label; $label.Text="○  $($checks[$i])"; $label.BackColor=[Drawing.Color]::FromArgb(18,29,43); $label.ForeColor=[Drawing.Color]::FromArgb(148,163,184); $label.Padding=New-Object Windows.Forms.Padding(14,9,8,8); $label.SetBounds(34,(112+$i*46),675,37); $form.Controls.Add($label); $labels += $label }

$status = New-Object Windows.Forms.Label; $status.Text="Prêt pour la vérification."; $status.SetBounds(34,580,675,28); $form.Controls.Add($status)
$verify = New-Object Windows.Forms.Button; $verify.Text="Vérifier l'application"; $verify.SetBounds(34,620,315,48); $verify.BackColor=[Drawing.Color]::FromArgb(59,130,246); $verify.ForeColor=[Drawing.Color]::White; $verify.FlatStyle="Flat"; $form.Controls.Add($verify)
$start = New-Object Windows.Forms.Button; $start.Text="Démarrer PokéDeal"; $start.SetBounds(394,620,315,48); $start.Enabled=$false; $start.BackColor=[Drawing.Color]::FromArgb(30,41,59); $start.ForeColor=[Drawing.Color]::FromArgb(148,163,184); $start.FlatStyle="Flat"; $form.Controls.Add($start)
$openLogs = New-Object Windows.Forms.Button; $openLogs.Text="Ouvrir les journaux de démarrage"; $openLogs.SetBounds(34,682,675,38); $openLogs.BackColor=[Drawing.Color]::FromArgb(18,29,43); $openLogs.ForeColor=[Drawing.Color]::FromArgb(165,243,252); $openLogs.FlatStyle="Flat"; $form.Controls.Add($openLogs)

$openLogs.Add_Click({
  try {
    if (!(Test-Path -LiteralPath $launcherLog)) { Write-LauncherLog "Journal initialisé depuis l'interface." }
    Start-Process notepad.exe -ArgumentList $launcherLog
    $status.Text='Journal de démarrage ouvert.'
  } catch {
    $status.Text=$_.Exception.Message
    Write-LauncherLog "Impossible d'ouvrir le journal : $($_.Exception.Message)" "ERROR"
  }
})

function Invoke-Check([int]$index,[scriptblock]$action){
  $name=$checks[$index]
  $labels[$index].Text="…  $name"
  $status.Text="$name — vérification en cours…"
  [Windows.Forms.Application]::DoEvents()
  Write-LauncherLog "Vérification : $name"
  try {
    $global:LASTEXITCODE=0
    $output=(& $action 2>&1 | Out-String).Trim()
    $exitCode=$LASTEXITCODE
    if($output){Write-LauncherLog $output}
    if($exitCode -ne 0){throw "Code de sortie $exitCode"}
    $labels[$index].Text="✓  $name"
    $labels[$index].ForeColor=[Drawing.Color]::FromArgb(110,231,183)
    Write-LauncherLog "Vérification réussie : $name" "OK"
    return $true
  } catch {
    $labels[$index].Text="✗  $name"
    $labels[$index].ForeColor=[Drawing.Color]::FromArgb(251,113,133)
    $status.Text="$name : $($_.Exception.Message)"
    Write-LauncherLog "Vérification échouée ($name) : $($_.Exception.Message)" "ERROR"
    return $false
  }
}

function Invoke-ResponsiveNpm([string[]]$arguments, [string]$progressMessage) {
  $stdoutPath = Join-Path $projectRoot ".pokedeal-preflight-output.log"
  $stderrPath = Join-Path $projectRoot ".pokedeal-preflight-error.log"
  $status.Text = $progressMessage
  Write-LauncherLog "$progressMessage La fenêtre reste utilisable pendant le contrôle."
  $process = Start-Process -FilePath "npm.cmd" -ArgumentList $arguments -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput $stdoutPath -RedirectStandardError $stderrPath
  while (!$process.WaitForExit(250)) { [Windows.Forms.Application]::DoEvents() }
  $output = @()
  if (Test-Path -LiteralPath $stdoutPath) { $output += Get-Content -LiteralPath $stdoutPath }
  if (Test-Path -LiteralPath $stderrPath) { $output += Get-Content -LiteralPath $stderrPath | Where-Object { $_ -notmatch "CJS build of Vite's Node API is deprecated" } }
  if ($output.Count) { Write-Output ($output -join [Environment]::NewLine) }
  if ($process.ExitCode -ne 0) { throw "npm a retourné le code $($process.ExitCode). Ouvre les journaux pour le détail." }
  $global:LASTEXITCODE = 0
}

function Get-DatabaseMode {
  $candidate = @(".env.local", ".env") | ForEach-Object { Join-Path $projectRoot $_ } | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
  if (!$candidate) { return "unknown" }
  $line = Get-Content -LiteralPath $candidate | Where-Object { $_ -match '^DATABASE_URL=' } | Select-Object -First 1
  if (!$line) { return "unknown" }
  $value = (($line -split '=', 2)[1]).Trim().Trim('"')
  try {
    $hostName = ([Uri]$value).Host
    if ($hostName -in @("localhost", "127.0.0.1", "db")) { return "local" }
    if ($hostName) { return "cloud" }
  } catch { return "unknown" }
  return "unknown"
}

function Test-DockerReady {
  if (!(Get-Command docker -ErrorAction SilentlyContinue)) { return $false }
  try {
    $probe = Start-Process -FilePath "docker.exe" -ArgumentList "info","--format","{{.ServerVersion}}" -WindowStyle Hidden -PassThru
    if (!$probe.WaitForExit(4000)) {
      $probe.Kill()
      Write-LauncherLog "Le moteur Docker ne répond pas après 4 secondes." "WARN"
      return $false
    }
    return $probe.ExitCode -eq 0
  } catch {
    Write-LauncherLog "Test Docker impossible : $($_.Exception.Message)" "WARN"
    return $false
  }
}

function Start-DockerIfAvailable {
  if (Test-DockerReady) { return $true }
  $desktop = "C:\Program Files\Docker\Docker\Docker Desktop.exe"
  if (!(Test-Path -LiteralPath $desktop)) { return $false }
  Write-LauncherLog "Docker Desktop est installé mais arrêté : tentative de démarrage." "WARN"
  Start-Process -FilePath $desktop -WindowStyle Hidden
  for ($attempt = 0; $attempt -lt 15; $attempt++) {
    Start-Sleep -Seconds 2
    [Windows.Forms.Application]::DoEvents()
    if (Test-DockerReady) { return $true }
  }
  return $false
}

$verify.Add_Click({$verify.Enabled=$false;$start.Enabled=$false;$status.Text="Vérifications en cours…"
  Write-LauncherLog "Prévol demandé par l'utilisateur."
  try { & (Join-Path $PSScriptRoot 'StopPokedealServices.ps1') } catch { Write-LauncherLog "Arrêt préalable : $($_.Exception.Message)" "WARN" }
  $steps=@(
    {node --version; if($LASTEXITCODE -ne 0){throw "Node.js indisponible"}; npm --version},
    {& (Join-Path $PSScriptRoot 'EnsureRealtimeConfig.ps1')},
    {
      $databaseMode = Get-DatabaseMode
      $dockerReady = Start-DockerIfAvailable
      if (!$dockerReady -and $databaseMode -eq "local") { throw "Docker Desktop doit être démarré pour la base locale." }
      if (!$dockerReady) { Write-Output "Docker indisponible : démarrage en mode Neon. Seul le pont Vintrack local sera désactivé." }
      else { Write-Output "Docker est prêt pour le pont temps réel Vintrack." }
      $global:LASTEXITCODE = 0
    },
    {
      if ((Get-DatabaseMode) -eq "local") {
        npm run realtime:up
        if($LASTEXITCODE -ne 0){throw "Services Docker indisponibles"}
      } elseif (Test-DockerReady) {
        npm run realtime:up
        if($LASTEXITCODE -ne 0){Write-Output "Pont Vintrack Docker non démarré ; la base Neon reste disponible.";$global:LASTEXITCODE=0}
      } else {
        Write-Output "Base Neon sélectionnée : aucun conteneur PostgreSQL requis."
      }
      npm run db:check
    },
    {npx prisma migrate deploy},
    {npm run prisma:seed},
    {npm run cardmarket:ensure-current},
    {Invoke-ResponsiveNpm @("test","--","--reporter=dot") "Tests automatiques (environ 30 à 60 secondes)…"},
    {Invoke-ResponsiveNpm @("run","lint") "Contrôle de la qualité du code…"},
    {Invoke-ResponsiveNpm @("run","build") "Préparation de la version locale (cela peut prendre deux minutes)…"}
  );$ok=$true;for($i=0;$i -lt $steps.Count;$i++){if(!(Invoke-Check $i $steps[$i])){$ok=$false;break}}
  if($ok){$status.Text="Tout est valide. PokéDeal peut démarrer.";$start.Enabled=$true;$start.BackColor=[Drawing.Color]::FromArgb(59,130,246);$start.ForeColor=[Drawing.Color]::White;Write-LauncherLog "Prévol entièrement validé." "OK"}else{$verify.Enabled=$true}
})
$start.Add_Click({
  $start.Enabled=$false
  Write-LauncherLog "Démarrage des services demandé."
  try {
    & (Join-Path $PSScriptRoot 'StartPokedealServices.ps1')
  } catch {
    $status.Text=$_.Exception.Message
    Write-LauncherLog "Démarrage impossible : $($_.Exception.Message)" "ERROR"
    $start.Enabled=$true
    return
  }
  $status.Text="Démarrage… attente du serveur local."
  $script:launchAttempts=0
  $script:launchTimer=New-Object Windows.Forms.Timer
  $script:launchTimer.Interval=1500
  $script:launchTimer.Add_Tick({
    if(!$script:launchTimer){return}
    $script:launchAttempts++
    try {
      $response=Invoke-WebRequest -Uri "http://localhost:3000/dashboard" -UseBasicParsing -TimeoutSec 2
      if($response.StatusCode -eq 200){
        $script:launchTimer.Stop();$script:launchTimer.Dispose();$script:launchTimer=$null
        $status.Text="Pokedeal est démarré."
        Write-LauncherLog "Serveur local disponible après $script:launchAttempts tentative(s)." "OK"
        Start-Process "http://localhost:3000/dashboard"
      }
    } catch {
      if($script:launchAttempts -ge 40){
        $script:launchTimer.Stop();$script:launchTimer.Dispose();$script:launchTimer=$null
        $status.Text="Le serveur n'a pas répondu. Ouvre les journaux de démarrage."
        Write-LauncherLog "Le serveur local n'a pas répondu après $script:launchAttempts tentative(s)." "ERROR"
        $start.Enabled=$true
      }
    }
  })
  $script:launchTimer.Start()
})
try {
  [void]$form.ShowDialog()
  Write-LauncherLog "Fermeture normale du centre de démarrage."
} catch {
  Write-LauncherLog "Erreur fatale de l'interface : $($_.Exception.ToString())" "FATAL"
  [Windows.Forms.MessageBox]::Show("Le lanceur PokéDeal a rencontré une erreur. Le journal va s'ouvrir.","PokéDeal",[Windows.Forms.MessageBoxButtons]::OK,[Windows.Forms.MessageBoxIcon]::Error) | Out-Null
  Start-Process notepad.exe -ArgumentList $launcherLog
  exit 1
}
