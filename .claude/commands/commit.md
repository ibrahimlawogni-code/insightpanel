# /commit

> Commande pour sauvegarder l'état du workspace avec Git.

---

## Mission

Quand je lance `/commit`, exécute la séquence suivante :

### Étape 1 : Vérifier l'état de Git

Lance `git status` pour voir l'état du dépôt.

- Si Git n'est pas initialisé, lance `git init` silencieusement avant de continuer.
- Si rien n'a changé (working tree clean), dis-le clairement et arrête-toi :

```
Rien à sauvegarder — le workspace est déjà à jour.
```

### Étape 2 : Présenter ce qui va être sauvegardé

Affiche un résumé lisible des fichiers modifiés/ajoutés/supprimés, groupés par catégorie :

```
Voici ce qui sera sauvegardé :

Nouveaux fichiers :
- [liste]

Fichiers modifiés :
- [liste]

Fichiers supprimés :
- [liste]

Les fichiers secrets (.env) sont exclus automatiquement.
```

### Étape 3 : Proposer un message de commit

Génère un message de commit clair et court (en français), en une ligne, qui résume ce qui a changé. Format :

```
Message proposé : "[message]"

Tu valides ce message, ou tu veux le modifier ?
```

### Étape 4 : Exécuter le commit

Une fois le message validé (ou modifié par moi) :

1. Stage tous les fichiers trackables : `git add .`
   (Le .gitignore exclut automatiquement .env et les secrets)
2. Crée le commit : `git commit -m "[message validé]"`
3. Confirme :

```
Sauvegardé. Commit créé :
  "[message]"
  [X] fichier(s) — [date et heure]
```

---

## Règles importantes

- Ne jamais commiter `.env` ni aucun fichier de secrets
- Ne jamais utiliser `--no-verify` ni forcer un commit
- Si Git n't est pas configuré (pas de user.name / user.email), configurer localement avec les infos d'Ibrahim avant de commiter :
  - `git config user.name "Ibrahim LAWOGNI"`
  - `git config user.email "ibrahim.lawogni@gmail.com"`
- Pas de tirets longs (em dashes) dans les messages
- Communication en français systématique
- Ne pas pousser vers un remote sans que je le demande explicitement
