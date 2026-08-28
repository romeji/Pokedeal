@echo off
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0launcher\PokedealLauncher.ps1" >> "%~dp0.pokedeal-launcher.log" 2>&1
if errorlevel 1 start "Journal Pokedeal" notepad.exe "%~dp0.pokedeal-launcher.log"
