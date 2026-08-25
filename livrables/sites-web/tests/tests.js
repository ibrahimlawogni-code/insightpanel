require('./harness.js');
// Rejoue le calcul de "deja reparti" de renderSwapStockGlobal.
function VALLEE_STOCK_TEST() {
  const r = T.stockCourant.filter(x => x.type === 'swap');
  return _tailleUnion(r.map(x => [x.simDebut, x.simFin])) + _sansPlage(r);
}
let ko = 0;
const t = (nom, recu, attendu) => {
  const ok = JSON.stringify(recu) === JSON.stringify(attendu);
  if (!ok) ko++;
  console.log((ok ? '  OK  ' : ' ECHEC') + ' | ' + nom + ' = ' + JSON.stringify(recu) + (ok ? '' : ' (attendu ' + JSON.stringify(attendu) + ')'));
};

console.log('--- Dates et horodatages ---');
t('parseSaisieDate dd/MM/yyyy', parseSaisieDate('15/12/2025').getMonth(), 11);
t('parseSaisieDate ISO', parseSaisieDate('2026-01-02').getDate(), 2);
t('tsToTime trie 15/12/2025 avant 02/01/2026', tsToTime('15/12/2025 08:00:00') < tsToTime('02/01/2026 08:00:00'), true);
t('tsToTime distingue deux heures du meme jour', tsToTime('24/08/2026 14:23:45') > tsToTime('24/08/2026 09:10:00'), true);
t('tsToTime sans heure', tsToTime('24/08/2026') > 0, true);

console.log('--- Identifiants ---');
t('sameId casse differente', sameId('Ghislain.Bah', 'ghislain.bah'), true);
t('sameId espaces', sameId(' Dbah ', 'dbah'), true);
t('sameId vide', sameId('', 'x'), false);
t('_findSeed exact', _findSeed('ibrahim.lawogni').role, 'ra');
t('_findSeed alias connu', _findSeed('Dbah').id, 'Ghislain.Bah');
t('_findSeed ne fusionne plus un homonyme', _findSeed('Pierre.Bah'), null);
t('_findSeed ne fusionne plus une agence', _findSeed('Agence.Dansou'), null);

console.log('--- Echappement ---');
t('esc chevrons', esc('<img onerror=x>'), '&lt;img onerror=x&gt;');
t('esc apostrophe', esc("O'Brien"), 'O&#39;Brien');

console.log('--- Cibles ---');
const ref = new Date(2026, 7, 15); // aout 2026, 31 jours
T.targets = { '2026-08': { ga: 18600, momo: 16740 } };
t('cible mois', teamPeriodTarget('ga', 'mois', ref), 18600);
t('cible jour = 18600/31', teamPeriodTarget('ga', 'jour', ref), 600);
t('cible semaine = 6 jours ouvres', teamPeriodTarget('ga', 'semaine', ref), 3600);
console.log('       (l ancien module Rapport donnait ' + Math.round(18600/31*7) + ' avec 7 jours)');

console.log('--- Repartition DFA ---');
const SAISIES = [
  { supId: 'Ghislain.Bah',       date: '10/08/2026', dfaActif: 30, grossAdd: 100, momoUser: 90 },
  { supId: 'ghislain.bah',       date: '12/08/2026', dfaActif: 30, grossAdd: 120, momoUser: 100 },
  { supId: 'Loukmane.Yessoufou', date: '12/08/2026', dfaActif: 10, grossAdd: 50,  momoUser: 40 }
];
T.saisies = SAISIES;
const snap = _dfaSnapshot(ref);
t('snapshot fusionne les casses', Object.keys(snap.map).length, 2);
t('total DFA', snap.total, 40);
t('cible Bah = 75% de 18600', supPropTarget(18600, 'Ghislain.Bah', ref, snap), 13950);
t('cible Yessoufou = 25%', supPropTarget(18600, 'loukmane.yessoufou', ref, snap), 4650);
t('somme des cibles = cible equipe', supPropTarget(18600,'Ghislain.Bah',ref,snap) + supPropTarget(18600,'Loukmane.Yessoufou',ref,snap), 18600);

console.log('--- Stock SWAP : union de plages ---');
// Le RA enleve 100 SIM ; l agence declare une reception de 50 prise dans cette plage.
T.enlevements = [{ type:'swap', auteurId:'Ibrahim.Lawogni', simDebut:'22967000001', simFin:'22967000100', quantite:100 }];
T.stock       = [{ type:'swap', auteurId:'Agence.Porto',    simDebut:'22967000001', simFin:'22967000050', quantite:50 },
                 { type:'p100',auteurId:'Agence.Porto',     simDebut:'22960000001', simFin:'22960000999', quantite:999 }];
