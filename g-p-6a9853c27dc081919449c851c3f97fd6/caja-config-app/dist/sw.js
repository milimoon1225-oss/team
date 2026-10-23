const CACHE = 'creativa-shell-bfcc8ee3669b7c00';
const PATHS = ["/assets/index-BZcjE5kq.js","/assets/index-C_1f4M7J.css","/brand/app-192.png","/brand/app-512.png","/brand/app-icon.svg","/brand/creativa-logo.png","/favicon.svg","/icons.svg","/index.html","/manifest.webmanifest"];
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
