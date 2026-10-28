@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Iniciar RS TECH.ps1"
if errorlevel 1 pause
endlocal
