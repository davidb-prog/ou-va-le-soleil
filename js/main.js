// Câblage de l'interface : boucle d'animation, curseur du temps, glissers et
// petits taps sur les deux vues, scénarios racontés, plein écran. Les deux
// vues sont TOUJOURS synchronisées sur la même heure sim.h — c'est le cœur
// du site : le même moment, deux regards.

import { TAU, wrap24, formatHM, periodWord, skyPhase, earthAngle,
         SPIN_HOURS_PER_SEC, SCENARIOS } from './model.js';
import { GardenView } from './garden.js';
import { SpaceView } from './space.js';

const $ = (id) => document.getElementById(id);
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const sim = {
  h: 12,                  // on ouvre sur le cas d'école : midi, soleil au plus haut
  playing: !reduceMotion, // le temps passe tout seul (un tour de Terre en 90 s)
  tween: null,            // { from, delta, target, start, dur } pendant un scénario
};
let activeScn = null; // le scénario affiché — nul dès qu'on reprend la main

const garden = new GardenView($('garden-view'));
const space = new SpaceView($('space-view'));

// ---- lecture / pause et curseur ----

const slider = $('time-slider');
let sliderHeld = false;

function setPlaying(p) {
  sim.playing = p;
  const btn = $('btn-spin');
  // libellé court et de largeur stable : sinon toute la ligne se remet en page
  // à chaque appui (et déborde sur mobile)
  btn.textContent = p ? '⏸ Pause' : '▶ Lecture';
  btn.setAttribute('aria-label', p
    ? 'Mettre en pause (le temps passe tout seul)'
    : 'Relancer le temps qui passe tout seul');
  btn.setAttribute('aria-pressed', p ? 'true' : 'false');
}

function setActiveScenario(id) {
  for (const key in scnButtons) {
    scnButtons[key].classList.toggle('active', key === id);
    scnButtons[key].setAttribute('aria-pressed', key === id ? 'true' : 'false');
  }
}

function stopAuto() {
  sim.tween = null;
  activeScn = null;
  if (sim.playing) setPlaying(false);
  setActiveScenario(null);
}

function toggleSpin() {
  sim.tween = null;
  activeScn = null;
  setActiveScenario(null);
  setPlaying(!sim.playing);
}

$('btn-spin').addEventListener('click', toggleSpin);
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && !e.target.closest('button, input, a, summary, select')) {
    e.preventDefault();
    toggleSpin();
  }
});

slider.addEventListener('input', () => {
  sim.h = wrap24(+slider.value);
  stopAuto();
});
slider.addEventListener('pointerdown', () => { sliderHeld = true; });
window.addEventListener('pointerup', () => { sliderHeld = false; });
window.addEventListener('pointercancel', () => { sliderHeld = false; });

// La bulle « glisse ici » vit SOUS le canvas (rien ne recouvre les vues) : au
// premier geste elle s'efface sur place, et le minuteur replie sa ligne — pas
// pendant un glisser, pour ne pas décaler la vue sous le doigt.
function hideHint() {
  const hint = $('drag-hint');
  if (hint && !hint.hidden) hint.classList.add('hide');
}
setTimeout(() => {
  hideHint();
  const hint = $('drag-hint');
  setTimeout(() => { if (hint) hint.hidden = true; }, 450);
}, 8000);

// ---- glisser = faire tourner le temps, petit tap = pause/lecture ----
// `hoursPerPixel` traduit le geste : sur le jardin, suivre le soleil du doigt ;
// sur l'espace, faire tourner le disque de la Terre.

