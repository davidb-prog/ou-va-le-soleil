// La vue « depuis l'espace » : la Terre vue de dessus, depuis au-dessus du pôle
// Nord (le rond clair au centre). Le Soleil est FIXE sur le côté droit de
// l'écran — il ne bouge JAMAIS, c'est l'acquis dur de l'épisode 3. La Terre
// tourne vers l'est (sens inverse des aiguilles d'une montre vue d'ici), la
// moitié tournée vers le Soleil est éclairée, l'autre est dans la nuit.
//
// Géométrie : pour un point accroché à la Terre à l'angle β (repère Terre),
// l'angle « canvas » vaut κ = β − earthAngle(h) ; la maison (β = 0) est donc
// plein côté Soleil à midi et à l'opposé à minuit — exactement comme la vérité
// testée houseFacesSun() du modèle.

import { TAU, DEG, earthAngle, COLOR_HOME, COLOR_FAR, COLOR_SUN,
         COLOR_SUN_DEEP } from './model.js';
import { fitCanvas, drawStars, label } from './canvas.js';

// Le décor accroché à la Terre (repère Terre, unité = rayon R) : deux îles aux
// marqueurs, quelques continents ronds, des petites lumières de villes.
const HOME_ISLAND = { x: 0.8, y: 0, r: 0.15 };
const FAR_ISLAND = { x: -0.8, y: 0, r: 0.14 };
const CONTINENTS = [
  { x: 0.42, y: -0.34, r: 0.3 }, { x: 0.14, y: -0.58, r: 0.24 },
  { x: 0.52, y: 0.3, r: 0.19 },
  { x: -0.44, y: 0.38, r: 0.28 }, { x: -0.12, y: 0.62, r: 0.2 },
  { x: -0.52, y: -0.42, r: 0.2 },
];
const CITY_LIGHTS = [
  [55, 0.66], [100, 0.52], [140, 0.62], [175, 0.76], [205, 0.55],
  [250, 0.68], [300, 0.74], [335, 0.6],
]; // [angle β en degrés, rayon relatif]

export class SpaceView {
  constructor(canvas) { this.canvas = canvas; this.layout = null; }

  draw(h) {
    const f = fitCanvas(this.canvas);
    const ctx = f.ctx, w = f.w, H = f.h;
    const M = Math.min(w, H);
    const R = M * 0.3;
    const cx = w * 0.4, cy = H * 0.53;
    const sunR = M * 0.115;
    const sunX = w - sunR - M * 0.035, sunY = cy;
    this.layout = { cx: cx, cy: cy, R: R };
    const A = earthAngle(h);

    // ---- le fond de l'espace
    ctx.fillStyle = '#070b17';
    ctx.fillRect(0, 0, w, H);
    drawStars(this, ctx, w, H, 90, 1);

    // ---- la lumière du Soleil qui arrive sur la Terre (flèches fixes)
    const rayX0 = cx + R + M * 0.02, rayX1 = sunX - sunR - M * 0.015;
    if (rayX1 > rayX0 + 12) {
      ctx.strokeStyle = 'rgba(255, 207, 92, 0.42)';
      ctx.fillStyle = 'rgba(255, 207, 92, 0.55)';
      ctx.lineWidth = Math.max(1.6, M * 0.006);
      for (const dy of [-0.42, 0, 0.42]) {
        const y = cy + dy * R;
        ctx.beginPath(); ctx.moveTo(rayX1, y); ctx.lineTo(rayX0 + 7, y); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(rayX0, y);
        ctx.lineTo(rayX0 + 9, y - 4.5);
        ctx.lineTo(rayX0 + 9, y + 4.5);
        ctx.closePath(); ctx.fill();
      }
    }

    // ---- la Terre (tout ce qui est « accroché » à elle tourne avec elle)
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.clip();

    // l'océan
    const og = ctx.createRadialGradient(cx, cy, R * 0.1, cx, cy, R);
    og.addColorStop(0, '#4a90e0'); og.addColorStop(1, '#2f6cb8');
    ctx.fillStyle = og;
    ctx.fillRect(cx - R, cy - R, 2 * R, 2 * R);

    // les continents, dans le repère de la Terre (ils tournent avec elle)
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-A);
    ctx.fillStyle = '#4fc79f';
    for (const c of CONTINENTS.concat([HOME_ISLAND, FAR_ISLAND])) {
      ctx.beginPath(); ctx.arc(c.x * R, c.y * R, c.r * R, 0, TAU); ctx.fill();
    }
    ctx.restore();

    // le pôle Nord, pile au centre (on regarde la Terre de dessus !)
    ctx.fillStyle = 'rgba(223, 233, 245, 0.92)';
    ctx.beginPath(); ctx.arc(cx, cy, R * 0.14, 0, TAU); ctx.fill();

