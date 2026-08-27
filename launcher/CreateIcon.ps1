Add-Type -AssemblyName System.Drawing
$bitmap = New-Object Drawing.Bitmap(256,256)
$graphics = [Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = "AntiAlias"; $graphics.Clear([Drawing.Color]::FromArgb(15,23,42))
$pen = New-Object Drawing.Pen([Drawing.Color]::FromArgb(103,232,249),22)
$graphics.DrawEllipse($pen,42,42,172,172); $graphics.DrawLine($pen,43,128,213,128)
$brush = New-Object Drawing.SolidBrush([Drawing.Color]::FromArgb(15,23,42)); $graphics.FillEllipse($brush,101,101,54,54)
$pen2 = New-Object Drawing.Pen([Drawing.Color]::White,12); $graphics.DrawEllipse($pen2,103,103,50,50)
$icon=[Drawing.Icon]::FromHandle($bitmap.GetHicon());$stream=[IO.File]::Open((Join-Path $PSScriptRoot 'pokedeal.ico'),[IO.FileMode]::Create);$icon.Save($stream);$stream.Close();$graphics.Dispose();$bitmap.Dispose()