function wireTimeDrag(canvas, hoursPerPixel) {
  let dragging = false, lastX = 0, moved = 0, downT = 0, unlocked = false, downX = 0;
  canvas.addEventListener('pointerdown', (e) => {
    dragging = true;
    unlocked = false;
    lastX = e.clientX; downX = e.clientX; moved = 0; downT = performance.now();
    if (canvas.setPointerCapture) canvas.setPointerCapture(e.pointerId);
    hideHint();
    e.preventDefault();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    moved += Math.abs(dx) + Math.abs(e.movementY || 0);
    if (!unlocked && Math.abs(e.clientX - downX) > 8) {
      unlocked = true;
      stopAuto();
    }
    if (unlocked) sim.h = wrap24(sim.h + dx * hoursPerPixel());
    lastX = e.clientX;
  });
  const release = (e) => {
    if (dragging && moved <= 6 && performance.now() - downT < 600) toggleSpin();
    dragging = false;
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', () => { dragging = false; });
}

wireTimeDrag($('garden-view'), () => {
  // toute la largeur du ciel = la journée entière (on suit le soleil du doigt)
  const w = Math.max(60, $('garden-view').clientWidth - 84);
  return 12 / w;
});
wireTimeDrag($('space-view'), () => {
  // un rayon de Terre sous le doigt ≈ 3 h 49 (même toucher que l'épisode 3)
  const R = space.layout ? space.layout.R : 120;
  return 24 / TAU / R;
});

// ---- plein écran de la scène (API native, repli CSS pour iOS) ----

const stagePanel = $('stage-panel');
const fsBtn = $('fs-toggle');

function setFsUi(active) {
  fsBtn.textContent = active ? '✕ Quitter le plein écran' : '⛶ Plein écran';
}
fsBtn.addEventListener('click', () => {
  if (document.fullscreenElement === stagePanel) { document.exitFullscreen(); return; }
  if (stagePanel.classList.contains('fs-fallback')) {
    stagePanel.classList.remove('fs-fallback');
    setFsUi(false);
    return;
  }
  if (stagePanel.requestFullscreen) {
    const p = stagePanel.requestFullscreen();
    if (p && p.then) {
      p.then(null, () => { stagePanel.classList.add('fs-fallback'); setFsUi(true); });
    }
    return;
  }
  stagePanel.classList.add('fs-fallback');
  setFsUi(true);
});
document.addEventListener('fullscreenchange', () => {
  setFsUi(document.fullscreenElement === stagePanel);
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && stagePanel.classList.contains('fs-fallback')) {
    stagePanel.classList.remove('fs-fallback');
    setFsUi(false);
  }
});

// ---- les boutons-scénarios et leurs micro-histoires ----

const scnButtons = {};
const scnBox = $('scenario-buttons');
for (const scn of SCENARIOS) {
  const btn = document.createElement('button');
  btn.className = 'scn scn-' + scn.id;
  btn.setAttribute('aria-pressed', 'false');
  const em = document.createElement('span');
  em.className = 'scn-emoji';
  em.textContent = scn.emoji;
  const lab = document.createElement('span');
  lab.textContent = scn.label;
  const sub = document.createElement('span');
  sub.className = 'scn-sub';
  sub.textContent = scn.sub;
  btn.appendChild(em); btn.appendChild(lab); btn.appendChild(sub);
  btn.addEventListener('click', () => runScenario(scn));
  scnBox.appendChild(btn);
  scnButtons[scn.id] = btn;
}

function renderInvite() {
  const box = $('story');
  box.innerHTML = '';
  const p = document.createElement('p');
  p.className = 'story-invite';
  p.textContent = 'Appuie sur un bouton : le temps glisse jusqu’au bon moment, puis on raconte le même instant deux fois — depuis le jardin, et depuis l’espace.';
  box.appendChild(p);
}

function renderStory(scn) {
  const box = $('story');
  box.innerHTML = '';
  const lines = [
    { cls: 'story-chip-jardin', chip: '🌳 dans ton jardin', text: scn.jardin },
    { cls: 'story-chip-espace', chip: '🚀 vu de l’espace', text: scn.espace },
  ];
  for (const line of lines) {
    const row = document.createElement('div');
    row.className = 'story-line';
    const chip = document.createElement('span');
    chip.className = 'story-chip ' + line.cls;
    chip.textContent = line.chip;
    const txt = document.createElement('p');
    txt.className = 'story-text';
    txt.textContent = line.text;
    row.appendChild(chip); row.appendChild(txt);
    box.appendChild(row);
  }
}

// Le temps glisse en douceur jusqu'au moment choisi — toujours vers l'avant,
// le vrai sens de la Terre.
function runScenario(scn) {
  setPlaying(false);
  setActiveScenario(scn.id);
  renderStory(scn);
  activeScn = scn;
  tellScenario(); // la version sonore, si le parent l'a activée
  // Sur mobile, les vues sont plus haut dans la page : on les ramène à l'écran
  // pour que l'enfant VOIE le temps glisser (sur grand écran, rien ne bouge).
  const vg = document.querySelector('.views-grid').getBoundingClientRect();
  if (vg.bottom < 120 || vg.top > window.innerHeight - 120) {
    stagePanel.scrollIntoView(reduceMotion ? true : { behavior: 'smooth', block: 'start' });
  }
  const delta = wrap24(scn.h - sim.h);
  if (reduceMotion || delta < 0.02 || delta > 23.98) {
    sim.tween = null;
    sim.h = scn.h;
    return;
  }
  sim.tween = {
    from: sim.h, delta: delta, target: scn.h,
    start: performance.now(), dur: Math.min(2600, 700 + delta * 90),
  };
}

