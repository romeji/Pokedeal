$projectRoot = Split-Path -Parent $PSScriptRoot
$desktop = [Environment]::GetFolderPath("Desktop")
$shortcutPath = Join-Path $desktop "Pokedeal.lnk"
$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$powershellPath = Join-Path $env:SystemRoot "System32\WindowsPowerShell\v1.0\powershell.exe"
$launcherPath = Join-Path $PSScriptRoot "PokedealLauncher.ps1"
$shortcut.TargetPath = $powershellPath
$shortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$launcherPath`""
$shortcut.WorkingDirectory = $projectRoot
$shortcut.IconLocation = (Join-Path $PSScriptRoot "pokedeal.ico")
$shortcut.Description = "Verifier et demarrer Pokedeal"
$shortcut.WindowStyle = 1
$shortcut.Save()
Write-Host "Raccourci créé : $shortcutPath"
