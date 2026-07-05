# Workspace History

> Journal chronologique de toutes les sessions et décisions importantes.
> Le plus récent en haut. Mis à jour automatiquement par Claude.
>
> **Comment ça marche :** Quand je lance la commande `/update` après une session importante, ou quand je raconte un changement significatif, Claude ajoute une entrée ici automatiquement. Je n'ai pas à écrire ce fichier manuellement.

---

## 2026-07-03 → 2026-07-06

### TeamVallee — Extension massive : dysfonctionnements enrichis, stocks/SWAP, comptes utilisateurs, courriers officiels, rapports, logo

Session la plus dense à ce jour sur TeamVallee, plusieurs jours de travail continu. Résumé par domaine.

**Dysfonctionnements**
- "Nature" passe d'un champ texte libre à un menu déroulant : MPOS, ANIP, MPOS & ANIP, PLUIE, MOMO, puis USSD ajouté ensuite
- Impact calculé automatiquement (fini le choix manuel Faible/Moyen/Élevé/Critique) : taux horaire de référence = moyenne mobile des 7 derniers jours "propres" (hors jours déjà marqués par un dysfonctionnement) pour la zone, divisé par l'amplitude de travail (12h, 8h-20h) ; impact estimé = taux × durée du dysfonctionnement ; badge de sévérité dérivé automatiquement de seuils sur ce volume
- Mini-dashboard en haut de la vue : "Durée totale" et "Impact total" (cumul des SIMs estimées perdues), avec sélecteur de période Jour/Semaine/Mois + navigation par date pour consulter n'importe quelle période passée

**Stocks SIM / Enlèvements globaux / SWAP**
- Nouvelle notion "Enlèvements globaux" (RA/admin) : plages de SIM réellement retirées chez MTN, source de vérité
- Le formulaire "Enregistrer une réception" vérifie automatiquement si la plage saisie est incluse dans un enlèvement global existant (badge Incluse / Hors plage), et le sélecteur "Superviseur concerné" a été supprimé (chaque saisie s'attribue directement à l'utilisateur connecté, comme SWAP)
- Ajout du type "SWAP" aux sélecteurs Type (Stock SIM et Enlèvements globaux) ; "Autres" retiré des deux ; "P100" retiré puis restauré uniquement pour RA/admin et superviseurs (Agence/CARE restent limités à SWAP)
- Nouveau menu SWAP (Date, N° SIM 11 chiffres, N° SWAPER 10 chiffres), devenu saisie globale sans sélection de destinataire. Historique filtré par rôle (RA/admin voient tout, les autres seulement les leurs). Nouveau tableau "Cumul SWAP par agent" (RA/admin) avec sélecteur de date
- "Stock Restant" distingué par compte (Agence/CARE ne voient que leur propre allocation) vs stock global restant (visible RA/admin uniquement, sur la page SWAP) — chaque compte peut désormais saisir son propre enlèvement SWAP, auto-rattaché
- Historique des enlèvements globaux également filtré par rôle

**KPI NEW ADD réel**
- Nouvelle carte Paramètres (RA/admin) pour saisir mensuellement le chiffre officiel validé (ex. MTN), comparé au déclaratif (somme des saisies) avec écart en valeur et %, alerte si >15%
- Bug corrigé : Google Sheets convertissait la colonne "Periode" en date, cassant l'affichage et créant des doublons — colonne forcée en texte brut + reconversion à la lecture

**Comptes utilisateurs**
- Nouvelle carte Paramètres "Gestion des utilisateurs" (RA/admin) : création de comptes Superviseur (avec zone), Agence ou Service CARE (nom libre), identifiant/mot de passe générés et affichés une seule fois
- Système d'authentification `loginVallee` en 3ᵉ recours (après InsightPanel puis le tableau codé en dur), qui ne renvoie jamais la liste des mots de passe — aucun compte existant n'a été touché/migré, décision volontaire pour garder un filet de sécurité hors-ligne
- VALLEE_SUPS devient dynamique : un superviseur créé ainsi apparaît automatiquement dans tous les sélecteurs/tableaux/pondérations DFA
- Nouveaux rôles "agence" et "care" : accès restreint à Dashboard + Stocks SIM + SWAP (Saisie du jour, Dysfonctionnements, Paramètres masqués). Dashboard dédié entièrement différent : SWAP Effectués (période) et Stock Restant personnel, sans aucune donnée GA/MoMo/équipe

**Courriers (ex-"Demandes d'explication")**
- Menu devenu générique "Courriers" avec sélecteur de type : Demande d'explication, Avertissement, Notification de sanction — chacun son propre gabarit de texte formel, sa propre référence (DEM-x / AVT-x / NOT-x), et champs spécifiques (Décision + date d'effet pour Notification)
- Destinataire : utilisateur du système ou contact externe ; lien optionnel vers un événement existant (dysfonctionnement, réception hors plage, écart KPI réel, ou courrier précédent) qui pré-remplit le constat
- Champ CC (copie) avec validation basique, plusieurs adresses séparées par virgules
- Envoi par email directement depuis le serveur (GmailApp.sendEmail) plutôt que par lien mailto: — le mailto échouait silencieusement via le gestionnaire Gmail du navigateur pour des textes trop longs
- Archivage automatique des réponses : `checkDemandesReponses()` scrute Gmail par référence, nécessite un déclencheur temporel configuré manuellement dans l'éditeur Apps Script (Déclencheurs > toutes les 15-30 min)
- Correcteur orthographique du navigateur activé sur les champs texte (Motif, Contexte, Message, Décision)

