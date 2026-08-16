// La vue « depuis ton jardin » : on regarde vers le SUD. Le soleil se lève à
// gauche (l'est), culmine au milieu (le sud), se couche à droite (l'ouest).
// Le ciel change de couleur en continu, les ombres s'allongent et tournent —
// tout est piloté par le modèle pur (js/model.js), rien n'est recalculé ici.

import { TAU, clamp01, sunAltitude, sunAzimuth01, antipodeHours, skyStops,
         starAlpha, shadowLength, shadowDirX, COLOR_HOME, COLOR_SUN,
         hexToRgb, mixRgb, rgbCss } from './model.js';
import { fitCanvas, drawStars, label } from './canvas.js';

const SIL = '#0a0f22'; // couleur des silhouettes en pleine nuit

// Une couleur du décor, éteinte vers la silhouette quand la lumière baisse
// (k = 1 en plein jour, 0 en pleine nuit).
function shade(hex, k) {
  return rgbCss(mixRgb(hexToRgb(SIL), hexToRgb(hex), clamp01(k)));
}

export class GardenView {
  constructor(canvas) { this.canvas = canvas; }

  // Position du soleil (ou de la lune) à l'écran pour une heure donnée.
  // Marge de 42 px : au lever et au coucher, le disque reste entier à l'écran.
  spot(hh, w, horizon) {
    const az = sunAzimuth01(hh);
    const alt = sunAltitude(hh);
    return {
      x: 42 + az * (w - 84),
      y: horizon - Math.max(-0.2, alt) * (horizon - 30),
    };
  }

