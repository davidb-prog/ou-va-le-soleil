// Tests du modèle — zéro dépendance : `node test/model.test.mjs`
// Vérifie les vérités du site : Soleil fixe, Terre qui tourne vers l'est en 24 h,
// équinoxe 6 h / 18 h, est → sud → ouest, ombres, antipode en plein jour à minuit,
// ciel continu, scénarios.

import {
  TAU, DEG, SUNRISE_H, SUNSET_H, NOON_H, MIDNIGHT_H, SPIN_HOURS_PER_SEC,
  COLOR_HOME, COLOR_FAR, wrap24, clamp01, sunAltitude, isDaylight, sunAzimuth01,
  sunDirX, NOON_ELEVATION_DEG, SHADOW_MAX, sunElevationDeg, shadowLength,
  shadowDirX, SUN_DIR, earthAngle, houseFacesSun, antipodeHours,
  SKY_NIGHT, SKY_DAWN, SKY_DAY, SKY_DUSK, SKY_KEYFRAMES, hexToRgb, mixRgb,
  skyStopsRgb, skyStops, skyPhase, starAlpha, formatHM, periodWord, SCENARIOS,
  DEFIS, DEFI_WINDOW_H, DEFI_EXIT_WINDOW_H, DEFI_DWELL_MS, hourDist, defiReussi,
} from '../js/model.js';

let failed = 0;
let passed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('  ✓ ' + name); }
  else { failed++; console.error('  ✗ ' + name + (detail === undefined ? '' : ' — ' + detail)); }
}
const approx = (a, b, eps) => Math.abs(a - b) <= (eps === undefined ? 1e-9 : eps);

console.log('Conventions du jour d’équinoxe');
check('lever à 6 h, coucher à 18 h, midi à 12 h, minuit à 0 h',
  SUNRISE_H === 6 && SUNSET_H === 18 && NOON_H === 12 && MIDNIGHT_H === 0);
check('la lecture automatique fait un tour de Terre en 90 s',
  approx(24 / SPIN_HOURS_PER_SEC, 90));
check('couleurs de la série : « chez toi » en rose, « là-bas » en sarcelle',
  COLOR_HOME === '#ff6b9d' && COLOR_FAR === '#46c2a5');

console.log('Hauteur du soleil — sin(π·(h−6)/12), la formule de l’épisode 3');
check('lever (6 h) et coucher (18 h) : soleil pile à l’horizon',
  approx(sunAltitude(6), 0) && approx(sunAltitude(18), 0));
check('midi : soleil au plus haut (1)', approx(sunAltitude(12), 1));
check('minuit : soleil au plus bas (−1)',
  approx(sunAltitude(0), -1) && approx(sunAltitude(24), -1));
check('symétrie matin/après-midi : même hauteur à 9 h et 15 h',
  approx(sunAltitude(9), sunAltitude(15)));
{
  let ok = true;
  for (let h = 0; h < 24; h += 0.05) {
    const day = h > 6.001 && h < 17.999;
    const night = h < 5.999 || h > 18.001;
    if (day && !isDaylight(h)) ok = false;
    if (night && isDaylight(h)) ok = false;
  }
  check('il fait jour exactement entre 6 h et 18 h : jour = nuit = 12 h', ok);
}

console.log('Est → sud → ouest (on regarde le jardin vers le sud)');
check('à 6 h le soleil se lève plein est (gauche de l’écran : azimut 0)',
  approx(sunAzimuth01(6), 0));
check('à midi il culmine plein sud (milieu : azimut 0,5)', approx(sunAzimuth01(12), 0.5));
check('à 18 h il se couche plein ouest (droite : azimut 1)', approx(sunAzimuth01(18), 1));
check('le matin, le soleil est du côté est (sunDirX < 0), le soir côté ouest (> 0)',
  sunDirX(8) < 0 && sunDirX(16) > 0 && approx(sunDirX(12), 0));
{
  let ok = true;
  for (let h = 6.25; h < 18; h += 0.25) {
    if (sunAzimuth01(h) <= sunAzimuth01(h - 0.25)) ok = false;
  }
  check('le soleil traverse le ciel sans jamais reculer (azimut strictement croissant)', ok);
}

console.log('Les ombres — longues matin et soir, courtes à midi, opposées au soleil');
check('élévation simplifiée : 45° à midi (équinoxe vers 45° nord), 0° au lever',
  NOON_ELEVATION_DEG === 45 && approx(sunElevationDeg(12), 45) && approx(sunElevationDeg(6), 0));
check('à midi, l’ombre fait pile une hauteur d’objet (cot 45°)',
  approx(shadowLength(12), 1));