// ---- mise à jour des textes (seulement quand ils changent) ----

const cache = {};
function setText(key, el, value) {
  if (cache[key] === value) return;
  cache[key] = value;
  el.textContent = value;
}

const GARDEN_STATUS = {
  night: '🌙 Nuit noire : le soleil est caché… il éclaire l’autre côté de la Terre',
  dawn: '🌅 Le soleil se lève, à l’est — le ciel devient tout rose',
  day: '☀️ Le soleil brille dans ton ciel',
  dusk: '🌇 Le soleil se couche, à l’ouest — le ciel devient orange',
};

// Le statut de la vue espace : côté jour, côté nuit — et, pendant ~20 minutes
// autour de 6 h et 18 h, le moment star : la maison est PILE sur la limite.
function spaceStatus(h) {
  const c = Math.cos(earthAngle(h));
  if (c > 0.045) return '🏠 Ta maison est du côté lumière : il fait jour chez toi';
  if (c < -0.045) return '🏠 Ta maison tourne le dos au Soleil : il fait nuit chez toi';
  return Math.sin(earthAngle(h)) > 0
    ? '🏠 Ta maison passe la limite jour/nuit : le soleil se couche chez toi'
    : '🏠 Ta maison arrive sur la limite jour/nuit : le soleil se lève chez toi !';
}

function updateTexts() {
  setText('time', $('home-time'), formatHM(sim.h).text);
  setText('period', $('home-period'), periodWord(sim.h));
  setText('garden', $('garden-status'), GARDEN_STATUS[skyPhase(sim.h)]);
  setText('space', $('space-status'), spaceStatus(sim.h));
  if (!sliderHeld) slider.value = sim.h;
}

// ---- boucle d'animation ----

const easeInOut = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

// On ne redessine que si quelque chose a changé (l'heure, ou la taille d'un
// canvas — rotation d'écran, plein écran…) : en pause, zéro travail par frame,
// la batterie du téléphone dit merci.
const drawn = { h: -1, sizes: '' };
function sizeKey() {
  const g = $('garden-view'), s = $('space-view');
  return g.clientWidth + 'x' + g.clientHeight + '|' + s.clientWidth + 'x' + s.clientHeight;
}

let lastMs = performance.now();
function frame(ms) {
  try {
    const dt = Math.min((ms - lastMs) / 1000, 0.1);
    lastMs = ms;
    if (sim.tween) {
      const tw = sim.tween;
      const k = Math.min(1, (ms - tw.start) / tw.dur);
      sim.h = k >= 1 ? tw.target : wrap24(tw.from + tw.delta * easeInOut(k));
      if (k >= 1) sim.tween = null;
    } else if (sim.playing) {
      sim.h = wrap24(sim.h + SPIN_HOURS_PER_SEC * dt);
    }
    const sizes = sizeKey();
    if (sim.h !== drawn.h || sizes !== drawn.sizes) {
      drawn.h = sim.h; drawn.sizes = sizes;
      garden.draw(sim.h);
      space.draw(sim.h);
      updateTexts();
    }
  } finally {
    // la boucle survit à un raté de rendu ponctuel (canvas en cours de layout…)
    requestAnimationFrame(frame);
  }
}

// ---- le conteur : une seule voix pour tout le site — la boîte « Le Soleil
// ne va nulle part ! » ET la version sonore des scénarios. La synthèse vocale
// du navigateur lit hors-ligne, rien n'est envoyé nulle part. Même conteur
// que l'épisode 3 : on note chaque voix française et on prend d'office la
// plus douce — français de France et voix « naturelles » d'abord, voix
// robotiques et accents lointains en dernier — et un petit menu laisse les
// parents en changer. ----

// une phrase par bulle (les longs textes d'une traite se font couper) ; la
// dernière phrase du bloc marque une vraie respiration
function sentenceChunks(text, endPara) {
  const bits = text.replace(/\s+/g, ' ').match(/[^.!?…]+[.!?…]*/g) || [];
  const out = [];
  for (const b of bits) { if (b.trim()) out.push({ text: b.trim(), endPara: false }); }
  if (out.length && endPara) out[out.length - 1].endPara = true;
  return out;
}

const listenBtn = $('btn-listen');
const voiceSel = $('voice-pick');
const voiceHint = $('voice-hint');
let narrator = null; // { speak(chunks, onDone), stop() } — null sans synthèse vocale

