# CONTEXT.md

> Mon contexte personnel et professionnel pour mon Jarvis.
> Ce fichier est mis à jour au fil du temps par Claude.

---

## Qui je suis

- **Prénom :** Ibrahim LAWOGNI
- **Ville / Pays :** Porto-Novo, Bénin
- **Situation actuelle :** Prestataire de service chez ZEPHIR GROUP
- **Profil dominant :** Employé cadre / Prestataire opérationnel

### Parcours académique

- 2026 : Licence en Marketing et Communication, Institut Universitaire EDEXCEL
- 2012 : DTITT (Diplôme de Technicien en Installation Télécoms et TICs), ESTB / SUPTELECOMSBJ, Cotonou
- 2009 : Baccalauréat Série D, Collège Catholique Notre Dame de Lourdes, Porto-Novo
- 2003 : BEPC, CEG Dèrègbé, Sèmè-Podji
- 1998 : CEP, École Primaire Groupe II, Port-Gentil, Gabon

---

## Ce que je fais

### Activité principale

Piloter l'acquisition et la performance terrain, en assurant la disponibilité des ressources (SIM, MoMo, matériel), le suivi des ventes et des KPIs, ainsi que la coordination des équipes pour atteindre les objectifs fixés.

### Détails du poste

- **Poste :** Responsable Acquisition (RA)
- **Entreprise :** ZEPHIR GROUP (ex DUOS.COM), distributeur agréé MTN Bénin
- **Zone couverte :** Avrankou-Missérété, Dangbo, Adjohoun, Bonou
- **Statut :** Prestataire de service

### Missions principales

- Piloter l'acquisition GSM & MoMo et garantir la conformité opérationnelle
- Piloter le développement de MoMo et garantir la conformité des refilers
- Assurer la performance terrain par le suivi des KPIs et le reporting stratégique
- Développer et encadrer les équipes pour atteindre les objectifs commerciaux
- Optimiser les process logistiques et organisationnels pour plus d'efficacité
- Maintenir une communication institutionnelle claire et transparente avec les partenaires
- Automatiser les tâches pour gagner en temps, en nouvelles stratégies et en performance

---

## Mes objectifs

### Objectifs généraux

- Piloter l'acquisition GSM & MoMo et garantir la conformité opérationnelle
- Assurer la performance terrain par le suivi des KPIs et le reporting stratégique
- Développer et encadrer les équipes pour atteindre les objectifs commerciaux
- Optimiser les process logistiques et organisationnels pour plus d'efficacité
- Maintenir une communication institutionnelle claire et transparente avec les partenaires
- Automatiser toutes les tâches pour gagner en temps, en nouvelles stratégies et en performance

### Objectifs court terme (3 à 6 mois)

- Renforcer la disponibilité des stocks et du matériel pour éviter les ruptures
- Améliorer la qualité du reporting quotidien et hebdomadaire pour une meilleure prise de décision
- Mettre en place un système de coaching régulier pour les agents afin d'augmenter leurs performances
- Assurer la conformité des bases agents et réduire les irrégularités détectées lors des audits
- Développer des outils pratiques (checklists, tableaux de suivi) pour simplifier le travail terrain
- Développer des outils digitaux (site web et application mobile) pour simplifier le travail terrain
- Développer un assistant personnel permettant d'automatiser l'ensemble de ces objectifs

### Objectifs long terme (1 à 3 ans)

- Devenir un référent régional en acquisition et conformité opérationnelle
- Structurer et professionnaliser les process internes pour une efficacité durable
- Étendre l'expertise vers des projets stratégiques Corporate & Gouvernement
- Contribuer à la transformation digitale des opérations (SAP, automatisation du reporting)
- Évoluer vers un poste de Responsable Régional ou Directeur des Opérations
- Développer un projet personnel permettant de solutionner un problème dans un domaine quelconque
- Développer des compétences en ressources humaines et en stratégies d'entreprise

---

## Mes projets en cours

