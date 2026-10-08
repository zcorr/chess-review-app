// Offline support for the home-screen web app. `vite build` fills in the three
// values below (see vite.config.ts) and writes the result to dist/sw.js.
//
// - SHELL: everything the app needs to start and to run Fast and Standard
//   reviews. Stored when the app is first opened; replaced as a set when a new
//   version is published.
// - BIG: the full engine for Deep reviews (about 99 MB). Stored separately, in
//   the background, and kept across app updates so it is downloaded once.
const VERSION = "b86a471b4bcc";
const SHELL = ["assets/dist-CixD3Ru4.js","assets/esm-CLn2UbRM.js","assets/esm-TPAa8t1l.js","assets/esm-xSZmqXOF.js","assets/index-DnaWyqk5.js","assets/index-ZiXtycCk.css","assets/web-Ba0TZG9T.js","assets/web-DXBXrMIR.js","assets/web-In5-MVUn.js","engine/stockfish-19-lite-single.js","engine/stockfish-19-lite-single.wasm","icons/apple-touch-icon.png","icons/icon-192.png","icons/icon-512.png","index.html","licenses/stockfish-GPL-3.0.txt","manifest.webmanifest"];
const BIG = ["engine/stockfish-19-single.js","engine/stockfish-19-single.wasm"];

const SHELL_CACHE = `game-review-${VERSION}`;
const BIG_CACHE = "game-review-engine-94a9d8ec8488";
const scope = self.registration.scope;
const isBig = (url) => BIG.some((f) => url === scope + f);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL.map((f) => new Request(scope + f, { cache: "reload" }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("game-review-") && k !== SHELL_CACHE && k !== BIG_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function storeBig() {
  const cache = await caches.open(BIG_CACHE);
  for (const f of BIG) {
    if (await cache.match(scope + f)) continue;
    const res = await fetch(scope + f);
    if (res.ok) await cache.put(scope + f, res);
  }
}

self.addEventListener("message", (event) => {
  // Best effort: with no connection or no room, Deep just needs the network later.
  if (event.data === "store-full-engine") event.waitUntil(storeBig().catch(() => undefined));
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  // Only the app's own files; chess.com requests go straight to the network.
  if (req.method !== "GET" || !req.url.startsWith(scope)) return;
  event.respondWith(
    (async () => {
      const url = req.mode === "navigate" ? scope + "index.html" : req.url.split("?")[0];
      const hit = await caches.match(url);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok && isBig(url)) {
        const copy = res.clone();
        event.waitUntil(caches.open(BIG_CACHE).then((c) => c.put(url, copy)).catch(() => undefined));
      }
      return res;
    })(),
  );
});
