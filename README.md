# Irregular App

Petite application Vue 3 + Vite pour réviser les verbes irréguliers anglais à partir d’un CSV local, sans backend.

## Fonctionnalités

- Trois modes d’exercice :
  - Français → Anglais
  - Anglais → Complet
  - Aléatoire → Complet
- Un verbe à la fois, dans un ordre mélangé
- Validation au clavier avec `Entrée`
- Raccourcis `Espace` ou `?` pour afficher ou masquer la réponse
- Feedback visuel immédiat sur les champs justes et faux
- Progression sauvegardée dans `localStorage`
- Sélection pondérée pour éviter de revoir trop vite les verbes déjà connus
- Compatible GitHub Pages
- Mise en cache locale pour continuer à réviser hors ligne après le premier chargement

## Installation

```bash
npm install
```

## Lancement en développement

```bash
npm run dev
```

## Build de production

```bash
npm run build
```

Le build est généré dans `dist/`.

## Preview locale du build

```bash
npm run preview
```

## Déploiement sur GitHub Pages

Le dépôt contient déjà un workflow GitHub Actions dans `.github/workflows/deploy.yml`.

### Étapes

1. Push le projet sur GitHub.
2. Vérifie que la branche de déploiement est bien `main`.
3. Dans `Settings > Pages`, choisis **GitHub Actions** comme source de déploiement.
4. À chaque push sur `main`, GitHub construit et déploie l’application.

### Configuration `base` Vite

La config de `vite.config.js` utilise :

- `/` en développement
- le nom du dépôt GitHub en production via `GITHUB_REPOSITORY`
- sinon `/irregular-app/` par défaut

Si ton dépôt n’a pas ce nom et que tu fais un build local de production, tu peux forcer la base :

```bash
VITE_BASE_PATH=/nom-du-repo/ npm run build
```

## Fichier CSV

Place le fichier dans :

```text
public/irregular-verbs.csv
```

Format attendu :

```text
Infinitif;Preterit;ParticipePasse;Traduction
awake;awoke;awoken;(se) réveiller
be;was/were;been;être
```

Contraintes :

- séparateur `;`
- en-tête attendu : `Infinitif;Preterit;ParticipePasse;Traduction`
- la colonne `Traduction` peut contenir plusieurs propositions séparées par `/`
- pour les formes anglaises contenant `/`, l’app accepte une variante seule ou la chaîne complète

## Structure

```text
src/
  main.js
  App.vue
  components/
    ModeSelector.vue
    QuizCard.vue
    ProgressPanel.vue
  composables/
    useCsvVerbs.js
    useProgress.js
    useQuiz.js
  utils/
    normalize.js
public/
  irregular-verbs.csv
  sw.js
```

## Personnalisation

- Modifie `public/irregular-verbs.csv` pour changer la liste des verbes.
- Si tu veux repartir de zéro, utilise le bouton `Reset progression` dans l’interface.
- La progression est stockée uniquement côté navigateur.
