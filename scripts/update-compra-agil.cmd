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
set "TOKEN_FILE=%PROJECT_DIR%\scripts\.escritorio-token"
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

REM --- Paso 3a: Snapshot de Compra Agil ---
echo [%date% %time%] npm run snapshot:compra-agil >> "%LOG_FILE%"
call npm run snapshot:compra-agil >> "%LOG_FILE%" 2>&1

REM --- Paso 3b: Bajar token del relay (si alguien sincronizo desde la web) ---
echo [%date% %time%] node scripts/pull-token.js >> "%LOG_FILE%"
call node scripts\pull-token.js >> "%LOG_FILE%" 2>&1

REM --- Paso 3c: Detectar adjudicaciones si hay token (no aborta si falla) ---
if exist "%TOKEN_FILE%" (
    set "ESC_TOKEN="
    set /p ESC_TOKEN=<"%TOKEN_FILE%"
    if defined ESC_TOKEN (
        echo [%date% %time%] npm run adjudicaciones --merge (token del archivo) >> "%LOG_FILE%"
        call npm run adjudicaciones -- "!ESC_TOKEN!" --merge >> "%LOG_FILE%" 2>&1
    ) else (
        echo [%date% %time%] .escritorio-token vacio: se omite deteccion >> "%LOG_FILE%"
    )
) else (
    echo [%date% %time%] Sin .escritorio-token: se omite deteccion de adjudicaciones >> "%LOG_FILE%"
)

REM --- Paso 3d: Build + deploy a gh-pages ---
echo [%date% %time%] npm run deploy >> "%LOG_FILE%"
call npm run deploy >> "%LOG_FILE%" 2>&1
set RC=!errorlevel!

echo [%date% %time%] Finalizado (codigo !RC!) >> "%LOG_FILE%"
echo. >> "%LOG_FILE%"

del "%LOCK_FILE%" 2>nul
exit /b !RC!
