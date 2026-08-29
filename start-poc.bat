@echo off

rem GRAHAK-DRISHTI local hackathon POC launcher.
rem The controller window owns all services and handles coordinated shutdown.

start "GRAHAK POC Controller" powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-poc.ps1"
exit /b 0