    // un voile de lumière côté Soleil…
    const lg = ctx.createLinearGradient(cx + R, 0, cx - R * 0.2, 0);
    lg.addColorStop(0, 'rgba(255, 247, 214, 0.22)');
    lg.addColorStop(1, 'rgba(255, 247, 214, 0)');
    ctx.fillStyle = lg;
    ctx.fillRect(cx - R, cy - R, 2 * R, 2 * R);

    // …et la moitié nuit à l'opposé (à gauche, toujours), avec un crépuscule doux
    ctx.fillStyle = 'rgba(8, 17, 42, 0.82)';
    ctx.beginPath();
    ctx.arc(cx, cy, R, -Math.PI / 2, Math.PI / 2, true);
    ctx.closePath(); ctx.fill();
    const tg = ctx.createLinearGradient(cx - R * 0.06, 0, cx + R * 0.2, 0);
    tg.addColorStop(0, 'rgba(8, 17, 42, 0.82)');
    tg.addColorStop(1, 'rgba(8, 17, 42, 0)');
    ctx.fillStyle = tg;
    ctx.fillRect(cx - R * 0.06, cy - R, R * 0.26 + R * 0.06, 2 * R);

    // les petites lumières des villes, sur la face nuit
    for (const [bDeg, rr] of CITY_LIGHTS) {
      const k = bDeg * DEG - A;
      if (Math.cos(k) > -0.1) continue; // encore côté jour
      const x = cx + rr * R * Math.cos(k), y = cy + rr * R * Math.sin(k);
      ctx.fillStyle = 'rgba(255, 207, 92, 0.9)';
      ctx.beginPath(); ctx.arc(x, y, Math.max(1.3, R * 0.014), 0, TAU); ctx.fill();
    }
    ctx.restore();