if (window.speechSynthesis && window.SpeechSynthesisUtterance) {
  let frVoices = [];
  let chosenURI = null;
  // même clé que l'épisode 3 : sur github.io (même origine), la voix choisie
  // par la famille se partage d'un épisode à l'autre — c'est voulu
  try { chosenURI = window.localStorage.getItem('ltt-voice'); } catch (e) { /* mode privé */ }

  const voiceScore = (v) => {
    const lang = (v.lang || '').replace('_', '-').toLowerCase();
    const name = (v.name || '').toLowerCase();
    let s = 0;
    if (lang.indexOf('fr-fr') === 0) s += 60;      // le français de France d'abord
    else if (lang.indexOf('fr') === 0) s += 20;
    if (lang.indexOf('fr-ca') === 0) s -= 30;      // l'accent québécois surprend ici
    // les voix neurales (Edge, Google…) et « premium » sont bien plus naturelles
    if (/natural|neural|online|premium|enhanced|am[ée]lior[ée]e|siri/.test(name)) s += 30;
    if (name.indexOf('google') !== -1) s += 24;
    if (/audrey|thomas|aur[ée]lie|marie|denise|henri|[ée]lo[ïi]se|vivienne|r[ée]my|jacqueline|charline|coralie|hortense/.test(name)) s += 12;
    if (!v.localService) s += 6;
    // les moteurs d'appoint et les voix rigolotes, très robotiques, en dernier
    if (/espeak|eloquence|compact|robot/.test(name)) s -= 50;
    if (/eddy|\bflo\b|grandma|grandpa|\breed\b|rocko|sandy|shelley|jester|bells|organ|superstar|trinoids|whisper|zarvox|bad news|bahh|boing|bubbles|cellos|wobble/.test(name)) s -= 40;
    return s;
  };

  const prettyName = (v) => {
    let n = v.name.replace(/^microsoft\s+/i, '')
      .replace(/\s*[-–—]\s*(french|fran[çc]ais).*$/i, '')
      .replace(/\s*\((french|fran[çc]ais)[^)]*\)\s*$/i, '');
    const lang = (v.lang || '').replace('_', '-');
    if (lang && lang.toLowerCase().indexOf('fr-fr') !== 0) n += ' · ' + lang;
    return n;
  };

  const refreshVoices = () => {
    const all = window.speechSynthesis.getVoices();
    frVoices = [];
    for (const v of all) {
      if ((v.lang || '').replace('_', '-').toLowerCase().indexOf('fr') === 0) frVoices.push(v);
    }
    frVoices.sort((a, b) => voiceScore(b) - voiceScore(a));
    if (voiceSel) {
      voiceSel.innerHTML = '';
      for (const v of frVoices) {
        const opt = document.createElement('option');
        opt.value = v.voiceURI;
        opt.textContent = prettyName(v);
        voiceSel.appendChild(opt);
      }
      let known = false;
      for (const v of frVoices) { if (v.voiceURI === chosenURI) known = true; }
      if (known) voiceSel.value = chosenURI;
      voiceSel.hidden = frVoices.length < 2;
    }
    if (voiceHint) {
      // en dessous de ce score, l'appareil n'a que des voix métalliques :
      // on souffle aux parents comment en obtenir une plus douce
      const best = frVoices.length ? voiceScore(frVoices[0]) : -1;
      voiceHint.hidden = best >= 84;
    }
  };
  refreshVoices();
  if ('onvoiceschanged' in window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = refreshVoices;
  }

  const pickVoice = () => {
    for (const v of frVoices) { if (v.voiceURI === chosenURI) return v; }
    return frVoices.length ? frVoices[0] : null;
  };

  // une lecture à la fois : gen invalide les onend des lectures annulées, et
  // le onDone de la lecture précédente est toujours prévenu qu'elle s'achève
  let gen = 0;
  let curDone = null;
  const settle = () => { const d = curDone; curDone = null; if (d) d(); };
  const stopSpeaking = () => { gen++; window.speechSynthesis.cancel(); settle(); };

  // ton de conteur : les phrases s'enchaînent avec de vraies pauses, sur un
  // débit posé, et un peu de relief là où le texte s'exclame ou questionne
  // (la synthèse du navigateur n'offre que rate et pitch — on s'en sert)
  const speakChunks = (chunks, onDone) => {
    stopSpeaking();
    refreshVoices(); // certaines listes de voix n'arrivent qu'après le chargement
    const myGen = gen;
    curDone = onDone || null;
    const voice = pickVoice();
    let at = 0;
    const speakNext = () => {
      if (myGen !== gen) return;
      if (at >= chunks.length) { settle(); return; }
      const c = chunks[at++];
      const u = new SpeechSynthesisUtterance(c.text);
      u.lang = voice ? voice.lang : 'fr-FR';
      if (voice) u.voice = voice;
      u.rate = 0.92; u.pitch = 1.04;
      if (/!\s*$/.test(c.text)) { u.rate = 0.96; u.pitch = 1.14; }  // l'émerveillement
      else if (/\?\s*$/.test(c.text)) { u.pitch = 1.12; }           // la question
      else if (c.text.indexOf('…') !== -1) { u.rate = 0.87; }       // le suspens
      u.onend = () => {
        if (myGen !== gen) return;
        window.setTimeout(speakNext, c.endPara ? 620 : 300);
      };
      u.onerror = () => { if (myGen === gen) settle(); };
      window.speechSynthesis.speak(u);
    };
    speakNext();
  };
  narrator = { speak: speakChunks, stop: stopSpeaking };

  // -- « Écouter l'histoire » : la boîte-révélation, phrase à phrase --
  listenBtn.hidden = false;
  let reading = false;
  const resetListen = () => {
    reading = false;
    listenBtn.textContent = '🔊 Écouter l’histoire';
    listenBtn.setAttribute('aria-pressed', 'false');
  };
  const startReading = () => {
    const chunks = [];
    const paras = $('explain-text').querySelectorAll('p');
    for (const para of paras) {
      for (const c of sentenceChunks(para.textContent, true)) chunks.push(c);
    }
    speakChunks(chunks, resetListen);
    reading = true;
    listenBtn.textContent = '⏹ Arrêter';
    listenBtn.setAttribute('aria-pressed', 'true');
  };
  listenBtn.addEventListener('click', () => {
    if (reading) { stopSpeaking(); return; } // le onDone remet le bouton
    startReading();
  });
  if (voiceSel) {
    voiceSel.addEventListener('change', () => {
      chosenURI = voiceSel.value;
      try { window.localStorage.setItem('ltt-voice', chosenURI); } catch (e) { /* tant pis */ }
      if (reading) startReading(); // on réécoute tout de suite avec la nouvelle voix
    });
  }
  window.addEventListener('pagehide', () => { window.speechSynthesis.cancel(); });
} else {
  $('btn-scn-voice').hidden = true; // pas de synthèse vocale : pas de version sonore
}

