# Instrucciones para la sesión de Antigravity (Dashboard Controlador)

## Resolver el `git pull` bloqueado en esta copia del repo

Los cambios locales en `.gitignore` y `scripts/update-compra-agil.cmd` probablemente se
solapan con lo que ya está en `origin/master` (commits `746df94` y `e4dc94c`), que ya
incluyen:

- `.gitignore`: agrega `scripts/sync-status.json`
- `update-compra-agil.cmd`: agrega `git pull --ff-only` antes del deploy
- nuevo archivo `scripts/check-compra-agil-sync.ps1`

## Pasos seguros

```bash
git diff -- .gitignore scripts/update-compra-agil.cmd
```

- Si lo que sale ahí es básicamente lo mismo que ya está en `origin/master` (redundante):

  ```bash
  git checkout -- .gitignore scripts/update-compra-agil.cmd
  git pull --ff-only
  ```

- Si hay algo distinto/importante que no está arriba:

  ```bash
  git stash
  git pull --ff-only
  git stash pop
  ```

  Si `stash pop` marca conflicto en esos 2 archivos, resolverlo a mano (la versión de
  `origin/master` ya cubre lo necesario para que `check-compra-agil-sync.ps1` funcione).

## Resultado esperado

Después de esto, `scripts/check-compra-agil-sync.ps1` debería existir en `scripts/` y el
repo debería quedar al día con `origin/master` (commits `746df94` y `e4dc94c`).
