// Modèle pur de « Où va le Soleil la nuit ? » — aucun accès DOM, testable sous Node.
//
// Convention du site (la plus simple pour une enfant de 5 ans) :
// - jour d'équinoxe permanent, en heure SOLAIRE : le soleil se lève à 6 h pile, culmine à
//   midi, se couche à 18 h pile — jour = nuit = 12 h (l'heure légale et les fuseaux sont le
//   sujet de l'épisode 3, pas de celui-ci) ;
// - hémisphère nord : on regarde le jardin vers le SUD, donc l'est est à gauche de l'écran
//   et l'ouest à droite ; le soleil culmine plein sud ;
// - le Soleil ne bouge JAMAIS : dans la vue de l'espace il est fixé sur le côté droit de
//   l'écran, et c'est la Terre qui tourne vers l'est (sens trigonométrique vue du pôle Nord,
//   même convention que l'épisode 3).

export const TAU = Math.PI * 2;
export const DEG = Math.PI / 180;

export const SUNRISE_H = 6;   // lever du soleil (heure solaire, équinoxe)
export const SUNSET_H = 18;   // coucher du soleil
export const NOON_H = 12;
export const MIDNIGHT_H = 0;

// La Terre fait un tour complet en 24 h ; en lecture automatique, un tour dure 90 s.
export const SPIN_HOURS_PER_SEC = 24 / 90;

// Couleurs de la série (épisode 3) — uniques ici, jamais recopiées dans les vues.
export const COLOR_HOME = '#ff6b9d';     // rose : « chez toi »
export const COLOR_FAR = '#46c2a5';      // sarcelle : « les enfants de l'autre côté »
export const COLOR_SUN = '#ffcf5c';
export const COLOR_SUN_DEEP = '#ff9f1c';

export function wrap24(h) { return ((h % 24) + 24) % 24; }
export function clamp01(v) { return Math.max(0, Math.min(1, v)); }

// Hauteur du soleil normalisée dans [−1, 1] — même formule que l'épisode 3 :
// 0 au lever (6 h) et au coucher (18 h), 1 à midi, −1 à minuit.
export function sunAltitude(h) {
  return Math.sin(Math.PI * (wrap24(h) - 6) / 12);
}

export function isDaylight(h) { return sunAltitude(h) > 0; }

// Position horizontale du soleil dans le ciel du jardin : 0 = plein est (gauche de
// l'écran), 0,5 = plein sud (midi), 1 = plein ouest (droite). N'a de sens que le jour.
export function sunAzimuth01(h) {
  return clamp01((wrap24(h) - 6) / 12);
}

// Composante horizontale « écran » de la direction du soleil, vue du jardin :
// −1 = à l'est (gauche), +1 = à l'ouest (droite), 0 = plein sud.
export function sunDirX(h) {
  return Math.sin(Math.PI * (wrap24(h) - 12) / 12);
}

// ------------------------------------------------------------------ les ombres
// Élévation simplifiée du soleil en degrés : 45° à midi (équinoxe vers 45° de
// latitude nord — la France), 0° au lever et au coucher.
export const NOON_ELEVATION_DEG = 45;
// Une ombre ne s'étire jamais au-delà de 6 fois la hauteur de l'objet (au-delà,
// elle sortirait du dessin sans rien apprendre de plus).
export const SHADOW_MAX = 6;

export function sunElevationDeg(h) {
  return NOON_ELEVATION_DEG * Math.max(0, sunAltitude(h));
}

// Longueur de l'ombre en « hauteurs d'objet » : cot(élévation), plafonnée à
// SHADOW_MAX ; 0 la nuit (pas de soleil, pas d'ombre).
export function shadowLength(h) {
  const e = sunElevationDeg(h) * DEG;
  if (e <= 0) return 0;
  return Math.min(SHADOW_MAX, Math.cos(e) / Math.sin(e));
}

// Direction horizontale de l'ombre à l'écran : toujours À L'OPPOSÉ du soleil.
// +1 = vers l'ouest (droite de l'écran, le matin), −1 = vers l'est (le soir),
// ≈ 0 à midi (l'ombre file plein nord, cachée derrière l'objet dans notre vue).
export function shadowDirX(h) {
  return -sunDirX(h);
}

// ------------------------------------------------- la Terre vue depuis l'espace
// Vue de dessus du pôle Nord. Le Soleil est FIXE, plein côté droit de l'écran :
// sa direction ne change jamais — c'est la Terre qui tourne.
export const SUN_DIR = { x: 1, y: 0 };

// Angle de « chez toi » sur le disque terrestre, en radians dans le sens
// trigonométrique (= vers l'est) : 0 quand la maison fait face au Soleil (midi),
// +π/2 au coucher (18 h), π à minuit (dos au Soleil). Même convention que le
// placeAngle de l'épisode 3.
export function earthAngle(h) {
  return (wrap24(h) - 12) / 24 * TAU;
}

