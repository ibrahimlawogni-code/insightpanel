require('./gas-harness.js');
let ko = 0;
const t = (nom, recu, attendu) => {
  const ok = JSON.stringify(recu) === JSON.stringify(attendu);
  if (!ok) ko++;
  console.log((ok ? '  OK  ' : ' ECHEC') + ' | ' + nom + ' = ' + JSON.stringify(recu) + (ok ? '' : ' (attendu ' + JSON.stringify(attendu) + ')'));
};
const D = (y,m,d) => new Date(Date.UTC(y,m-1,d));

console.log('--- Verrou non repris quand doPost le detient deja ---');
let prises = 0, liberations = 0;
global.LockService = { getScriptLock: () => { prises++; return { waitLock(){}, releaseLock(){ liberations++; } }; } };

// Feuille ancienne : la migration TotalDFA/DFAActif doit se declencher.
const feuilleAncienne = () => {
  const sh = new FakeSheet('SaisiesVallee', [
    ['Date','SupID','SupNom','Zone','GrossAdd','MoMoUser','Observation','Horodatage'],
    [D(2026,8,1),'Ghislain.Bah','Ghislain BAH','Akpro',100,90,'obs',D(2026,8,1)]
  ]);
  sh.insertColumnBefore = function (pos) { this.rows.forEach(r => r.splice(pos - 1, 0, '')); };
  return sh;
};

// Chemin ECRITURE : doPost prend le verrou, la migration ne doit pas en reprendre un second.
__SS = new FakeSS({ SaisiesVallee: feuilleAncienne() });
prises = 0; liberations = 0;
doPost({ postData: { contents: JSON.stringify({ action:'saveSaisieVallee', date:'2026-08-24', supId:'X', grossAdd:1, momoUser:1 }) } });
t('un seul verrou pris sur le chemin ecriture', prises, 1);
t('une seule liberation', liberations, 1);
t('migration quand meme effectuee', __SS.sheets.SaisiesVallee.rows[0].map(String).indexOf('TotalDFA') >= 0, true);

// Chemin LECTURE : pas de verrou doPost, mais la migration prend le sien.
__SS = new FakeSS({ SaisiesVallee: feuilleAncienne() });
prises = 0; liberations = 0;
doPost({ postData: { contents: JSON.stringify({ action:'getSaisiesVallee' }) } });
t('verrou dedie pris sur le chemin lecture', prises, 1);
t('et libere', liberations, 1);

console.log('--- Creation de feuille concurrente ---');
// insertSheet echoue comme si une autre execution avait cree la feuille juste avant.
const ssRace = new FakeSS({});
ssRace.insertSheet = function (n) {
  this.sheets[n] = new FakeSheet(n, [['Date','Sim','Swaper','AuteurId','AuteurNom','Horodatage'],
                                     [D(2026,8,1),'22967000001','2296100001','A','A',D(2026,8,1)]]);
  throw new Error('a sheet with that name already exists');
};
__SS = ssRace;
let err = null, sh = null;
try { sh = _getOrCreateSwapVallee(ssRace); } catch (e) { err = e.message; ko++; }
t('pas d exception si la feuille existe deja', err, null);
t('la feuille existante est retournee', sh && sh.nom, 'SwapVallee');
t('pas de seconde ligne d en-tetes', sh && sh.rows.length, 2);
t('donnee existante intacte', sh && String(sh.rows[1][1]), '22967000001');

console.log('--- _poserEntetes ---');
const vide = new FakeSheet('Test', []);
_poserEntetes(vide, ['A','B','C'], [10,20,30]);
t('en-tetes posees sur feuille vide', vide.rows[0], ['A','B','C']);
_poserEntetes(vide, ['A','B','C'], [10,20,30]);
t('second appel sans effet', vide.rows.length, 1);


console.log('--- _poserEntetes sous concurrence ---');
// Deux executions voient la meme feuille vide : la seconde ne doit rien reecrire.
const partagee = new FakeSheet('Test', []);
_poserEntetes(partagee, ['A','B'], [10,20]);
_poserEntetes(partagee, ['A','B'], [10,20]);
t('une seule ligne d en-tetes', partagee.rows.length, 1);
t('verrou pris pour la pose', prises > 0, true);


console.log('--- Feuille creee sans en-tetes : auto-reparation ---');
// Simule une pose d en-tetes qui a echoue : la feuille existe mais est vide.
__SS = new FakeSS({ SwapVallee: new FakeSheet('SwapVallee', []) });
const repare = _getOrCreateSwapVallee(__SS);
t('en-tetes posees au passage suivant', repare.rows.length, 1);
t('en-tetes correctes', repare.rows[0], ['Date','Sim','Swaper','AuteurId','AuteurNom','Horodatage']);
// Et l ecriture qui aurait plante fonctionne desormais.
let errEcriture = null;
try { handleSaveSwapVallee({ date:'2026-08-25', sim:'22967000001', swaper:'2296100001', auteurId:'A', auteurNom:'A' }); }
catch (e) { errEcriture = e.message; ko++; }
t('ecriture possible apres reparation', errEcriture, null);
t('la ligne est bien la', repare.rows.length, 2);
// Passage suivant : rien ne bouge.
_getOrCreateSwapVallee(__SS);
t('pas de reparation superflue', repare.rows.length, 2);

console.log(ko === 0 ? '\nTOUS LES TESTS PASSENT' : '\n' + ko + ' ECHEC(S)');
process.exit(ko ? 1 : 0);
