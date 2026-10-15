import { computePose } from './renderer.js';
import { Audio2026 } from './audio.js';

export const GAME_W = 384;
export const GAME_H = 216;
export const GROUND_Y = 28; // altura do chão em relação à base da arte de fundo
export const STAGE_LEFT = 40;
export const STAGE_RIGHT = GAME_W - 40;

const MOVES = {
  punch: { total: 300, startup: 70, active: 90, damage: 6, meter: 7, push: 10, type: 'melee', range: 32 },
  kick: { total: 380, startup: 100, active: 110, damage: 9, meter: 9, push: 16, type: 'melee', range: 36 },
  special1: { total: 520, startup: 160, active: 260, damage: 10, meter: 14, push: 6, type: 'projectile', cooldown: 1000 },
  special2: { total: 460, startup: 90, active: 180, damage: 12, meter: 16, push: 24, type: 'dash', cooldown: 1100 },
  super: { total: 760, startup: 120, active: 260, damage: 24, meter: 0, push: 30, type: 'super', cooldown: 0 }
};

export function moveInfo(name) { return MOVES[name]; }

export class Fighter {
  constructor(def, playerIndex, isCPU, difficulty = 'normal') {
    this.def = def;
    this.playerIndex = playerIndex;
    this.isCPU = isCPU;
    this.difficulty = difficulty;
    this.visual = def.visual;
    this.scale = 2.15 * (def.visual.build || 1);

    this.health = 100;
    this.maxHealth = 100;
    this.meter = 0;
    this.roundsWon = 0;

    this.x = playerIndex === 0 ? STAGE_LEFT + 60 : STAGE_RIGHT - 60;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.facing = playerIndex === 0 ? 1 : -1;

    this.action = 'idle';
    this.actionTime = 0; // segundos desde início da ação atual
    this.locked = false; // true quando não pode agir (ataque/hit/ko)
    this.grounded = true;
    this.blocking = false;
    this.hitThisAction = false;
    this.comboCount = 0;

    this.cooldowns = { special1: 0, special2: 0 };
    this.hitstop = 0;
    this.flash = 0;
    this.introTimer = 0.8;
    this.wins = [];
    this.koFallDone = false;
    this.aiTimer = 0;
    this.aiState = 'approach';
    this.aiNextDecision = 0;
    this.spawnedProjectile = false;
    this.inputBack = false;
  }

  reset(keepRounds = true) {
    this.health = 100;
    this.meter = 0;
    this.x = this.playerIndex === 0 ? STAGE_LEFT + 60 : STAGE_RIGHT - 60;
    this.y = 0; this.vx = 0; this.vy = 0;
    this.action = 'idle'; this.actionTime = 0; this.locked = false;
    this.grounded = true; this.blocking = false; this.introTimer = 0.6;
    this.koFallDone = false;
    this.cooldowns = { special1: 0, special2: 0 };
    this.spawnedProjectile = false;
  }

  get isDown() { return this.action === 'ko'; }
  get isAttacking() { return ['punch', 'kick', 'special1', 'special2', 'super'].includes(this.action); }
  get canAct() { return !this.locked && this.introTimer <= 0; }

  setAction(name, opts = {}) {
    if (this.action === name && opts.restart !== true) return;
    this.action = name;
    this.actionTime = 0;
    this.hitThisAction = false;
    this.comboTag = opts.comboTag || null;
    const lockedActions = ['punch', 'kick', 'special1', 'special2', 'super', 'hit', 'ko', 'win'];
    this.locked = lockedActions.includes(name);
  }

  startHitstop(ms) { this.hitstop = Math.max(this.hitstop, ms); }

  takeDamage(dmg, opts = {}) {
    this.health = Math.max(0, this.health - dmg);
    this.flash = 1;
    if (!opts.blocked) this.meter = Math.min(100, this.meter + dmg * 0.6);
  }

  update(dt, opponent, world) {
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 6);
    this.cooldowns.special1 = Math.max(0, this.cooldowns.special1 - dt * 1000);
    this.cooldowns.special2 = Math.max(0, this.cooldowns.special2 - dt * 1000);
    if (this.hitstop > 0) { this.hitstop -= dt * 1000; return; }
    if (this.introTimer > 0) { this.introTimer -= dt; return; }

    this.actionTime += dt;

    // física vertical (pulo)
    if (!this.grounded) {
      this.vy -= 520 * dt;
      this.y += this.vy * dt;
      if (this.y <= 0) { this.y = 0; this.vy = 0; this.grounded = true; Audio2026.land(); }
    }

    this.facing = this.x < opponent.x ? 1 : -1;

    this.resolveActionLogic(dt, opponent, world);

    // limites do palco
    this.x = Math.max(STAGE_LEFT, Math.min(STAGE_RIGHT, this.x));
  }

  resolveActionLogic(dt, opponent, world) {
    const info = MOVES[this.action];
    if (info) {
      const ms = this.actionTime * 1000;
      if (!this.hitThisAction && ms >= info.startup && ms <= info.startup + info.active) {
        this.tryHit(opponent, world, info);
      }
      if (this.action === 'special1' && ms >= info.startup && !this.spawnedProjectile) {
        this.spawnedProjectile = true;
        world.spawnProjectile(this);
      }
      if (this.action === 'special2' && ms < info.active + info.startup) {
        this.vx = this.facing * 160;
        this.x += this.vx * dt;
      }
      if (ms >= info.total) {
        if (this.action === 'super') world.endSuperFreeze && world.endSuperFreeze();
        this.spawnedProjectile = false;
        this.setAction('idle');
      }
      return;
    }

    if (this.action === 'hit') {
      this.x += (-this.facing) * 60 * dt;
      if (this.actionTime > 0.32) this.setAction('idle');
      return;
    }
    if (this.action === 'ko') {
      if (this.actionTime < 0.4) this.y += 40 * dt;
      return;
    }
    if (this.action === 'win') {
      return;
    }
  }

  tryHit(opponent, world, info) {
    const dx = Math.abs(opponent.x - this.x);
    const range = info.range || 34;
    if (info.type === 'melee' && dx <= range && !opponent.isDown) {
      this.hitThisAction = true;
      world.applyHit(this, opponent, info);
    } else if (info.type === 'dash' && dx <= 34 && !opponent.isDown) {
      this.hitThisAction = true;
      world.applyHit(this, opponent, info);
    } else if (info.type === 'super' && dx <= 60 && !opponent.isDown) {
      this.hitThisAction = true;
      world.applyHit(this, opponent, info);
    }
  }

  getAnimState() {
    let action = this.action;
    let t = this.actionTime;
    if (this.introTimer > 0) { action = 'idle'; t = 0; }
    if (!this.grounded && (action === 'idle' || action === 'walk')) action = 'jump';
    return { action, t };
  }

  getPoseFrame() {
    const { action, t } = this.getAnimState();
    return computePose(action, t * 6 + this.playerIndex * 10, { crouch: action === 'crouch' });
  }
}
