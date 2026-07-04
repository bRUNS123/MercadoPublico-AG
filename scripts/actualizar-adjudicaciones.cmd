@echo off
setlocal
REM ============================================================
REM Actualiza las adjudicaciones (adjudicada/no + comentarios +
REM justificacion del comprador) de "Procesos con resultados" y
REM las publica: detectar -> commit -> push. Hermes lo sirve.
REM
REM Uso (en el notebook, IP chilena):
REM   scripts\actualizar-adjudicaciones.cmd <TOKEN_BEARER>
REM
REM El TOKEN se saca del bookmarklet "Sincronizar GEOPRO" o de
REM DevTools -> Network -> peticion a servicios-escritorio ->
REM header "authorization: Bearer ..." (sin el "Bearer "). Caduca ~8h.
REM
REM Si el escritorio no responde (401), usa la alternativa con el
REM Response pegado a un archivo:
REM   npm run adjudicaciones -- --procesos ruta\response.json --token <TOKEN>
REM ============================================================

cd /d "%~dp0.."

REM Node 22 (igual que update-compra-agil.cmd)
set "NODE22=C:\Users\Usuario\AppData\Roaming\fnm\node-versions\v22.22.3\installation"
if exist "%NODE22%" set "PATH=%NODE22%;%PATH%"

if "%~1"=="" (
  echo Falta el token.
  echo Uso: %~nx0 ^<TOKEN_BEARER^>
  exit /b 1
)

echo === 1/3 Detectando adjudicaciones ===
call npm run adjudicaciones -- "%~1"
if errorlevel 1 (
  echo.
  echo No se pudo detectar ^(token vencido o el escritorio no respondio^).
  echo Alternativa con Response pegado:
  echo   npm run adjudicaciones -- --procesos ruta\response.json --token %~1
  exit /b 1
)

echo === 2/3 Commit ===
git add public/data/mis-adjudicaciones.json
git commit -m "chore: actualiza adjudicaciones" || echo (sin cambios que commitear)

echo === 3/3 Push ===
git push origin master

echo.
echo Listo. Hermes publicara los cambios en su proxima corrida,
echo o corre scripts\update-compra-agil.cmd para publicar ya.
