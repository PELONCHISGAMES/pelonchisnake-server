@echo off
title Servidor Multijugador PELONCHISNAKE (20, 45 y 80 Jugadores)
color 0B
echo ==============================================================================
echo   INICIANDO SERVIDOR MULTIJUGADOR - PELONCHISNAKE (PELONCHIS GAMES STUDIO)
echo ==============================================================================
echo.
cd /d "%~dp0"
if not exist node_modules (
    echo Instalando dependencias necesarias (ws)...
    call npm install
)
echo.
echo Iniciando servidor en el puerto 3000...
node server.js
pause
