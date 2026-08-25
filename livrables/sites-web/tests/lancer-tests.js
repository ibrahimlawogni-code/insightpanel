// Lance toutes les suites de tests TeamVallee et affiche un bilan.
// Utilisation : node livrables/sites-web/tests/lancer-tests.js

const { execFileSync } = require('child_process');
const path = require('path');

const SUITES = [
  ['tests.js',      'Front : dates, identifiants, cibles, stock SWAP'],
  ['tests2.js',     'Front : bandeau d\'échec, durées, échappement'],
  ['tests3.js',     'Front : plages de SIM, rangs de rôles'],
  ['tests4.js',     'Front : décision de revalidation du rôle'],
  ['gas-tests.js',  'Backend : horodatage, heures, doublons, références'],
  ['gas-tests2.js', 'Backend : verrou, archivage des réponses'],
  ['gas-tests3.js', 'Backend : grille pleine, migration de colonnes'],
  ['gas-tests4.js', 'Backend : verrou imbriqué, création concurrente']
];

let echecs = 0;
let assertions = 0;

SUITES.forEach(([fichier, description]) => {
  let sortie = '';
  let ok = true;
  try {
    // stderr capturé plutôt qu'hérité : les suites journalisent volontairement des
    // avertissements (échec de chargement simulé, rôle refusé) qui pollueraient le bilan.
    sortie = execFileSync(process.execPath, [path.join(__dirname, fichier)],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (err) {
    ok = false;
    sortie = (err.stdout || '') + (err.stderr || '');
  }
  assertions += (sortie.match(/OK   \|/g) || []).length;
  if (!ok) echecs++;
  console.log((ok ? '  OK    ' : ' ECHEC  ') + fichier.padEnd(15) + description);
  if (!ok) sortie.split('\n').filter(l => l.includes('ECHEC |')).forEach(l => console.log('          ' + l.trim()));
});

console.log('');
console.log(`  ${assertions} assertions · ${SUITES.length - echecs}/${SUITES.length} suites au vert`);
process.exit(echecs ? 1 : 0);
