# La voix du conteur — rédiger et produire les enregistrements (ElevenLabs)

Référence pour tous les épisodes du Petit labo. Née sur « Où va le Soleil la nuit ? »,
où chaque règle ci-dessous a été apprise sur un vrai raté. L'outillage (`tools/build-voix.mjs`,
`tools/voix-lib.mjs`, `test/voix.test.mjs`) se porte tel quel d'un épisode à l'autre —
seule la fonction `corpus()` décrit les textes de l'épisode.

## Les deux principes

1. **Le texte affiché est la source de vérité.** La voix enregistrée ne dit jamais autre
   chose que ce que le site montre : le manifeste (`assets/audio/manifest.json`) stocke le
   texte oral exact de chaque bloc, le site vérifie la correspondance avant de jouer un mp3
   (sinon repli synthèse), et `node test/voix.test.mjs` échoue si un texte a changé sans
   régénération.
2. **Un bloc = une unité de sens dite d'une traite** (un paragraphe d'histoire, une consigne,
   un bravo), avec un id stable en kebab-case (`histoire-3`, `defi-midi-consigne`). On ne
   découpe pas par phrase : la voix pose mieux sa prosodie sur un bloc entier.

## Écrire pour être dit

Le passage écrit → oral est fait par `texteOral()` (dans `model.js`, partagée site/outil/
tests) : émojis retirés, « 6 h 30 » → « 6 heures 30 », guillemets français retirés, tirets
cadratins → virgules, espaces recollés devant la ponctuation. Ces filets mécaniques existent,
mais la vraie qualité vient de l'écriture elle-même :

- **Phrases pleines et courtes.** Sujet, verbe, point. La synthèse trébuche sur les
  deux-points d'explication (« le dos : il fait nuit ») et les appositions (« le Soleil,
  lui, continue ») — préférer deux phrases simples (« …elle lui tourne le dos, et il fait
  nuit chez toi. Mais le Soleil continue de briller. »).
- **Jamais une ouverture d'un seul mot.** « midi ! Mets le soleil… » passe mal ; donner un
  appui : « midi, le milieu du jour ! Mets le soleil… ».
- **Un fragment qui complète une amorce à l'écran** (« …et fabrique… → le matin ! ») garde
  son amorce : elle part à ElevenLabs en `previous_text` (champ `precedent` du corpus) —
  le modèle entend le contexte, le fichier ne le prononce pas.
- **Points de suspension** : bien pour le suspens (« Mais chut… »), mal en enchaînement
  après une citation (« “se lève”… en vrai ») — reformuler.
- **Nombres ronds en toutes lettres** (« 24 heures ») ; les heures en chiffres sont
  oralisées automatiquement.
- Les guillemets et tirets typographiques restent bienvenus **à l'écran** — `texteOral()`
  s'en charge ; ne pas appauvrir l'écrit pour l'oral.

## Le processus, dans l'ordre

1. **Figer les textes du site d'abord** (tests verts, relecture) — chaque changement de
   texte après enregistrement rejoue la loterie sur son bloc.
2. Écrire `corpus()` dans `tools/voix-lib.mjs` : la liste des blocs (id, texte oral,
   `precedent` éventuel). `node test/voix.test.mjs` vérifie ids, émojis, heures, guillemets.
3. `node tools/build-voix.mjs --dry-run` : chiffrage en crédits (~1 crédit/caractère,
   un épisode ≈ 2 500).
4. **Choisir la voix** : `--essai voiceId1,voiceId2,…` génère une phrase-test expressive
   par candidate dans `tools/essais/` (gitignoré) → écoute en famille → gagnante.
5. **Génération complète** (la voix retenue est mémorisée dans le manifeste), puis écoute
   de contrôle : servir le repo et ouvrir `tools/ecoute.html` (tous les clips avec leur
   texte en face).
6. **Une prise ratée se refait avant de se réécrire.** La synthèse est non déterministe :
   beaucoup de « bugs » sont des tirages malchanceux. D'abord `--only <id>` (re-tirage pur) ;
   ne réécrire le texte que si le même endroit accroche sur 2-3 prises.
7. **Validation finale → UN commit** d'`assets/audio/` (mp3 + manifeste) pour tout
   l'épisode. Ensuite, on ne touche plus aux textes sans vraie raison.

## Garde-fous (détail dans CLAUDE.md, section « La voix enregistrée »)

- Clé API : utilisateur dédiée, scope Text-to-Speech + lecture des voix seulement,
  plafond mensuel ≈ un épisode × 5, expiration ≤ 30 jours, stockée dans `~/.zshrc` —
  jamais dans un cloud environment, jamais dans un repo.
- Sortie 64 kb/s (de la parole), pas de Git LFS, git ne delta-compresse pas l'audio :
  d'où le commit unique.
- Le site reste 100 % statique : aucune clé, aucun appel API côté site ; repli synthèse
  du navigateur si un fichier manque ou ne correspond plus au texte.

## Porter sur un nouvel épisode

1. Copier `tools/build-voix.mjs` et le squelette de `test/voix.test.mjs` ; ajouter
   `texteOral()` + `VOIX_TRANSITIONS` (ou équivalent) dans le `model.js` de l'épisode.
2. Réécrire `corpus()` dans `tools/voix-lib.mjs` — c'est la seule partie propre à l'épisode.
3. Committer un manifeste vide (`{ "voix": null, "modele": null, "blocs": {} }`) : le site
   marche à la synthèse tant que les mp3 n'existent pas.
4. Brancher le conteur du site sur `narrate(blocs)` avec repli (voir `js/main.js` de
   `ou-va-le-soleil`), reprendre la section « La voix enregistrée » dans le CLAUDE.md,
   puis dérouler le processus ci-dessus.
