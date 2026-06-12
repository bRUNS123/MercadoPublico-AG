@echo off
REM Genera el snapshot de Compra Agil y lo publica en GitHub Pages (rama gh-pages).
REM Pensado para ejecutarse periodicamente via el Programador de tareas de Windows
REM desde un equipo con IP chilena (ver README para el comando schtasks).

cd /d "%~dp0.."

echo [%date% %time%] Iniciando actualizacion de Compra Agil >> "%~dp0update-compra-agil.log"
call npm run deploy:snapshot >> "%~dp0update-compra-agil.log" 2>&1
echo [%date% %time%] Finalizado (codigo %errorlevel%) >> "%~dp0update-compra-agil.log"
echo. >> "%~dp0update-compra-agil.log"
