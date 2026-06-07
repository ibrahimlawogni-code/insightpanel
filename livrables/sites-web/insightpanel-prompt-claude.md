# InsightPanel — Prompt Claude Design

> Prompt à coller dans Claude.ai (mode Artifacts) pour générer le mockup HTML de la plateforme InsightPanel.

---

Crée un mockup HTML/CSS/JS complet et professionnel d'une plateforme web de gestion des opérations terrain pour ZEPHIR GROUP, distributeur agréé MTN Bénin.

**Nom de la plateforme : InsightPanel**

---

**Contexte métier**
Plateforme interne destinée à optimiser la gestion des opérations terrain et le suivi des performances commerciales en temps réel. Elle centralise la collecte de données brutes et l'analyse stratégique pour les équipes terrain et l'administration de ZEPHIR GROUP.

---

**Utilisateurs et rôles (accès hiérarchisé)**
- **Agent terrain** : saisie des ventes GSM/MoMo, consultation de ses propres KPIs
- **Superviseur terrain** : suivi de son équipe, alertes terrain, rapports journaliers
- **Chef d'agence** : vue agence complète, gestion des stocks, validation des rapports
- **Directeur Commercial (DC)** : vue multi-agences, tableaux de bord stratégiques, exports
- **Administration** : gestion des comptes, droits d'accès, paramétrage

---

**Pages à afficher dans le mockup**

1. **Page de connexion** avec sélection du rôle, logo InsightPanel, mention ZEPHIR GROUP, couleurs MTN (jaune #FFC300 et noir #1A1A1A)
2. **Dashboard principal (vue DC)** avec :
   - KPIs clés en cards : Ventes GSM du jour, Activations MoMo, Taux de conformité, Stock disponible
   - Graphique d'évolution des ventes sur 7 jours (bar chart)
   - Carte des zones (Avrankou, Missérété, Dangbo, Adjohoun, Bonou) avec indicateurs de performance par couleur (vert/orange/rouge)
   - Tableau des top agents de la semaine
   - Alertes et notifications en temps réel
3. **Vue Superviseur** : liste de son équipe avec KPIs individuels, bouton "Envoyer rapport journalier"
4. **Vue Agent terrain** : formulaire de saisie rapide (ventes du jour, incidents, stock), mes statistiques personnelles

---

**Design attendu**
- Interface moderne, propre, professionnelle
- Palette : jaune MTN (#FFC300), noir (#1A1A1A), blanc (#FFFFFF), gris clair (#F5F5F5)
- Sidebar de navigation avec icônes
- Responsive (desktop en priorité)
- Utilise Tailwind CSS ou du CSS moderne inline
- Données fictives réalistes (noms béninois, chiffres cohérents)
- Textes en français

Génère le tout dans un seul fichier HTML autonome, navigable, avec plusieurs vues accessibles via la sidebar ou des onglets.
