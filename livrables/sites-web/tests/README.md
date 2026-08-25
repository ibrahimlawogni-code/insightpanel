# Tests TeamVallée

Suites écrites lors de l'audit du 24 août 2026 pour vérifier les corrections apportées à
`TeamVallee.html` et `apps-script-vallee.gs`.

## Lancer

```
node livrables/sites-web/tests/lancer-tests.js
```

Aucune dépendance à installer, uniquement Node. Les suites lisent directement les fichiers
source du dépôt : elles testent donc toujours le code réel, jamais une copie.

## Comment ça marche

Les deux fichiers audités s'exécutent normalement dans un navigateur ou chez Google, deux
environnements absents en ligne de commande. Deux harnais les simulent :

- `harness.js` fournit un faux `document`, `localStorage`, `sessionStorage` et `fetch`,
  puis évalue le bloc `<script>` de `TeamVallee.html`. L'objet global `T` sert à piloter
  l'état interne (saisies, stock, objectifs, utilisateur courant) depuis les tests.
- `gas-harness.js` fournit un faux Google Sheets : `SpreadsheetApp`, `LockService`,
  `GmailApp`, `Utilities`. Le faux `getRange` refuse de sortir de la grille, comme le
  vrai, ce qui permet de tester le cas d'une feuille arrivée à saturation.

## Ce qui est couvert

| Suite | Sujet |
|---|---|
| `tests.js` | Dates et horodatages, comparaison d'identifiants, calcul des cibles, union des plages de stock SWAP |
| `tests2.js` | Bandeau d'échec de chargement, détection d'un backend non redéployé, durées de dysfonctionnement |
| `tests3.js` | Comparaison exacte des numéros de SIM, couverture de plage, rangs de rôles |
| `tests4.js` | Décision de `_revaliderRole` : les réductions de droits s'appliquent, les élévations sont refusées |
| `gas-tests.js` | Récupération de l'heure perdue, refus des doublons de saisie, unicité des références de courrier |
| `gas-tests2.js` | Verrou limité aux écritures, archivage qui ne prend pas nos propres envois pour des réponses |
| `gas-tests3.js` | Écriture sur une feuille saturée, migration de colonnes sans duplication |
| `gas-tests4.js` | Verrou non repris quand `doPost` le détient déjà, création de feuille concurrente, auto-réparation des en-têtes |

## Ajouter un cas

Chaque suite suit le même modèle :

```js
require('./harness.js');       // ou ./gas-harness.js
const t = (nom, recu, attendu) => { /* comparaison et affichage */ };

t('description du cas', valeurCalculée, valeurAttendue);
```

Un test qui échoue affiche la valeur reçue et la valeur attendue, et le script sort en
code 1, ce qui suffit à faire échouer une automatisation.

Une leçon de l'audit vaut d'être retenue : un test qui ne vérifie qu'une brique isolée ne
protège pas de son mauvais usage. Le classement des rôles était correct et testé, mais la
comparaison qui s'en servait était inversée. `tests4.js` teste désormais la décision
elle-même, pas seulement ses ingrédients.
