@echo off
REM Genera el snapshot de Compra Agil y lo publica en GitHub Pages (rama gh-pages).
REM Pensado para ejecutarse periodicamente via el Programador de tareas de Windows
REM desde un equipo con IP chilena (ver README para el comando schtasks).

cd /d "%~dp0.."

REM Usar Node 22 (requerido por Vite 8 / Rolldown)
set "PATH=C:\Users\Usuario\AppData\Roaming\fnm\node-versions\v22.22.3\installation;%PATH%"

echo [%date% %time%] Iniciando actualizacion de Compra Agil >> "%~dp0update-compra-agil.log"
REM Sincroniza SIEMPRE al codigo publicado (origin/master), descartando cualquier
REM divergencia local del clon, para no republicar una version vieja del bundle.
echo [%date% %time%] git fetch + reset --hard origin/master >> "%~dp0update-compra-agil.log"
git fetch origin master >> "%~dp0update-compra-agil.log" 2>&1
git reset --hard origin/master >> "%~dp0update-compra-agil.log" 2>&1
call npm run deploy:snapshot >> "%~dp0update-compra-agil.log" 2>&1
echo [%date% %time%] Finalizado (codigo %errorlevel%) >> "%~dp0update-compra-agil.log"
echo. >> "%~dp0update-compra-agil.log"
