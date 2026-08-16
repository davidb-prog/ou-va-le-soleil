// Helpers canvas partagés par les deux vues — repris de l'épisode 3.
// Aucune constante du modèle ici : uniquement de la tuyauterie de dessin.

import { TAU } from './model.js';

// Ajuste le buffer du canvas à sa taille CSS (net sur écrans denses) et
// renvoie le contexte prêt à dessiner en coordonnées CSS.
export function fitCanvas(canvas) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = canvas.clientWidth, h = canvas.clientHeight;
  const bw = Math.max(1, Math.round(w * dpr)), bh = Math.max(1, Math.round(h * dpr));
  if (canvas.width !== bw || canvas.height !== bh) { canvas.width = bw; canvas.height = bh; }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx: ctx, w: w, h: h };
}

// Un semis d'étoiles stable (recalculé seulement quand la taille change),
// atténué par `alpha` (0 = invisible, 1 = pleine nuit).
export function drawStars(view, ctx, w, h, count, alpha) {
  const key = w + 'x' + h + ':' + count;
  if (view._starKey !== key) {
    view._starKey = key;
    view._stars = Array.from({ length: count }, () =>
      [Math.random() * w, Math.random() * h, Math.random() * 1.1 + 0.3, Math.random() * 0.5 + 0.15]);
  }
  ctx.fillStyle = '#fff';
  for (const [x, y, r, a] of view._stars) {
    ctx.globalAlpha = a * alpha;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// Texte avec halo sombre : lisible sur le jour comme sur la nuit.
// `clampW`/`clampH` : garde le texte à l'intérieur du canvas (mesure réelle).
export function label(ctx, text, x, y, opts) {
  const o = opts || {};
  const size = o.size || 11;
  const weight = o.weight || 700;
  const align = o.align || 'left';
  ctx.font = weight + ' ' + size + 'px system-ui, sans-serif';
  if (o.clampW) {
    const tw = ctx.measureText(text).width;
    if (align === 'left') x = Math.min(x, o.clampW - tw - 5);
    else if (align === 'right') x = Math.max(x, tw + 5);
    else x = Math.max(tw / 2 + 5, Math.min(x, o.clampW - tw / 2 - 5));
  }
  if (o.clampH) y = Math.max(size * 0.7 + 3, Math.min(y, o.clampH - size * 0.7 - 3));
  ctx.textAlign = align;
  ctx.textBaseline = o.baseline || 'middle';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(7, 11, 23, 0.85)';
  ctx.lineWidth = Math.max(3, size * 0.3);
  ctx.globalAlpha = o.alpha === undefined ? 1 : o.alpha;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = o.color || 'rgba(205, 215, 240, 0.9)';
  ctx.fillText(text, x, y);
  ctx.globalAlpha = 1;
}
