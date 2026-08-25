require('./gas-harness.js');
let ko = 0;
const t = (nom, recu, attendu) => {
  const ok = JSON.stringify(recu) === JSON.stringify(attendu);
  if (!ok) ko++;
  console.log((ok ? '  OK  ' : ' ECHEC') + ' | ' + nom + ' = ' + JSON.stringify(recu) + (ok ? '' : ' (attendu ' + JSON.stringify(attendu) + ')'));
};
const D = (y,m,d,h=0,mi=0,s=0) => new Date(Date.UTC(y,m-1,d,h,mi,s));
const post = obj => JSON.parse(doPost({ postData: { contents: JSON.stringify(obj) } })._body);

console.log('--- Verrou : ecritures seulement ---');
let verrous = 0;
global.LockService = { getScriptLock: () => { verrous++; return { waitLock(){}, releaseLock(){} }; } };
// Feuilles deja en place : on teste le regime normal, pas la creation initiale.
__SS = new FakeSS({
  SaisiesVallee: new FakeSheet('SaisiesVallee', [
    ['Date','SupID','SupNom','Zone','GrossAdd','MoMoUser','TotalDFA','DFAActif','Observation','Horodatage']]),
  StockVallee: new FakeSheet('StockVallee', [
    ['Date','SimDebut','SimFin','Quantite','AuteurId','AuteurNom','AuteurRole','Horodatage','Type']])
});

verrous = 0; post({ action: 'getSaisiesVallee' });
t('une lecture ne prend pas le verrou', verrous, 0);
verrous = 0; post({ action: 'getStockVallee' });
t('autre lecture non verrouillee', verrous, 0);
// Une lecture sur une feuille absente prend le verrou : c est voulu, elle la cree.
__SS.sheets.DysfVallee = undefined; delete __SS.sheets.DysfVallee;
verrous = 0; post({ action: 'getDysfVallee' });
t('creation de feuille : verrou pris une fois', verrous, 1);
verrous = 0; post({ action: 'getDysfVallee' });
t('lecture suivante : plus de verrou', verrous, 0);
verrous = 0; post({ action: 'saveSaisieVallee', date:'2026-08-24', supId:'X', grossAdd:1, momoUser:1 });
t('une ecriture prend le verrou', verrous, 1);
verrous = 0; post({ action: 'updateSaisieVallee', supId:'X', horodatage:'zz' });
t('une mise a jour prend le verrou', verrous, 1);
t('action inconnue reste signalee', post({ action: 'nawak' }).error.indexOf('Action inconnue'), 0);
t('corps illisible gere', JSON.parse(doPost({ postData: { contents: '{pas du json' } })._body).success, false);

console.log('--- Archivage : notre propre envoi n est pas une reponse ---');
const msg = (from, date, body) => ({ getFrom: () => from, getDate: () => date, getPlainBody: () => body });
const feuilleCourriers = () => new FakeSheet('DemandesVallee', [
  ['Ref','Type','Date','DestinataireNom','DestinataireEmail','DestinataireType','Motif','Contexte','Message','Decision','DateEffet','DateLimite','Cc','Statut','Reponse','DateReponse','AuteurId','Horodatage'],
  ['DEM-1','demande','01/08/2026','Bah','bah@x.bj','u','motif','','','','','','','En attente','','','ib',D(2026,8,1)]
]);
const statut = () => __SS.sheets.DemandesVallee.rows[1][13];
const reponse = () => __SS.sheets.DemandesVallee.rows[1][14];

// 1. Fil ne contenant que notre envoi
__SS = new FakeSS({ DemandesVallee: feuilleCourriers() });
global.GmailApp = { search: () => [{ getMessages: () => [msg('moi@zephir.bj', D(2026,8,1), 'envoi')] }] };
checkDemandesReponses();
t('envoi seul : reste en attente', statut(), 'En attente');

// 2. Notre envoi puis notre relance, toujours aucune reponse
__SS = new FakeSS({ DemandesVallee: feuilleCourriers() });
global.GmailApp = { search: () => [{ getMessages: () => [
  msg('moi@zephir.bj', D(2026,8,1), 'envoi'), msg('moi@zephir.bj', D(2026,8,3), 'relance')] }] };
checkDemandesReponses();
t('notre relance n est pas une reponse', statut(), 'En attente');

// 3. Vraie reponse du destinataire
__SS = new FakeSS({ DemandesVallee: feuilleCourriers() });
global.GmailApp = { search: () => [{ getMessages: () => [
  msg('moi@zephir.bj', D(2026,8,1), 'envoi'),
  msg('Ghislain BAH <bah@x.bj>', D(2026,8,4), 'voici mes explications')] }] };
checkDemandesReponses();
t('reponse du destinataire archivee', statut(), 'Répondu');
t('corps de la reponse conserve', reponse(), 'voici mes explications');

// 4. Message d un tiers dans le fil : ignore
__SS = new FakeSS({ DemandesVallee: feuilleCourriers() });
global.GmailApp = { search: () => [{ getMessages: () => [
  msg('moi@zephir.bj', D(2026,8,1), 'envoi'),
  msg('inconnu@ailleurs.bj', D(2026,8,5), 'bonjour')] }] };
checkDemandesReponses();
t('message d un tiers ignore', statut(), 'En attente');

// 5. Garde de dernier recours : aucune adresse exploitable
__SS = new FakeSS({ DemandesVallee: new FakeSheet('DemandesVallee', [
  ['Ref','Type','Date','DestinataireNom','DestinataireEmail','Statut','Reponse','DateReponse'],
  ['DEM-1','demande','01/08/2026','Bah','','En attente','','']]) });
global.Session = { getScriptTimeZone: () => 'UTC', getEffectiveUser: () => ({ getEmail: () => '' }) };
global.GmailApp = { search: () => [{ getMessages: () => [msg('moi@zephir.bj', D(2026,8,1), 'envoi')] }] };
checkDemandesReponses();
t('sans adresse connue, l envoi initial reste exclu', __SS.sheets.DemandesVallee.rows[1][5], 'En attente');

console.log(ko === 0 ? '\nTOUS LES TESTS PASSENT' : '\n' + ko + ' ECHEC(S)');
process.exit(ko ? 1 : 0);
