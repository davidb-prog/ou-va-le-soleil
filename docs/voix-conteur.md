# La voix du conteur — où est le guide ?

Le guide de la voix enregistrée (règles d'écriture pour l'oral, processus de
production ElevenLabs, garde-fous, portage sur un nouvel épisode) a déménagé :
**la référence de la famille est le skill `petit-labo`**
(`references/voix-enregistree.md` et `references/narrateur.md`) et son skill
compagnon `generer-voix-petit-labo`, qui déroule la production elle-même
(génération, contrôle, re-tirages, écoute, commit unique).

L'outillage canonique (mode `--calme`, `tools/controle-voix.mjs`, page
d'écoute-marathon) vit dans le dépôt `la-terre-tourne` — c'est de là qu'on le
copie pour équiper un nouvel épisode. Le corpus de CET épisode reste dans
`tools/voix-lib.mjs`, ses règles dures dans `CLAUDE.md`
(section « La voix enregistrée »).

Ce fichier n'est gardé que comme pointeur, pour les liens anciens : ne plus
rien documenter ici.