  draw(h) {
    const f = fitCanvas(this.canvas);
    const ctx = f.ctx, w = f.w, H = f.h;
    const horizon = Math.round(H * 0.72);
    const s = w / 600; // échelle générale du décor
    const alt = sunAltitude(h);
    const dayK = clamp01(alt * 2.2 + 0.25); // lumière du décor (1 jour, 0 nuit)

    // ---- le ciel, en continu sur 24 h
    const stops = skyStops(h);
    const g = ctx.createLinearGradient(0, 0, 0, horizon);
    g.addColorStop(0, stops[0]); g.addColorStop(0.55, stops[1]); g.addColorStop(1, stops[2]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, horizon);

    // ---- les étoiles, quand le soleil est bien couché
    const sa = starAlpha(h);
    if (sa > 0) drawStars(this, ctx, w, horizon * 0.94, 70, sa);

    // ---- la trajectoire du soleil (arc pointillé), visible tant qu'il fait clair
    const arcA = clamp01((alt + 0.28) * 2.2) * 0.4;
    if (arcA > 0.02) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 207, 92, ' + arcA + ')';
      ctx.lineWidth = 2;
      ctx.setLineDash([1, 9]);
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let hh = 6; hh <= 18.001; hh += 0.4) {
        const p = this.spot(hh, w, horizon);
        if (hh === 6) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
      ctx.restore();
    }

    // ---- le soleil (jamais sous terre : passé l'horizon, il a disparu)
    if (alt > -0.14) {
      const p = this.spot(h, w, horizon);
      const warm = clamp01(1 - alt * 1.5); // orangé quand il est bas
      const core = rgbCss(mixRgb(hexToRgb(COLOR_SUN), hexToRgb('#ff8a3c'), warm * 0.8));
      const R = 15 * Math.max(0.8, s);
      const glow = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, R * 3);
      glow.addColorStop(0, core);
      glow.addColorStop(0.45, 'rgba(255, 175, 70, 0.45)');
      glow.addColorStop(1, 'rgba(255, 159, 28, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(p.x, p.y, R * 3, 0, TAU); ctx.fill();
      ctx.fillStyle = core;
      ctx.beginPath(); ctx.arc(p.x, p.y, R, 0, TAU); ctx.fill();
      // deux petits yeux et un sourire, parce qu'on a 5 ans
      const k = clamp01(alt * 4 + 0.4);
      if (k > 0.3) {
        ctx.globalAlpha = k;
        ctx.fillStyle = 'rgba(90, 50, 5, 0.85)';
        ctx.beginPath(); ctx.arc(p.x - R * 0.32, p.y - R * 0.15, R * 0.09, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(p.x + R * 0.32, p.y - R * 0.15, R * 0.09, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(90, 50, 5, 0.85)';
        ctx.lineWidth = R * 0.09; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(p.x, p.y + R * 0.12, R * 0.38, 0.25 * Math.PI, 0.75 * Math.PI);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }

    // ---- la lune, pile à l'opposé du soleil (elle veille sur la nuit).
    // Dessinée en CROISSANT, le pictogramme universel de la nuit : impossible
    // de la confondre avec le soleil, même du coin de l'œil. Orientation fixe
    // (ouverture à gauche, comme le 🌙 du reste du site) — un croissant qui
    // pivoterait en traversant le ciel serait plus étrange qu'utile. Licence
    // assumée et documentée : une lune à l'opposé du soleil serait pleine en
    // vrai — les phases, c'est l'épisode 1.
    const mAlt = sunAltitude(antipodeHours(h));
    if (mAlt > 0.05) {
      const p = this.spot(antipodeHours(h), w, horizon);
      const mr = 12 * Math.max(0.8, s);
      ctx.globalAlpha = clamp01((mAlt - 0.05) * 3);
      ctx.save();
      ctx.shadowColor = 'rgba(233, 237, 248, 0.8)'; ctx.shadowBlur = 14;
      ctx.fillStyle = '#e6ecfa';
      this.crescentPath(ctx, p.x, p.y, mr, mr * 0.45, mr * 0.82);
      ctx.fill();
      ctx.restore();
      // deux petits cratères sur la partie charnue (à droite)
      ctx.fillStyle = '#bcc8e2';
      ctx.beginPath(); ctx.arc(p.x + mr * 0.48, p.y - mr * 0.22, mr * 0.17, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(p.x + mr * 0.38, p.y + mr * 0.34, mr * 0.12, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
    }

    // ---- deux nuages qui se promènent en plein jour
    const cloudA = clamp01(alt * 2 - 0.15) * 0.85;
    if (cloudA > 0) {
      ctx.fillStyle = 'rgba(255, 255, 255, ' + cloudA + ')';
      const drift = (h * 14 * s) % (w + 120) - 60;
      this.cloud(ctx, drift, 28 * s + 6, 1.1 * s);
      this.cloud(ctx, ((drift + w * 0.55) + 60) % (w + 120) - 60, 52 * s + 6, 0.8 * s);
    }

    // ---- le sol : l'herbe du jardin, éteinte la nuit
    const gg = ctx.createLinearGradient(0, horizon, 0, H);
    gg.addColorStop(0, shade('#2f7d54', dayK * 0.9 + 0.1));
    gg.addColorStop(1, shade('#1f5a3d', dayK * 0.9 + 0.1));
    ctx.fillStyle = gg;
    ctx.fillRect(0, horizon, w, H - horizon);

    // ---- les ombres (sous les objets), puis le décor par-dessus
    const shLen = shadowLength(h);
    const shDir = shadowDirX(h);
    const shA = 0.34 * clamp01(alt * 3.5);
    const shadow = (x, baseY, objH, minR) => {
      if (shLen <= 0 || shA <= 0.01) return;
      const dx = shDir * shLen * objH;
      const rx = Math.max(minR, Math.abs(dx) / 2);
      ctx.fillStyle = 'rgba(7, 11, 23, ' + shA + ')';
      ctx.beginPath();
      ctx.ellipse(x + dx / 2, baseY, rx, 5.5 * s, 0, 0, TAU);
      ctx.fill();
    };

    // la maison un peu décalée : le soleil levant a la place de se montrer à l'est
    const houseX = w * 0.2, houseW = 96 * s, houseH = 74 * s;
    const treeX = w * 0.64, treeH = 92 * s;
    const childX = w * 0.44, childH = 40 * s;
    const childHere = h >= 7 && h < 20.5; // au dodo la nuit !

    shadow(houseX, horizon + 4 * s, houseH * 0.85, houseW * 0.44);
    shadow(treeX, horizon + 4 * s, treeH * 0.8, 15 * s);
    if (childHere) shadow(childX, horizon + 7 * s, childH, 7 * s);

    this.house(ctx, houseX, horizon + 4 * s, s, dayK, alt < -0.02);
    this.tree(ctx, treeX, horizon + 4 * s, s, dayK);
    if (childHere) this.child(ctx, childX, horizon + 7 * s, s, dayK);
    this.flowers(ctx, w, horizon, H, s, dayK);

    // ---- les points cardinaux, posés sur l'herbe (le parent les montre du doigt)
    const cardY = H - 11 * s;
    label(ctx, 'est', 10 + 8 * s, cardY, { size: 10.5, color: 'rgba(233, 237, 248, 0.75)', clampW: w, clampH: H });
    label(ctx, 'sud', w / 2, cardY, { size: 10.5, align: 'center', color: 'rgba(233, 237, 248, 0.75)', clampW: w, clampH: H });
    label(ctx, 'ouest', w - 10 - 8 * s, cardY, { size: 10.5, align: 'right', color: 'rgba(233, 237, 248, 0.75)', clampW: w, clampH: H });
  }

  // Trace un croissant de lune : le disque (rayon r) mordu par un cercle
  // décalé de `biteDx` vers la gauche (rayon biteR). Un seul chemin fermé —
  // grand arc extérieur par la droite, puis remontée le long de la morsure —
  // donc le halo (shadowBlur) épouse la forme du croissant, et les étoiles
  // restent visibles dans le creux.
  crescentPath(ctx, x, y, r, biteDx, biteR) {
    const d = biteDx;
    const a = (r * r - biteR * biteR + d * d) / (2 * d); // corde d'intersection
    const hh = Math.sqrt(Math.max(0, r * r - a * a));
    const t1 = Math.atan2(hh, -a), t2 = Math.atan2(-hh, -a);   // cornes, sur le disque
    const u1 = Math.atan2(hh, d - a), u2 = Math.atan2(-hh, d - a); // cornes, sur la morsure
    ctx.beginPath();
    ctx.arc(x, y, r, t1, t2, true);            // l'extérieur, en passant par la droite
    ctx.arc(x - d, y, biteR, u2, u1, false);   // l'intérieur, le long de la morsure
    ctx.closePath();
  }

  cloud(ctx, x, y, k) {
    ctx.beginPath();
    ctx.arc(x, y, 11 * k, 0, TAU);
    ctx.arc(x + 12 * k, y - 5 * k, 8.5 * k, 0, TAU);
    ctx.arc(x + 24 * k, y, 9.5 * k, 0, TAU);
    ctx.fill();
  }

  // La maison : murs chaleureux, toit rose, cheminée — la fenêtre s'allume la nuit.
  house(ctx, x, baseY, s, dayK, lit) {
    const bw = 96 * s, bh = 56 * s;
    const y = baseY - bh;
    ctx.fillStyle = shade('#e8bd82', dayK * 0.85 + 0.15);
    ctx.fillRect(x - bw / 2, y, bw, bh);
    // le toit
    ctx.fillStyle = shade('#d0596e', dayK * 0.85 + 0.15);
    ctx.beginPath();
    ctx.moveTo(x - bw / 2 - 10 * s, y);
    ctx.lineTo(x, y - 34 * s);
    ctx.lineTo(x + bw / 2 + 10 * s, y);
    ctx.closePath(); ctx.fill();
    // la cheminée
    ctx.fillStyle = shade('#b0687a', dayK * 0.85 + 0.15);
    ctx.fillRect(x + bw * 0.22, y - 30 * s, 11 * s, 20 * s);
    // la porte
    ctx.fillStyle = shade('#7a4a2b', dayK * 0.8 + 0.2);
    const dw = 18 * s, dh = 30 * s;
    ctx.fillRect(x - bw * 0.32 - dw / 2, baseY - dh, dw, dh);
    ctx.fillStyle = shade('#ffcf5c', dayK * 0.6 + 0.2);
    ctx.beginPath(); ctx.arc(x - bw * 0.32 + dw * 0.24, baseY - dh * 0.48, 1.8 * s, 0, TAU); ctx.fill();
    // la fenêtre : ciel le jour, lumière dorée la nuit
    const wx = x + bw * 0.14, wy = y + bh * 0.24, ww = 26 * s, wh = 22 * s;
    if (lit) { ctx.save(); ctx.shadowColor = COLOR_SUN; ctx.shadowBlur = 16; }
    ctx.fillStyle = lit ? COLOR_SUN : shade('#bfe0ff', dayK * 0.8 + 0.1);
    ctx.fillRect(wx, wy, ww, wh);
    if (lit) ctx.restore();
    ctx.strokeStyle = shade('#8a5a36', dayK * 0.8 + 0.2);
    ctx.lineWidth = Math.max(1.5, 2 * s);
    ctx.strokeRect(wx, wy, ww, wh);
    ctx.beginPath();
    ctx.moveTo(wx + ww / 2, wy); ctx.lineTo(wx + ww / 2, wy + wh);
    ctx.moveTo(wx, wy + wh / 2); ctx.lineTo(wx + ww, wy + wh / 2);
    ctx.stroke();
  }

  // L'arbre : un tronc et trois boules de feuillage.
  tree(ctx, x, baseY, s, dayK) {
    ctx.fillStyle = shade('#8a5a36', dayK * 0.85 + 0.15);
    ctx.fillRect(x - 6 * s, baseY - 46 * s, 12 * s, 46 * s);
    ctx.beginPath();
    ctx.moveTo(x - 6 * s, baseY - 30 * s);
    ctx.quadraticCurveTo(x - 20 * s, baseY - 38 * s, x - 26 * s, baseY - 50 * s);
    ctx.lineTo(x - 18 * s, baseY - 46 * s);
    ctx.closePath(); ctx.fill();
    const leaf1 = shade('#3f9e63', dayK * 0.85 + 0.15);
    const leaf2 = shade('#2f7f4f', dayK * 0.85 + 0.15);
    ctx.fillStyle = leaf2;
    ctx.beginPath(); ctx.arc(x - 22 * s, baseY - 62 * s, 22 * s, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 20 * s, baseY - 60 * s, 24 * s, 0, TAU); ctx.fill();
    ctx.fillStyle = leaf1;
    ctx.beginPath(); ctx.arc(x - 2 * s, baseY - 76 * s, 26 * s, 0, TAU); ctx.fill();
  }

  // Toi, dans le jardin (au lit entre 20 h 30 et 7 h !).
  child(ctx, x, baseY, s, dayK) {
    const hh = 40 * s;
    // les jambes
    ctx.strokeStyle = shade('#3f6db3', dayK * 0.85 + 0.15);
    ctx.lineWidth = 5 * s; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x - 3.5 * s, baseY - hh * 0.32); ctx.lineTo(x - 4 * s, baseY);
    ctx.moveTo(x + 3.5 * s, baseY - hh * 0.32); ctx.lineTo(x + 4 * s, baseY);
    ctx.stroke();
    // le corps (t-shirt rose de la série)
    ctx.fillStyle = shade(COLOR_HOME, dayK * 0.85 + 0.15);
    ctx.beginPath();
    ctx.moveTo(x - 7.5 * s, baseY - hh * 0.62);
    ctx.lineTo(x + 7.5 * s, baseY - hh * 0.62);
    ctx.lineTo(x + 6 * s, baseY - hh * 0.28);
    ctx.lineTo(x - 6 * s, baseY - hh * 0.28);
    ctx.closePath(); ctx.fill();
    // les bras : un tendu vers le ciel (coucou le soleil !)
    ctx.strokeStyle = shade('#ffd9b0', dayK * 0.85 + 0.15);
    ctx.lineWidth = 3.6 * s;
    ctx.beginPath();
    ctx.moveTo(x - 6 * s, baseY - hh * 0.56); ctx.lineTo(x - 13 * s, baseY - hh * 0.86);
    ctx.moveTo(x + 6 * s, baseY - hh * 0.56); ctx.lineTo(x + 11 * s, baseY - hh * 0.4);
    ctx.stroke();
    // la tête
    ctx.fillStyle = shade('#ffd9b0', dayK * 0.85 + 0.15);
    ctx.beginPath(); ctx.arc(x, baseY - hh * 0.78, 7.5 * s, 0, TAU); ctx.fill();
    // les cheveux
    ctx.fillStyle = shade('#4a3524', dayK * 0.85 + 0.15);
    ctx.beginPath();
    ctx.arc(x, baseY - hh * 0.82, 7.5 * s, Math.PI, TAU);
    ctx.fill();
  }

  flowers(ctx, w, horizon, H, s, dayK) {
    const spots = [[0.06, 0.5, '#ff6b9d'], [0.33, 0.75, '#a98bff'], [0.87, 0.6, '#ffcf5c'], [0.95, 0.85, '#ff6b9d']];
    for (const [fx, fy, col] of spots) {
      const x = fx * w, y = horizon + (H - horizon) * fy;
      ctx.strokeStyle = shade('#2f7f4f', dayK * 0.85 + 0.15);
      ctx.lineWidth = 2 * s;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 9 * s); ctx.stroke();
      ctx.fillStyle = shade(col, dayK * 0.85 + 0.15);
      for (let i = 0; i < 5; i++) {
        const a = i * TAU / 5;
        ctx.beginPath();
        ctx.arc(x + Math.cos(a) * 3.4 * s, y - 9 * s + Math.sin(a) * 3.4 * s, 2.2 * s, 0, TAU);
        ctx.fill();
      }
      ctx.fillStyle = shade('#fff7d6', dayK * 0.85 + 0.15);
      ctx.beginPath(); ctx.arc(x, y - 9 * s, 1.8 * s, 0, TAU); ctx.fill();
    }
  }
}
