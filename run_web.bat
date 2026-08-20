@echo off
title Tank Trouble - Web Edition
cd /d "%~dp0"
echo ==============================================
echo   Iniciando Tank Trouble - Modern Web Edition
echo ==============================================
echo Abriendo navegador en http://localhost:8080 ...
start http://localhost:8080
python -m http.server 8080
pause
