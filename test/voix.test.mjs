// Tests de la voix du conteur — zéro dépendance : `node test/voix.test.mjs`
// Le corpus vocal (blocs id + texte oral) et, quand les fichiers enregistrés
// existent, la cohérence manifeste ↔ textes du site : la voix enregistrée ne
// doit JAMAIS dire autre chose que ce que le site affiche.

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { corpus, hashTexte } from '../tools/voix-lib.mjs';
import { texteOral, EMOJI_RE, VOIX_TRANSITIONS } from '../js/model.js';

let failed = 0;
let passed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('  ✓ ' + name); }
  else { failed++; console.error('  ✗ ' + name + (detail === undefined ? '' : ' — ' + detail)); }
}

console.log('Le texte oral (texteOral)');
check('« 6 h 30 » se dit « 6 heures 30 », « 18 h » se dit « 18 heures »',
  texteOral('à 6 h 30 puis 18 h pile') === 'à 6 heures 30 puis 18 heures pile');
check('« 24 heures » écrit en toutes lettres ne bouge pas',
  texteOral('24 heures — un jour entier') === '24 heures — un jour entier');
check('les émojis disparaissent et le point se recolle',
  texteOral('Le soleil brille 🌞 .') === 'Le soleil brille.');
check('les espaces multiples se replient', texteOral('un  \n  seul') === 'un seul');

console.log('Le corpus vocal');
const blocs = corpus();
check('23 blocs : 2 transitions + 8 scénarios + 8 défis + 5 paragraphes d’histoire',
  blocs.length === 23, blocs.length);
{
  const ids = {};
  let ok = true;
  for (const b of blocs) {
    if (ids[b.id]) ok = false;
    ids[b.id] = true;
    if (!/^[a-z0-9-]+$/.test(b.id)) ok = false;
    if (!b.texte || b.texte.length < 5) ok = false;
  }
  check('identifiants uniques en kebab-case, textes non vides', ok);
}
check('les transitions du conteur sont dans le corpus',
  blocs.some((b) => b.id === 'transition-jardin' && b.texte === VOIX_TRANSITIONS.jardin) &&
  blocs.some((b) => b.id === 'transition-espace'));
check('le défi-vedette a sa consigne et son bravo',
  blocs.some((b) => b.id === 'defi-autre-cote-consigne') &&
  blocs.some((b) => b.id === 'defi-autre-cote-bravo'));
// EMOJI_RE porte le drapeau /g (stateful avec .test) : on le clone sans
const emojiUne = new RegExp(EMOJI_RE.source, 'u');
check('aucun émoji dans les textes oraux',
  blocs.every((b) => !emojiUne.test(b.texte)));
check('aucune heure en chiffres non oralisée (« N h ») ne subsiste',
  blocs.every((b) => !/\d\s*h\b/.test(b.texte)));
check('apostrophes typographiques « ’ » partout (jamais le « \' » droit)',
  blocs.every((b) => b.texte.indexOf("'") === -1));
check('le corpus tient dans le plan Starter d’ElevenLabs (≈ 30 000 crédits)',
  blocs.reduce((n, b) => n + b.texte.length, 0) < 10000);

console.log('Le manifeste des fichiers enregistrés');
const manifeste = JSON.parse(readFileSync(new URL('../assets/audio/manifest.json', import.meta.url), 'utf8'));
const enregistres = Object.keys(manifeste.blocs);
if (enregistres.length === 0) {
  check('pas encore de fichiers enregistrés : le site lit tout à la synthèse (repli)', true);
} else {
  check('chaque bloc du corpus a son fichier enregistré',
    blocs.every((b) => manifeste.blocs[b.id]),
    blocs.filter((b) => !manifeste.blocs[b.id]).map((b) => b.id).join(', '));
  check('chaque fichier dit ENCORE le texte du site (texte et hash à jour)',
    blocs.every((b) => {
      const m = manifeste.blocs[b.id];
      return m && m.texte === b.texte && m.hash === hashTexte(b.texte);
    }),
    blocs.filter((b) => {
      const m = manifeste.blocs[b.id];
      return !m || m.texte !== b.texte || m.hash !== hashTexte(b.texte);
    }).map((b) => b.id).join(', '));
  check('aucun bloc fantôme dans le manifeste',
    enregistres.every((id) => blocs.some((b) => b.id === id)));
  const dossier = new URL('../assets/audio/', import.meta.url);
  check('tous les mp3 du manifeste existent sur le disque',
    enregistres.every((id) => existsSync(new URL(manifeste.blocs[id].fichier, dossier))));
  check('aucun mp3 orphelin dans assets/audio/',
    readdirSync(dossier).filter((f) => f.endsWith('.mp3'))
      .every((f) => enregistres.some((id) => manifeste.blocs[id].fichier === f)));
  check('la voix et le modèle sont notés dans le manifeste',
    typeof manifeste.voix === 'string' && manifeste.voix.length > 0 &&
    manifeste.modele === 'eleven_multilingual_v2');
}

console.log('');
if (failed > 0) {
  console.error(failed + ' test(s) en échec, ' + passed + ' réussi(s).');
  process.exit(1);
}
console.log('Tous les tests de la voix passent (' + passed + ').');
