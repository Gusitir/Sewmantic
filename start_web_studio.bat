@echo off
chcp 65001 > nul
title Pattern AI Core - Web Studio 2D
color 0B

:: Cambiar al directorio donde se encuentra este archivo .bat
cd /d "%~dp0"

echo =============================================================
echo    PATTERN AI CORE — WEB STUDIO & 2D PATTERN VIEWER
echo =============================================================
echo.

:: 1. Verificar si Node.js está instalado en el sistema
where node >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Node.js no está instalado o no se encuentra en el PATH.
    echo Por favor descarga e instala Node.js ^(v18 o superior^) desde:
    echo https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: 2. Verificar dependencias de npm (node_modules)
if not exist "node_modules\" (
    echo [1/3] Instalando dependencias del proyecto (npm install)...
    call npm install
    if %errorlevel% neq 0 (
        color 0C
        echo [ERROR] Falló la instalación de dependencias npm.
        pause
        exit /b 1
    )
    echo [OK] Dependencias instaladas correctamente.
    echo.
)

:: 3. Verificar si el proyecto está compilado (dist/index.js)
if not exist "dist\index.js" (
    echo [2/3] Compilando código TypeScript (npm run build)...
    call npm run build
    if %errorlevel% neq 0 (
        color 0C
        echo [ERROR] Falló la compilación de TypeScript.
        pause
        exit /b 1
    )
    echo [OK] Compilación completada con éxito.
    echo.
)

:: 4. Iniciar el servidor local y abrir el navegador en 1 clic
echo [3/3] Iniciando servidor Web Studio en http://127.0.0.1:3030 ...
echo Presiona Ctrl+C en cualquier momento para detener el servidor.
echo.

node dist/index.js serve --port 3030 --open

if %errorlevel% neq 0 (
    echo.
    echo El servidor se detuvo o ocurrió un error.
    pause
)
