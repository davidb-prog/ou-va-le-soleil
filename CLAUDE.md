# Où va le Soleil la nuit ? — contexte projet

Épisode 2 du « Petit labo d'astronomie » : site statique d'une page qui explique le lever et
le coucher du soleil à une enfant de 5 ans (le parent lit à voix haute). Français uniquement.
L'idée centrale : **le Soleil ne va nulle part** — il ne bouge pas, ne s'éteint pas ; c'est la
Terre qui tourne sur elle-même en 24 h, et la nuit, c'est quand notre maison lui tourne le dos.
Le cœur du site : **le même moment vu de deux endroits** — depuis le jardin (le soleil *semble*
traverser le ciel) et depuis l'espace (le Soleil est fixe, c'est nous qui tournons), les deux
vues synchronisées sur la même heure.

Les épisodes voisins font référence (identité visuelle, niveau d'exigence, conventions) :
épisode 1 <https://github.com/davidb-prog/eclipse-explorer> (« La mécanique des éclipses »),
épisode 3 <https://github.com/davidb-prog/la-terre-tourne> (« Quelle heure est-il là-bas ? »).

## Contraintes

- **Zéro dépendance, zéro build** : HTML + CSS + JS vanilla (modules ES), canvas 2D / SVG
  maison. Ça doit rester ouvrable avec `python3 -m http.server` et déployable tel quel sur
  GitHub Pages.
- **Compat mobiles anciens** : pas d'optional chaining `?.` ni de nullish `??` ; pas de
  lookbehind dans les regex ; repli `@supports` pour `aspect-ratio` ; `top/right/bottom/left`
  plutôt que `inset` ; préfixer `-webkit-backdrop-filter` et `-webkit-transform` ;
  `touch-action: none` sur les canvas interactifs (le choix de « la Lune » : le geste posé
  sur une vue appartient toujours au glisser du temps, un doigt un peu de travers ne doit
  jamais partir en défilement — les vues plafonnées en hauteur laissent de la page autour
  pour défiler) ; tester à 390 px de large.
- `js/model.js` est **pur** (aucun accès DOM) et doit le rester : il se teste avec
  `node test/model.test.mjs`. Toutes les constantes (heures de lever/coucher, couleurs de ciel,
  scénarios, géométrie ombre/soleil) vivent dedans — ne jamais les recopier ailleurs.
- Boucle rAF résiliente (`try/finally`), `prefers-reduced-motion` respecté (rien ne bouge tout
  seul), aria-labels sur tous les canvas.
- Thème sombre de la série (palette reprise de l'épisode 3 : `--bg #0b1020`, `--sun #ffcf5c`,
  `--rose #ff6b9d`, `--teal #46c2a5`…), tons ronds et joueurs.
- **Honnêteté pédagogique.** Convention d'équinoxe assumée (comme l'épisode 3) : lever 6 h,
  coucher 18 h, jour = nuit = 12 h ; heure « du jardin » = heure solaire (pas d'heure légale ni
  de fuseaux — c'est le sujet de l'épisode 3). Toute nouvelle simplification se documente dans
  la « note aux parents » (index.html) et dans « Ce que le site simplifie » (README).

## Vérités à préserver (couvertes par `test/model.test.mjs`)

- Le **Soleil est fixe** ; la Terre fait un tour complet en 24 h, **vers l'est** (sens
  trigonométrique vue du pôle Nord, même convention que l'épisode 3 : angle de la maison
  `(h − 12) / 24 · τ`, 0 = face au Soleil à midi).
- Hauteur du soleil = `sin(π · (h − 6) / 12)` — même formule que l'épisode 3 ; 0 au lever
  (6 h) et au coucher (18 h), 1 à midi, −1 à minuit.
- Le soleil se lève à l'**est**, culmine au **sud** à midi (hémisphère nord), se couche à
  l'**ouest** — dans la vue jardin (on regarde vers le sud) : est à gauche, ouest à droite.
