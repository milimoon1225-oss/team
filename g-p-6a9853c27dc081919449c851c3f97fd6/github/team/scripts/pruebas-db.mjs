import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const carpeta = fileURLToPath(new URL('../pedido-validacion/', import.meta.url));
for (const archivo of readdirSync(carpeta).filter(name => /^probar-.*\.mjs$/.test(name)).sort()) {
  console.log(`\nPrueba: ${archivo}`);
  const result = spawnSync(process.execPath, [archivo], { cwd: carpeta, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