check('l’ombre raccourcit du matin vers midi : 7 h > 9 h > 12 h',
  shadowLength(7) > shadowLength(9) && shadowLength(9) > shadowLength(12));
check('symétrie : l’ombre de 9 h a la longueur de celle de 15 h',
  approx(shadowLength(9), shadowLength(15)));
check('juste après le lever, l’ombre est immense mais plafonnée (SHADOW_MAX)',
  approx(shadowLength(6.05), SHADOW_MAX) && SHADOW_MAX >= 5);
check('la nuit, pas de soleil… donc pas d’ombre',
  shadowLength(0) === 0 && shadowLength(5) === 0 && shadowLength(19) === 0);
check('le matin l’ombre pointe vers l’ouest (droite), le soir vers l’est (gauche)',
  shadowDirX(8) > 0 && shadowDirX(16) < 0 && approx(shadowDirX(12), 0));
{
  let ok = true;
  for (let h = 6.05; h < 18; h += 0.1) {
    if (shadowDirX(h) * sunDirX(h) > 0) ok = false;
  }
  check('l’ombre est toujours à l’opposé du soleil (produit des directions ≤ 0)', ok);
}

console.log('Depuis l’espace — le Soleil est FIXE, la Terre tourne vers l’est');
check('la direction du Soleil à l’écran ne change jamais : plein côté droit (1, 0)',
  SUN_DIR.x === 1 && SUN_DIR.y === 0 && Object.keys(SUN_DIR).length === 2);
check('à midi, la maison fait face au Soleil (angle 0)', approx(earthAngle(12), 0));
check('au coucher (18 h), la maison est à +90° — sens trigonométrique = vers l’est',
  approx(earthAngle(18), TAU / 4));
check('la Terre avance de 15° par heure, toujours dans le même sens',
  approx(earthAngle(13) - earthAngle(12), TAU / 24) &&
  approx(earthAngle(3) - earthAngle(2), TAU / 24));
check('un tour complet en 24 h', approx(earthAngle(12 + 24) - earthAngle(12), 0) &&
  approx(wrap24(12 + 24), 12));
check('à midi la maison est côté jour, à minuit côté nuit (dos au Soleil)',
  houseFacesSun(12) === true && houseFacesSun(0) === false);
{
  let ok = true;
  for (let h = 0; h < 24; h += 0.05) {
    if (Math.abs(h - 6) < 0.01 || Math.abs(h - 18) < 0.01) continue; // frontières exactes
    if (houseFacesSun(h) !== isDaylight(h)) ok = false;
  }
  check('les deux vues racontent la même chose : côté jour du globe ⟺ soleil levé au jardin', ok);
}

console.log('L’autre côté de la Terre');
check('à minuit chez nous, il est midi à l’antipode', approx(antipodeHours(0), 12));
check('à minuit chez nous, le soleil est au ZÉNITH de l’autre côté (grand jour)',
  approx(sunAltitude(antipodeHours(0)), 1));
check('à 18 h chez nous (coucher), le soleil se lève chez eux (6 h)',
  approx(antipodeHours(18), 6) && approx(sunAltitude(antipodeHours(18)), 0));
{
  let ok = true;
  for (let h = 0; h < 24; h += 0.05) {
    if (Math.abs(h - 6) < 0.01 || Math.abs(h - 18) < 0.01) continue;
    if (isDaylight(h) === isDaylight(antipodeHours(h))) ok = false;
  }
  check('jour chez nous ⟺ nuit chez eux, à chaque instant', ok);
}

console.log('Le ciel continu — nuit → aube rose → jour → coucher orangé → nuit');
check('les jalons du ciel couvrent 0 → 24 h dans l’ordre',
  SKY_KEYFRAMES[0][0] === 0 && SKY_KEYFRAMES[SKY_KEYFRAMES.length - 1][0] === 24 &&
  SKY_KEYFRAMES.every((k, i) => i === 0 || k[0] > SKY_KEYFRAMES[i - 1][0]));
check('hexToRgb décode le rose de la série', (() => {
  const c = hexToRgb('#ff6b9d');
  return c[0] === 255 && c[1] === 107 && c[2] === 157;
})());
check('mixRgb à mi-chemin', (() => {
  const m = mixRgb([0, 0, 0], [100, 200, 50], 0.5);
  return m[0] === 50 && m[1] === 100 && m[2] === 25;
})());
check('à minuit, le ciel est exactement la palette de nuit',
  JSON.stringify(skyStopsRgb(0)) === JSON.stringify(SKY_NIGHT.map(hexToRgb)));