- Les **ombres** : longues au matin et au soir, courtes à midi, toujours à l'**opposé** du
  soleil ; aucune ombre la nuit.
- Les **deux vues racontent la même chose** : la maison est du côté jour du globe exactement
  quand le soleil est au-dessus de l'horizon dans le jardin.
- À **minuit chez nous, il fait grand jour de l'autre côté** de la Terre (l'antipode a le
  soleil au zénith).
- Le ciel est **continu** sur 24 h : nuit étoilée → aube rose → grand jour → coucher orangé →
  nuit, sans saut de couleur (les jalons `SKY_*` et l'interpolation vivent dans `model.js`).

## Invariants d'interaction (voulus par l'utilisateur)

- Dans la vue espace, le **Soleil est fixe sur le côté** de l'écran — acquis dur de
  l'épisode 3 : un soleil qui bouge à l'écran embrouille tout. Rien ne doit jamais le déplacer.
- Les deux vues sont **synchronisées sur la même heure** en permanence (côte à côte sur grand
  écran, empilées sur mobile).
- Glisser horizontalement sur **l'une ou l'autre vue** fait tourner le temps (et donc la
  Terre) ; un petit tap sur une vue met en pause / relance ; espace = pause ; le grand curseur
  0–24 h reste le maître à bord.
- Les boutons-scénarios (lever, midi, coucher, minuit) font tourner le temps **en douceur et
  toujours vers l'avant** (le vrai sens de la Terre), puis racontent la micro-histoire
  jardin + espace ; sur mobile, l'appui ramène doucement les vues à l'écran.
- Le jeu « Fais tourner la Terre ! » (fin de page, replié derrière « Jouer ») : le site
  demande un moment, l'enfant le **fabrique** en faisant tourner le temps sur deux mini-vues
  répliquées (mêmes classes de vues, toujours synchronisées sur `sim.h` ; vue espace en mode
  `mini` sans étiquettes). Défis dans `model.js` (`DEFIS`, `defiReussi`, fenêtre ±45 min
  `DEFI_WINDOW_H`, tempo `DEFI_DWELL_MS` anti « gagné en passant ») — le dernier défi est la
  révélation à l'envers : grand jour chez les enfants de l'autre côté = minuit chez soi.
  Ouvrir le jeu met en pause (rien ne doit gagner tout seul) ; le conteur 🔇/🔊 des scénarios
  lit aussi consignes et bravos (à la première victoire seulement). **Le bravo ne ment
  jamais** : à la victoire, recalage doux de l'heure pile sur la cible (annulé par tout
  glisser — rien n'est jamais verrouillé) ; si l'enfant remporte la Terre hors de la fenêtre
  de sortie (`DEFI_EXIT_WINDOW_H`, ±1 h 15 — hystérésis anti-clignotement), le bravo se range
  et revient s'il re-fabrique le moment ; « Encore une ! » reste acquis.
- Rien ne recouvre jamais les canvas (la bulle « glisse ici » vit SOUS le jardin) ; en pause,
  aucun redessin (garde « même heure + mêmes tailles » dans la boucle rAF — batterie).

## Structure

- `index.html` — page unique : en-tête (titre « Où va le Soleil la nuit ? », kicker
  « Petit labo d'astronomie — épisode 2 », refrain « … parce que la Terre tourne ! »), les deux
  vues synchronisées, grand curseur 0–24 h, boutons-scénarios + histoire, boîte « Le Soleil ne
  va nulle part ! » (repliée derrière son titre sur mobile, comme l'épisode 3), jeu « Fais
  tourner la Terre ! » (deux mini-vues répliquées), pont vers l'épisode 3, note aux parents
  repliable
- `css/style.css` — thème sombre de la série ; bascule mobile ≤ 640 px (aucune incrustation ne
  recouvre les canvas à 390 px : tout descend sous le visuel)
- `js/model.js` — modèle pur : constantes, hauteur/azimut du soleil, ombres (longueur,
  direction), angle de rotation de la Terre, jalons et interpolation des couleurs du ciel,
  étoiles, scénarios et textes, défis du jeu (`DEFIS`, `defiReussi`, `hourDist`), heures
  formatées
- `js/garden.js` — vue « depuis ton jardin » (canvas) : décor maison + arbre + enfant, ciel
  continu, arc du soleil (trajectoire pointillée), lune opposée, étoiles, nuages, ombres qui
  s'allongent et tournent, repères est/sud/ouest
- `js/space.js` — vue « depuis l'espace » (canvas) : la Terre vue de dessus du pôle Nord,
  Soleil **fixe** à droite avec ses rayons, moitié jour / moitié nuit, marqueur rose « chez
  toi » + marqueur sarcelle « les enfants de l'autre côté », flèche du sens de rotation ;
  option `{ mini: true }` (le jeu) : mêmes dessins sans les étiquettes de texte
- `js/main.js` — boucle d'animation, curseur, lecture auto (un tour en 90 s), glissers et taps
  sur les deux canvas, scénarios en douceur, note aux parents,
  jeu des défis (mini-vues, `nextDefi`/`winDefi`/`checkDefi`), conteur repris de l'épisode 3
  (score des voix françaises, menu de voix, clé localStorage `ltt-voice` partagée entre
  épisodes — même origine github.io) qui lit la boîte-révélation, la version sonore des
  scénarios ET les consignes/bravos des défis (bouton 🔇/🔊 `btn-scn-voice` à côté du titre de
  « Joue avec le temps », clé `ltt-scn-voice` partagée elle aussi avec l'épisode 3)
- `test/model.test.mjs` — tests Node du modèle (zéro dépendance)

## Vérification navigateur

Suite Playwright maintenue dans le scratchpad des sessions (`test-site.cjs`) : desktop +
mobile 390 px, zéro erreur console, captures d'écran **regardées vraiment** aux heures clés
(6 h, 12 h, 18 h, minuit), sondes de pixels (`getImageData`) pour la géométrie jour/nuit de la
vue espace et les couleurs du ciel, glissers, tap-pause, scénarios, le jeu complet (défi raté
hors fenêtre, gagné après la tempo, « Encore une ! », glisser sur les mini-vues),
`prefers-reduced-motion`. Lancer le serveur avant chaque run :
`python3 -m http.server 8123`. Playwright est installé en global :
`NODE_PATH=/opt/node22/lib/node_modules node test-site.cjs` ; `chromium.launch()` avec repli
`executablePath: '/opt/pw-browsers/chromium'` ; faire défiler l'élément dans le viewport avant
tout geste souris.

## Déploiement

Le workflow `.github/workflows/deploy-pages.yml` (copié de l'épisode 3) publie sur GitHub
Pages à chaque push sur `main`. Le tout premier run échouera tant que Pages n'a pas été activé
à la main (Settings → Pages → Source : « GitHub Actions ») — prévenir David à ce moment-là.

## Conventions

- Textes UI et commentaires en français ; apostrophe typographique « ’ » dans les chaînes UI.
- Commits conventionnels en français (`feat:`, `fix:`, `docs:`…). Pas de fusion sur `main`
  sans feu vert explicite de David.
- Public : 5 ans, qui ne sait pas lire. Très peu de texte côté enfant, phrases courtes que le
  parent lit à voix haute, gros visuels. Le vocabulaire technique (rotation, axe, hémisphère,
  équinoxe…) va dans la note aux parents ou le README.
- Un artifact Claude (page unique auto-contenue, générée par le script scratchpad
  `build-artifact.mjs`) sert aux tests en famille — republier **au même URL** à chaque
  itération : <https://claude.ai/code/artifact/deace3b5-dee4-4f0f-b91a-e8ab885af7ae>
  (depuis une autre session : passer cette URL au paramètre `url` de l'outil Artifact).
