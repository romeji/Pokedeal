Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot

$form = New-Object Windows.Forms.Form
$form.Text = "PokéDeal · Centre de démarrage"
$form.Size = New-Object Drawing.Size(760,680)
$form.StartPosition = "CenterScreen"
$form.BackColor = [Drawing.Color]::FromArgb(10,17,27)
$form.ForeColor = [Drawing.Color]::FromArgb(226,232,240)
$form.Font = New-Object Drawing.Font("Segoe UI",10)
$iconPath = Join-Path $PSScriptRoot "pokedeal.ico"
if (Test-Path -LiteralPath $iconPath) { $form.Icon = New-Object Drawing.Icon($iconPath) }

$title = New-Object Windows.Forms.Label
$title.Text = "POKÉDEAL  ·  PRÉVOL"
$title.Font = New-Object Drawing.Font("Segoe UI Semibold",20)
$title.ForeColor = [Drawing.Color]::FromArgb(103,232,249)
$title.SetBounds(32,25,680,45); $form.Controls.Add($title)
$subtitle = New-Object Windows.Forms.Label
$subtitle.Text = "Toutes les vérifications doivent être validées avant le lancement."
$subtitle.ForeColor = [Drawing.Color]::FromArgb(148,163,184)
$subtitle.SetBounds(34,72,680,28); $form.Controls.Add($subtitle)

$checks = @("Node.js et npm","Fichier .env","Docker Desktop","PostgreSQL","Migrations Prisma","Données de conformité","Tests automatiques","Qualité du code","Build de production")
$labels = @()
for($i=0;$i -lt $checks.Count;$i++){ $label=New-Object Windows.Forms.Label; $label.Text="○  $($checks[$i])"; $label.BackColor=[Drawing.Color]::FromArgb(18,29,43); $label.ForeColor=[Drawing.Color]::FromArgb(148,163,184); $label.Padding=New-Object Windows.Forms.Padding(14,9,8,8); $label.SetBounds(34,(112+$i*46),675,37); $form.Controls.Add($label); $labels += $label }

$status = New-Object Windows.Forms.Label; $status.Text="Prêt pour la vérification."; $status.SetBounds(34,535,675,28); $form.Controls.Add($status)
$verify = New-Object Windows.Forms.Button; $verify.Text="Vérifier l'application"; $verify.SetBounds(34,575,315,48); $verify.BackColor=[Drawing.Color]::FromArgb(34,211,238); $verify.ForeColor=[Drawing.Color]::FromArgb(8,15,24); $verify.FlatStyle="Flat"; $form.Controls.Add($verify)
$start = New-Object Windows.Forms.Button; $start.Text="Démarrer PokéDeal"; $start.SetBounds(394,575,315,48); $start.Enabled=$false; $start.BackColor=[Drawing.Color]::FromArgb(30,41,59); $start.ForeColor=[Drawing.Color]::FromArgb(148,163,184); $start.FlatStyle="Flat"; $form.Controls.Add($start)

function Invoke-Check([int]$index,[scriptblock]$action){$labels[$index].Text="…  $($checks[$index])";[Windows.Forms.Application]::DoEvents();try{& $action;if($LASTEXITCODE -ne 0){throw "Code $LASTEXITCODE"};$labels[$index].Text="✓  $($checks[$index])";$labels[$index].ForeColor=[Drawing.Color]::FromArgb(110,231,183);return $true}catch{$labels[$index].Text="✗  $($checks[$index])";$labels[$index].ForeColor=[Drawing.Color]::FromArgb(251,113,133);$status.Text="$($checks[$index]) : $($_.Exception.Message)";return $false}}

$verify.Add_Click({$verify.Enabled=$false;$start.Enabled=$false;$status.Text="Vérifications en cours…"
  $steps=@(
    {node --version | Out-Null; npm --version | Out-Null},
    {if(!(Test-Path -LiteralPath (Join-Path $projectRoot '.env'))){throw '.env absent'}},
    {docker info | Out-Null},
    {npm run db:up | Out-Null},
    {npx prisma migrate deploy | Out-Null},
    {npm run prisma:seed | Out-Null},
    {npm test | Out-Null},
    {npm run lint | Out-Null},
    {npm run build | Out-Null}
  );$ok=$true;for($i=0;$i -lt $steps.Count;$i++){if(!(Invoke-Check $i $steps[$i])){$ok=$false;break}}
  if($ok){$status.Text="Tout est valide. PokéDeal peut démarrer.";$start.Enabled=$true;$start.BackColor=[Drawing.Color]::FromArgb(59,130,246);$start.ForeColor=[Drawing.Color]::White}else{$verify.Enabled=$true}
})
$start.Add_Click({Start-Process -FilePath "cmd.exe" -ArgumentList "/c","npm run dev > .pokedeal-dev.log 2>&1" -WorkingDirectory $projectRoot -WindowStyle Hidden;$status.Text="Démarrage… le navigateur va s'ouvrir.";$timer=New-Object Windows.Forms.Timer;$timer.Interval=4000;$timer.Add_Tick({$timer.Stop();Start-Process "http://localhost:3000/dashboard"});$timer.Start()})
[void]$form.ShowDialog()
