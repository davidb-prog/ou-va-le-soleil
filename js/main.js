// Câblage de l'interface : boucle d'animation, curseur du temps, glissers et
// petits taps sur les deux vues, scénarios racontés, plein écran. Les deux
// vues sont TOUJOURS synchronisées sur la même heure sim.h — c'est le cœur
// du site : le même moment, deux regards.

import { TAU, wrap24, formatHM, periodWord, skyPhase, houseFacesSun,
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

const garden = new GardenView($('garden-view'));
const space = new SpaceView($('space-view'));

// ---- lecture / pause et curseur ----

const slider = $('time-slider');
let sliderHeld = false;

function setPlaying(p) {
  sim.playing = p;
  const btn = $('btn-spin');
  btn.textContent = p ? '⏸ Pause' : '▶ Le temps passe tout seul';
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
  if (sim.playing) setPlaying(false);
  setActiveScenario(null);
}

function toggleSpin() {
  sim.tween = null;
  setActiveScenario(null);
  setPlaying(!sim.playing);
}

$('btn-spin').addEventListener('click', toggleSpin);
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && !e.target.closest('button, input, a, summary')) {
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

function hideHint() {
  const hint = $('drag-hint');
  if (hint) hint.classList.add('hide');
}
setTimeout(hideHint, 8000);

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
  const w = Math.max(60, $('garden-view').clientWidth - 52);
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

function updateTexts() {
  setText('time', $('home-time'), formatHM(sim.h).text);
  setText('period', $('home-period'), periodWord(sim.h));
  setText('garden', $('garden-status'), GARDEN_STATUS[skyPhase(sim.h)]);
  setText('space', $('space-status'), houseFacesSun(sim.h)
    ? '🏠 Ta maison est du côté lumière : il fait jour chez toi'
    : '🏠 Ta maison tourne le dos au Soleil : il fait nuit chez toi');
  if (!sliderHeld) slider.value = sim.h;
}

// ---- boucle d'animation ----

const easeInOut = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

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
    garden.draw(sim.h);
    space.draw(sim.h);
    updateTexts();
  } finally {
    // la boucle survit à un raté de rendu ponctuel (canvas en cours de layout…)
    requestAnimationFrame(frame);
  }
}

renderInvite();
setPlaying(sim.playing);
requestAnimationFrame(frame);
