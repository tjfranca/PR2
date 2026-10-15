import { Fighter, GAME_W, GAME_H, STAGE_LEFT, STAGE_RIGHT, moveInfo } from './fighter.js';
import { drawFighterSprite, drawFighterPortrait, drawProjectile } from './renderer.js';
import { STAGES } from './stages.js';
import { Audio2026 } from './audio.js';
import { createAIController } from './ai.js';

const ROUND_TIME = 99;
const ROUNDS_TO_WIN = 2;

export class Match {
  constructor({ p1Def, p2Def, p1CPU = false, p2CPU = true, difficulty = 'normal', stageKey, images, portraits = {} }) {
    this.images = images;
    this.portraits = portraits;
    this.stageKey = stageKey || p1Def.stage;
    this.stage = STAGES[this.stageKey];

    this.p1 = new Fighter(p1Def, 0, p1CPU, difficulty);
    this.p2 = new Fighter(p2Def, 1, p2CPU, difficulty);
    this.fighters = [this.p1, this.p2];

    this.p1AI = p1CPU ? createAIController(difficulty) : null;
    this.p2AI = p2CPU ? createAIController(difficulty) : null;

    this.round = 1;
    this.timer = ROUND_TIME;
    this.state = 'intro'; // intro -> fight -> roundend -> (intro|matchend)
    this.stateTime = 0;
    this.projectiles = [];
    this.particles = [];
    this.screenShake = 0;
    this.hitstopGlobal = 0;
    this.banner = { text: 'ROUND 1', sub: '', t: 0 };
    this.fightFlash = 0;
    this.winnerText = '';
    this.matchOver = false;
    this.matchWinner = null;
    this.onMatchEnd = null;
    this._matchEndFired = false;
    Audio2026.startMusic('fight');
  }

  destroy() { Audio2026.stopMusic(); }

  spawnProjectile(fighter) {
    const info = moveInfo('special1');
    this.projectiles.push({
      x: fighter.x + fighter.facing * 20,
      y: 34 + fighter.y,
      vx: fighter.facing * 190,
      facing: fighter.facing,
      owner: fighter,
      color: fighter.visual.accent || '#ffd400',
      damage: info.damage,
      t: 0
    });
    Audio2026.special();
  }

