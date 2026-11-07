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
| `npm run build:artifact` | Une seule page HTML autonome (`dist-artifact/la-retenue.html`), pour la publier sur claude.ai |

Le mode hors ligne et l'installation (PWA) ne sont actifs que sur la version construite (`npm run build` puis `npm run preview`). Sur téléphone, l'installation demande une adresse en HTTPS, donc un hébergement (Netlify, Vercel, GitHub Pages…).

## Parcours

1. **Accueil** : addition, « Mon calcul », « Construis le nombre » (la soustraction est annoncée « bientôt »).
2. **Niveaux** : 7 + 5, 38 + 6, 47 + 28, puis avec des centaines (286 + 147).
3. **Visuel** : un seul visuel à l'écran à la fois ; des boutons-icônes permettent d'en changer à tout moment.
4. **Exercice** : l'enfant répond de quatre façons, ou appuie sur « Montre-moi » :
   - **Clavier** : il tape le résultat ;
   - **Je pose** : il glisse (ou touche) des chiffres dans les cases de l'addition posée, retenue comprise ;
   - **Je manipule** : il ajoute le second nombre en faisant glisser des fagots, des billets ou des perles depuis la réserve, puis regroupe 10 éléments (ou fait avancer la grenouille, ou tape sur le compteur) ;
   - **Je choisis** : trois réponses, dont des erreurs courantes.
   Une erreur typique reçoit un indice adapté : retenue oubliée (65 au lieu de 75), somme écrite en entier (615).
5. **Montre-moi** : c'est l'enfant qui fait chaque geste. Il touche la colonne qui clignote pour réunir les unités, touche les 10 éléments pour en faire un paquet, puis le fait glisser vers la colonne de gauche. Sur la règle, chaque appui fait un bond ; sur le compteur, chaque appui fait tourner le chiffre d'un cran. La voix explique, l'écran n'affiche que 3 ou 4 mots. Si l'enfant se trompe ou hésite (7 secondes), une main montre le geste ; le bouton « Aide » l'affiche aussi.
6. **Retour** : étoiles et fanfare si c'est juste, message bienveillant sinon. Une étoile par bonne réponse, cinq par niveau, gardées dans le navigateur.

**Mon calcul** : on recopie une addition des devoirs (résultat jusqu'à 999) et on la travaille avec tous les visuels et toutes les façons de répondre.

**Fais 10 !** : le jeu des compléments à 10, en 10 manches avec points, série et étoiles (record gardé).
- **Boîte de 10** : « 7 + ? = 10 ». L'enfant choisit une bulle, ou remplit la boîte pour compter ; les jetons ajoutés sont orange, numérotés, et le total « +3 » s'affiche.
- **Grenouille** : même question sur une règle de 10 graduations ; chaque appui fait un bond numéroté et « +3 » suit la grenouille.
- **Amoureux de 10** : toucher deux bulles qui font 10 (3 plateaux de 4 paires).
- Niveau « 47 + ? = 50 » : compléments à la dizaine suivante (et paires qui font 100).
- **Concours** des amoureux : 8 paires (16 grosses bulles) par écran, chronométré. « 60 secondes » : un maximum de paires, un nouvel écran arrive quand le précédent est vidé. « Course » : trouver 10, 20 ou 40 paires le plus vite possible. « À deux » : on choisit l'adversaire par sa photo et 1, 2 ou 3 manches de 30 secondes chacun ; on se passe le téléphone entre les manches (« Au tour de Tom ! »), le total des paires désigne le gagnant, couronné à la fin (ou « Égalité ! »), avec « Revanche ». Compte à rebours 3-2-1 avec la photo du joueur, médailles (bronze, argent, or, diamant), couronne pour un record ou la première place, nouveaux trophées, podium avec les photos.

**Joueurs** : « Qui joue ? » depuis l'accueil (la photo du joueur s'affiche en haut). Quand un autre enfant prend la main, un grand écran « Passe le téléphone à Tom » s'affiche avec sa photo, la voix le dit, et il touche sa photo ou « C'est moi ! ». À la fin d'un concours, « Au tour de Léa ! » enchaîne directement sur le joueur suivant. Chaque profil a un prénom, une couleur et une photo prise en direct : la caméra s'affiche, compte à rebours 3-2-1, flash. Si la caméra en direct n'est pas disponible (par exemple dans la page claude.ai), le bouton ouvre l'appareil photo du téléphone. La page de profil montre les records, les trophées et les derniers concours. Profils, photos (192 × 192, environ 5 Ko) et scores restent dans le navigateur de l'appareil (`localStorage`, clé `retenue:profiles`) : rien n'est envoyé.

