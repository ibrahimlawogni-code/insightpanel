require('./gas-harness.js');
let ko = 0;
const t = (nom, recu, attendu) => {
  const ok = JSON.stringify(recu) === JSON.stringify(attendu);
  if (!ok) ko++;
  console.log((ok ? '  OK  ' : ' ECHEC') + ' | ' + nom + ' = ' + JSON.stringify(recu) + (ok ? '' : ' (attendu ' + JSON.stringify(attendu) + ')'));
};
const D = (y,m,d,h=0,mi=0,s=0) => new Date(Date.UTC(y,m-1,d,h,mi,s));

console.log('--- V-01 : horodatage, heure recuperee ---');
t('_tsStr sur une date convertie par Sheets', G._tsStr(D(2026,8,24,14,23,45)), '24/08/2026 14:23:45');
t('_tsStr sur du texte deja propre', G._tsStr('24/08/2026 09:10:00'), '24/08/2026 09:10:00');
t('l ancien _cellStr perdait l heure', G._cellStr(D(2026,8,24,14,23,45)), '24/08/2026');

console.log('--- V-02 : heures de dysfonctionnement ---');
t('_timeStr sur une heure stockee en 1899', G._timeStr(D(1899,12,30,8,30)), '08:30');
t('_timeStr sur du texte', G._timeStr('08:30'), '08:30');
t('l ancien _cellStr affichait 1899', G._cellStr(D(1899,12,30,8,30)), '30/12/1899');

console.log('--- _dateKey ---');
t('_dateKey ISO', G._dateKey('2026-08-24'), '2026-08-24');
t('_dateKey FR', G._dateKey('24/08/2026'), '2026-08-24');
t('_dateKey Date', G._dateKey(D(2026,8,24)), '2026-08-24');

const ENTETES = ['Date','SupID','SupNom','Zone','GrossAdd','MoMoUser','TotalDFA','DFAActif','Observation','Horodatage'];
const nouvelleFeuille = () => new FakeSheet('SaisiesVallee', [ENTETES,
  [D(2026,8,24),'Ghislain.Bah','Ghislain BAH','Akpro',100,90,40,30,'matin',   D(2026,8,24,9,10,0)],
  [D(2026,8,24),'Ghislain.Bah','Ghislain BAH','Akpro',150,120,40,30,'apres-midi',D(2026,8,24,17,45,0)]
]);

console.log('--- V-01 : la correction vise la bonne ligne ---');
__SS = new FakeSS({ SaisiesVallee: nouvelleFeuille() });
const lues = rep(G.handleGetSaisiesVallee({})).data;
t('deux horodatages distincts', lues.map(r => r.horodatage), ['24/08/2026 09:10:00','24/08/2026 17:45:00']);
rep(G.handleUpdateSaisieVallee({ supId:'Ghislain.Bah', horodatage:'24/08/2026 17:45:00', grossAdd:999, momoUser:888, totalDfa:40, dfaActif:30, observation:'corrige' }));
t('ligne du matin intacte',    __SS.sheets.SaisiesVallee.rows[1][4], 100);
t('ligne de l apres-midi modifiee', __SS.sheets.SaisiesVallee.rows[2][4], 999);

console.log('--- V-01 : casse differente de l identifiant ---');
__SS = new FakeSS({ SaisiesVallee: nouvelleFeuille() });
t('mise a jour trouvee malgre la casse',
  rep(G.handleUpdateSaisieVallee({ supId:'ghislain.bah', horodatage:'24/08/2026 09:10:00', grossAdd:7, momoUser:7, observation:'x' })).success, true);

console.log('--- V-23 : colonne Observation absente ---');
__SS = new FakeSS({ SaisiesVallee: new FakeSheet('SaisiesVallee', [
  ['Date','SupID','SupNom','Zone','GrossAdd','MoMoUser','Horodatage'],
  [D(2026,8,24),'Ghislain.Bah','Ghislain BAH','Akpro',100,90, D(2026,8,24,9,10,0)]
]) });
let plante = false;
try { t('pas de plantage sans colonne Observation',
  rep(G.handleUpdateSaisieVallee({ supId:'Ghislain.Bah', horodatage:'24/08/2026 09:10:00', grossAdd:5, momoUser:5, observation:'x' })).success, true); }
catch (e) { plante = true; ko++; console.log(' ECHEC | exception : ' + e.message); }

console.log('--- V-10 : doublon date + superviseur ---');
__SS = new FakeSS({ SaisiesVallee: nouvelleFeuille() });
const dbl = rep(G.handleSaveSaisieVallee({ date:'2026-08-24', supId:'Ghislain.Bah', supNom:'Ghislain BAH', zone:'Akpro', grossAdd:50, momoUser:40 }));
t('doublon refuse', dbl.success, false);
t('code renvoye', dbl.code, 'DOUBLON');
t('horodatage existant renvoye', dbl.horodatage, '24/08/2026 09:10:00');
t('aucune ligne ajoutee', __SS.sheets.SaisiesVallee.rows.length, 3);
t('doublon accepte si force', rep(G.handleSaveSaisieVallee({ date:'2026-08-24', supId:'Ghislain.Bah', grossAdd:50, momoUser:40, force:true })).success, true);
t('ligne ajoutee apres force', __SS.sheets.SaisiesVallee.rows.length, 4);
t('autre date acceptee', rep(G.handleSaveSaisieVallee({ date:'2026-08-25', supId:'Ghislain.Bah', grossAdd:50, momoUser:40 })).success, true);
t('autre superviseur accepte', rep(G.handleSaveSaisieVallee({ date:'2026-08-24', supId:'Loukmane.Yessoufou', grossAdd:50, momoUser:40 })).success, true);

