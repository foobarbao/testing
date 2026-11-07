# La retenue

Application web pour aider les enfants de 6 à 10 ans à comprendre la retenue dans l'addition. Chaque calcul se regarde étape par étape, avec six visuels animés qui montrent le même moment clé : **10 unités deviennent 1 dizaine** (et 10 dizaines deviennent 1 centaine).

## Lancer l'appli

```bash
npm install
npm run dev
```

Vite affiche deux adresses :

```
➜  Local:   http://localhost:5173/
➜  Network: http://192.168.x.x:5173/
```

Pour tester sur un téléphone ou une tablette, connecte-le au même Wi-Fi que l'ordinateur et ouvre l'adresse **Network**.

Autres commandes :

| Commande | Rôle |
| --- | --- |
| `npm run build` | Version de production dans `dist/` (avec le mode hors ligne) |
| `npm run preview` | Sert `dist/` sur le réseau local, pour essayer l'installation sur l'écran d'accueil |
| `npm test` | Tests du moteur d'exercices |
| `npm run typecheck` | Vérification TypeScript |

Le mode hors ligne et l'installation (PWA) ne sont actifs que sur la version construite (`npm run build` puis `npm run preview`). Sur téléphone, l'installation demande une adresse en HTTPS, donc un hébergement (Netlify, Vercel, GitHub Pages…).

## Parcours

1. **Accueil** : addition (la soustraction est annoncée « bientôt »), avec les étoiles gagnées.
2. **Niveaux** : 7 + 5, 38 + 6, 47 + 28, puis avec des centaines (286 + 147).
3. **Visuels** : un ou deux visuels, modifiables à tout moment pendant l'exercice.
4. **Exercice** : l'enfant répond au pavé numérique ou appuie sur « Montre-moi ».
5. **Mode guidé** : l'animation s'arrête à chaque étape, avec Précédent, Suivant et Rejouer. La grenouille peut lire chaque phrase avec la voix française du navigateur.
6. **Retour** : étoiles et fanfare si c'est juste, message bienveillant sinon. Une étoile par bonne réponse, cinq par niveau, gardées dans le navigateur.

Lien direct vers un calcul précis : `/?niveau=3&calcul=47+28`.

## Les visuels

| Visuel | Ce qui se passe au moment de la retenue |
| --- | --- |
| Bâtonnets | Les 10 bâtonnets se serrent, un élastique orange les attache, ils deviennent un fagot bleu qui glisse chez les dizaines. |
| Addition posée | Le chiffre des unités s'écrit en bas et le 1 s'envole en haut de la colonne suivante. |
| Règle | La grenouille fait des bonds de 1. En franchissant une barre rouge, « +1 dizaine ! » s'affiche. Ensuite elle fait des bonds de 10, puis de 100. |
| Roues | Compteur à engrenages : quand les unités passent de 9 à 0, la dent orange fait tourner la roue des dizaines d'un cran, avec un « clic ». |
| Boulier | Les 10 perles du bas sont entourées, disparaissent, et une perle apparaît sur la tige de gauche. |
| Monnaie | 10 pièces de 1 € vont à la banque et reviennent en un billet de 10 € (puis 10 billets de 10 € deviennent un billet de 100 €). |

Code couleur partout : unités en vert, dizaines en bleu, centaines en violet, retenue en orange.

## Organisation du code

```
src/
  engine/      calculs par niveau et découpage d'une addition en étapes
  visuals/     un composant par visuel ; tous reçoivent (lesson, step, dur)
  screens/     accueil, niveaux, choix des visuels, exercice
  lib/         réglages et étoiles (localStorage), sons synthétisés, voix
```

Le moteur (`src/engine/steps.ts`) transforme un calcul en une liste d'étapes : poser, additionner une colonne, regrouper 10, faire monter la retenue, écrire le chiffre. Chaque étape décrit l'état de toutes les colonnes. Un visuel n'a qu'à dessiner cet état ; deux visuels affichés ensemble restent donc synchronisés sans rien de plus.

### Ajouter la soustraction

Le type `Op` prévoit déjà `'sub'`. Il reste à écrire `buildSubtraction` dans `steps.ts` avec une étape « emprunt » (1 dizaine qu'on casse en 10 unités), puis à jouer les mêmes animations à l'envers dans chaque visuel : le fagot se défait, le billet est changé en pièces, la roue recule de 0 à 9.