Les compléments à 10 sont aussi mis en avant dans les leçons : au moment du paquet de 10, la voix et l'addition posée disent « 7 + 3 = 10, reste 5 » et les 3 bâtonnets qui complètent la dizaine sont orange. Sur la règle, chaque bond est numéroté, ceux qui mènent à la dizaine sont orange, un « +k » suit la grenouille et « 47 + 3 = 50 » s'affiche en passant la dizaine. Le compteur et « Je manipule » affichent aussi « +k ».

**Construis le nombre** : un nombre s'affiche et l'enfant le représente avec un modèle (bâtonnets, monnaie, boulier, règle, compteur). Jusqu'à 20, il part d'un tas d'unités à ranger en dizaines. Il peut aussi taper son propre nombre. Pour regrouper, il fait glisser un élément vers la colonne de gauche ou appuie sur « Faire un fagot » ; pour casser une dizaine, il la fait glisser vers la droite.

**Voix** : activée par défaut. Elle lit le calcul, chaque étape du mode guidé, les consignes et les indices. Sur iPhone et iPad, elle démarre après le premier appui sur l'écran.

Lien direct vers un calcul précis : `/?niveau=3&calcul=47+28`.

## Les visuels

| Visuel | Ce qui se passe au moment de la retenue |
| --- | --- |
| Bâtonnets | Les 10 bâtonnets se serrent, un élastique orange les attache, ils deviennent un fagot bleu qui glisse chez les dizaines. |
| Addition posée | Le chiffre des unités s'écrit en bas et le 1 s'envole en haut de la colonne suivante. |
| Règle | L'enfant tape pour chaque bond de 1. Il peut faire glisser la règle avec le doigt, la rapprocher ou l'éloigner (loupes − et +, ou deux doigts), puis revenir à la grenouille ; dès qu'elle bondit, la règle la suit. En franchissant une barre rouge, « +1 dizaine ! » s'affiche. Ensuite il fait des bonds de 10, puis de 100. |
| Compteur | Gros chiffres : l'enfant tape sur le chiffre des unités ; quand il passe de 9 à 0, le chiffre des dizaines avance tout seul, avec un « clic ». |
| Boulier | Les 10 perles du bas sont entourées, disparaissent, et une perle apparaît sur la tige de gauche. |
| Monnaie | 10 pièces de 1 € vont à la banque et reviennent en un billet de 10 € (puis 10 billets de 10 € deviennent un billet de 100 €). |

Code couleur partout : unités en vert, dizaines en bleu, centaines en violet, retenue en orange.

## Organisation du code

```
src/
  engine/      calculs par niveau, découpage d'une addition en étapes, réponses au choix, compléments à 10
  visuals/     un composant par visuel ; tous reçoivent (lesson, step, dur)
  play/        ce que l'enfant manipule : plateau à regrouper, règle et compteur pilotés, « Je pose », « Je choisis »
  screens/     accueil, niveaux, choix du visuel, exercice, Mon calcul, Construis le nombre, Fais 10 !, concours, joueurs, profil
  ten/         boîte de 10 et règle de la grenouille du jeu « Fais 10 ! »
  lib/         réglages et étoiles, profils et scores des concours (localStorage), sons, voix, glisser-déposer
```

Le moteur (`src/engine/steps.ts`) transforme un calcul en une liste d'étapes : poser, additionner une colonne, regrouper 10, faire monter la retenue, écrire le chiffre. Chaque étape décrit l'état de toutes les colonnes. Un visuel n'a qu'à dessiner cet état ; on peut donc changer de visuel au milieu d'une explication sans perdre l'étape. Pendant « Montre-moi », chaque visuel reçoit le geste attendu (`gesture`) et appelle `onDone` quand l'enfant l'a fait.

### Ajouter la soustraction

Le type `Op` prévoit déjà `'sub'`. Il reste à écrire `buildSubtraction` dans `steps.ts` avec une étape « emprunt » (1 dizaine qu'on casse en 10 unités), puis à jouer les mêmes animations à l'envers dans chaque visuel : le fagot se défait, le billet est changé en pièces, la roue recule de 0 à 9.