// La maison est-elle du côté jour du globe ? (cos > 0 : tournée vers le Soleil.)
export function houseFacesSun(h) {
  return Math.cos(earthAngle(h)) > 0;
}

// L'autre côté de la Terre : quand il est h chez nous, il est h + 12 là-bas —
// à minuit chez nous, le soleil est au zénith de l'antipode.
export function antipodeHours(h) {
  return wrap24(h + 12);
}

// --------------------------------------------------------------- le ciel continu
// Nuit étoilée → aube ROSE → grand jour → coucher ORANGÉ → nuit : trois couleurs
// (haut, milieu, horizon) interpolées en continu entre des jalons horaires.
export const SKY_NIGHT = ['#070d20', '#0d183a', '#16335e'];
export const SKY_DAWN = ['#282a55', '#a85480', '#ffab7e'];   // l'aube rose
export const SKY_DAY = ['#2f74c9', '#5fa5e8', '#a8d7ff'];
export const SKY_DUSK = ['#211f4c', '#b0503c', '#ff9448'];   // le coucher orangé

// [heure, palette] — entre deux jalons, on glisse en douceur de l'un à l'autre.
// Les fenêtres nuit ↔ aube/crépuscule durent 1 h 45 : assez lentes pour que le
// ciel reste continu (vérifié par le test « aucun saut de couleur »).
export const SKY_KEYFRAMES = [
  [0, SKY_NIGHT], [4.25, SKY_NIGHT], [6, SKY_DAWN], [7.5, SKY_DAY],
  [16.5, SKY_DAY], [18, SKY_DUSK], [19.75, SKY_NIGHT], [24, SKY_NIGHT],
];

export function hexToRgb(hex) {
  return [
    parseInt(hex.substr(1, 2), 16),
    parseInt(hex.substr(3, 2), 16),
    parseInt(hex.substr(5, 2), 16),
  ];
}

