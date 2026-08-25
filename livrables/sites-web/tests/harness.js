const noop = () => {};
const fakeEl = new Proxy({}, {
  get: (t, k) => (k === 'style' ? {} : k === 'classList' ? { add: noop, remove: noop }
      : k === 'value' || k === 'textContent' || k === 'innerHTML' ? ''
      : typeof k === 'string' ? noop : undefined),
  set: () => true
});
global.document = {
  getElementById: () => fakeEl, querySelector: () => null, querySelectorAll: () => [],
  createElement: () => fakeEl, addEventListener: noop
};
const store = () => { const m = {}; return { getItem: k => m[k] ?? null, setItem: (k,v) => m[k]=v, removeItem: k => delete m[k] }; };
global.localStorage = store();
global.sessionStorage = store();
global.window = { open: noop, addEventListener: noop, location: {} };
global.navigator = { clipboard: { writeText: async () => {} } };
global.crypto = require('crypto').webcrypto;
global.fetch = async () => ({ json: async () => ({ success: true, data: [] }) });
global.confirm = () => true;
global.alert = noop;

const fs = require('fs');
const src  = fs.readFileSync(require('path').join(__dirname, '..', 'TeamVallee.html'), 'utf8');
const code = src.match(/<script>\n([\s\S]*)\n<\/script>/)[1];

// Les declarations let/const d'un eval indirect restent dans la portee de l'eval.
// On ajoute un epilogue, evalue dans cette meme portee, pour piloter l'etat depuis les tests.
const epilogue = `
globalThis.T = {
  set saisies(v)      { VALLEE_SAISIES = v; },
  set stock(v)        { VALLEE_STOCK = v; },
  set enlevements(v)  { VALLEE_ENLEVEMENTS = v; },
  set swap(v)         { VALLEE_SWAP = v; },
  set targets(v)      { VALLEE_MONTHLY_TARGETS = v; },
  set sups(v)         { VALLEE_SUPS = v; },
  set user(v)         { currentUser = v; },
  set refDate(v)      { _dashRefDate = v; },
  set range(v)        { _dashRangeDebut = v[0]; _dashRangeFin = v[1]; },
  get echecs()        { return MODULES_EN_ECHEC; },
  get stockCourant()  { return VALLEE_STOCK; },
  set usersDyn(v)     { VALLEE_USERS_DYNAMIC = v; },
  get user()          { return currentUser; }
};
`;
(0, eval)(code + epilogue);
