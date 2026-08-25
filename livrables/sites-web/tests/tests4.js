require('./harness.js');
let ko = 0;
const t = (nom, recu, attendu) => {
  const ok = JSON.stringify(recu) === JSON.stringify(attendu);
  if (!ok) ko++;
  console.log((ok ? '  OK  ' : ' ECHEC') + ' | ' + nom + ' = ' + JSON.stringify(recu) + (ok ? '' : ' (attendu ' + JSON.stringify(attendu) + ')'));
};

// Ce que la suite precedente ne testait pas : la DECISION de _revaliderRole,
// et non le seul classement des rangs. C est la qu une inversion se cachait.
const decide = (roleSession, roleServeur) => {
  T.user = { id: 'Agence.Porto', nom: 'Agence Porto', role: roleSession, initiales: 'AP', zone: 'Porto' };
  T.usersDyn = [{ id: 'Agence.Porto', nom: 'Agence Porto', role: roleServeur, libelle: 'Porto' }];
  _revaliderRole();
  return T.user ? T.user.role : 'DECONNECTE';
};

console.log('--- _revaliderRole : reduction appliquee ---');
t('admin -> agence : applique', decide('admin', 'agence'), 'agence');
t('ra -> superviseur : applique', decide('ra', 'superviseur'), 'superviseur');
t('superviseur -> care : applique', decide('superviseur', 'care'), 'care');
t('dg -> agence : applique', decide('dg', 'agence'), 'agence');

console.log('--- _revaliderRole : elevation refusee ---');
t('agence -> admin : refuse', decide('agence', 'admin'), 'agence');
t('care -> ra : refuse', decide('care', 'ra'), 'care');
t('superviseur -> ra : refuse', decide('superviseur', 'ra'), 'superviseur');
t('agence -> superviseur : refuse', decide('agence', 'superviseur'), 'agence');

console.log('--- _revaliderRole : cas neutres ---');
t('roles identiques : inchange', decide('superviseur', 'superviseur'), 'superviseur');
t('casse differente : inchange', decide('superviseur', 'SUPERVISEUR'), 'superviseur');
t('meme rang : inchange', decide('agence', 'care'), 'agence');

console.log('--- _revaliderRole : role serveur vide ---');
t('session privilegiee sans role serveur : deconnexion', decide('ra', ''), 'DECONNECTE');
T.user = { id: 'Agence.Porto', nom: 'Agence Porto', role: 'agence', initiales: 'AP' };
T.usersDyn = [{ id: 'Agence.Porto', nom: 'Agence Porto', role: '' }];
_revaliderRole();
t('session ordinaire sans role serveur : conservee', T.user && T.user.role, 'agence');

console.log('--- _revaliderRole : hors perimetre ---');
t('compte code en dur : jamais touche', decide('ra', 'agence') && (() => {
  T.user = { id: 'Ibrahim.Lawogni', nom: 'Ibrahim LAWOGNI', role: 'ra', initiales: 'IL' };
  T.usersDyn = [{ id: 'Ibrahim.Lawogni', nom: 'x', role: 'agence' }];
  _revaliderRole();
  return T.user.role;
})(), 'ra');

console.log('--- Selecteur superviseur preserve ---');
t('_applySupOpts existe', typeof _applySupOpts, 'function');

console.log(ko === 0 ? '\nTOUS LES TESTS PASSENT' : '\n' + ko + ' ECHEC(S)');
process.exit(ko ? 1 : 0);
