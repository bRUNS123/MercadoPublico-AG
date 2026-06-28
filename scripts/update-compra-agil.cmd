@echo off
setlocal enabledelayedexpansion
REM ============================================================
REM Snapshot + deploy de Compra Agil para GitHub Pages.
REM Ejecutado via Windows Task Scheduler cada 2h (IP chilena).
REM ============================================================

REM --- Config ---
set "PROJECT_DIR=C:\Users\Usuario\Desktop\Programación\MercadoPublico-AG (API)"
set "LOG_FILE=%PROJECT_DIR%\scripts\update-compra-agil.log"
set "LOCK_FILE=%PROJECT_DIR%\scripts\.snapshot-running.lock"
set "MAX_RUNTIME_MIN=50"
set "NODE22=C:\Users\Usuario\AppData\Roaming\fnm\node-versions\v22.22.3\installation"

REM --- Prevenir ejecuciones solapadas ---
if exist "%LOCK_FILE%" (
    for /f %%i in ('type "%LOCK_FILE%"') do set OLD_PID=%%i
    tasklist /fi "PID eq !OLD_PID!" 2>nul | find "!OLD_PID!" >nul
    if !errorlevel! equ 0 (
        echo [%date% %time%] BLOQUEADO: otra instancia ya esta corriendo (PID !OLD_PID!) >> "%LOG_FILE%"
        echo. >> "%LOG_FILE%"
        exit /b 0
    )
    del "%LOCK_FILE%" 2>nul
)
echo %PID% > "%LOCK_FILE%"

REM --- Timeout auto-destrucción (evita zombies) ---
start /b "" cmd /c "timeout /t %MAX_RUNTIME_MIN% /nobreak >nul && taskkill /f /pid %PID% 2>nul && echo [%date% %time%] AUTO-MATADO: excedio %MAX_RUNTIME_MIN% min >> "%LOG_FILE%""

REM --- Entrar al directorio del proyecto ---
cd /d "%PROJECT_DIR%" 2>nul
if %errorlevel% neq 0 (
    echo [%date% %time%] ERROR: no se pudo entrar a %PROJECT_DIR% >> "%LOG_FILE%"
    del "%LOCK_FILE%" 2>nul
    exit /b 1
)

REM --- Usar Node 22 (requerido por Vite 8 / Rolldown) ---
set "PATH=%NODE22%;%PATH%"

echo [%date% %time%] Iniciando actualizacion de Compra Agil >> "%LOG_FILE%"

REM --- Paso 1: Sincronizar con origin/master ---
echo [%date% %time%] git fetch + reset --hard origin/master >> "%LOG_FILE%"
git fetch origin master >> "%LOG_FILE%" 2>&1
if !errorlevel! neq 0 (
    echo [%date% %time%] ERROR: git fetch fallo >> "%LOG_FILE%"
    del "%LOCK_FILE%" 2>nul
    exit /b 1
)
git reset --hard origin/master >> "%LOG_FILE%" 2>&1

REM --- Paso 2: Instalar dependencias (por si cambiaron) ---
echo [%date% %time%] npm install (por si hay nuevas dependencias) >> "%LOG_FILE%"
call npm install --prefer-offline --no-audit --no-fund >> "%LOG_FILE%" 2>&1

REM --- Paso 3: Snapshot + build + deploy ---
echo [%date% %time%] npm run deploy:snapshot >> "%LOG_FILE%"
call npm run deploy:snapshot >> "%LOG_FILE%" 2>&1
set RC=!errorlevel!

echo [%date% %time%] Finalizado (codigo !RC!) >> "%LOG_FILE%"
echo. >> "%LOG_FILE%"

del "%LOCK_FILE%" 2>nul
exit /b !RC!
