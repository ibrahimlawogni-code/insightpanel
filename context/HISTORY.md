# Workspace History

> Journal chronologique de toutes les sessions et décisions importantes.
> Le plus récent en haut. Mis à jour automatiquement par Claude.
>
> **Comment ça marche :** Quand je lance la commande `/update` après une session importante, ou quand je raconte un changement significatif, Claude ajoute une entrée ici automatiquement. Je n'ai pas à écrire ce fichier manuellement.

---

## 2026-06-25

### InsightPanel — Analyse stratégique dans les rapports + correction de saisies DFA

- Analyse stratégique intégrée dans les rapports Superviseur et RA (suggestion Ibrahim, pas un nouveau menu)
  - Trajectoire attendue selon la période (jour=100%, semaine=jour/6, mois=jour/jours du mois)
  - Alertes stock critique (solde <= 50 SIMs), agents en retard/en avance
  - Recommandations contextuelles : réappro urgent, visite terrain, valorisation
  - Section HTML dans la carte KPI + texte dans le rapport WhatsApp/email
- Fix KPI "Mon stock reçu" = 0 pour Pierre : transfert créé avant la mise à jour GAS (pas de colonne Statut donc pas de ligne StockSIM auto-créée). Résolution : ajout manuel d'une ligne dans StockSIM avec type='transfert' et auteurId=Pierre.id
- Correction de saisies DFA ajoutée à la vue Superviseur
  - Tableau filtrable par DFA et plage de dates, tri par date décroissante
  - Modal de correction : GA, New MoMo User, Stock SIM, Observation (tous champs, tout l'historique)
  - Accès : superviseur (zone uniquement), ra et admin (tout)
  - GAS : endpoint updateSaisie, identifie la ligne par horodatage (ts) + dfaId
  - Après correction : cache invalidé, données mises à jour localement sans rechargement de page
- Nouveau déploiement GAS, nouvelle URL mise à jour dans InsightPanel

---

## 2026-06-24

### InsightPanel — Corrections multiples + export Excel + migration GitHub Pages

- Fix Détection SIMs : champs Début/Fin marqués requis (*), bannière d'avertissement si aucune plage P100 enregistrée
- Fix rafraîchissement page : stocks et vue superviseur ne restauraient pas la bonne vue au reload (`saveViewState` + `_tryRestoreSession` étendus pour ces deux cas)
- Fix rapports hebdomadaires : target affiché était mensuel, corrigé en target hebdo proportionnel via `MONTHLY_TARGETS`
- Fix icônes rapports : FontAwesome CDN indisponible sur réseau lent, remplacé par emojis Unicode dans tous les boutons de rapport
- Redesign carte "Progression mensuelle — Équipe" : barres de progression en dégradé, icônes KPI emoji, couleurs dynamiques, section projection en pointillés
- Fix Vue Agent Terrain : données DFA vides à cause d'un écart de casse entre `USERS.id` et `s.dfaId`, normalisé avec `.toLowerCase().trim()` sur tous les points de comparaison
- Fix Vue Superviseur : affichait une date passée (J-3) au lieu d'aujourd'hui, cause racine dans le bloc `showView('superviseur')` qui ne réinitialisait pas `supViewRefDate`
- Migration hébergement : Netlify (crédits épuisés) vers GitHub Pages
  - `index.html` copié à la racine du repo
  - `bg-login.png` copié à la racine (fix fond noir page de connexion)
  - Hook pre-commit mis à jour pour synchroniser les deux assets automatiquement
  - URL active : https://ibrahimlawogni-code.github.io/insightpanel/
- Export Excel SIMs vendues : bouton "Exporter Excel" dans la carte Stocks (SheetJS 0.18.5 via CDN), fichier .xlsx avec en-têtes stylisés, reprend les filtres actifs, export total sans limite de pagination, superviseur limité automatiquement à sa propre zone

---

## 2026-06-21

### InsightPanel — Rapports stocks, profil utilisateur, fix Best Seller

- Rapports : intégration données Stocks & Ressources dans `_buildRapportRA` et `_buildRapportSup`
  - KPI card SIM vendues / stock, tableau par superviseur (reçu / vendu / solde / taux)
  - Section stocks dans le texte WhatsApp/email
  - Helpers `_stockRapportRA()` et `_stockRapportSup()`

- Fix rapports stocks : `renderRapports()` était synchrone, `STOCK_DATA` vide à l'ouverture
  - Ajout `_ensureStockLoaded()` indépendant du DOM (`loadStockHistorique` avait une garde `!tbody`)
  - `renderRapports()` devient async, attend `Promise.all([saisies, stock])`
  - `_refreshStocksView()` réinitialise `_stockFromSheets` pour forcer rechargement

- Modal "Mon profil" : clic sur les initiales (sidebar) ouvre le modal
  - Lecture seule : nom, identifiant, rôle, zone
  - Modifiable : téléphone (sans vérification pwd) et mot de passe (avec vérification ancien pwd)
  - Endpoint Apps Script `changeMyProfile` : gère les deux cas séparément
  - Colonne Telephone créée automatiquement dans Utilisateurs si absente

- Fix critique Best Seller détail agents : toutes les valeurs à 0
  - Cause : `_filterWeekOffset` utilisait `_parseFrDate` (DD/MM/YYYY uniquement)
  - Apps Script renvoie des dates ISO (YYYY-MM-DD) → `_parseFrDate` retournait null → filtre vide
  - Correction : `_parseSaisieDate` (multi-format) + paramètre `refBase` optionnel
  - `renderBestsellerSupDetail` : utilise `bsSupRefDate` au lieu de `today`, gère tous les modes de période
  - Comparaison `dfaId` désormais insensible à la casse
  - Ce bug touchait aussi les tableaux hebdomadaires et calculs S-1/S-2 partout dans l'app

---

## 2026-06-20 — Session 2

### InsightPanel — Tabs Vue d'ensemble + audit intégrité données

- Tabs Aujourd'hui / Semaine / Mois câblés sur les 4 KPI cards du dashboard (labels et deltas dynamiques selon la période)
- `setDashPeriod(period, el)` : bascule la période active et relance `renderDashKPIs()`
- `renderDashKPIs()` rendu period-aware : filtre filCurr / filPrev, delta vs hier/S-1/M-1, label dynamique
- Audit intégrité post-modifications : bug critique découvert dans `_filterPeriod`
- Fix `_filterPeriod` : remplace `_parseFrDate` (DD/MM/YYYY uniquement) par `_parseSaisieDate` (tous formats). Les vues Semaine et Mois affichaient 0 sur toute la base car Apps Script peut renvoyer des dates ISO ou Date.toString()
- Ce bug touchait silencieusement tous les dashboards utilisant `_filterPeriod` (rapports, perf superviseur, bestseller, agent)

---

## 2026-06-20

### InsightPanel — Fix vue superviseur + audit complet + corrections rapports

- Fix critique : vue superviseur toujours vide pour BAH Ghislain et autres superviseurs. Cause racine : USERS démarrait avec USERS_SEED (6 comptes), `_ensureUsersLoaded()` voyait `USERS.length > 0` et ne fetchait jamais Sheets. Les superviseurs, absents du seed, étaient introuvables → "Sélectionnez un superviseur" permanent.
- Fix : ajout du flag `_usersFromSheets` (true uniquement après réponse Sheets ou cache valide)
- `_initSupSelector()` rendue async, attend `_ensureUsersLoaded()` avant de rendre la vue
- `_ensureUsersLoaded()` : après chargement, relance `_renderSupNavItems()` et `_renderSupView()`
- Audit complet de tous les dashboards (agent, superviseur, RA, rapports, stocks, KPIs)
- Fix rapports Superviseur et RA : `s.agentId` → `s.dfaId` (GA et MoMo toujours à 0)
- Fix taux MoMo dans les 3 fonctions de rapport : `'momo'` → `'momoUser'`
- Fix `renderDashKPIs` : comparaison de date par string → `_parseSaisieDate()` + `todayISO` (KPIs du jour affichaient 0 si format Sheets différent)
- Fix CSS : ajout de `--text`, `--text-muted`, `--border`, `--card-bg`, `--bg`, `--success`, `--danger` dans `:root` (textes invisibles dans les cartes KPI des rapports)
- Les DFA ont commencé à saisir des données réelles dans Google Sheets

---

## 2026-06-19 — Session 2

### InsightPanel — Nettoyage données fictives + automatisation complète

- Correction labels formulaire perf superviseur : "DFA" → "Total équipe / Ma zone"
- Bouton Actualiser Stocks : `_refreshStocksView()` recharge tout (saisies + gestionnaire + SIM vendues)
- Audit automatisation : bug `s.agentId` → `s.dfaId` dans `_buildRapportDFA` corrigé (rapports toujours à 0)
- `_onSaisiesLoaded()` complété : `renderRapports()` et `_initPerfSupSection()` ajoutés
- Compte admin ajouté : `Admin.zephir` / `Admin@2026`
- Suppression de toutes les données fictives (550+ lignes supprimées) :
  - 50 agents DFA fictifs retirés de `USERS_SEED` (comptes structurels conservés)
  - `SUP_PERF_DATA`, `ZONE_PERF_DATA`, `ZONE_PERF`, `BESTSELLER_MOCK`, `AGENT_PERF_DATA`, `REALISE_DATA`, `agentPerfData` vidés
  - Table "Top Agents" et carte "Alertes" du dashboard : statique → dynamique depuis Sheets
  - `MONTHLY_TARGETS` corrigé : 45 000 fictif → 18 660 (cible MTN officielle juin 2026)
  - 4 KPI cards dashboard : valeurs hardcodées → calculées depuis `SAISIES_DATA`
  - Carte évaluation Vue Agent : données fictives → `_renderAgentEvalCard()` dynamique
- Application prête pour insertion de données réelles dans Google Sheets

---

## 2026-06-19

### InsightPanel — Rôle Admin, formulaire perf superviseur, bug page blanche corrigé

- Nouveau rôle `admin` : accès complet à toutes les fonctions de modification (équivalent RA hors données terrain)
- Restriction modifications : seuls `ra` et `admin` peuvent créer/modifier comptes, approuver/rejeter demandes, réinitialiser mots de passe
- `dg`, `dga`, `dcc`, `dc` passent en lecture seule (dashboards visibles, pas de modifications)
- Modal réinitialisation mot de passe : bouton clé (ra/admin), nouveau mot de passe, endpoint `resetPassword` dans Apps Script
- Formulaire "Ma performance du jour" dans Saisie du jour (rôle superviseur) : date, performance déclarée, performance globale auto (cumul DFA du mois), historique avec écart DFA
- Sheet `PerfSup` créée automatiquement dans Google Sheets si absente
- Endpoints Apps Script ajoutés : `resetPassword`, `savePerfSup`, `getPerfSup`
- Bug critique corrigé : SyntaxError dans `renderUsersTable` (template literal imbriqué avec `'\\'')`) bloquait tout le script et causait une page blanche au rafraîchissement
- Filet de sécurité ajouté : timeout 4s + `window.addEventListener('error')` retirent `restoring-session` si le script principal échoue

---

## 2026-06-09 / 2026-06-10

### InsightPanel — Vue Superviseur complète, filtres DFA, menus RA

- Correction bug critique : USERS devenait undefined si Apps Script ne renvoyait pas de champ "users" (ajout vérification Array.isArray)
- Nouveau endpoint getSaisies dans Apps Script pour alimenter les dashboards depuis Google Sheets
- Vue Superviseur : sous-menus latéraux par superviseur (Alphonse DJOKPE, Missimahou HONKOU, Ghislain BAH, Loukmane YESSOUFOU, François DANSOU)
- Vue Superviseur : sélecteur de période groupé (Aujourd'hui / Semaine / Mois / Année + bouton Période pour plage personnalisée)
- Vue d'ensemble : tableau "Suivi hebdomadaire — Performance par superviseur" (W-2 / W-1 / W / Target / Gap WoW / Gap Target) avec ligne Total/Moyenne
- Format de date "Semaine X du mois de juin 2026" appliqué dans tout le dashboard
- Suppression de la section "Superviseurs — Performance par zone" dans Vue d'ensemble
- Chaque sous-menu superviseur : tableau hebdomadaire DFA + tableau Suivi performance DFA avec lignes Total/Moyenne
- Limitation à 10 DFAs max par tableau dans les sous-menus superviseur
- Filtre déroulant "DFAs" au-dessus des 3 tableaux du sous-menu superviseur (filtrage simultané, reset automatique au changement de superviseur)
- Compte RA : ajout menus "Mon évaluation de performance" et "Best Seller" dans la navigation
- Évaluation RA : métriques d'équipe (atteinte objectifs, agents actifs, ratio MoMo, zones actives) au lieu des métriques DFA individuelles
- Best Seller : pour le RA, "Mon équipe" affiche toute l'équipe toutes zones confondues

---

## 2026-06-09

### InsightPanel — Dashboard RA complet + améliorations techniques

- Dashboard RA enrichi : compteurs équipe (DFA total/actifs, superviseurs actifs)
- Suivi performance superviseurs par zone avec tabs Jour/Semaine/Mois (taux évolutif, moy./jour)
- Objectifs périodiques (journalier/hebdo/mensuel) avec sélecteur de date
- Cibles officielles juin intégrées : 18 660 Gross Add (18 117 × 1,03), 16 794 New MoMo (90 % du Gross Add)
- Responsive mobile : sidebar hamburger overlay, grilles empilées, tables scrollables
- Toggle afficher/masquer mot de passe sur la page de connexion
- Motif africain jaune/noir en arrière-plan de la page de connexion
- Hook Git pre-commit automatisant la sync InsightPanel.html vers index.html (fix Netlify)
- Format identifiant capitalisé (Ibrahim.Lawogni) + normalisation à la connexion

---

## 2026-06-05

### Installation initiale du Jarvis

- Workspace personnalisé pour Ibrahim LAWOGNI, basé à Porto-Novo au Bénin
- Profil principal : Responsable Acquisition (RA) en prestation de service chez ZEPHIR GROUP
- Activité : Pilotage de l'acquisition GSM & MoMo, supervision des équipes terrain, suivi des KPIs et conformité opérationnelle sur 4 communes
- Objectifs court terme identifiés : renforcement des stocks, amélioration du reporting, coaching des agents, conformité des bases, développement d'outils digitaux et automatisation
- Vision long terme : poste de Responsable Régional ou Directeur des Opérations, transformation digitale, projet entrepreneurial personnel
- Projets actifs au démarrage : automatisation des tâches, site web, application mobile, formation en analyse de données
- Domaine d'aide prioritaire : automatisation et outils pratiques (tableaux de bord, checklists, applications)
- Style de communication choisi : explications détaillées et pédagogiques
