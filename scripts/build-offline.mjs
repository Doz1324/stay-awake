import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const root = new URL('../dist/', import.meta.url);
async function walk(directory, prefix = '') {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = prefix + entry.name;
    if (entry.isDirectory())
      result.push(...(await walk(new URL(entry.name + '/', directory), path + '/')));
    else if (entry.name !== 'service-worker.js') result.push('/' + path);
  }
  return result;
}
const files = (await walk(root)).sort();
const hash = createHash('sha256');
for (const file of files) {
  hash.update(file);
  hash.update(await readFile(new URL(file.slice(1), root)));
}
const version = hash.digest('hex').slice(0, 16);
const source = `const CACHE = 'stay-awake-${version}';
const FILES = ${JSON.stringify(['/', ...files])};
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)));
});
// Updates activate after old tabs close, never in the middle of a session.
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('stay-awake-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(caches.open(CACHE).then(cache => cache.match('/')).then(cached => cached || fetch(event.request)));
  } else if (FILES.includes(url.pathname)) {
    event.respondWith(caches.open(CACHE).then(cache => cache.match(url.pathname)).then(cached => cached || fetch(event.request)));
  }
});
self.addEventListener('message', event => {
  if (event.data?.type === 'CHECK_CACHE') event.waitUntil(caches.open(CACHE).then(async cache => {
    const files = await Promise.all(FILES.map(file => cache.match(file)));
    event.ports[0]?.postMessage({ ready: files.every(Boolean) });
  }));
});
`;
await writeFile(new URL('service-worker.js', root), source);
console.log(`Offline cache generated: ${files.length + 1} resources, version ${version}`);
