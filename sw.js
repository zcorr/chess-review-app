// Offline support for the home-screen web app. `vite build` fills in the three
// values below (see vite.config.ts) and writes the result to dist/sw.js.
//
// - SHELL: everything the app needs to start and to run Fast and Standard
//   reviews. Stored when the app is first opened; replaced as a set when a new
//   version is published.
// - BIG: the full engine for Deep reviews (about 99 MB). Stored separately, in
//   the background, and kept across app updates so it is downloaded once.
const VERSION = "3047c9d9036c";
const SHELL = ["assets/bB-e3VYunWx.svg","assets/bB-iyH0v7Z0.svg","assets/bK-BL0QGrKs.svg","assets/bK-Djkp8PTh.svg","assets/bK-DTUu5j8N.svg","assets/bN-D9jRtGJ_.svg","assets/bN-DV6FTLn3.svg","assets/bP-CGLLXhNQ.svg","assets/bQ-1IeWImkq.svg","assets/bQ-vR63YZTE.svg","assets/bR-383n7NSU.svg","assets/bR-BHIbUWFN.svg","assets/Capture-Bhj8XNmH.mp3","assets/Capture-DFc1xgFt.mp3","assets/Capture-DRQORuq4.mp3","assets/Check-B8OJ5uOG.mp3","assets/Check-CJgI6Xry.mp3","assets/Check-DJmJECUU.mp3","assets/dist-CixD3Ru4.js","assets/esm-ChmOXjxb.js","assets/esm-CzX7tfvG.js","assets/esm-vNA6_G9_.js","assets/Great-B_8WhfLh.mp3","assets/Great-DU_iqG5H.mp3","assets/Great-DU6mlAWX.mp3","assets/index-c8uPepbI.css","assets/index-D1jCko7R.js","assets/montserrat-cyrillic-ext-wght-normal-CO5hGrJv.woff2","assets/montserrat-cyrillic-wght-normal-EAA9jha_.woff2","assets/montserrat-latin-ext-wght-normal-BsZE-iaG.woff2","assets/montserrat-latin-wght-normal-l_AIctKy.woff2","assets/montserrat-vietnamese-wght-normal-k7S-YeeD.woff2","assets/Move-BuLApF77.mp3","assets/Move-Bvv5-7_Y.mp3","assets/Move-r23F5GRU.mp3","assets/Victory-D0-Qzdvj.mp3","assets/Victory-DmqqhBYK.mp3","assets/Victory-Fr2hjdee.mp3","assets/wB-B7R4db3S.svg","assets/wB-DiYRSouN.svg","assets/web-Ba0TZG9T.js","assets/web-BB10Bm2M.js","assets/web-DXBXrMIR.js","assets/wK-D_X_4gjZ.svg","assets/wK-SQ_0hBK7.svg","assets/wN-BB4og9ET.svg","assets/wN-C-7zcFKh.svg","assets/wQ-BGXfGjRf.svg","assets/wQ-CAIG1KIb.svg","assets/wR-BthIZAC8.svg","assets/wR-jiJXo9Kv.svg","engine/stockfish-19-lite-single.js","engine/stockfish-19-lite-single.wasm","icons/apple-touch-icon.png","icons/icon-192.png","icons/icon-512.png","index.html","licenses/stockfish-GPL-3.0.txt","manifest.webmanifest"];
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
