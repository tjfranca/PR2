// =============================================================
// Renderizador "pixel puppet" — desenha cada lutador por código
// (sem nenhuma imagem real de pessoa), com paleta e acessórios
// próprios por personagem. Visual estilizado tipo cartoon 16-bit.
// =============================================================

const UNIT = 60; // altura de referência do boneco, em "unidades"

function shade(hex, amt) {
  const c = hex.replace('#', '');
  const num = parseInt(c, 16);
  let r = (num >> 16) + amt;
  let g = ((num >> 8) & 0xff) + amt;
  let b = (num & 0xff) + amt;
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  return `rgb(${r},${g},${b})`;
}

function limb(ctx, ax, ay, bx, by, cx, cy, width, color) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#1a1208';
  ctx.lineWidth = width + 3;
  ctx.beginPath();
  ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.lineTo(cx, cy);
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.lineTo(cx, cy);
  ctx.stroke();
}

function outlinedRect(ctx, x, y, w, h, color) {
  ctx.fillStyle = '#1a1208';
  ctx.fillRect(x - w / 2 - 1, y - 1, w + 2, h + 2);
  ctx.fillStyle = color;
  ctx.fillRect(x - w / 2, y, w, h);
}

function outlinedCircle(ctx, x, y, r, color) {
  ctx.fillStyle = '#1a1208';
  ctx.beginPath(); ctx.arc(x, y, r + 1.4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
}

// -------------------------------------------------------------
// Pose procedural — recebe (action, t[s], blend 0..1) e devolve
// coordenadas relativas (em unidades, x>0 = sentido da frente).
// -------------------------------------------------------------
export function computePose(action, t, extra = {}) {
  const pose = {
    hipY: 28, shoulderY: 46, headBob: 0, lean: 0, headTilt: 0,
    armBack: { elbow: { x: -4, y: 38 }, hand: { x: -5, y: 29 } },
    armFront: { elbow: { x: 4, y: 38 }, hand: { x: 6, y: 29 } },
    legBack: { knee: { x: -4, y: 15 }, foot: { x: -6, y: 0 } },
    legFront: { knee: { x: 4, y: 15 }, foot: { x: 6, y: 0 } },
    propHand: 'front'
  };

  const sw = (f) => Math.sin(t * f);

  switch (action) {
    case 'idle': {
      const b = sw(3.2) * 1.1;
      pose.hipY += b * 0.4; pose.shoulderY += b;
      pose.armFront.hand.y += sw(3.2 + 1) * 0.8;
      pose.armBack.hand.y += sw(3.2 + 1.4) * 0.8;
      break;
    }
    case 'walk': {
      const cyc = t * 9;
      const s1 = Math.sin(cyc), s2 = Math.sin(cyc + Math.PI);
      pose.legFront.foot.x = 6 + s1 * 6;
      pose.legFront.foot.y = Math.max(0, s1) * 4;
      pose.legFront.knee.x = 4 + s1 * 3;
      pose.legBack.foot.x = -6 + s2 * 6;
      pose.legBack.foot.y = Math.max(0, s2) * 4;
      pose.legBack.knee.x = -4 + s2 * 3;
      pose.armFront.hand.x = 6 - s1 * 5;
      pose.armBack.hand.x = -5 - s2 * 5;
      pose.hipY += Math.abs(Math.sin(cyc)) * 1.6;
      pose.shoulderY += Math.abs(Math.sin(cyc)) * 1.6;
      break;
    }
    case 'jump': {
      pose.legFront.knee = { x: 6, y: 20 };
      pose.legFront.foot = { x: 8, y: 10 };
      pose.legBack.knee = { x: -6, y: 18 };
      pose.legBack.foot = { x: -3, y: 6 };
      pose.armFront.elbow = { x: 8, y: 44 };
      pose.armFront.hand = { x: 10, y: 50 };
      pose.armBack.elbow = { x: -8, y: 40 };
      pose.armBack.hand = { x: -10, y: 46 };
      break;
    }
    case 'crouch': {
      pose.hipY = 18; pose.shoulderY = 34;
      pose.legFront.knee = { x: 7, y: 10 }; pose.legFront.foot = { x: 8, y: 0 };
      pose.legBack.knee = { x: -7, y: 10 }; pose.legBack.foot = { x: -8, y: 0 };
      pose.armFront.hand = { x: 7, y: 20 };
      pose.armBack.hand = { x: -6, y: 18 };
      break;
    }
    case 'punch': {
      const p = Math.min(1, t);
      let ext;
      if (p < 0.3) ext = p / 0.3;
      else if (p < 0.6) ext = 1;
      else ext = 1 - (p - 0.6) / 0.4;
      pose.lean = ext * 4;
      pose.armFront.elbow = { x: 8 + ext * 6, y: 40 };
      pose.armFront.hand = { x: 10 + ext * 22, y: 38 };
      pose.armBack.hand = { x: -8, y: 32 };
      break;
    }
    case 'kick': {
      const p = Math.min(1, t);
      let ext;
      if (p < 0.3) ext = p / 0.3;
      else if (p < 0.6) ext = 1;
      else ext = 1 - (p - 0.6) / 0.4;
      pose.lean = -ext * 5;
      pose.legFront.knee = { x: 8 + ext * 6, y: 28 };
      pose.legFront.foot = { x: 10 + ext * 26, y: 22 };
      pose.armBack.hand = { x: -10, y: 36 };
      pose.armFront.hand = { x: 6, y: 20 };
      break;
    }
    case 'special': {
      const p = Math.min(1, t);
      pose.lean = 3;
      pose.armFront.elbow = { x: 10, y: 42 };
      pose.armFront.hand = { x: 16 + p * 6, y: 40 };
      pose.armBack.elbow = { x: 8, y: 40 };
      pose.armBack.hand = { x: 14 + p * 6, y: 38 };
      pose.hipY = 24; pose.shoulderY = 42;
      break;
    }
    case 'super': {
      const p = Math.min(1, t);
      pose.lean = sw(14) * 1.5;
      pose.armFront.elbow = { x: 10, y: 48 };
      pose.armFront.hand = { x: 14, y: 58 + p * 2 };
      pose.armBack.elbow = { x: -10, y: 48 };
      pose.armBack.hand = { x: -14, y: 58 + p * 2 };
      pose.headTilt = -4;
      break;
    }
    case 'hit': {
      pose.lean = -6;
      pose.headTilt = 8;
      pose.armFront.hand = { x: 10, y: 44 };
      pose.armBack.hand = { x: -12, y: 40 };
      pose.hipY = 26;
      break;
    }
    case 'block': {
      pose.lean = -3;
      pose.hipY = 24; pose.shoulderY = 40;
      pose.armFront.elbow = { x: 8, y: 44 };
      pose.armFront.hand = { x: 10, y: 50 };
      pose.armBack.elbow = { x: 6, y: 42 };
      pose.armBack.hand = { x: 8, y: 48 };
      break;
    }
    case 'win': {
      const b = sw(4) * 1.5;
      pose.shoulderY += b;
      pose.armFront.elbow = { x: 6, y: 50 };
      pose.armFront.hand = { x: 10, y: 62 + b };
      pose.armBack.elbow = { x: -6, y: 50 };
      pose.armBack.hand = { x: -10, y: 62 + b };
      pose.headTilt = -4;
      break;
    }
    case 'ko': {
      pose.hipY = 10; pose.shoulderY = 14;
      pose.armFront.hand = { x: 18, y: 6 };
      pose.armBack.hand = { x: -16, y: 4 };
      pose.legFront.foot = { x: 20, y: 2 };
      pose.legBack.foot = { x: -2, y: 2 };
      break;
    }
    default: break;
  }
  return pose;
}

function drawHair(ctx, style, color, outlineColor) {
  ctx.fillStyle = outlineColor;
  switch (style) {
    case 'bald':
      ctx.beginPath(); ctx.arc(-3, 2, 5.5, Math.PI, Math.PI * 1.9); ctx.fill();
      break;
    case 'long':
      ctx.fillRect(-9, -2, 5, 20);
      ctx.fillRect(4, -2, 5, 20);
      ctx.beginPath(); ctx.arc(0, -2, 9.5, Math.PI, Math.PI * 2); ctx.fill();
      break;
    case 'ponytail':
      ctx.beginPath(); ctx.arc(0, -2, 9, Math.PI, Math.PI * 2); ctx.fill();
      ctx.fillRect(-14, 2, 6, 16);
      break;
    case 'side':
      ctx.beginPath(); ctx.arc(0, -3, 9, Math.PI * 0.9, Math.PI * 2.05); ctx.fill();
      break;
    case 'short':
    default:
      ctx.beginPath(); ctx.arc(0, -2, 9, Math.PI * 0.95, Math.PI * 2.05); ctx.fill();
      break;
  }
}

function drawFace(ctx, facial, skin) {
  ctx.fillStyle = '#1a1208';
  switch (facial) {
    case 'mustache':
      ctx.fillRect(-4, 6.5, 8, 1.6);
      break;
    case 'beard':
      ctx.beginPath(); ctx.ellipse(0, 7.5, 5.4, 3.4, 0, 0, Math.PI); ctx.fill();
      break;
    case 'goatee':
      ctx.fillRect(-1.6, 7, 3.2, 3.5);
      break;
    default: break;
  }
}

function drawAccessory(ctx, accessory, color, headR) {
  ctx.fillStyle = color;
  switch (accessory) {
    case 'hat':
      ctx.fillStyle = '#4a3418';
      ctx.fillRect(-12, -9, 24, 3);
      ctx.beginPath(); ctx.ellipse(0, -11, 8, 5, 0, Math.PI, Math.PI * 2); ctx.fill();
      break;
    case 'glasses':
      ctx.strokeStyle = '#1a1208';
      ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(-3.2, 1, 3, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(3.2, 1, 3, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-0.2, 1); ctx.lineTo(0.2, 1); ctx.stroke();
      break;
    case 'headband':
      ctx.fillRect(-9.5, -2.5, 19, 3.2);
      break;
    case 'sash':
      break;
    default: break;
  }
}

function drawPropAtHand(ctx, accessory, x, y, color, facing) {
  ctx.save();
  ctx.translate(x, y);
  switch (accessory) {
    case 'book':
      outlinedRect(ctx, 0, -2, 7, 5, color);
      break;
    case 'briefcase':
      outlinedRect(ctx, 0, -2, 8, 6, color);
      break;
    case 'megaphone':
      ctx.fillStyle = '#1a1208';
      ctx.beginPath();
      ctx.moveTo(0, -3); ctx.lineTo(8 * facing, -5); ctx.lineTo(8 * facing, 3); ctx.lineTo(0, 1);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0.5, -2.4); ctx.lineTo(7 * facing, -4); ctx.lineTo(7 * facing, 2.4); ctx.lineTo(0.5, 0.6);
      ctx.closePath(); ctx.fill();
      break;
    case 'guitar':
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.ellipse(2 * facing, 0, 5, 7, 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#1a1208'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(2 * facing, -5); ctx.lineTo(10 * facing, -16); ctx.stroke();
      break;
    case 'gavel':
      outlinedRect(ctx, 0, -1, 6, 4, color);
      break;
    case 'stethoscope':
      ctx.strokeStyle = color; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2); ctx.stroke();
      break;
    case 'flag':
      ctx.fillStyle = '#1a1208'; ctx.fillRect(-0.6, -14, 1.2, 14);
      ctx.fillStyle = color; ctx.fillRect(0.6, -14, 9 * facing, 6);
      break;
    default: break;
  }
  ctx.restore();
}

export function drawFighterSprite(ctx, opts) {
  const {
    x, y, facing, scale, visual, pose, flash = 0, tint = null, alpha = 1
  } = opts;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.scale(facing * scale, -scale); // y invertido (cima = positivo nas unidades)

  const leanX = pose.lean || 0;
  const hipX = 0;
  const hipY = pose.hipY;
  const shX = leanX * 0.6;
  const shY = pose.shoulderY;

  const skin = flash > 0 ? '#ffffff' : visual.skin;
  const suit = flash > 0 ? '#ffffff' : visual.suit;
  const suitShadow = flash > 0 ? '#eeeeee' : visual.suitShadow;
  const hairColor = flash > 0 ? '#ffffff' : visual.hair;

  // sombra no chão
  ctx.save();
  ctx.scale(1, -1);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(0, 1, 13, 3.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // perna de trás
  limb(ctx, hipX - 3, hipY, pose.legBack.knee.x, pose.legBack.knee.y, pose.legBack.foot.x, pose.legBack.foot.y, 6, suitShadow);
  // braço de trás
  limb(ctx, shX - 3, shY, pose.armBack.elbow.x, pose.armBack.elbow.y, pose.armBack.hand.x, pose.armBack.hand.y, 5, suitShadow);

  // tronco (paletó)
  ctx.save();
  ctx.translate(leanX, 0);
  outlinedRect(ctx, 0, hipY - 2, 20, shY - hipY + 10, suit);
  // camisa visível no colarinho
  ctx.fillStyle = visual.shirt;
  ctx.fillRect(-4, shY + 3, 8, 7);
  // gravata / detalhe
  ctx.fillStyle = visual.tie;
  ctx.fillRect(-2, shY - 3, 4, 14);
  if (visual.accessory === 'sash') {
    ctx.save();
    ctx.strokeStyle = visual.accent;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-9, shY + 8); ctx.lineTo(9, hipY - 1);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();

  // cabeça
  const headX = leanX * 1.1 + (pose.headTilt || 0) * 0.3;
  const headY = shY + 11;
  ctx.save();
  ctx.translate(headX, headY);
  outlinedCircle(ctx, 0, 0, 8.6, skin);
  drawFace(ctx, visual.facial, skin);
  drawHair(ctx, visual.hairStyle, hairColor, flash > 0 ? '#ffffff' : shade(hairColor, -40));
  drawAccessory(ctx, visual.accessory, visual.accent || '#222', 8.6);
  // olhos
  ctx.fillStyle = '#1a1208';
  ctx.fillRect(2.4, 0.6, 1.6, 1.8);
  ctx.fillRect(-4, 0.6, 1.6, 1.8);
  ctx.restore();

  // perna da frente
  limb(ctx, hipX + 3, hipY, pose.legFront.knee.x, pose.legFront.knee.y, pose.legFront.foot.x, pose.legFront.foot.y, 6.4, suit);
  // sapatos
  outlinedRect(ctx, pose.legFront.foot.x, pose.legFront.foot.y - 2, 8, 3, '#1a1208');
  outlinedRect(ctx, pose.legBack.foot.x, pose.legBack.foot.y - 2, 8, 3, '#1a1208');

  // braço da frente
  limb(ctx, shX + 3, shY, pose.armFront.elbow.x, pose.armFront.elbow.y, pose.armFront.hand.x, pose.armFront.hand.y, 5.4, suit);

  // prop na mão da frente (livro, maleta, megafone...)
  if (visual.accessory && ['book', 'briefcase', 'megaphone', 'guitar', 'gavel', 'stethoscope', 'flag'].includes(visual.accessory)) {
    drawPropAtHand(ctx, visual.accessory, pose.armFront.hand.x, pose.armFront.hand.y, visual.accent || '#ddd', facing);
  }

  // mão
  outlinedCircle(ctx, pose.armFront.hand.x, pose.armFront.hand.y, 3, skin);

  if (flash > 0) {
    ctx.globalAlpha = flash * 0.6;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-14, -2, 28, 70);
  }

  ctx.restore();
}

// -------------------------------------------------------------
// Retrato-caricatura (ilustração estática por personagem) com
// animação por transformação de corpo inteiro — usado quando a
// imagem do lutador já foi carregada; cai de volta pro boneco
// vetorial acima caso a imagem não exista/carregue.
// -------------------------------------------------------------
export function drawFighterPortrait(ctx, opts) {
  const {
    x, y, facing, img, action, t, flash = 0, alpha = 1, heightUnits = 150
  } = opts;

  if (!img || !img.complete || !img.naturalWidth) return false;

  const drawH = heightUnits;
  const drawW = img.naturalWidth * (drawH / img.naturalHeight);

  let rot = 0, sx = 1, sy = 1, offX = 0, offY = 0, tint = null;
  const clamp01 = (v) => Math.max(0, Math.min(1, v));

  switch (action) {
    case 'idle':
      offY = Math.sin(t * 3.2) * 2;
      break;
    case 'walk':
      offY = Math.abs(Math.sin(t * 9)) * 3;
      rot = Math.sin(t * 9) * 0.045;
      break;
    case 'jump':
      sy = 1.06; sx = 0.96; offY = -2;
      break;
    case 'crouch':
      sy = 0.8; offY = drawH * 0.1;
      break;
    case 'punch':
    case 'kick':
    case 'special1':
    case 'special2':
    case 'super': {
      const p = clamp01(t);
      let k;
      if (p < 0.3) k = p / 0.3;
      else if (p < 0.6) k = 1;
      else k = 1 - (p - 0.6) / 0.4;
      const boost = action === 'super' ? 1.6 : action === 'kick' ? 1.2 : 1;
      rot = k * 0.14 * boost;
      sx = 1 + k * 0.07 * boost;
      sy = 1 - k * 0.05 * boost;
      offX = k * 7 * boost;
      if (action === 'special1' || action === 'special2') tint = `rgba(255,222,120,${0.22 * k})`;
      if (action === 'super') tint = `rgba(255,255,255,${0.3 * k})`;
      break;
    }
    case 'hit':
      rot = -0.12; offX = -7;
      tint = `rgba(255,60,60,0.4)`;
      break;
    case 'block':
      sy = 0.93; offY = drawH * 0.05;
      tint = 'rgba(120,190,255,0.3)';
      break;
    case 'win': {
      const b = Math.abs(Math.sin(t * 4));
      offY = -b * 5; sx = 1.04; sy = 1.04;
      break;
    }
    case 'ko':
      rot = 1.25; offY = drawH * 0.22; sy = 0.92;
      break;
    default: break;
  }

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(facing, 1);
  ctx.translate(offX, offY);
  ctx.rotate(rot);
  ctx.scale(sx, sy);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(img, -drawW / 2, -drawH, drawW, drawH);
  if (tint) { ctx.fillStyle = tint; ctx.fillRect(-drawW / 2, -drawH, drawW, drawH); }
  if (flash > 0) { ctx.fillStyle = `rgba(255,255,255,${flash * 0.55})`; ctx.fillRect(-drawW / 2, -drawH, drawW, drawH); }
  ctx.restore();
  return true;
}

export function drawProjectile(ctx, x, y, facing, color, t) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(t * 12);
  outlinedCircle(ctx, 0, 0, 7, color);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const a = (Math.PI / 2) * i + t * 12;
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * 7, Math.sin(a) * 7);
  }
  ctx.stroke();
  ctx.restore();
}
