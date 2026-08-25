require('./harness.js');
let ko = 0;
const t = (nom, recu, attendu) => {
  const ok = JSON.stringify(recu) === JSON.stringify(attendu);
  if (!ok) ko++;
  console.log((ok ? '  OK  ' : ' ECHEC') + ' | ' + nom + ' = ' + JSON.stringify(recu) + (ok ? '' : ' (attendu ' + JSON.stringify(attendu) + ')'));
};

console.log('--- Bandeau d echec : levee du signalement ---');
_echecChargement('SWAP', 'timeout');
_echecChargement('Stocks SIM', 'timeout');
t('deux modules signales', T.echecs.size, 2);
_succesChargement('SWAP');
t('un module leve', T.echecs.size, 1);
_succesChargement('Stocks SIM');
t('plus aucun module en echec apres reprise', T.echecs.size, 0);
_succesChargement('Courriers');
t('lever un module jamais signale est sans effet', T.echecs.size, 0);

console.log('--- Detection backend non redeploye ---');
t('action inconnue reconnue', _actionInconnue('Action inconnue : getObjectifsVallee'), true);
t('vraie erreur non confondue', _actionInconnue('Cannot read property of null'), false);
t('erreur vide', _actionInconnue(undefined), false);

console.log('--- Duree des dysfonctionnements ---');
t('conversion duree vers minutes', _dureeToMinutes('02h30'), 150);
t('duree non reconnue vaut zero', _dureeToMinutes('30/12/1899'), 0);
t('minutes vers duree', _minutesToDuree(150), '2h30');

console.log('--- Cibles : coherence tableau de bord et rapport ---');
T.targets = { '2026-08': { ga: 18600, momo: 16740 } };
const ref = new Date(2026, 7, 15);
t('meme fonction, donc meme cible hebdo partout',
  teamPeriodTarget('ga', 'semaine', ref), teamPeriodTarget('ga', 'semaine', ref));
t('trimestre = somme des trois mois reels', teamPeriodTarget('ga', 'trimestre', ref), 18600 + 18660 + 18660);
t('annee = somme des douze mois', teamPeriodTarget('ga', 'annee', ref), 18600 + 18660 * 11);

console.log('--- Echappement des attributs ---');
t('esc protege les guillemets', esc('a"b'), 'a&quot;b');
t('esc protege les chevrons', esc('<b>'), '&lt;b&gt;');


console.log('--- editSaisie signale son echec ---');
T.saisies = [{ supId:'Ghislain.Bah', horodatage:'24/08/2026 09:10:00', date:'24/08/2026', grossAdd:10, momoUser:9, totalDfa:40, dfaActif:30, observation:'' }];
t('ligne connue : passage en modification', editSaisie('24/08/2026 09:10:00', 'Ghislain.Bah'), true);
t('casse indifferente', editSaisie('24/08/2026 09:10:00', 'ghislain.bah'), true);
t('horodatage inconnu : refus signale', editSaisie('24/08/2026 17:45:00', 'Ghislain.Bah'), false);
t('horodatage vide : refus signale', editSaisie('', 'Ghislain.Bah'), false);


console.log('--- Dysfonctionnement a cheval sur minuit ---');
// Cas reel en base : 25/07/2026, 20:00 -> 02:45.
const champs = {};
const vraiGet = document.getElementById;
document.getElementById = id => ({
  get value() { return champs[id] !== undefined ? champs[id] : ''; },
  set value(v) { champs[id] = v; },
  style: {}, classList: { add(){}, remove(){} }, innerHTML: '', textContent: ''
});

const duree = (debut, fin, repondreOui) => {
  champs['dysf-heure-debut'] = debut;
  champs['dysf-heure-fin']   = fin;
  champs['dysf-duree']       = '';
  champs['dysf-date']        = '';
  champs['dysf-localite']    = '';
  global.confirm = () => repondreOui;
  calcDureeDysf();
  return champs['dysf-duree'];
};

t('journee normale', duree('08:00', '10:30', false), '02h30');
t('minuit confirme : duree correcte', duree('20:00', '02:45', true), '06h45');
t('minuit refuse : duree videe', duree('20:00', '02:45', false), '');
t('inversion refusee : duree videe', duree('10:00', '08:00', false), '');
t('inversion confirmee comme nuit', duree('10:00', '08:00', true), '22h00');
t('heure manquante', duree('08:00', '', false), '');

document.getElementById = vraiGet;

console.log(ko === 0 ? '\nTOUS LES TESTS PASSENT' : '\n' + ko + ' ECHEC(S)');
process.exit(ko ? 1 : 0);