t('stock global = parc enleve', _stockSwapGlobal(), 100);
t('P100 exclu', _stockSwapGlobal(), 100);
t('agence : sa reception compte', _stockSwapAlloue('Agence.Porto'), 50);
t('agence : casse indifferente', _stockSwapAlloue('agence.porto'), 50);
t('compte sans stock', _stockSwapAlloue('Service.Care'), 0);

// Meme compte declarant enlevement ET reception incluse : compte une seule fois.
T.enlevements = [{ type:'swap', auteurId:'Agence.Porto', simDebut:'22967000001', simFin:'22967000100', quantite:100 }];
T.stock       = [{ type:'swap', auteurId:'Agence.Porto', simDebut:'22967000010', simFin:'22967000050', quantite:41 }];
t('reception incluse non recomptee', _stockSwapAlloue('Agence.Porto'), 100);

// Reception a cheval sur deux enlevements : aucun ne la contient seul.
T.enlevements = [{ type:'swap', auteurId:'A', simDebut:'1000', simFin:'1099', quantite:100 },
                 { type:'swap', auteurId:'A', simDebut:'1100', simFin:'1199', quantite:100 }];
T.stock       = [{ type:'swap', auteurId:'A', simDebut:'1050', simFin:'1150', quantite:101 }];
t('plages contigues fusionnees', _stockSwapAlloue('A'), 200);

// Chevauchement partiel : seule la part nouvelle s ajoute.
T.enlevements = [{ type:'swap', auteurId:'A', simDebut:'1000', simFin:'1099', quantite:100 }];
T.stock       = [{ type:'swap', auteurId:'A', simDebut:'1050', simFin:'1149', quantite:100 }];
t('chevauchement partiel : union 1000-1149', _stockSwapAlloue('A'), 150);

// Plages disjointes : addition normale.
T.enlevements = [{ type:'swap', auteurId:'A', simDebut:'1000', simFin:'1099', quantite:100 }];
T.stock       = [{ type:'swap', auteurId:'A', simDebut:'5000', simFin:'5029', quantite:30 }];
t('plages disjointes additionnees', _stockSwapAlloue('A'), 130);

// Enregistrement sans plage : on retombe sur la quantite declaree.
T.enlevements = [{ type:'swap', auteurId:'A', simDebut:'', simFin:'', quantite:75 }];
T.stock       = [];
t('sans plage : quantite declaree', _stockSwapAlloue('A'), 75);
t('idem pour le global', _stockSwapGlobal(), 75);

console.log('--- Taille de plage ---');
t('plage simple', _taillePlage('1000', '1099'), 100);
t('une seule SIM', _taillePlage('1000', '1000'), 1);
t('fin avant debut', _taillePlage('1099', '1000'), null);
t('non numerique', _taillePlage('abc', '1000'), null);
t('ICCID 19 chiffres exact', _taillePlage('8922901234567890123', '8922901234567890222'), 100);


console.log('--- Plage inversee : la quantite ne disparait pas ---');
T.enlevements = [{ type:'swap', auteurId:'A', simDebut:'1099', simFin:'1000', quantite:60 }];
T.stock       = [];
t('plage inversee retombe sur la quantite', _stockSwapAlloue('A'), 60);
t('idem pour le global', _stockSwapGlobal(), 60);
T.enlevements = [{ type:'swap', auteurId:'A', simDebut:'1000', simFin:'1099', quantite:100 },
                 { type:'swap', auteurId:'A', simDebut:'2099', simFin:'2000', quantite:60 }];
t('plage valide et plage inversee cumulees', _stockSwapAlloue('A'), 160);


console.log('--- Part deja repartie : dedoublonnee comme le reste ---');
T.enlevements = [{ type:'swap', auteurId:'RA', simDebut:'1000', simFin:'1099', quantite:100 }];
T.stock = [{ type:'swap', auteurId:'A', simDebut:'1000', simFin:'1049', quantite:50 },
           { type:'swap', auteurId:'A', simDebut:'1000', simFin:'1049', quantite:50 }];
const receptions = VALLEE_STOCK_TEST();
t('doublon de reception compte une seule fois', receptions, 50);
t('la part repartie ne depasse pas le global', receptions <= _stockSwapGlobal(), true);

console.log('--- Filtre periode non validee ---');
T.range = [null, null];
t('onglet Periode sans bornes ne renvoie rien', filterByPeriod(SAISIES, 'periode').length, 0);
T.range = ['2026-08-01', '2026-08-31'];
t('onglet Periode avec bornes filtre', filterByPeriod(SAISIES, 'periode').length, 3);

console.log(ko === 0 ? '\nTOUS LES TESTS PASSENT' : '\n' + ko + ' ECHEC(S)');
process.exit(ko ? 1 : 0);
