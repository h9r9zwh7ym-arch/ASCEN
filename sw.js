// ASCEN — service worker : l'app démarre instantanément, avec ou sans réseau.
// Stratégie « cache d'abord, mise à jour en arrière-plan » : la page s'ouvre depuis la
// copie locale (aucune attente même avec un réseau lent ou absent), puis la dernière
// version est téléchargée discrètement et servie au lancement suivant.
const CACHE = "forge-v73"; // nom interne gardé (données et caches existants)
// seulement l'indispensable au démarrage ; le reste (Three.js des trophées, grandes icônes)
// est mis en cache à la première utilisation, pour ne pas occuper l'appareil inutilement
// (les scènes de l'ascension, ascent-scenes.js, sont demandées par la page au premier lancement en ligne)
const CORE = ["./", "./index.html", "./manifest.webmanifest", "./icon-180.png", "./icon-192.png"];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// télécharge et met en cache, sans prévenir : la nouvelle version sert au lancement suivant,
// comme une app native. (Avant, on comparait les en-têtes etag / last-modified ; GitHub Pages les
// renvoie différents d'un serveur à l'autre pour le même fichier, d'où un faux « Mise à jour prête »
// à chaque lancement.)
async function refresh(req, key) {
  const res = await fetch(req, { cache: "no-cache" });
  if (res && res.ok) await (await caches.open(CACHE)).put(key, res.clone());
  return res;
}
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  const nav = req.mode === "navigate";
  const key = nav ? "./index.html" : req;
  e.respondWith((async () => {
    const hit = await caches.match(key, { ignoreSearch: nav });
    const update = refresh(req, key).catch(() => null);
    if (hit) { e.waitUntil(update); return hit; }
    // premier lancement : réseau, avec la copie en cache en dernier recours
    const res = await update;
    return res || (await caches.match("./index.html")) || Response.error();
  })());
});