console.log('--- V-11 : reference de courrier apres suppression ---');
__SS = new FakeSS({ DemandesVallee: new FakeSheet('DemandesVallee', [
  ['Ref','Type','Date','DestinataireNom','DestinataireEmail','DestinataireType','Motif','Contexte','Message','Decision','DateEffet','DateLimite','Cc','Statut','Reponse','DateReponse','AuteurId','Horodatage'],
  ['DEM-1','demande','01/08/2026','A','a@x.bj','u','m','','','','','','','En attente','','','ib',D(2026,8,1)],
  ['DEM-3','demande','03/08/2026','C','c@x.bj','u','m','','','','','','','En attente','','','ib',D(2026,8,3)]
]) });
t('numero suivant = max + 1, pas nombre de lignes + 1',
  rep(G.handleSaveDemandeVallee({ type:'demande', destinataireNom:'D', motif:'m' })).ref, 'DEM-4');
t('prefixe independant par type',
  rep(G.handleSaveDemandeVallee({ type:'avertissement', destinataireNom:'E', motif:'m' })).ref, 'AVT-1');

console.log('--- V-12 : stock ecrit par nom de colonne ---');
__SS = new FakeSS({ StockVallee: new FakeSheet('StockVallee', [
  ['Date','SimDebut','SimFin','Quantite','AuteurId','AuteurNom','AuteurRole','Horodatage','Type','Commentaire']
]) });
G.handleSaveStockVallee({ date:'2026-08-24', simDebut:'22967000001', simFin:'22967000100', quantite:100, auteurId:'Agence.Porto', auteurNom:'Agence Porto', auteurRole:'agence', type:'swap' });
const lu = rep(G.handleGetStockVallee({})).data[0];
t('type au bon endroit', lu.type, 'swap');
t('quantite au bon endroit', lu.quantite, 100);
t('role au bon endroit', lu.auteurRole, 'agence');


console.log('--- Lignes saisies directement dans Sheets (sans horodatage) ---');
// Cas reel : 1048 des 1180 saisies de production ont ete tapees dans la feuille,
// donc sans horodatage. Elles etaient indistinguables les unes des autres.
const ENT2 = ['Date','SupID','SupNom','Zone','GrossAdd','MoMoUser','TotalDFA','DFAActif','Observation','Horodatage'];
const feuilleSansTs = () => new FakeSheet('SaisiesVallee', [ENT2,
  [D(2026,7,20),'Ghislain.Bah','Ghislain BAH','Akpro',10,9,40,30,'',''],
  [D(2026,7,21),'Ghislain.Bah','Ghislain BAH','Akpro',20,18,40,30,'',''],
  [D(2026,7,22),'Ghislain.Bah','Ghislain BAH','Akpro',30,27,40,30,'','']
]);

__SS = new FakeSS({ SaisiesVallee: feuilleSansTs() });
const f = __SS.sheets.SaisiesVallee;
t('mise a jour par numero de ligne', rep(G.handleUpdateSaisieVallee({
  supId:'Ghislain.Bah', row:3, date:'2026-07-21', grossAdd:999, momoUser:888, totalDfa:40, dfaActif:30, observation:'corrige' })).success, true);
t('ligne visee modifiee', f.rows[2][4], 999);
t('ligne precedente intacte', f.rows[1][4], 10);
t('ligne suivante intacte', f.rows[3][4], 30);

// Garde-fou : si la feuille a bouge, la date ne concorde plus et on refuse.
__SS = new FakeSS({ SaisiesVallee: feuilleSansTs() });
const refus = rep(G.handleUpdateSaisieVallee({
  supId:'Ghislain.Bah', row:3, date:'2026-07-22', grossAdd:1, momoUser:1 }));
t('date discordante : ecriture refusee', refus.success, false);
t('message explicite', refus.error.indexOf('changé de place') >= 0, true);
t('aucune ligne touchee', __SS.sheets.SaisiesVallee.rows[2][4], 20);

// Superviseur discordant : meme refus.
__SS = new FakeSS({ SaisiesVallee: feuilleSansTs() });
t('superviseur discordant : refus', rep(G.handleUpdateSaisieVallee({
  supId:'Loukmane.Yessoufou', row:3, date:'2026-07-21', grossAdd:1, momoUser:1 })).success, false);

// Sans numero de ligne, on retombe sur l horodatage comme avant.
__SS = new FakeSS({ SaisiesVallee: nouvelleFeuille() });
t('sans numero de ligne : recherche par horodatage', rep(G.handleUpdateSaisieVallee({
  supId:'Ghislain.Bah', horodatage:'24/08/2026 17:45:00', grossAdd:5, momoUser:5, observation:'x' })).success, true);
t('ligne hors bornes ignoree', rep(G.handleUpdateSaisieVallee({
  supId:'Ghislain.Bah', row:9999, horodatage:'24/08/2026 09:10:00', grossAdd:7, momoUser:7, observation:'y' })).success, true);

console.log(ko === 0 ? '\nTOUS LES TESTS BACKEND PASSENT' : '\n' + ko + ' ECHEC(S)');
process.exit(ko ? 1 : 0);