check('à midi, le ciel est exactement la palette de jour',
  JSON.stringify(skyStopsRgb(12)) === JSON.stringify(SKY_DAY.map(hexToRgb)));
check('à 6 h, le ciel est exactement la palette d’aube',
  JSON.stringify(skyStopsRgb(6)) === JSON.stringify(SKY_DAWN.map(hexToRgb)));
check('à 18 h, le ciel est exactement la palette de coucher',
  JSON.stringify(skyStopsRgb(18)) === JSON.stringify(SKY_DUSK.map(hexToRgb)));
check('l’aube est ROSE à l’horizon (rouge dominant) et son milieu tire au rose',
  (() => {
    const d = hexToRgb(SKY_DAWN[2]), m = hexToRgb(SKY_DAWN[1]);
    return d[0] > d[1] && d[0] > d[2] && d[0] - d[2] > 80 && m[0] > m[2];
  })());
check('le coucher est ORANGÉ à l’horizon (rouge > vert > bleu)',
  (() => {
    const d = hexToRgb(SKY_DUSK[2]);
    return d[0] > d[1] && d[1] > d[2] && d[0] - d[2] > 100;
  })());
check('le grand jour est BLEU (le bleu domine en haut du ciel)',
  (() => {
    const t = hexToRgb(SKY_DAY[0]);
    return t[2] > t[0] && t[2] > 100;
  })());
check('la nuit est sombre (les trois couleurs restent discrètes)',
  SKY_NIGHT.every((c) => { const r = hexToRgb(c); return r[0] + r[1] + r[2] < 200; }));
{
  let maxJump = 0;
  let prev = skyStopsRgb(0);
  for (let h = 0.05; h <= 24.0001; h += 0.05) {
    const cur = skyStopsRgb(h);
    for (let i = 0; i < 3; i++) {
      for (let c = 0; c < 3; c++) {
        maxJump = Math.max(maxJump, Math.abs(cur[i][c] - prev[i][c]));
      }
    }
    prev = cur;
  }
  check('aucun saut de couleur sur 24 h (variation max par pas de 3 min < 12/255)',
    maxJump < 12, 'saut max : ' + maxJump);
}
check('skyStops renvoie des chaînes rgb() prêtes pour un dégradé',
  skyStops(12).length === 3 && skyStops(12)[0].indexOf('rgb(') === 0);
check('phases du ciel : nuit, aube, jour, crépuscule (seuils de l’épisode 3)',
  skyPhase(0) === 'night' && skyPhase(23) === 'night' && skyPhase(6) === 'dawn' &&
  skyPhase(12) === 'day' && skyPhase(18) === 'dusk' &&
  skyPhase(5.25) === 'dawn' && skyPhase(18.75) === 'night');
check('étoiles : invisibles en plein jour, pleines en pleine nuit, fondu entre les deux',
  starAlpha(12) === 0 && starAlpha(0) === 1 &&
  starAlpha(18.6) > 0 && starAlpha(18.6) < 1);

console.log('Heures affichées');
check('formatHM(12) → « 12 h 00 »', formatHM(12).text === '12 h 00');
check('formatHM(6,5) → « 6 h 30 »', formatHM(6.5).text === '6 h 30');
check('arrondi avec retenue : 23,9999 → « 0 h 00 »', formatHM(23.9999).text === '0 h 00');
check('mots-repères : midi, minuit, matin, après-midi, soir, nuit',
  periodWord(12) === 'midi !' && periodWord(0) === 'minuit !' && periodWord(7) === 'le matin' &&
  periodWord(15) === 'l’après-midi' && periodWord(20.5) === 'le soir' && periodWord(23) === 'la nuit');

console.log('Scénarios — lever, midi, coucher, minuit');
check('quatre moments, aux bonnes heures : 6 h, 12 h, 18 h, 0 h',
  SCENARIOS.length === 4 &&
  SCENARIOS[0].id === 'lever' && SCENARIOS[0].h === 6 &&
  SCENARIOS[1].id === 'midi' && SCENARIOS[1].h === 12 &&
  SCENARIOS[2].id === 'coucher' && SCENARIOS[2].h === 18 &&
  SCENARIOS[3].id === 'minuit' && SCENARIOS[3].h === 0);
{
  const ids = {};
  let ok = true;
  for (const scn of SCENARIOS) {
    if (ids[scn.id]) ok = false;
    ids[scn.id] = true;
    if (!(scn.h >= 0 && scn.h < 24)) ok = false;
    if (!scn.jardin || !scn.espace || !scn.label || !scn.emoji || !scn.sub) ok = false;
  }
  check('identifiants uniques, heures valides, deux textes (jardin + espace) partout', ok);
}
check('chaque histoire a sa version jardin ET sa version espace (le même moment, deux regards)',
  SCENARIOS.every((s) => s.jardin.length > 30 && s.espace.length > 30));