export function mixRgb(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

export function rgbCss(rgb) { return 'rgb(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ')'; }

const smooth = (t) => { const u = clamp01(t); return u * u * (3 - 2 * u); };

// Les trois couleurs du ciel à l'heure h, en triplets [r, g, b].
export function skyStopsRgb(h) {
  const hh = wrap24(h);
  let a = SKY_KEYFRAMES[0], b = SKY_KEYFRAMES[SKY_KEYFRAMES.length - 1];
  for (let i = 0; i < SKY_KEYFRAMES.length - 1; i++) {
    if (hh >= SKY_KEYFRAMES[i][0] && hh <= SKY_KEYFRAMES[i + 1][0]) {
      a = SKY_KEYFRAMES[i]; b = SKY_KEYFRAMES[i + 1];
      break;
    }
  }
  const span = b[0] - a[0];
  const t = span > 0 ? smooth((hh - a[0]) / span) : 0;
  const out = [];
  for (let i = 0; i < 3; i++) out.push(mixRgb(hexToRgb(a[1][i]), hexToRgb(b[1][i]), t));
  return out;
}

// La même chose, prête pour un dégradé canvas.
export function skyStops(h) {
  const rgb = skyStopsRgb(h);
  return [rgbCss(rgb[0]), rgbCss(rgb[1]), rgbCss(rgb[2])];
}

// État du ciel en bandes simples (pour les textes et les sondes) — mêmes seuils
// que l'épisode 3.
export function skyPhase(h) {
  const hh = wrap24(h);
  if (hh < 5.25 || hh >= 18.75) return 'night';
  if (hh < 6.75) return 'dawn';
  if (hh < 17.25) return 'day';
  return 'dusk';
}

// Opacité des étoiles : 0 en plein jour, 1 en pleine nuit, fondu au crépuscule.
export function starAlpha(h) {
  return clamp01((-sunAltitude(h) - 0.06) * 4);
}

// ------------------------------------------------------------------- les heures
// Heure « horloge » lisible : arrondit à la minute, avec retenue (23 h 59,6 → 0 h 00).
export function formatHM(hours) {
  const total = Math.round(wrap24(hours) * 60) % (24 * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return { h: h, m: m, text: h + ' h ' + (m < 10 ? '0' + m : String(m)) };
}

// Mot d'accompagnement de l'heure, à hauteur d'enfant.
export function periodWord(hours) {
  const c = formatHM(hours);
  if (c.h === 12 && c.m === 0) return 'midi !';
  if (c.h === 0 && c.m === 0) return 'minuit !';
  if (c.h < 6) return 'la nuit';
  if (c.h < 12) return 'le matin';
  if (c.h < 18) return 'l’après-midi';
  if (c.h < 22) return 'le soir';
  return 'la nuit';
}

// ------------------------------------------------------------------------ le jeu
// « Fais tourner la Terre ! » : le site demande un moment de la journée, et
// l'enfant le FABRIQUE en faisant tourner le temps (glisser sur les vues, ou
// le grand curseur — qui reste le maître à bord).

// Fenêtre de réussite : ±45 min autour de l'heure cible — assez large pour
// des doigts de 5 ans (le recalage doux affiche de toute façon le bravo sur
// le moment pile).
export const DEFI_WINDOW_H = 0.75;
// Il faut RESTER un instant sur le bon moment : un grand coup de glisser qui
// traverse la fenêtre ne gagne pas « en passant ».
export const DEFI_DWELL_MS = 350;
// Honnêteté du bravo : il ne reste affiché que tant que le moment est encore
// à l'écran. On ne le retire qu'en sortant d'une fenêtre un peu plus large
// que celle d'entrée — l'hystérésis évite le clignotement au bord.
export const DEFI_EXIT_WINDOW_H = 1.25;

// Le dernier défi est la révélation du site transformée en action : pour
// faire briller le grand jour chez les enfants de l'autre côté, l'enfant
// doit plonger sa propre maison dans la nuit.
export const DEFIS = [
  {
    id: 'lever', emoji: '🌅', h: 6,
    consigne: 'le matin ! Fais lever le soleil dans ton jardin.',
    bravo: 'Bravo ! Le soleil se lève à l’est… et vu de l’espace, c’est ta maison qui vient de tourner vers lui !',
  },
  {
    id: 'midi', emoji: '☀️', h: 12,
    consigne: 'midi pile ! Mets le soleil tout en haut du ciel.',
    bravo: 'Bravo ! Le soleil est au plus haut, plein sud — et les ombres sont si petites qu’elles se cachent sous les pieds !',
  },
  {
    id: 'coucher', emoji: '🌇', h: 18,
    consigne: 'le soir ! Couche le soleil, fais le ciel tout orange.',
    bravo: 'Bravo ! Le ciel est tout orange… et regarde la vue de l’espace : le Soleil, lui, n’a pas bougé d’un poil !',
  },
  {
    id: 'autre-cote', emoji: '⭐', h: 0,
    consigne: 'le grand jour… chez les enfants de l’autre côté de la Terre !',
    bravo: 'Bravo ! Chez toi c’est la nuit noire, tout le monde dort… et chez eux, c’est midi en plein soleil !',
  },
];

// Écart entre deux heures sur le cadran de 24 h (23 h 30 et 0 h 30 : 1 h).
export function hourDist(a, b) {
  const d = Math.abs(wrap24(a) - wrap24(b));
  return Math.min(d, 24 - d);
}

export function defiReussi(defi, h) {
  return hourDist(h, defi.h) <= DEFI_WINDOW_H;
}

// ------------------------------------------------------------------ les scénarios
// Quatre moments de la journée : le temps glisse en douceur (toujours vers
// l'avant, le vrai sens de la Terre), puis on raconte le même instant deux fois —
// depuis le jardin, puis depuis l'espace.
export const SCENARIOS = [
  {
    id: 'lever', emoji: '🌅', label: 'Le soleil se lève', sub: '6 h — bonjour !', h: 6,
    jardin: 'Regarde à gauche, vers l’est : le soleil pointe le bout de son nez, et le ciel devient tout rose. Bonjour !',
    espace: 'Ta maison vient de tourner du côté de la lumière. Le Soleil n’est pas « arrivé » : il t’attendait — c’est toi qui reviens vers lui, parce que la Terre tourne !',
  },
  {
    id: 'midi', emoji: '☀️', label: 'Midi pile', sub: '12 h — tout en haut', h: 12,
    jardin: 'Le soleil est au plus haut, plein sud. Les ombres sont toutes petites : elles se cachent sous tes pieds !',
    espace: 'Ta maison est en plein milieu du côté jour, bien en face du Soleil. C’est pour ça qu’il est si haut dans ton ciel.',
  },
  {
    id: 'coucher', emoji: '🌇', label: 'Le soleil se couche', sub: '18 h — bonne nuit ?', h: 18,
    jardin: 'Le ciel devient orange, les ombres s’étirent, et le soleil glisse derrière l’horizon, à droite, vers l’ouest. Au revoir !',
    espace: 'Regarde bien : le Soleil n’a pas bougé d’un poil ! C’est ta maison qui part de l’autre côté de la Terre. Il ne s’éteint pas, il brille toujours.',
  },
  {
    id: 'minuit', emoji: '🌙', label: 'Minuit, tu dors', sub: '0 h — chuuut…', h: 0,
    jardin: 'Nuit noire, ciel plein d’étoiles, la lune veille. Le soleil a disparu… mais où est-il passé ?',
    espace: 'Le voilà ! Ta maison lui tourne le dos, tout simplement. Et pendant que tu dors, de l’autre côté de la Terre, c’est grand jour : des enfants jouent en plein soleil !',
  },
];