    // la limite jour/nuit en pointillés, et le bord du disque
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 7]);
    ctx.beginPath(); ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy + R); ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = 'rgba(150, 180, 240, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
    // le liseré doré du côté qui reçoit la lumière
    ctx.strokeStyle = 'rgba(255, 223, 120, 0.55)';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(cx, cy, R + 1, -80 * DEG, 80 * DEG); ctx.stroke();

    // ---- « jour » / « nuit », écrits sur le disque
    label(ctx, '☀️ jour', cx + R * 0.52, cy + R * 0.66,
      { align: 'center', size: Math.max(10, M * 0.032), color: 'rgba(255, 236, 190, 0.95)', clampW: w, clampH: H });
    label(ctx, '🌙 nuit', cx - R * 0.52, cy + R * 0.66,
      { align: 'center', size: Math.max(10, M * 0.032), color: 'rgba(200, 212, 240, 0.95)', clampW: w, clampH: H });

    // ---- chez toi (β = 0) et les enfants de l'autre côté (β = π)
    const kHome = -A;
    this.houseMarker(ctx, cx + R * 0.86 * Math.cos(kHome), cy + R * 0.86 * Math.sin(kHome),
      Math.max(9, R * 0.15), Math.cos(kHome) < 0);
    label(ctx, 'chez toi', cx + R * 0.55 * Math.cos(kHome), cy + R * 0.55 * Math.sin(kHome),
      { align: 'center', size: Math.max(10, M * 0.03), color: '#ffb3cd', clampW: w, clampH: H });

    const kFar = kHome + Math.PI;
    const fx = cx + R * 0.86 * Math.cos(kFar), fy = cy + R * 0.86 * Math.sin(kFar);
    ctx.save();
    ctx.shadowColor = COLOR_FAR; ctx.shadowBlur = 10;
    ctx.fillStyle = COLOR_FAR;
    ctx.beginPath(); ctx.arc(fx, fy, Math.max(4.5, R * 0.055), 0, TAU); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.arc(fx, fy, Math.max(4.5, R * 0.055), 0, TAU); ctx.stroke();
    const fsz = Math.max(9, M * 0.026);
    label(ctx, 'les enfants', cx + R * 0.55 * Math.cos(kFar), cy + R * 0.55 * Math.sin(kFar) - fsz * 0.62,
      { align: 'center', size: fsz, color: '#8fe0cb', clampW: w, clampH: H });
    label(ctx, 'de l’autre côté', cx + R * 0.55 * Math.cos(kFar), cy + R * 0.55 * Math.sin(kFar) + fsz * 0.62,
      { align: 'center', size: fsz, color: '#8fe0cb', clampW: w, clampH: H });

    // ---- la flèche du sens de rotation (vers l'est), au-dessus du disque
    ctx.save();
    ctx.strokeStyle = 'rgba(233, 237, 248, 0.7)';
    ctx.fillStyle = 'rgba(233, 237, 248, 0.8)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.arc(cx, cy, R + M * 0.032, -42 * DEG, -132 * DEG, true);
    ctx.stroke();
    ctx.setLineDash([]);
    const ka = -132 * DEG, ra = R + M * 0.032;
    const ax = cx + ra * Math.cos(ka), ay = cy + ra * Math.sin(ka);
    const vx = Math.sin(ka), vy = -Math.cos(ka); // tangente, sens de rotation
    ctx.beginPath();
    ctx.moveTo(ax + vx * 11, ay + vy * 11);
    ctx.lineTo(ax - vx * 2 + Math.cos(ka) * 5, ay - vy * 2 + Math.sin(ka) * 5);
    ctx.lineTo(ax - vx * 2 - Math.cos(ka) * 5, ay - vy * 2 - Math.sin(ka) * 5);
    ctx.closePath(); ctx.fill();
    ctx.restore();
    label(ctx, 'la Terre tourne', cx, cy - R - M * 0.06,
      { align: 'center', size: Math.max(10, M * 0.03), color: 'rgba(205, 215, 240, 0.9)', clampW: w, clampH: H });

    // ---- le Soleil, FIXE sur le côté droit — il ne bouge jamais
    const sg = ctx.createRadialGradient(sunX, sunY, 1, sunX, sunY, sunR * 2.4);
    sg.addColorStop(0, 'rgba(255, 247, 214, 0.9)');
    sg.addColorStop(0.4, 'rgba(255, 207, 92, 0.35)');
    sg.addColorStop(1, 'rgba(255, 159, 28, 0)');
    ctx.fillStyle = sg;
    ctx.beginPath(); ctx.arc(sunX, sunY, sunR * 2.4, 0, TAU); ctx.fill();
    ctx.strokeStyle = COLOR_SUN;
    ctx.lineWidth = Math.max(2, sunR * 0.09);
    ctx.lineCap = 'round';
    for (let i = 0; i < 12; i++) {
      const a = i * TAU / 12 + 0.26;
      ctx.beginPath();
      ctx.moveTo(sunX + Math.cos(a) * sunR * 1.25, sunY + Math.sin(a) * sunR * 1.25);
      ctx.lineTo(sunX + Math.cos(a) * sunR * 1.6, sunY + Math.sin(a) * sunR * 1.6);
      ctx.stroke();
    }
    const sc = ctx.createRadialGradient(sunX - sunR * 0.25, sunY - sunR * 0.25, 1, sunX, sunY, sunR);
    sc.addColorStop(0, '#fff7d6'); sc.addColorStop(0.6, COLOR_SUN); sc.addColorStop(1, COLOR_SUN_DEEP);
    ctx.fillStyle = sc;
    ctx.beginPath(); ctx.arc(sunX, sunY, sunR, 0, TAU); ctx.fill();
    label(ctx, 'le Soleil', sunX, sunY + sunR * 1.75 + 8,
      { align: 'center', size: Math.max(11, M * 0.034), color: COLOR_SUN, clampW: w, clampH: H });
    label(ctx, 'il ne bouge pas !', sunX, sunY + sunR * 1.75 + 8 + Math.max(11, M * 0.034),
      { align: 'center', size: Math.max(9, M * 0.026), weight: 400, color: 'rgba(255, 223, 140, 0.85)', clampW: w, clampH: H });
  }

  // La petite maison rose « chez toi », accrochée au bord du disque ; sa
  // fenêtre s'allume quand elle passe du côté nuit (comme dans le jardin !).
  houseMarker(ctx, x, y, size, night) {
    ctx.save();
    ctx.shadowColor = COLOR_HOME; ctx.shadowBlur = 12;
    ctx.fillStyle = COLOR_HOME;
    const bw = size, bh = size * 0.62;
    ctx.fillRect(x - bw / 2, y - bh / 2, bw, bh);
    ctx.beginPath();
    ctx.moveTo(x - bw * 0.62, y - bh / 2);
    ctx.lineTo(x, y - bh / 2 - size * 0.55);
    ctx.lineTo(x + bw * 0.62, y - bh / 2);
    ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.lineWidth = Math.max(1.4, size * 0.1);
    ctx.lineJoin = 'round';
    ctx.strokeRect(x - bw / 2, y - bh / 2, bw, bh);
    ctx.beginPath();
    ctx.moveTo(x - bw * 0.62, y - bh / 2);
    ctx.lineTo(x, y - bh / 2 - size * 0.55);
    ctx.lineTo(x + bw * 0.62, y - bh / 2);
    ctx.stroke();
    ctx.fillStyle = night ? COLOR_SUN : 'rgba(255, 255, 255, 0.85)';
    if (night) { ctx.save(); ctx.shadowColor = COLOR_SUN; ctx.shadowBlur = 8; }
    ctx.fillRect(x - bw * 0.18, y - bh * 0.22, bw * 0.36, bh * 0.5);
    if (night) ctx.restore();
  }
}
