import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const dir = new URL('../release/', import.meta.url);
const files = (await readdir(dir)).filter(name => /\.(exe|AppImage)$/.test(name)).sort();
if (!files.length) throw new Error('Primero genera un instalador en release/.');
const lines = await Promise.all(files.map(async name => `${createHash('sha256').update(await readFile(new URL(name, dir))).digest('hex')}  ${name}`));
await writeFile(new URL('SHA256SUMS.txt', dir), lines.join('\n') + '\n');
console.log(lines.join('\n'));
