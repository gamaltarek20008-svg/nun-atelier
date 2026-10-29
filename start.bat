@echo off
title NUN Atelier - green edition
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required. Install it from https://nodejs.org then run this file again.
  pause
  exit /b 1
)
start "" /b node serve.mjs
timeout /t 2 /nobreak >nul
start "" http://localhost:4173
echo.
echo   Shop running at http://localhost:4173
echo   Close this window to stop the server.
echo.
pause
