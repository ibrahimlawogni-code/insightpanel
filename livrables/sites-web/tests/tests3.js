require('./harness.js');
let ko = 0;
const t = (nom, recu, attendu) => {
  const ok = JSON.stringify(recu) === JSON.stringify(attendu);
  if (!ok) ko++;
  console.log((ok ? '  OK  ' : ' ECHEC') + ' | ' + nom + ' = ' + JSON.stringify(recu) + (ok ? '' : ' (attendu ' + JSON.stringify(attendu) + ')'));
};

console.log('--- Comparaison de plages de SIM ---');
t('ordre simple', _cmpSim('22967000001', '22967000002') < 0, true);
t('egalite', _cmpSim('22967000005', '22967000005'), 0);
t('longueurs differentes', _cmpSim('999', '1000') < 0, true);
t('non numerique rejete', isNaN(_cmpSim('abc', '123')), true);
t('vide rejete', isNaN(_cmpSim('', '123')), true);
// 19 chiffres : Number() rendrait ces deux ICCID egaux (au-dela de 2^53)
const a = '8922901234567890123', b = '8922901234567890124';
t('Number confond ces deux ICCID', Number(a) === Number(b), true);
t('_cmpSim les distingue', _cmpSim(a, b) < 0, true);

console.log('--- Couverture de plage ---');
t('incluse', _plageCouverte('22967000010', '22967000020', '22967000001', '22967000100'), true);
t('bornes exactes', _plageCouverte('22967000001', '22967000100', '22967000001', '22967000100'), true);
t('depasse a droite', _plageCouverte('22967000050', '22967000200', '22967000001', '22967000100'), false);
t('depasse a gauche', _plageCouverte('22966999999', '22967000050', '22967000001', '22967000100'), false);
t('valeurs manquantes', _plageCouverte('', '22967000050', '22967000001', '22967000100'), false);
t('ICCID longs : pas de faux positif', _plageCouverte(b, b, a, a), false);

console.log('--- Badge de couverture ---');
T.enlevements = [{ type:'swap', simDebut:'22967000001', simFin:'22967000100', quantite:100 }];
t('reception incluse trouvee', !!_findCoveringEnlevement('22967000010','22967000020','swap'), true);
t('mauvais type ignore', _findCoveringEnlevement('22967000010','22967000020','p100'), null);
t('hors plage', _findCoveringEnlevement('22968000010','22968000020','swap'), null);
t('bornes vides', _findCoveringEnlevement('','','swap'), null);

console.log('--- Droits appliques sans relancer le demarrage ---');
T.user = { id:'Agence.Porto', nom:'Agence Porto', role:'agence', initiales:'AP', zone:'Porto' };
let planté = null;
try { _appliquerDroits(); } catch (e) { planté = e.message; ko++; }
t('_appliquerDroits s execute seul', planté, null);


console.log('--- Rang des roles : correction a sens unique ---');
t('admin plus haut que ra', _rangRole('admin') < _rangRole('ra'), true);
t('ra plus haut que superviseur', _rangRole('ra') < _rangRole('superviseur'), true);
t('superviseur plus haut qu agence', _rangRole('superviseur') < _rangRole('agence'), true);
t('casse indifferente', _rangRole('RA'), _rangRole('ra'));
t('role inconnu au plus bas', _rangRole('nawak') > _rangRole('care'), true);
t('agence et care au meme niveau', _rangRole('agence'), _rangRole('care'));

console.log('--- Plage fiable : coherence bornes et quantite ---');
t('bornes coherentes', _plageFiable({ simDebut:'1000', simFin:'1099', quantite:100 }), true);
t('bornes incoherentes rejetees', _plageFiable({ simDebut:'1000', simFin:'1099', quantite:250 }), false);
t('sans quantite : bornes acceptees', _plageFiable({ simDebut:'1000', simFin:'1099' }), true);
t('bornes invalides rejetees', _plageFiable({ simDebut:'abc', simFin:'1099', quantite:100 }), false);
// Ligne dont les bornes ont perdu leur precision : on retombe sur la quantite.
T.enlevements = [{ type:'swap', auteurId:'A', simDebut:'8922901234567890000', simFin:'8922901234567890000', quantite:100 }];
T.stock = [];
t('bornes degradees : quantite retenue', _stockSwapAlloue('A'), 100);

console.log(ko === 0 ? '\nTOUS LES TESTS PASSENT' : '\n' + ko + ' ECHEC(S)');
process.exit(ko ? 1 : 0);
