@echo off
setlocal EnableDelayedExpansion
title Pattern AI Core - Web Studio 2D
color 0B

cd /d "%~dp0"

echo =============================================================
echo    PATTERN AI CORE - WEB STUDIO Y VISOR 2D
echo =============================================================
echo.

where node >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Node.js no esta instalado o no se encuentra en el PATH.
    echo Por favor descarga e instala Node.js desde: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

if not exist "node_modules\" (
    echo [1/3] Instalando dependencias npm...
    call npm install
    if %errorlevel% neq 0 (
        color 0C
        echo [ERROR] Fallo la instalacion de dependencias.
        pause
        exit /b 1
    )
    echo [OK] Dependencias instaladas.
    echo.
)

if not exist "dist\index.js" (
    echo [2/3] Compilando TypeScript...
    call npm run build
    if %errorlevel% neq 0 (
        color 0C
        echo [ERROR] Fallo la compilacion de TypeScript.
        pause
        exit /b 1
    )
    echo [OK] Compilacion completada.
    echo.
)

echo [3/3] Iniciando servidor Web Studio en http://127.0.0.1:3030 ...
echo Presiona Ctrl+C para detener el servidor.
echo.

node dist/index.js serve --port 3030 --open

if %errorlevel% neq 0 (
    echo.
    echo El servidor se ha detenido.
    pause
)
