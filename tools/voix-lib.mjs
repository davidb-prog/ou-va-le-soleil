// Corpus vocal de « Où va le Soleil la nuit ? » : la liste des blocs parlés
// (id stable + texte oral), partagée par tools/build-voix.mjs (génération
// ElevenLabs) et test/voix.test.mjs (cohérence manifeste ↔ textes du site).
//
// Pour porter l'outil sur un autre épisode (« Quelle heure est-il là-bas ? »,
// « Pourquoi la Lune change de forme ? », les saisons…), seule la fonction
// corpus() change : elle décrit où vivent les textes de CET épisode.

import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { SCENARIOS, DEFIS, VOIX_TRANSITIONS, texteOral } from '../js/model.js';

// Tous les blocs que le conteur peut dire, avec les MÊMES ids que js/main.js.
export function corpus() {
  const blocs = [
    { id: 'transition-jardin', texte: texteOral(VOIX_TRANSITIONS.jardin) },
    { id: 'transition-espace', texte: texteOral(VOIX_TRANSITIONS.espace) },
  ];
  for (const s of SCENARIOS) {
    blocs.push({ id: 'scn-' + s.id + '-jardin', texte: texteOral(s.jardin) });
    blocs.push({ id: 'scn-' + s.id + '-espace', texte: texteOral(s.espace) });
  }
  for (const d of DEFIS) {
    blocs.push({ id: 'defi-' + d.id + '-consigne', texte: texteOral(d.consigne) });
    blocs.push({ id: 'defi-' + d.id + '-bravo', texte: texteOral(d.bravo) });
  }
  // la grande histoire : un bloc par paragraphe de la boîte-révélation
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const zone = html.match(/<div id="explain-text"[^>]*>([\s\S]*?)<\/div>/);
  if (!zone) throw new Error('explain-text introuvable dans index.html');
  const paras = zone[1].match(/<p>[\s\S]*?<\/p>/g) || [];
  paras.forEach((p, i) => {
    blocs.push({ id: 'histoire-' + (i + 1), texte: texteOral(p.replace(/<[^>]+>/g, ' ')) });
  });
  return blocs;
}

// Empreinte courte d'un texte : le manifeste s'en sert pour savoir quels
// blocs régénérer quand un texte du site change.
export function hashTexte(t) {
  return createHash('sha1').update(t, 'utf8').digest('hex').slice(0, 12);
}
