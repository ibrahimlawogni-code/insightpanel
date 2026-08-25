/* Service worker de Performance Team Vallée.
 *
 * Il rend l'application installable sur ordinateur et téléphone, et garde son enveloppe
 * disponible hors connexion. Les données, elles, viennent de Google Apps Script : sans
 * réseau elles restent inaccessibles, et le service worker le dit clairement plutôt que
 * de laisser l'application afficher des zéros.
 *
 * À SAVOIR AVANT DE MODIFIER : incrémenter VERSION à chaque mise en ligne. C'est ce qui
 * déclenche le nettoyage des anciens caches et la proposition de rechargement.
 */

const VERSION = 'tv-2026-08-25-2';
const CACHE_COQUE = VERSION + '-coque';

/* Enveloppe de l'application : sans réseau, c'est ce qui permet quand même de l'ouvrir. */
const A_PRECHARGER = [
  './team-vallee.html',
  './bg-team-vallee.jpg',
  './icone-192.png',
  './icone-512.png',
  './manifest.webmanifest'
];

/* Origines dont les réponses ne doivent JAMAIS être mises en cache : ce sont les
   données vivantes. Une saisie servie depuis un cache serait un chiffre faux. */
const ORIGINES_DONNEES = [
  'script.google.com',
  'script.googleusercontent.com'
];

self.addEventListener('install', evt => {
  evt.waitUntil((async () => {
    const cache = await caches.open(CACHE_COQUE);
    /* addAll échoue en bloc si une seule ressource manque : on les prend une par une
       pour qu'un fichier absent n'empêche pas l'installation. */
    await Promise.all(A_PRECHARGER.map(async url => {
      try { await cache.add(new Request(url, { cache: 'reload' })); }
      catch (err) { console.warn('[sw] préchargement ignoré :', url, err); }
    }));
  })());
});

self.addEventListener('activate', evt => {
  evt.waitUntil((async () => {
    const noms = await caches.keys();
    await Promise.all(noms.filter(n => !n.startsWith(VERSION)).map(n => caches.delete(n)));
    await self.clients.claim();
  })());
});

/* La page demande l'activation immédiate quand l'utilisateur accepte de recharger. */
self.addEventListener('message', evt => {
  if (evt.data === 'activer-maintenant') self.skipWaiting();
});

self.addEventListener('fetch', evt => {
  const req = evt.request;
  const url = new URL(req.url);

  if (ORIGINES_DONNEES.includes(url.hostname)) { evt.respondWith(donnees(req)); return; }
  if (req.method !== 'GET') return;                       // le reste des écritures passe directement
  if (req.mode === 'navigate' || estDocument(url)) { evt.respondWith(reseauDabord(req)); return; }
  if (url.origin === self.location.origin || url.hostname === 'cdnjs.cloudflare.com') {
    evt.respondWith(cacheDabord(req));
  }
});

function estDocument(url) {
  return url.origin === self.location.origin && url.pathname.endsWith('.html');
}

/* Données : réseau uniquement. Hors ligne, on renvoie une réponse que l'application sait
   lire, ce qui déclenche son propre bandeau « données incomplètes » au lieu d'une erreur
   réseau brute ou, pire, d'un tableau vide pris pour un vrai zéro. */
async function donnees(req) {
  try {
    return await fetch(req);
  } catch (_) {
    return new Response(
      JSON.stringify({ success: false, error: 'Hors ligne : le serveur est injoignable.' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
}

/* Document : réseau d'abord, pour qu'une mise en ligne soit prise en compte dès la
   visite suivante. Le cache ne sert que de filet hors connexion. */
async function reseauDabord(req) {
  const cache = await caches.open(CACHE_COQUE);
  try {
    const rep = await fetch(req);
    if (rep && rep.ok) cache.put(req, rep.clone());
    return rep;
  } catch (_) {
    /* ignoreSearch : les raccourcis de l'application ouvrent team-vallee.html?vue=saisie,
       qui ne correspondrait sinon à aucune entrée du cache. On ne se rabat jamais sur une
       autre page : ce service worker couvre aussi InsightPanel, servi depuis la même
       portée, et lui répondre avec TeamVallée serait pire que de dire « hors ligne ». */
    const enCache = await cache.match(req, { ignoreSearch: true });
    if (enCache) return enCache;
    return new Response(
      '<!doctype html><meta charset="utf-8"><title>Hors ligne</title>' +
      '<body style="font-family:system-ui;background:#1a1a1a;color:#f5f5f5;display:flex;' +
      'align-items:center;justify-content:center;height:100vh;margin:0;text-align:center;padding:24px">' +
      '<div><h1 style="color:#f8c200;font-size:20px">Hors ligne</h1>' +
      '<p style="color:#aaa;font-size:14px;line-height:1.6">Ouvre l\'application une fois avec du réseau,<br>' +
      'elle restera ensuite accessible hors connexion.</p></div>',
      { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }
}

/* Ressources fixes : cache d'abord, et rafraîchissement en arrière-plan. L'affichage est
   immédiat même sur un réseau lent, ce qui est le cas courant sur le terrain. */
async function cacheDabord(req) {
  const cache = await caches.open(CACHE_COQUE);
  const enCache = await cache.match(req);
  const surLeReseau = fetch(req).then(rep => {
    if (rep && (rep.ok || rep.type === 'opaque')) cache.put(req, rep.clone());
    return rep;
  }).catch(() => null);
  return enCache || (await surLeReseau) || Response.error();
}
