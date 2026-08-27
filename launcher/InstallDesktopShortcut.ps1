$projectRoot = Split-Path -Parent $PSScriptRoot
$desktop = [Environment]::GetFolderPath("Desktop")
$shortcutPath = Join-Path $desktop "Pokedeal.lnk"
$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = Join-Path $projectRoot "Pokedeal Launcher.cmd"
$shortcut.WorkingDirectory = $projectRoot
$shortcut.IconLocation = (Join-Path $PSScriptRoot "pokedeal.ico")
$shortcut.Description = "Verifier et demarrer Pokedeal"
$shortcut.Save()
Write-Host "Raccourci créé : $shortcutPath"
