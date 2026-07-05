// Guardián de deploy: aborta si este clon NO está sincronizado con origin/master.
// Evita el problema recurrente de que un clon viejo publique en gh-pages un bundle
// desactualizado y "borre" features. Corre automáticamente antes de `npm run deploy`.

import { execSync } from 'child_process';

const git = (cmd) => execSync(`git ${cmd}`, { encoding: 'utf-8' }).trim();

let fetched = true;
try { execSync('git fetch origin master', { stdio: 'ignore' }); } catch { fetched = false; }

if (!fetched) {
  console.warn('predeploy-guard: no se pudo hacer git fetch (¿sin red?). Se omite la verificación.');
  process.exit(0);
}

let local, remote;
try {
  local = git('rev-parse HEAD');
  remote = git('rev-parse origin/master');
} catch (e) {
  console.error('predeploy-guard: no se pudo leer git:', e.message);
  process.exit(1);
}

if (local === remote) {
  console.log('✓ Clon sincronizado con origin/master. Continuando el deploy.');
  process.exit(0);
}

const behind = Number(git('rev-list --count HEAD..origin/master'));
const ahead = Number(git('rev-list --count origin/master..HEAD'));

console.error('\n⛔ DEPLOY ABORTADO: este clon NO está sincronizado con origin/master.');
console.error(`   local  = ${local.slice(0, 8)}   origin = ${remote.slice(0, 8)}  (adelante ${ahead}, atrás ${behind})`);
if (behind > 0) console.error('   → Trae lo último:   git fetch origin && git reset --hard origin/master');
if (ahead > 0) console.error('   → Pushea primero:   git push origin master');
console.error('   Desplegar desde un clon viejo PISA el sitio con código viejo. Sincroniza y reintenta.\n');
process.exit(1);