// ---- la version sonore des scénarios : quand l'enfant choisit un moment, le
// conteur raconte le même instant deux fois — depuis le jardin, puis depuis
// l'espace. On ne lit pas les bulles écrites telles quelles : à l'oral, il
// manque les enchaînements — le conteur ajoute « Dans ton jardin… » et
// « Et maintenant, vu de l'espace… », et retire les émojis, imprononçables. ----

const scnVoiceBtn = $('btn-scn-voice');
let scnVoiceOn = false;
// même clé que l'épisode 3 : la famille qui a déjà activé la voix là-bas la
// retrouve ici (même origine github.io) — c'est voulu
try { scnVoiceOn = window.localStorage.getItem('ltt-scn-voice') === '1'; } catch (e) { /* mode privé */ }

function setScnVoiceUi() {
  scnVoiceBtn.textContent = scnVoiceOn ? '🔊 la voix raconte' : '🔇 sans la voix';
  scnVoiceBtn.setAttribute('aria-pressed', scnVoiceOn ? 'true' : 'false');
}
setScnVoiceUi();
scnVoiceBtn.addEventListener('click', () => {
  scnVoiceOn = !scnVoiceOn;
  try { window.localStorage.setItem('ltt-scn-voice', scnVoiceOn ? '1' : '0'); } catch (e) { /* tant pis */ }
  setScnVoiceUi();
  if (!narrator) return;
  if (scnVoiceOn) tellScenario(); else narrator.stop();
});

const EMOJI_RE = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]/gu;

function spokenStory(scn) {
  // retirer un émoji laisse un espace orphelin devant le point final — et un
  // « . » isolé se fait lire « point » par certaines voix : on le recolle
  const clean = (t) => t.replace(EMOJI_RE, '').replace(/\s+/g, ' ')
    .replace(/\s+\./g, '.').trim();
  const chunks = [{ text: 'Dans ton jardin…', endPara: false }];
  for (const c of sentenceChunks(clean(scn.jardin), true)) chunks.push(c);
  chunks.push({ text: 'Et maintenant, vu de l’espace…', endPara: false });
  for (const c of sentenceChunks(clean(scn.espace), true)) chunks.push(c);
  return chunks;
}

function tellScenario() {
  if (narrator && scnVoiceOn && activeScn) {
    narrator.speak(spokenStory(activeScn));
  }
}

renderInvite();
setPlaying(sim.playing);
requestAnimationFrame(frame);