- **Automatisation des tâches :** Mettre en place des outils et scripts pour automatiser les tâches répétitives opérationnelles
- **InsightPanel (site web) :** Tableau de bord opérationnel MTN Bénin hébergé sur GitHub Pages (https://ibrahimlawogni-code.github.io/insightpanel/), repo : ibrahimlawogni-code/insightpanel. SPA en HTML/JS vanilla, backend Google Apps Script + Google Sheets. Fonctionnalités actives : authentification par rôle (agent, superviseur, ra, dc, dcc, dga, dg, admin), dashboard RA avec KPIs et objectifs périodiques, Vue d'ensemble avec suivi hebdomadaire par superviseur (W-2/W-1/W/Target/Gap), Vue Superviseur avec sous-menus par superviseur et filtres DFA, tableaux Suivi performance DFA et hebdomadaire DFA, menus "Mon évaluation de performance" et "Best Seller" adaptés au rôle RA, rapports hebdomadaires WhatsApp/email avec analyse stratégique intégrée (trajectoire, alertes stock, recommandations contextuelles), détection SIMs externes, export Excel des SIMs vendues (RA + Superviseur), correction de saisies DFA depuis la vue Superviseur (modal, filtres par DFA et date, accès par rôle), transferts inter-superviseurs, responsive mobile. Hook Git pre-commit synchronise automatiquement InsightPanel.html vers index.html (livrables/sites-web/ et racine) et bg-login.png à la racine.
- **TeamVallee (site web) :** SPA dédiée au suivi de performance de l'équipe Vallée, hébergée sur GitHub Pages (https://ibrahimlawogni-code.github.io/insightpanel/team-vallee.html), fichier source : livrables/sites-web/TeamVallee.html, backend GAS séparé (VALLEE_URL, apps-script-vallee.gs). Devenue une app très riche après une extension majeure (juillet 2026) :
  - **Rôles** : superviseur, RA/admin, dg/dga/dc/dcc (lecture), plus deux nouveaux rôles créés depuis l'app — Agence et Service CARE — avec accès restreint (Dashboard + Stocks SIM + SWAP uniquement) et un dashboard dédié à leur activité SWAP (pas de GA/MoMo)
  - **Comptes** : gestion des utilisateurs depuis Paramètres (RA/admin) — création de superviseurs/agences/services CARE avec identifiant/mot de passe générés, authentification `loginVallee` en secours indépendante des comptes codés en dur existants (jamais migrés, pour garder un filet de sécurité)
  - **Dashboard** : KPIs GA/MoMo/DFA Actifs/Stock, objectifs Jour/Hebdo/Mois avec cibles proportionnelles aux DFA Actifs, comparatif WoW (semaine vs semaine précédente) sur la carte Hebdomadaire, carte KPI NEW ADD réel vs déclaratif (écart avec alerte si >15%)
  - **Dysfonctionnements** : nature en menu déroulant (MPOS/ANIP/PLUIE/MOMO/USSD...), impact calculé automatiquement (taux horaire réel × durée, badge de sévérité auto), mini-dashboard Durée totale/Impact total avec sélecteur de période
  - **Stocks SIM** : Enlèvements globaux (RA/superviseurs/agences selon type P100 ou SWAP) comme source de vérité, réceptions vérifiées automatiquement contre ces enlèvements (badge Incluse/Hors plage), menu SWAP séparé avec stock restant par compte vs stock global (RA uniquement)
  - **Courriers** : Demande d'explication / Avertissement / Notification de sanction avec gabarits formels, référence unique par type, envoi direct par email serveur (GmailApp), archivage automatique des réponses via un déclencheur Apps Script qui scrute Gmail
  - **Rapports** : menu dédié avec contenu adapté par rôle, envoi WhatsApp/Email
  - **Identité** : logo "Signal en Hausse" (SVG inline, sans fichier externe) sur favicon/connexion/barre latérale
  - Hook Git pre-commit synchronise TeamVallee.html vers team-vallee.html à la racine
  - Point de vigilance récurrent : toute modification d'apps-script-vallee.gs nécessite un redéploiement manuel dans l'éditeur Apps Script (copier-coller + nouvelle version) ; les déploiements GitHub Pages peuvent aussi rester bloqués ou échouer silencieusement — un commit vide relance le pipeline
- **Application mobile :** Développement d'une application mobile pour simplifier le travail terrain
- **Formation en analyse de données :** Montée en compétences sur l'analyse de données pour améliorer le pilotage des KPIs

---

## Mes outils et préférences

### Outils que j'utilise au quotidien

- Google Drive
- Google Sheets
- Microsoft Excel
- WhatsApp (communication terrain et institutionnelle)

### Style de communication préféré

Explications détaillées et pédagogiques. Ibrahim préfère comprendre le pourquoi et le comment derrière chaque réponse ou recommandation.

### Domaine où j'ai besoin du plus d'aide

Automatisation et outils pratiques : tableaux de bord, checklists, applications mobiles et web pour simplifier et optimiser le travail terrain.

---

## Notes importantes

> Cette section se remplira au fil du temps avec les éléments de contexte qui émergent naturellement dans mes sessions avec Claude.

[VIDE INITIALEMENT - SE REMPLIRA AU FIL DES SESSIONS]