  spawnParticles(x, y, color, n = 8) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 60 + Math.random() * 90;
      this.particles.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6 + 40,
        life: 0.35 + Math.random() * 0.2, color, age: 0
      });
    }
  }

  applyHit(attacker, defender, info) {
    const holdingBack = defender.inputBack;
    const canBlock = holdingBack && defender.grounded && defender.action !== 'hit' && !defender.isDown;
    const blocked = canBlock && info.type !== 'super_unblockable';
    let dmg = info.damage;
    if (blocked) dmg = Math.max(1, Math.round(info.damage * 0.12));

    defender.takeDamage(dmg, { blocked });
    attacker.meter = Math.min(100, attacker.meter + info.meter * (blocked ? 0.5 : 1));

    const push = (info.push || 10) * (blocked ? 0.6 : 1);
    defender.x += attacker.facing * push;
    defender.x = Math.max(STAGE_LEFT, Math.min(STAGE_RIGHT, defender.x));

    const hitX = (attacker.x + defender.x) / 2;
    this.spawnParticles(hitX, 40 + defender.y, blocked ? '#8fd3ff' : '#ffe066', blocked ? 5 : 10);

    this.screenShake = info.type === 'super' ? 10 : (blocked ? 2 : 4);
    attacker.startHitstop(info.type === 'super' ? 160 : 90);
    defender.startHitstop(info.type === 'super' ? 160 : 90);

    if (blocked) {
      Audio2026.block();
      if (defender.health > 0) defender.setAction('block', { restart: true });
    } else if (defender.health <= 0) {
      defender.setAction('ko');
      Audio2026.ko();
      this.endRound(attacker);
    } else {
      defender.setAction('hit', { restart: true });
      if (info.type === 'kick' || defender.action === 'kick') Audio2026.kick();
      else Audio2026.punch();
    }

    if (info.type === 'super') Audio2026.superMove();
  }

  endRound(loser) {
    if (this.state === 'roundend' || this.state === 'matchend') return;
    const winner = loser === this.p1 ? this.p2 : this.p1;
    winner.roundsWon += 1;
    this.state = 'roundend';
    this.stateTime = 0;
    this.banner = { text: loser.health <= 0 ? 'K.O.!' : 'TEMPO ESGOTADO!', sub: `${winner.def.name} venceu o round!`, t: 0 };
    winner.setAction('win');
  }

  timeUp() {
    if (this.state !== 'fight') return;
    if (this.p1.health === this.p2.health) {
      this.banner = { text: 'EMPATE!', sub: 'Ninguém venceu o round.', t: 0 };
      this.state = 'roundend';
      this.stateTime = 0;
      this.p1.setAction('idle'); this.p2.setAction('idle');
      this.drawTimeUpNoWinner = true;
    } else {
      const loser = this.p1.health < this.p2.health ? this.p1 : this.p2;
      this.endRound(loser);
    }
  }

  nextRoundOrEnd() {
    if (this.p1.roundsWon >= ROUNDS_TO_WIN || this.p2.roundsWon >= ROUNDS_TO_WIN) {
      this.matchOver = true;
      this.matchWinner = this.p1.roundsWon > this.p2.roundsWon ? this.p1 : this.p2;
      this.state = 'matchend';
      this.stateTime = 0;
      this._matchEndFired = false;
      Audio2026.win();
      return;
    }
    this.round += 1;
    this.timer = ROUND_TIME;
    this.p1.reset(); this.p2.reset();
    this.state = 'intro';
    this.stateTime = 0;
    this.banner = { text: `ROUND ${this.round}`, sub: '', t: 0 };
  }

  controlFighter(fighter, input, opponent, dt) {
    const back = fighter.x < opponent.x ? input.left : input.right;
    const forward = fighter.x < opponent.x ? input.right : input.left;
    fighter.inputBack = back && !forward;

    if (!fighter.canAct) return;

    if (fighter.action === 'ko' || fighter.action === 'win') return;

    if (input.super && fighter.meter >= 100 && fighter.grounded) {
      fighter.meter = 0;
      fighter.setAction('super', { restart: true });
      return;
    }
    if (input.special1 && fighter.cooldowns.special1 <= 0 && fighter.grounded) {
      fighter.cooldowns.special1 = moveInfo('special1').cooldown;
      fighter.setAction('special1', { restart: true });
      return;
    }
    if (input.special2 && fighter.cooldowns.special2 <= 0) {
      fighter.cooldowns.special2 = moveInfo('special2').cooldown;
      fighter.setAction('special2', { restart: true });
      return;
    }
    if (input.punch) { fighter.setAction('punch', { restart: true }); Audio2026.punch(); return; }
    if (input.kick) { fighter.setAction('kick', { restart: true }); Audio2026.kick(); return; }

    if (fighter.inputBack && fighter.grounded) {
      fighter.setAction('block');
      fighter.x += fighter.facing * -40 * dt;
      fighter.x = Math.max(STAGE_LEFT, Math.min(STAGE_RIGHT, fighter.x));
      return;
    }

    if (input.up && fighter.grounded) {
      fighter.grounded = false;
      fighter.vy = 230;
      fighter.setAction('jump');
      Audio2026.jump();
      return;
    }

    if (input.down && fighter.grounded) {
      fighter.setAction('crouch');
      return;
    }

    if (forward) {
      fighter.x += fighter.facing * (fighter.grounded ? 95 : 70) * dt;
      fighter.x = Math.max(STAGE_LEFT, Math.min(STAGE_RIGHT, fighter.x));
      fighter.setAction(fighter.grounded ? 'walk' : 'jump');
      return;
    }
    if (back) {
      fighter.x += fighter.facing * -(fighter.grounded ? 70 : 55) * dt;
      fighter.x = Math.max(STAGE_LEFT, Math.min(STAGE_RIGHT, fighter.x));
      fighter.setAction(fighter.grounded ? 'walk' : 'jump');
      return;
    }

    fighter.setAction(fighter.grounded ? 'idle' : 'jump');
  }

  update(dt, inputs) {
    if (this.hitstopGlobal > 0) { this.hitstopGlobal -= dt * 1000; return; }
    this.screenShake = Math.max(0, this.screenShake - dt * 40);

    if (this.state === 'intro') {
      this.stateTime += dt;
      this.banner.t += dt;
      if (this.stateTime > 1.3) { this.state = 'fight'; this.stateTime = 0; this.fightFlash = 0.7; Audio2026.roundStart(); }
      return;
    }

    if (this.state === 'roundend') {
      this.stateTime += dt;
      this.p1.update(dt, this.p2, this);
      this.p2.update(dt, this.p1, this);
      if (this.stateTime > 2.2) this.nextRoundOrEnd();
      return;
    }

    if (this.state === 'matchend') {
      this.stateTime += dt;
      this.p1.update(dt, this.p2, this);
      this.p2.update(dt, this.p1, this);
      if (!this._matchEndFired && this.stateTime > 2.4) {
        this._matchEndFired = true;
        if (this.onMatchEnd) this.onMatchEnd(this.matchWinner);
      }
      return;
    }

    // ---- state === 'fight' ----
    if (this.fightFlash > 0) this.fightFlash -= dt;
    this.timer -= dt;
    if (this.timer <= 0) { this.timer = 0; this.timeUp(); }

    let p1in = inputs.p1;
    let p2in = inputs.p2;
    if (this.p1AI) p1in = this.p1AI(dt, this.p1, this.p2);
    if (this.p2AI) p2in = this.p2AI(dt, this.p2, this.p1);

    this.controlFighter(this.p1, p1in, this.p2, dt);
    this.controlFighter(this.p2, p2in, this.p1, dt);

    this.p1.update(dt, this.p2, this);
    this.p2.update(dt, this.p1, this);

    // separação simples se colidirem (menor que o alcance dos golpes corpo-a-corpo)
    const minDist = 18;
    const dx = this.p2.x - this.p1.x;
    if (Math.abs(dx) < minDist && this.p1.grounded && this.p2.grounded) {
      const overlap = (minDist - Math.abs(dx)) / 2;
      const dir = dx >= 0 ? 1 : -1;
      this.p1.x -= dir * overlap;
      this.p2.x += dir * overlap;
    }

    // projéteis
    for (const pr of this.projectiles) {
      pr.x += pr.vx * dt;
      pr.t += dt;
      const target = pr.owner === this.p1 ? this.p2 : this.p1;
      if (!pr.hit && Math.abs(pr.x - target.x) < 16 && !target.isDown) {
        pr.hit = true;
        this.applyHit(pr.owner, target, { damage: pr.damage, type: 'projectile', push: 8, meter: 6 });
      }
    }
    this.projectiles = this.projectiles.filter((p) => !p.hit && p.x > STAGE_LEFT - 20 && p.x < STAGE_RIGHT + 20);

    // partículas
    for (const pa of this.particles) {
      pa.age += dt;
      pa.x += pa.vx * dt;
      pa.y += pa.vy * dt;
      pa.vy -= 200 * dt;
    }
    this.particles = this.particles.filter((p) => p.age < p.life);
  }

  worldToScreen(x, y, canvasW, canvasH) {
    const scale = Math.min(canvasW / GAME_W, canvasH / GAME_H);
    const offX = (canvasW - GAME_W * scale) / 2;
    const offY = (canvasH - GAME_H * scale) / 2;
    return { sx: offX + x * scale, sy: offY + y * scale, scale };
  }

  render(ctx, canvasW, canvasH) {
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvasW, canvasH);

    const scale = Math.min(canvasW / GAME_W, canvasH / GAME_H);
    const offX = (canvasW - GAME_W * scale) / 2 + (Math.random() - 0.5) * this.screenShake;
    const offY = (canvasH - GAME_H * scale) / 2 + (Math.random() - 0.5) * this.screenShake;

    ctx.save();
    ctx.translate(offX, offY);
    ctx.scale(scale, scale);

    // fundo
    const img = this.images[this.stageKey];
    if (img) {
      ctx.drawImage(img, 0, 0, GAME_W, GAME_H * 0.95);
    } else {
      ctx.fillStyle = '#223';
      ctx.fillRect(0, 0, GAME_W, GAME_H);
    }
    // chão
    ctx.fillStyle = 'rgba(10,10,15,0.35)';
    ctx.fillRect(0, GAME_H * 0.86, GAME_W, GAME_H * 0.14);

    const floorScreenY = GAME_H * 0.86 + 6;

    const order = this.p1.x <= this.p2.x ? [this.p1, this.p2] : [this.p2, this.p1];
    for (const f of order) {
      const sx = f.x;
      const sy = floorScreenY - f.y;
      const portraitImg = this.portraits[f.def.id];
      const { action, t } = f.getAnimState();
      const drawn = portraitImg && drawFighterPortrait(ctx, {
        x: sx, y: sy, facing: f.facing, img: portraitImg,
        action, t: t * 6 + f.playerIndex * 10, flash: f.flash,
        heightUnits: 136 * (f.visual.build || 1)
      });
      if (!drawn) {
        drawFighterSprite(ctx, {
          x: sx, y: sy, facing: f.facing, scale: f.scale, visual: f.visual,
          pose: f.getPoseFrame(), flash: f.flash
        });
      }
    }

    for (const pr of this.projectiles) {
      drawProjectile(ctx, pr.x, floorScreenY - pr.y, pr.facing, pr.color, pr.t);
    }

    for (const pa of this.particles) {
      ctx.globalAlpha = Math.max(0, 1 - pa.age / pa.life);
      ctx.fillStyle = pa.color;
      ctx.fillRect(pa.x - 1.5, floorScreenY - pa.y - 1.5, 3, 3);
      ctx.globalAlpha = 1;
    }

    ctx.restore();

    this.renderHUD(ctx, canvasW, canvasH, offX, offY, scale);
  }

  renderHUD(ctx, canvasW, canvasH, offX, offY, scale) {
    ctx.save();
    ctx.translate(offX, offY);
    ctx.scale(scale, scale);

    this.drawHealthBar(ctx, this.p1, 10, 10, false);
    this.drawHealthBar(ctx, this.p2, GAME_W - 10, 10, true);

    // nomes
    ctx.font = '7px "Press Start 2P", monospace';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    ctx.fillText(this.p1.def.name.toUpperCase(), 10, 22);
    ctx.textAlign = 'right';
    ctx.fillText(this.p2.def.name.toUpperCase(), GAME_W - 10, 22);

    // medidor especial
    this.drawMeter(ctx, this.p1, 10, 30, false);
    this.drawMeter(ctx, this.p2, GAME_W - 10, 30, true);

    // rounds vencidos
    this.drawRoundPips(ctx, this.p1, 10, 3, false);
    this.drawRoundPips(ctx, this.p2, GAME_W - 10, 3, true);

    // timer
    ctx.textAlign = 'center';
    ctx.font = '14px "Press Start 2P", monospace';
    ctx.fillStyle = '#fff';
    ctx.fillText(String(Math.ceil(this.timer)).padStart(2, '0'), GAME_W / 2, 6);

    // banners
    if (this.state === 'intro' || this.state === 'roundend' || this.state === 'matchend') {
      ctx.save();
      ctx.globalAlpha = Math.min(1, this.banner.t * 3);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffce00';
      ctx.font = '18px "Press Start 2P", monospace';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 4;
      ctx.strokeText(this.state === 'matchend' ? `${this.matchWinner.def.name.toUpperCase()} VENCEU!` : this.banner.text, GAME_W / 2, GAME_H / 2 - 20);
      ctx.fillText(this.state === 'matchend' ? `${this.matchWinner.def.name.toUpperCase()} VENCEU!` : this.banner.text, GAME_W / 2, GAME_H / 2 - 20);
      if (this.banner.sub) {
        ctx.font = '8px "Press Start 2P", monospace';
        ctx.strokeText(this.banner.sub, GAME_W / 2, GAME_H / 2 + 4);
        ctx.fillStyle = '#fff';
        ctx.fillText(this.banner.sub, GAME_W / 2, GAME_H / 2 + 4);
      }
      ctx.restore();
    }

    if (this.fightFlash > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, this.fightFlash * 3);
      ctx.textAlign = 'center';
      ctx.font = '20px "Press Start 2P", monospace';
      ctx.fillStyle = '#ff4040';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 4;
      ctx.strokeText('LUTAR!', GAME_W / 2, GAME_H / 2 - 20);
      ctx.fillText('LUTAR!', GAME_W / 2, GAME_H / 2 - 20);
      ctx.restore();
    }

    ctx.restore();
  }

  drawHealthBar(ctx, f, x, y, flip) {
    const w = 150, h = 10;
    const pct = Math.max(0, f.health / f.maxHealth);
    ctx.save();
    if (flip) { ctx.translate(x, y); ctx.scale(-1, 1); ctx.translate(-w, 0); }
    else ctx.translate(x, y);
    ctx.fillStyle = '#111';
    ctx.fillRect(-2, -2, w + 4, h + 4);
    ctx.fillStyle = '#4a0000';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = pct > 0.5 ? '#4caf50' : pct > 0.2 ? '#ffb300' : '#e53935';
    ctx.fillRect(0, 0, w * pct, h);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, w, h);
    ctx.restore();
  }

  drawMeter(ctx, f, x, y, flip) {
    const w = 110, h = 5;
    const pct = f.meter / 100;
    ctx.save();
    if (flip) { ctx.translate(x, y); ctx.scale(-1, 1); ctx.translate(-w, 0); }
    else ctx.translate(x, y);
    ctx.fillStyle = '#111';
    ctx.fillRect(-1, -1, w + 2, h + 2);
    ctx.fillStyle = pct >= 1 ? '#00e5ff' : '#1565c0';
    ctx.fillRect(0, 0, w * pct, h);
    ctx.strokeStyle = '#fff';
    ctx.strokeRect(0, 0, w, h);
    ctx.restore();
  }

  drawRoundPips(ctx, f, x, y, flip) {
    const r = 2.4;
    for (let i = 0; i < ROUNDS_TO_WIN; i++) {
      const won = i < f.roundsWon;
      ctx.beginPath();
      const px = flip ? x - 6 - i * 8 : x + 6 + i * 8;
      ctx.arc(px, y, r, 0, Math.PI * 2);
      ctx.fillStyle = won ? '#ffce00' : '#444';
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 0.6;
      ctx.stroke();
    }
  }
}

export { GAME_W, GAME_H };
