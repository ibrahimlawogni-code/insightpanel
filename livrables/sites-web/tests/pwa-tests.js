// Vérifie que l'installation sur ordinateur et téléphone est correctement déclarée :
// manifeste valide, icônes réellement présentes et aux bonnes dimensions, service worker
// cohérent, et page qui référence le tout. Ces fichiers ne sont pas exécutés ici, ils
// sont confrontés les uns aux autres et au contenu du dépôt.

const fs = require('fs');
const path = require('path');

const RACINE = path.join(__dirname, '..', '..', '..');   // racine du dépôt, servie par GitHub Pages
const lire = f => fs.readFileSync(path.join(RACINE, f), 'utf8');
const existe = f => fs.existsSync(path.join(RACINE, f));

let ko = 0;
const t = (nom, recu, attendu) => {
  const ok = JSON.stringify(recu) === JSON.stringify(attendu);
  if (!ok) ko++;
  console.log((ok ? '  OK  ' : ' ECHEC') + ' | ' + nom + ' = ' + JSON.stringify(recu) + (ok ? '' : ' (attendu ' + JSON.stringify(attendu) + ')'));
};

// Dimensions d'un PNG : lues dans l'en-tête IHDR, sans dépendance.
function taillePng(f) {
  const b = fs.readFileSync(path.join(RACINE, f));
  if (b.length < 24 || b.toString('ascii', 1, 4) !== 'PNG') return null;
  return b.readUInt32BE(16) + 'x' + b.readUInt32BE(20);
}

console.log('--- Manifeste ---');
t('manifest.webmanifest présent', existe('manifest.webmanifest'), true);
const man = JSON.parse(lire('manifest.webmanifest'));
t('nom court renseigné', !!man.short_name, true);
t('langue française', man.lang, 'fr');
t('affichage autonome', man.display, 'standalone');
t('page de démarrage', man.start_url, './team-vallee.html');
t('icône 192 déclarée', man.icons.some(i => i.sizes === '192x192'), true);
t('icône 512 déclarée', man.icons.some(i => i.sizes === '512x512'), true);
t('icône masquable déclarée', man.icons.some(i => (i.purpose || '').includes('maskable')), true);

console.log('--- Icônes réellement présentes ---');
man.icons.forEach(i => {
  const f = i.src.replace('./', '');
  t('fichier ' + f, existe(f), true);
  if (existe(f)) t('  dimensions annoncées', taillePng(f), i.sizes);
});
t('apple-touch-icon.png présent', existe('apple-touch-icon.png'), true);
t('  dimensions', taillePng('apple-touch-icon.png'), '180x180');

console.log('--- Cibles du manifeste ---');
t('page de démarrage existante', existe(man.start_url.replace('./', '')), true);
man.shortcuts.forEach(s => {
  const fichier = s.url.replace('./', '').split('?')[0];
  t('raccourci « ' + s.short_name +' » pointe sur un fichier existant', existe(fichier), true);
});
const vues = man.shortcuts.map(s => new URLSearchParams(s.url.split('?')[1] || '').get('vue'));
const page = lire('team-vallee.html');
vues.forEach(v => t('vue « ' + v + ' » connue de l\'application', page.includes("'" + v + "'"), true));

console.log('--- Service worker ---');
t('sw.js présent', existe('sw.js'), true);
const sw = lire('sw.js');
t('version définie', /const VERSION = '[^']+'/.test(sw), true);
t('origines de données exclues du cache', sw.includes('script.google.com'), true);
t('réponse hors ligne exploitable par l\'application', sw.includes('"success": false') || sw.includes('success: false'), true);

console.log('--- Fichiers préchargés par le service worker ---');
const bloc = sw.match(/const A_PRECHARGER = \[([\s\S]*?)\]/)[1];
const precharges = [...bloc.matchAll(/'([^']+)'/g)].map(m => m[1].replace('./', ''));
t('liste non vide', precharges.length > 0, true);
precharges.forEach(f => t('préchargé : ' + f, existe(f), true));

console.log('--- Page ---');
t('manifeste référencé', /<link rel="manifest" href="manifest\.webmanifest">/.test(page), true);
t('couleur de thème déclarée', /<meta name="theme-color"/.test(page), true);
t('icône iOS référencée', /rel="apple-touch-icon"/.test(page), true);
t('service worker enregistré', page.includes("serviceWorker.register('sw.js')"), true);
t('bouton d\'installation présent', page.includes('id="btn-installer"'), true);
t('bandeau hors ligne présent', page.includes('id="barre-hors-ligne"'), true);
t('bandeau de mise à jour présent', page.includes('id="barre-maj"'), true);
t('contexte non sécurisé écarté', page.includes("location.protocol !== 'https:'"), true);

console.log('--- Copie racine synchronisée avec la source ---');
const source = fs.readFileSync(path.join(__dirname, '..', 'TeamVallee.html'), 'utf8');
t('team-vallee.html identique à TeamVallee.html', page === source, true);

console.log(ko === 0 ? '\nTOUS LES TESTS PASSENT' : '\n' + ko + ' ECHEC(S)');
process.exit(ko ? 1 : 0);