check('à minuit, l’histoire espace montre le grand jour de l’autre côté',
  SCENARIOS[3].espace.indexOf('autre côté') !== -1 &&
  SCENARIOS[3].espace.indexOf('grand jour') !== -1);
check('au coucher, l’histoire espace insiste : le Soleil n’a pas bougé',
  SCENARIOS[2].espace.indexOf('pas bougé') !== -1);
check('apostrophes typographiques « ’ » partout dans les textes UI (jamais le « \' » droit)',
  SCENARIOS.every((s) =>
    (s.label + s.sub + s.jardin + s.espace).indexOf("'") === -1));

console.log('Le jeu « Fais tourner la Terre ! »');
check('l’écart d’heures fait le tour du cadran : 23 h 30 ↔ 0 h 30 = 1 h',
  approx(hourDist(23.5, 0.5), 1) && approx(hourDist(6, 18), 12) && approx(hourDist(3, 3), 0));
check('quatre défis : lever, midi, coucher… et le grand jour de l’autre côté',
  DEFIS.length === 4 &&
  DEFIS[0].id === 'lever' && DEFIS[0].h === 6 &&
  DEFIS[1].id === 'midi' && DEFIS[1].h === 12 &&
  DEFIS[2].id === 'coucher' && DEFIS[2].h === 18 &&
  DEFIS[3].id === 'autre-cote' && DEFIS[3].h === 0);
{
  const ids = {};
  let ok = true;
  for (const d of DEFIS) {
    if (ids[d.id]) ok = false;
    ids[d.id] = true;
    if (!(d.h >= 0 && d.h < 24)) ok = false;
    if (!d.consigne || !d.bravo || !d.emoji) ok = false;
  }
  check('identifiants uniques, heures valides, consigne + bravo partout', ok);
}
check('chaque défi est atteignable : réussi pile sur sa cible',
  DEFIS.every((d) => defiReussi(d, d.h)));
check('la fenêtre de réussite fait ±45 min, pas plus',
  DEFI_WINDOW_H === 0.75 &&
  DEFIS.every((d) => defiReussi(d, d.h + 0.75) && defiReussi(d, d.h - 0.75) &&
    !defiReussi(d, d.h + 0.9) && !defiReussi(d, d.h - 0.9)));
{
  let ok = true;
  for (const a of DEFIS) {
    for (const b of DEFIS) {
      if (a !== b && hourDist(a.h, b.h) <= 2 * DEFI_WINDOW_H) ok = false;
    }
  }
  check('les fenêtres des défis ne se chevauchent jamais (une seule réponse à la fois)', ok);
}
check('le défi « autre-cote » gagne autour de minuit, même par le côté 23 h',
  defiReussi(DEFIS[3], 0) && defiReussi(DEFIS[3], 23.6) && defiReussi(DEFIS[3], 0.4) &&
  !defiReussi(DEFIS[3], 22) && !defiReussi(DEFIS[3], 2));
check('le défi-vedette dit la vérité : à sa cible, zénith chez eux, nuit noire chez nous',
  approx(sunAltitude(antipodeHours(DEFIS[3].h)), 1) && approx(sunAltitude(DEFIS[3].h), -1));
check('la petite tempo anti « gagné en passant » est courte mais réelle',
  DEFI_DWELL_MS >= 200 && DEFI_DWELL_MS <= 1000);
check('hystérésis du bravo : la fenêtre de sortie est plus large que celle d’entrée',
  DEFI_EXIT_WINDOW_H > DEFI_WINDOW_H && DEFI_EXIT_WINDOW_H <= 1.5);
{
  let ok = true;
  for (const a of DEFIS) {
    for (const b of DEFIS) {
      if (a !== b && hourDist(a.h, b.h) <= 2 * DEFI_EXIT_WINDOW_H) ok = false;
    }
  }
  check('même les fenêtres de sortie ne se chevauchent jamais entre défis', ok);
}
check('apostrophes typographiques « ’ » dans les textes du jeu (jamais le « \' » droit)',
  DEFIS.every((d) => (d.consigne + d.bravo).indexOf("'") === -1));

console.log('');
if (failed > 0) {
  console.error(failed + ' test(s) en échec, ' + passed + ' réussi(s).');
  process.exit(1);
}
console.log('Tous les tests passent (' + passed + ').');
