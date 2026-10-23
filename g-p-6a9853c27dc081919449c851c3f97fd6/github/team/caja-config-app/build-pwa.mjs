import { readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { createHash } from 'node:crypto';

// Cache only the public application shell. Supabase responses and credentials
// are deliberately excluded; local cash uses its own encrypted database.
export function pwaShell() {
  let config;
  return {
    name: 'creativa-offline-shell',
    apply: 'build',
    configResolved(value) { config = value; },
    async closeBundle() {
      const dir = resolve(config.root, config.build.outDir);
      const files = [];
      async function scan(folder) {
        for (const entry of await readdir(folder, { withFileTypes: true })) {
          const full = resolve(folder, entry.name);
          if (entry.isDirectory()) await scan(full);
          else if (entry.name !== 'sw.js' && !entry.name.endsWith('.map')) files.push(full);
        }
      }
      await scan(dir);
      files.sort();
      const hash = createHash('sha256');
      for (const file of files) hash.update(await readFile(file));
      const paths = files.map(file => '/' + relative(dir, file).replaceAll('\\', '/'));
      const code = `const CACHE = 'creativa-shell-${hash.digest('hex').slice(0,16)}';
const PATHS = ${JSON.stringify(paths)};
const STATIC = new Set(PATHS);
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(PATHS)));
  // Do not skip waiting: an open cash form must not change version mid-operation.
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys
    .filter(key => key.startsWith('creativa-shell-') && key !== CACHE)
    .map(key => caches.delete(key)))));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (request.mode === 'navigate' && (url.pathname === '/' || url.pathname === '/index.html')) {
    // The shell and its hashed assets belong to the same verified build.
    event.respondWith(caches.open(CACHE).then(async cache =>
      (await cache.match('/index.html')) || fetch(request)));
    return;
  }
  if (STATIC.has(url.pathname) && !url.search) {
    event.respondWith(caches.open(CACHE).then(async cache =>
      (await cache.match(url.pathname)) || fetch(request)));
  }
});
`;
      await writeFile(resolve(dir, 'sw.js'), code, 'utf8');
    },
  };
}
