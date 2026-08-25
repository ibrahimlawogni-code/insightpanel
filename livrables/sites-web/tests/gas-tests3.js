require('./gas-harness.js');
let ko = 0;
const t = (nom, recu, attendu) => {
  const ok = JSON.stringify(recu) === JSON.stringify(attendu);
  if (!ok) ko++;
  console.log((ok ? '  OK  ' : ' ECHEC') + ' | ' + nom + ' = ' + JSON.stringify(recu) + (ok ? '' : ' (attendu ' + JSON.stringify(attendu) + ')'));
};
const D = (y,m,d,h=0,mi=0,s=0) => new Date(Date.UTC(y,m-1,d,h,mi,s));

console.log('--- Grille pleine : l ecriture doit continuer ---');
const ENT = ['Date','Sim','Swaper','AuteurId','AuteurNom','Horodatage'];
const feuille = new FakeSheet('SwapVallee', [ENT]);
// Grille saturee : 5 lignes de donnees pour 6 lignes de grille.
for (let i = 0; i < 5; i++) feuille.rows.push([D(2026,8,1),'2296700000'+i,'229610000'+i,'A','A',D(2026,8,1)]);
feuille._maxRows = 6;
__SS = new FakeSS({ SwapVallee: feuille });
t('grille saturee avant ecriture', feuille.getLastRow(), feuille.getMaxRows());
let erreur = null;
try { rep(handleSaveSwapVallee({ date:'2026-08-24', sim:'22967099999', swaper:'2296109999', auteurId:'A', auteurNom:'A' })); }
catch (e) { erreur = e.message; ko++; }
t('pas d exception sur grille pleine', erreur, null);
t('la ligne est bien ajoutee', feuille.getLastRow(), 7);
t('grille agrandie avec marge', feuille.getMaxRows() >= 7, true);
t('valeur relue correctement', rep(handleGetSwapVallee({})).data.slice(-1)[0].sim, '22967099999');

console.log('--- Migration de colonnes : verrou et non-duplication ---');
let prises = 0;
global.LockService = { getScriptLock: () => { prises++; return { waitLock(){}, releaseLock(){} }; } };
const ancienne = new FakeSheet('SaisiesVallee', [
  ['Date','SupID','SupNom','Zone','GrossAdd','MoMoUser','Observation','Horodatage'],
  [D(2026,8,1),'Ghislain.Bah','Ghislain BAH','Akpro',100,90,'obs',D(2026,8,1,9,0,0)]
]);
// insertColumnBefore reel : decale les cellules
ancienne.insertColumnBefore = function (pos) { this.rows.forEach(r => r.splice(pos - 1, 0, '')); };
__SS = new FakeSS({ SaisiesVallee: ancienne });
prises = 0;
_getOrCreateSaisiesVallee(__SS);
t('verrou pris pour la migration', prises, 1);
const apres = ancienne.rows[0].map(String);
t('TotalDFA ajoute', apres.filter(h => h === 'TotalDFA').length, 1);
t('DFAActif ajoute', apres.filter(h => h === 'DFAActif').length, 1);
t('Observation preservee', apres.filter(h => h === 'Observation').length, 1);
prises = 0;
_getOrCreateSaisiesVallee(__SS);
t('second appel : aucune migration, aucun verrou', prises, 0);
t('aucune colonne en double', ancienne.rows[0].map(String).filter(h => h === 'TotalDFA').length, 1);
t('donnee de la ligne intacte', _cellStr(ancienne.rows[1][0]), '01/08/2026');
t('GrossAdd toujours a sa place', ancienne.rows[1][4], 100);

console.log('--- Archivage : reponse dans un fil separe ---');
const msg = (from, date, body) => ({ getFrom: () => from, getDate: () => date, getPlainBody: () => body });
__SS = new FakeSS({ DemandesVallee: new FakeSheet('DemandesVallee', [
  ['Ref','Type','Date','DestinataireNom','DestinataireEmail','Statut','Reponse','DateReponse'],
  ['DEM-1','demande','01/08/2026','Bah','bah@x.bj','En attente','','']]) });
global.Session = { getScriptTimeZone: () => 'UTC', getEffectiveUser: () => ({ getEmail: () => 'moi@zephir.bj' }) };
// Le destinataire repond en ouvrant un nouveau fil : son message est en position 0.
global.GmailApp = { search: () => [
  { getMessages: () => [msg('moi@zephir.bj', D(2026,8,1), 'envoi')] },
  { getMessages: () => [msg('Ghislain BAH <bah@x.bj>', D(2026,8,6), 'ma reponse')] }
] };
checkDemandesReponses();
t('reponse en fil separe detectee', __SS.sheets.DemandesVallee.rows[1][5], 'Répondu');
t('corps conserve', __SS.sheets.DemandesVallee.rows[1][6], 'ma reponse');

console.log(ko === 0 ? '\nTOUS LES TESTS PASSENT' : '\n' + ko + ' ECHEC(S)');
process.exit(ko ? 1 : 0);