**Rapports**
- Nouveau menu Rapport (période Jour/Semaine/Mois, aperçu texte, envoi WhatsApp/Email) avec contenu adapté par rôle : Superviseur (GA/MoMo zone, DFA, stock, dysfonctionnements), RA/Admin (équipe complète, tableau par superviseur, KPI réel, alertes), DG/DGA/DC/DCC (version condensée), Agence/CARE (SWAP + stock personnel)
- Emojis plutôt que FontAwesome pour les boutons d'action, cohérent avec le fix déjà appliqué sur InsightPanel pour le réseau lent

**Dashboard**
- Comparatif WoW (semaine vs semaine précédente) intégré à la carte Hebdomadaire d'Objectifs, format "↑ +23% vs semaine dernière (W-1=2847)"

**Identité visuelle**
- Logo "Signal en Hausse" (quatre points de collecte reliés par une ligne montante, symbolisant données terrain → analyse) intégré en SVG inline : favicon, écran de connexion, barre latérale — pas de fichier image externe

**Incidents de déploiement rencontrés (résolus)**
- Plusieurs lags de déploiement GitHub Pages (build en attente, jusqu'à 45+ min) et un échec pur de l'étape "Deploy" malgré un build réussi — résolus à chaque fois par un commit vide pour relancer le pipeline
- Plusieurs oublis de redéploiement Apps Script après modification du fichier .gs — à surveiller systématiquement après toute modification du backend



### TeamVallee — Objectifs mensuels, DFA weighting, restauration vue, UX dysfonctionnements

**Paramètres — refonte complète des objectifs mensuels**
- Remplacement du formulaire mono-cible (GA + MoMo) par un tableau de 13 mois (mois actuel + 12 mois passés)
- Chaque mois a ses propres cibles GA et MoMo indépendantes, persistées dans `localStorage (tv_monthly_targets)`
- Calcul automatique MoMo User = GA × 90% à la saisie (champ MoMo reste modifiable pour override manuel)
- Valeur par défaut utilisée comme placeholder si un mois n'est pas renseigné (fallback `VALLEE_TEAM_TARGET`)
- Carte "Répartition DFA Actifs" : affiche les cibles individuelles de chaque superviseur pour le mois en cours, proportionnelles à leurs DFA Actifs. Si aucune donnée DFA, répartition égale entre les 5
- Suppression de `_updateParamHints()` (ancienne répartition égale ÷5 obsolète)

**Dashboard — cibles proportionnelles au DFA Actifs**
- `periodTarget(metric)` : somme les cibles réelles mois par mois pour les modes trimestre et année (au lieu d'une simple multiplication)
- `supPropTarget(teamPeriodTarget, supId)` : calcule la cible individuelle d'un superviseur en fonction de sa part de DFA Actifs du mois de référence
- Snapshot DFA calculé séparément sur les données du mois de référence (pas du filtre actif), pour des proportions cohérentes quel que soit le mode de période affiché
- Tableau performance RA : chaque superviseur affiche sa cible DFA-pondérée, plus la division égale
- Indicateur `· DFA` ou `· égal` dans le tfoot pour signaler le mode de calcul utilisé

**Fix — superviseurs voyaient zéro sur le dashboard**
- Cause racine : superviseur enregistré dans InsightPanel GAS avec ID court (`Dbah`) ne correspondait pas à `USERS_SEED` (`Ghislain.Bah`)
- Fix : `_findSeed(gasId)` avec matching en deux niveaux — correspondance exacte (insensible casse), puis fallback par suffixe du nom de famille (`'dbah'.endsWith('bah')` → match)
- `startSession()` normalise systématiquement l'ID utilisateur via `_findSeed()` pour éviter le décalage
- `loadSaisies()` : logs console pour diagnostiquer le filtrage (`myId`, `role`, nombre d'enregistrements pour l'utilisateur)

**Fix — restauration de la vue active après refresh**
- `showView()` sauvegarde la vue courante dans `sessionStorage (tv_last_view)` à chaque navigation
- `startSession()` lit `tv_last_view` au chargement et restaure la vue correspondante au lieu de forcer le dashboard
- Guard : un superviseur ne peut pas restaurer la vue Paramètres (réservée RA)
- `doLogout()` efface `tv_last_view` pour repartir proprement à la prochaine connexion

**UX — dysfonctionnements**
- Ajout de l'option "Toutes les localités" en tête du sélecteur de localité (après "— Sélectionner —")
- Disponible uniquement pour le RA (superviseurs ont leur localité verrouillée automatiquement)

**Technique**
- Gestion des erreurs améliorée dans `loadSaisies()`, `loadStock()`, `loadDysf()` : affichage toast au lieu de `.catch(() => {})` silencieux
- Hook Git pre-commit configuré pour synchroniser `TeamVallee.html` → `team-vallee.html` (racine) à chaque commit

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
