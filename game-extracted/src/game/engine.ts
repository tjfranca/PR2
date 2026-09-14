/* Beat 'em up engine — Power Rangers vs forças de Ivan Ooze (6 fases + chefe final)
   Stage physics: solid objects, floor spikes, retractable spikes, slippery ooze,
   breakable crates (health drops), kickable rolling barrels, fire drums,
   airborne knockdowns with bounce, per-stage dynamic hazards. */
import {
  CharKey,
  EnemyKind,
  Frame,
  RANGER_SHEET,
  CIV_SHEET,
  WEAPON_SPECS,
  WeaponFx,
  buildAnims,
  buildCivAnims,
  buildEnemyAnims,
  getImage,
  getWeaponFrames,
  skelerenaIsFallback,
} from "./sprites";
import { sfx } from "./audio";
import { music } from "./music";
import { pollGamepads } from "./gamepad";
import { settings } from "./settings";
import { damage, resolveEnemyHit, resolveHit } from "./combat";
import { breakCrate, breakCrateHit, hitObjects, updateObjects } from "./objects";
import { spawnHazard, updateHazards } from "./hazards";
import {
  drawBossBar,
  drawFighter,
  drawHazardAir,
  drawHazardGround,
  drawObject,
  drawOoze,
  drawPickup,
  drawProjectile,
  drawWeaponFx,
  hazardScreenPos,
} from "./render";
import {
  GRAV,
  GROUND_TOP,
  MORPH_ARM_UP,
  MORPH_DUR,
  MORPH_STRIKE,

  VIEW_H,
  VIEW_W,
  ZPX,
  Z_MAX,
  Z_MIN,
} from "./consts";
import { OBJ_SIZE, STAGES } from "./stages";
import { Fighter } from "./fighter";
import { RANGER_GLOW } from "./world";
import type { AttackSpec } from "./fighter";
import type { EngineCallbacks, Hazard, Particle, Pickup, Projectile, Spark, StageObj, Floater, TouchAction } from "./world";
import type { StageDef } from "./stages";
import { diffMods, scaledWaves } from "./logic";

export { VIEW_H, VIEW_W } from "./consts";
export type { StageDef } from "./stages";
export type { EngineCallbacks, Hazard, Particle, Pickup, Spark, StageObj, Floater, TouchAction } from "./world";


/* ---------------- game ---------------- */

export class Game {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  players: Fighter[] = [];
  enemies: Fighter[] = [];
  objects: StageObj[] = [];
  pickups: Pickup[] = [];
  particles: Particle[] = [];
  sparks: Spark[] = [];
  floaters: Floater[] = [];
  hazards: Hazard[] = [];
  projectiles: Projectile[] = [];
  hazardTimer = 0;
  ambientT = 0;
  keys = new Set<string>();
  camX = 0;
  score = 0;
  phase = 0;
  wave = 0;
  waves: number[] = [];
  toSpawn = 0;
  spawnT = 0;
  bannerT = 0;
  bannerBig = "";
  bannerSmall = "";
  shake = 0;
  hitstop = 0;
  over = false;
  raf = 0;
  last = 0;
  time = 0;
  cb: EngineCallbacks;
  charKeys: CharKey[];
  endT = -1;
  phaseEndT = -1;
  worldW = 2000;
  morphT = -1;
  morphThunder = false;
  morphing: Fighter | null = null;
  flashT = 0;
  paused = false;
  pauseShake = 0;
  diff = diffMods(settings.difficulty);
  boss: Fighter | null = null;
  bossMaxHp = 1;
  bossMinionT = 8;
  tipTxt = "";
  tipT = 0;
  tipsShown = new Set<string>();
  onPauseChange: (paused: boolean) => void = () => {};
  private onBlur = () => {
    // teclas "presas" ao perder o foco (Alt+Tab etc.)
    this.keys.clear();
    if (!this.over && !this.paused) this.togglePause();
  };
  private onVisibility = () => {
    if (document.hidden && !this.over && !this.paused) this.togglePause();
  };

  get player(): Fighter {
    return this.players[0];
  }

  alivePlayers(): Fighter[] {
    return this.players.filter((p) => !p.dead);
  }

  nearestPlayer(x: number): Fighter {
    const alive = this.alivePlayers();
    let best = alive[0] ?? this.players[0];
    for (const p of alive) if (Math.abs(p.x - x) < Math.abs(best.x - x)) best = p;
    return best;
  }

  constructor(
    canvas: HTMLCanvasElement,
    charKeys: CharKey[],
    cb: EngineCallbacks,
    opts: { score?: number; phase?: number } = {},
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.ctx.imageSmoothingEnabled = false;
    this.cb = cb;
    this.charKeys = charKeys;
    this.score = opts.score ?? 0;
    const hp = Math.round(120 * this.diff.playerHpMul);
    this.players = charKeys.map((k, i) =>
      new Fighter(CIV_SHEET[k], buildCivAnims(k), hp, 180, true, { charKey: k, pIdx: i }),
    );
    this.startPhase(opts.phase ?? 0);
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.onBlur);
    document.addEventListener("visibilitychange", this.onVisibility);
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.loop);
    music.play("battle");
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.onBlur);
    document.removeEventListener("visibilitychange", this.onVisibility);
  }

  togglePause() {
    this.setPaused(!this.paused);
  }

  setPaused(v: boolean) {
    if (this.paused === v || this.over) return;
    this.paused = v;
    this.pauseShake = 0.25;
    if (v) music.pause();
    else music.resume();
    this.onPauseChange(v);
  }

  stage(): StageDef {
    // fase do chefe reaproveita o cenário e física da última fase
    return STAGES[Math.min(this.phase, STAGES.length - 1)];
  }

  isBossPhase(): boolean {
    return this.phase >= STAGES.length;
  }

  startPhase(i: number) {
    this.phase = i;
    this.enemies = [];
    this.sparks = [];
    this.floaters = [];
    this.hazards = [];
    this.pickups = [];
    this.particles = [];
    this.projectiles = [];
    this.hazardTimer = 2.5;
    this.camX = 0;
    this.morphT = -1;
    this.morphing = null;
    this.wave = -1;
    this.toSpawn = 0;
    this.endT = -1;
    this.phaseEndT = -1;
    this.tipT = 0;
    this.tipsShown.clear();
    this.boss = null;
    this.bossMinionT = 8;

    // reposiciona todos os jogadores; revive os caídos com 60% de vida
    for (const p of this.players) {
      p.x = 180 + p.pIdx * 50;
      p.z = 0.5;
      p.h = 0;
      p.vy = 0;
      p.vx = 0;
      p.mvx = 0;
      p.mvz = 0;
      p.facing = 1;
      if (p.dead) {
        p.dead = false;
        p.hp = Math.round(p.maxHp * 0.6);
        p.invuln = 2;
      } else if (i > 0) {
        p.hp = Math.min(p.maxHp, p.hp + 45);
      }
      p.setState("idle");
    }

    if (this.isBossPhase()) {
      // ---- CHEFE FINAL: IVAN OOZE ----
      const st = this.stage();
      this.worldW = st.imgW * 2;
      this.objects = [];
      this.waves = [];
      const b = new Fighter("oozeman", buildEnemyAnims("oozeman"), Math.round(300 * this.diff.hpMul), 78, false, {
        isBoss: true,
        drawScale: 3,
        kind: "oozeman",
      });
      b.x = this.worldW - 720;
      b.z = 0.5;
      b.attackCd = 2;
      this.boss = b;
      this.bossMaxHp = b.hp;
      this.enemies = [b];
      this.banner("CHEFE FINAL", "IVAN OOZE — O OOZE SUPREMO", 3);
      sfx.wave();
      return;
    }

    const st = STAGES[i];
    this.worldW = st.imgW * 2;
    this.objects = st.objects.map((d) => ({
      kind: d.kind,
      x: d.x * this.worldW,
      z: d.z,
      w: OBJ_SIZE[d.kind].w,
      zr: OBJ_SIZE[d.kind].zr,
      hp: d.kind === "crate" ? 3 : 999,
      vx: 0,
      rot: 0,
      timer: Math.random() * 2,
      up: false,
      warn: false,
      cool: new Map(),
      dead: false,
      wobble: 0,
    }));
    if (i > 0) sfx.wave();
    this.waves = scaledWaves(st.waves, this.diff.countMul);
    this.banner(`FASE ${i + 1}`, st.name, 2.6);
    this.spawnT = 1.4;
    this.nextWave();
  }

  nextWave() {
    this.wave++;
    if (this.wave < this.waves.length) {
      this.toSpawn = this.waves[this.wave];
      this.spawnT = Math.max(this.spawnT, 0.6);
      if (this.wave > 0) {
        this.banner(`ONDA ${this.wave + 1}`, "Mais inimigos chegando!", 1.8);
        sfx.wave();
      }
    }
  }

  banner(big: string, small: string, t: number) {
    this.bannerBig = big;
    this.bannerSmall = small;
    this.bannerT = t;
  }

  /* ---------- input ---------- */

  onKeyDown(e: KeyboardEvent) {
    const k = e.key.toLowerCase();
    if (k === "p" || k === "escape") {
      e.preventDefault();
      this.togglePause();
      return;
    }
    if (
      [
        "arrowup",
        "arrowdown",
        "arrowleft",
        "arrowright",
        "w",
        "a",
        "s",
        "d",
        " ",
        "z",
        "x",
        "c",
        "j",
        "k",
        "l",
        "m",
        "enter",
        "f",
        "g",
        "h",
        "y",
        "t",
      ].includes(k)
    )
      e.preventDefault();
    this.keys.add(k);
    // P1: Z/X/C/M/Espaço · P2: G/H/Y/T/F (co-op)
    if (k === "z" || k === "j") this.action("punch", 0);
    else if (k === "x" || k === "k") this.action("kick", 0);
    else if (k === "c" || k === "l") this.action("special", 0);
    else if (k === "m" || k === "enter") this.action("morph", 0);
    else if (k === " ") this.action("jump", 0);
    else if (k === "g") this.action("punch", 1);
    else if (k === "h") this.action("kick", 1);
    else if (k === "y") this.action("special", 1);
    else if (k === "t") this.action("morph", 1);
    else if (k === "f") this.action("jump", 1);
  }

  onKeyUp(e: KeyboardEvent) {
    this.keys.delete(e.key.toLowerCase());
  }

  press(dir: string, pIdx = 0) {
    this.keys.add(`p${pIdx}:${dir}`);
  }
  release(dir: string, pIdx = 0) {
    this.keys.delete(`p${pIdx}:${dir}`);
  }

  action(a: TouchAction, pIdx = 0) {
    const p = this.players[pIdx];
    if (!p || this.over || this.paused || p.dead || this.morphT >= 0) return;
    const busy = [
      "attack",
      "special",
      "hurt",
      "fall",
      "down",
      "getup",
      "victory",
      "morph",
    ].includes(p.state);
    switch (a) {
      case "morph":
        if (!p.morphed && p.morphMeter >= 1 && !busy && p.h <= 0) this.doMorph(p);
        break;
      case "punch":
        if (!busy && p.state !== "jump") this.doAttack("punch", p);
        break;
      case "kick":
        if (!busy) this.doAttack("kick", p);
        break;
      case "special":
        if (!busy && p.state !== "jump" && p.specialCd <= 0 && p.morphed)
          this.doAttack("special", p);
        break;
      case "jump":
        if (!busy && p.state !== "jump" && p.h <= 0) {
          p.vy = -820;
          p.h = 0.001;
          p.setState("jump");
          sfx.jump();
        }
        break;
    }
  }

  /* Cinematic morph sequence (world frozen, letterbox + camera zoom):
       0.0–0.9s  civilian raises the morpher to the chest  ("IT'S MORPHIN TIME!")
       0.9–1.7s  arm thrust to the sky, lightning builds up, aura grows
       1.7s      thunder strike → white flash → sprite becomes the Ranger
       1.7–2.9s  Ranger holds the pose, dino call caption, power-up sting */
  doMorph(p: Fighter) {
    this.morphT = MORPH_DUR;
    this.morphThunder = false;
    this.morphing = p;
    p.setState("morph");
    p.facing = 1;
    p.vx = 0;
    p.mvx = 0;
    p.mvz = 0;
    sfx.morphin();
  }

  morphElapsed(): number {
    return this.morphT >= 0 ? MORPH_DUR - this.morphT : -1;
  }

  morphCall(k: CharKey): string {
    switch (k) {
      case "red":
        return "TIRANOSSAURO!";
      case "black":
        return "MASTODONTE!";
      case "blue":
        return "TRICERÁTOPS!";
      case "yellow":
        return "DENTE-DE-SABRE!";
      case "pink":
        return "PTERODÁCTILO!";
      case "white":
        return "TIGRE BRANCO!";
    }
  }

  rangerName(k: CharKey): string {
    switch (k) {
      case "red":
        return "RANGER VERMELHO";
      case "black":
        return "RANGER PRETO";
      case "blue":
        return "RANGER AZUL";
      case "yellow":
        return "RANGER AMARELA";
      case "pink":
        return "RANGER ROSA";
      case "white":
        return "RANGER BRANCO";
    }
  }

  doAttack(kind: "punch" | "kick" | "special", p: Fighter) {
    const a = p.anims;
    const civ = !p.morphed;
    if (kind === "punch") {
      // Combo: punch1 → punch2 → punch3, escalating damage; resets after ~0.7s
      p.comboStep = (p.comboStep + 1) % 4;
      let frames: Frame[];
      let dmg: number, range: number, kd: boolean;
      if (p.comboStep === 1) {
        frames = a.punch;
        dmg = civ ? 5 : 7;
        range = 72;
        kd = false;
      } else if (p.comboStep === 2) {
        frames = a.punch2;
        dmg = civ ? 7 : 10;
        range = 80;
        kd = false;
      } else if (p.comboStep === 3) {
        frames = a.punch3;
        dmg = civ ? 11 : 16;
        range = 92;
        kd = true;
        p.comboStep = 0;
      } else {
        frames = a.punch;
        dmg = civ ? 5 : 7;
        range = 72;
        kd = false;
      }
      p.attack = {
        anim: { frames, fps: 9, loop: false },
        hitFrame: Math.min(1, frames.length - 1),
        dmg,
        range,
        knockdown: kd,
      };
      p.setState("attack");
      sfx.punch();
      p.comboTimer = 0.7;
    } else if (kind === "kick") {
      // Air kick = dive (carry forward)
      if (p.state === "jump") {
        p.attack = {
          anim: { frames: [a.kick[Math.min(1, a.kick.length - 1)]], fps: 5, loop: false },
          hitFrame: 0,
          dmg: civ ? 12 : 17,
          range: 96,
          knockdown: true,
        };
        p.setState("attack");
        // forward momentum so the dive travels
        if (Math.abs(p.vx) < 60) p.vx = p.facing * 90;
        // cancel horizontal momentum while attack animates so we don't fly
        p.mvx = 0;
        sfx.kick();
        return;
      }
      p.attack = {
        anim: { frames: a.kick, fps: 8, loop: false },
        hitFrame: Math.min(1, a.kick.length - 1),
        dmg: civ ? 11 : 16,
        range: civ ? 86 : 98,
        knockdown: true,
      };
      p.setState("attack");
      sfx.kick();
      p.comboStep = 0;
    } else {
      // Personalized weapon: per-ranger frames + per-ranger FX
      const key = p.charKey!;
      const wFrames = getWeaponFrames(key);
      const spec = WEAPON_SPECS[key];
      const animFrames = wFrames.length ? wFrames : a.special;
      p.attack = {
        anim: { frames: animFrames, fps: 6, loop: false },
        hitFrame: Math.min(spec.hitFrame, animFrames.length - 1),
        dmg: civ ? Math.floor(spec.dmg * 0.7) : spec.dmg,
        range: spec.range,
        knockdown: true,
        aoe: spec.aoe,
        weaponFx: spec.fx,
      };
      p.setState("special");
      p.specialCd = 5;
      this.shake = 0.32;
      sfx.special();
      p.comboStep = 0;
    }
  }

  /* ---------- spawning ---------- */

  spawnEnemy() {
    const st = this.stage();
    const pool = st.enemies;
    let kind: EnemyKind = "putty";
    if (pool.length > 1 && Math.random() < 0.35) {
      const specials = pool.filter((k) => k !== "putty");
      kind = specials[Math.floor(Math.random() * specials.length)];
    }
    const diff = this.phase * 1.5 + this.wave;
    let hp = 24 + diff * 6;
    let speed = 60 + diff * 5 + Math.random() * 18;
    if (kind === "skelerena") {
      hp *= 0.7;
      speed = 110 + diff * 5;
    } else if (kind === "oozeman") {
      hp *= 1.9;
      speed = 38 + diff * 2;
    }
    hp = Math.round(hp * this.diff.hpMul);
    speed *= this.diff.speedMul;
    const e = new Fighter(kind, buildEnemyAnims(kind), hp, speed, false);
    e.kind = kind;
    const side = Math.random() < 0.5 ? -1 : 1;
    e.x = this.camX + (side < 0 ? -60 : VIEW_W + 60);
    e.x = Math.max(-80, Math.min(this.worldW + 80, e.x));
    e.z = Math.random();
    e.attackCd = 0.8 + Math.random() * 1.6;
    this.enemies.push(e);
  }

  spawnHazard() {
    spawnHazard(this);
  }
  addFloater(x: number, y: number, txt: string, color: string) {
    this.floaters.push({ x, y, txt, color, t: 0 });
  }

  burst(x: number, y: number, color: string, n: number, speed: number, grav = 900, size = 4) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.4 + Math.random() * 0.8);
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - speed * 0.5,
        t: 0,
        life: 0.5 + Math.random() * 0.5,
        color,
        size: size * (0.6 + Math.random() * 0.8),
        grav,
      });
    }
  }

  /** apply damage + airborne launch to any fighter */
  damage(f: Fighter, dmg: number, dirX: number, knockdown: boolean, launch = 380, source = "hit") {
    damage(this, f, dmg, dirX, knockdown, launch, source);
  }
  loop = (now: number) => {
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.pauseShake = Math.max(0, this.pauseShake - dt);
    if (!this.paused) {
      this.update(dt);
      pollGamepads(this);
    }
    this.render();
    this.raf = requestAnimationFrame(this.loop);
  };

  update(dt: number) {
    this.time += dt;
    if (this.hitstop > 0) {
      this.hitstop -= dt;
      this.shake = Math.max(0, this.shake - dt * 0.5);
      return;
    }
    this.bannerT -= dt;
    this.shake = Math.max(0, this.shake - dt);
    this.flashT = Math.max(0, this.flashT - dt);
    this.tipT = Math.max(0, this.tipT - dt);
    this.updateAmbient(dt);
    this.updateParticles(dt);

    for (const p of this.players) {
      p.t += dt;
      p.invuln = Math.max(0, p.invuln - dt);
      p.hitFlash = Math.max(0, p.hitFlash - dt);
      p.specialCd = Math.max(0, p.specialCd - dt);
      p.comboTimer = Math.max(0, p.comboTimer - dt);
      if (p.comboTimer <= 0 && p.comboStep > 0 && p.state !== "attack") p.comboStep = 0;
    }

    // morph cinematic: morpher at chest → arm to the sky + lightning → strike → Ranger
    if (this.morphT >= 0) {
      const p = this.morphing!;
      this.morphT -= dt;
      const el = this.morphElapsed();
      // rumble builds while the lightning charges
      if (el > MORPH_ARM_UP && el < MORPH_STRIKE)
        this.shake = Math.max(this.shake, 0.08 + (el - MORPH_ARM_UP) * 0.25);
      if (el >= MORPH_ARM_UP && !this.morphThunder) {
        this.morphThunder = true;
        sfx.thunder();
      }
      if (el >= MORPH_STRIKE && !p.morphed) {
        p.morphed = true;
        const key = p.charKey!;
        p.sheet = RANGER_SHEET[key];
        p.anims = buildAnims(key);
        p.setState("victory");
        p.hp = p.maxHp;
        p.speed = 200;
        p.invuln = 1.6;
        this.flashT = 0.55;
        this.shake = 0.6;
        sfx.powerUp();
        this.burst(p.x, p.feetY() - 60, RANGER_GLOW[key], 48, 460, 300, 5);
        this.burst(p.x, p.feetY() - 60, "#ffffff", 20, 300, 200, 3);
      }
      if (this.morphT <= 0) {
        this.morphT = -1;
        this.morphing = null;
        p.setState("idle");
        this.banner(this.rangerName(p.charKey!), "Poder total! Arma liberada [C]", 1.6);
      }
      return;
    }

    // waves / phases
    if (!this.isBossPhase()) {
      if (this.toSpawn > 0) {
        this.spawnT -= dt;
        if (this.spawnT <= 0 && this.enemies.length < 6) {
          this.spawnEnemy();
          this.toSpawn--;
          this.spawnT = 1.0 + Math.random() * 1.1;
          if (!this.tipsShown.has("attack")) this.tip("attack", "Z ou J = SOCAR · X ou K = CHUTAR", 3.5);
        }
      } else if (this.enemies.length === 0 && !this.over && this.endT < 0 && this.phaseEndT < 0) {
        if (this.wave + 1 < this.waves.length) this.nextWave();
        else if (this.phase + 1 <= STAGES.length) {
          this.phaseEndT = 2.2;
          this.banner("FASE CONCLUÍDA!", "Teletransportando…", 2.2);
          for (const p of this.alivePlayers()) p.setState("victory");
          sfx.victory();
        }
      }
    } else if (this.boss && this.boss.hp <= 0 && this.endT < 0) {
      this.endT = 2.6;
      this.score += 5000;
      for (const p of this.alivePlayers()) p.setState("victory");
      sfx.victory();
      this.banner("IVAN OOZE FOI DERROTADO!", "ANGEL GROVE ESTÁ SALVA!", 2.6);
    }
    if (this.phaseEndT > 0) {
      this.phaseEndT -= dt;
      if (this.phaseEndT <= 0) {
        this.phaseEndT = -1;
        this.startPhase(this.phase + 1);
      }
    }
    if (this.endT > 0) {
      this.endT -= dt;
      if (this.endT <= 0) {
        this.over = true;
        this.cb.onVictory(this.score);
      }
    }

    this.updateHazards(dt);

    // ---- jogadores: controle, física e máquina de estados ----
    for (const p of this.players) this.updatePlayer(p, dt);

    // ---- inimigos ----
    const target = this.nearestPlayer(0);
    for (const e of this.enemies) {
      if (e.isBoss) {
        // IA do chefe é separada; aqui só os timers de fade/morte
        e.t += dt;
        e.flicker = Math.max(0, e.flicker - dt);
        if (e.removeT > 0) e.removeT -= dt;
        continue;
      }
      e.t += dt;
      e.invuln = Math.max(0, e.invuln - dt);
      e.flicker = Math.max(0, e.flicker - dt);
      e.hitFlash = Math.max(0, e.hitFlash - dt);
      e.blockT = Math.max(0, e.blockT - dt);
      if (e.removeT > 0) {
        e.removeT -= dt;
        continue;
      }
      if (e.knocked()) {
        e.x += e.vx * dt;
        if (e.h <= 0) e.vx *= 1 - 4 * dt;
        this.integrateAir(e, dt);
        this.clampWorld(e);
        if (e.state === "hurt" && e.animDone()) e.setState("idle");
        if (e.state === "fall" && e.animDone() && e.h <= 0) {
          if (e.hp <= 0) {
            e.removeT = 0.8;
            e.flicker = 0.8;
            this.score += e.kind === "putty" ? 100 : 250;
            if (e.kind === "oozeman" && Math.random() < 0.35)
              this.pickups.push({ x: e.x, z: e.z, t: 0, heal: 25 });
            continue;
          }
          e.setState("down");
          e.downT = 0.8 + Math.random() * 0.5;
        }
        if (e.state === "down") {
          e.downT -= dt;
          if (e.downT <= 0) e.setState("getup");
        }
        if (e.state === "getup" && e.animDone()) {
          e.invuln = 0.5;
          e.setState("idle");
        }
        continue;
      }
      if (this.over || target.dead || target.state === "victory" || this.phaseEndT > 0) {
        e.setState("idle");
        continue;
      }
      e.attackCd -= dt;
      const dx = target.x - e.x;
      const dz = (target.z - e.z) * 110;
      const adx = Math.abs(dx);
      const adz = Math.abs(dz);
      e.facing = dx >= 0 ? 1 : -1;
      if (e.state === "attack") {
        if (e.attack?.lungeSpeed) e.x += e.facing * e.attack.lungeSpeed * dt;
        if (e.attack && !e.didHit && e.frameIndex() >= e.attack.hitFrame) {
          e.didHit = true;
          this.resolveEnemyHit(e);
        }
        if (e.animDone()) {
          e.attack = null;
          e.setState("idle");
          e.attackCd =
            (e.kind === "skelerena" ? 1.6 : e.kind === "oozeman" ? 1.8 : 1.2) + Math.random() * 1.4;
        }
        continue;
      }
      const reach = e.kind === "oozeman" ? 105 : e.kind === "skelerena" ? 95 : 74;
      if (adx < reach && adz < 26) {
        if (e.attackCd <= 0) {
          const dmgBase = e.kind === "oozeman" ? 10 : e.kind === "skelerena" ? 8 : 6;
          e.attack = {
            anim: { frames: e.anims.punch, fps: e.kind === "oozeman" ? 4 : 6, loop: false },
            hitFrame: Math.min(
              e.kind === "putty" || (e.kind === "skelerena" && skelerenaIsFallback()) ? 2 : 1,
              e.anims.punch.length - 1,
            ),
            dmg: Math.round((dmgBase + Math.floor(this.phase * 1.5) + this.wave) * this.diff.dmgMul),
            range: e.kind === "oozeman" ? 118 : e.kind === "skelerena" ? 104 : 86,
            knockdown: e.kind !== "putty",
            lungeSpeed: e.kind === "skelerena" ? 130 : 0,
          };
          e.setState("attack");
        } else e.setState("idle");
      } else {
        const tx = target.x - e.facing * 55;
        let mx = Math.sign(tx - e.x);
        let mz = Math.sign(target.z - e.z);
        if (e.blockT > 0) {
          // detour around a solid object
          mz = e.blockDir;
          mx *= 0.35;
        }
        const spd = e.speed * (this.onOoze(e) ? 0.55 : 1);
        e.x += mx * spd * dt;
        e.z += mz * (e.kind === "skelerena" ? 0.85 : 0.6) * dt;
        e.z = Math.max(Z_MIN, Math.min(Z_MAX, e.z));
        e.x = Math.max(10, Math.min(this.worldW - 10, e.x));
        e.setState("walk");
      }
    }
    this.enemies = this.enemies.filter((e) => e.removeT === -1 || e.removeT > 0);

    // ---- chefe final ----
    if (this.boss && this.boss.hp > 0) this.updateBoss(dt);

    this.updateObjects(dt);
    this.updatePickups(dt);
    this.updateProjectiles(dt);

    for (const s of this.sparks) s.t += dt;
    this.sparks = this.sparks.filter((s) => s.t < 0.3);
    for (const f of this.floaters) f.t += dt;
    this.floaters = this.floaters.filter((f) => f.t < 0.8);

    this.updateTips(dt);

    // câmera: ponto médio dos jogadores vivos
    const alive = this.alivePlayers();
    if (alive.length) {
      const mid = alive.reduce((s, p) => s + p.x, 0) / alive.length;
      const target = Math.max(0, Math.min(this.worldW - VIEW_W, mid - VIEW_W / 2));
      this.camX += (target - this.camX) * Math.min(1, 6 * dt);
    }
  }

  /* ---------- máquina de estados do jogador ---------- */

  updatePlayer(p: Fighter, dt: number) {
    // ---- controle (com momentum na gosma) ----
    p.onOoze = this.onOoze(p);
    const k = this.keys;
    const idx = p.pIdx;
    const solo = this.players.length === 1;
    // P1: setas (+WASD no solo) · P2: WASD · gamepad: p${idx}:dir
    const useArrows = idx === 0;
    const useWasd = idx === 1 || (idx === 0 && solo);
    const left =
      k.has(`p${idx}:left`) || (useArrows && k.has("arrowleft")) || (useWasd && k.has("a"));
    const right =
      k.has(`p${idx}:right`) || (useArrows && k.has("arrowright")) || (useWasd && k.has("d"));
    const up =
      k.has(`p${idx}:up`) || (useArrows && k.has("arrowup")) || (useWasd && k.has("w"));
    const dn =
      k.has(`p${idx}:down`) || (useArrows && k.has("arrowdown")) || (useWasd && k.has("s"));
    if (!this.over && !p.dead && this.phaseEndT < 0) {
      const canMove = ["idle", "walk", "jump"].includes(p.state);
      const dx = canMove ? (right ? 1 : 0) - (left ? 1 : 0) : 0;
      const dz = canMove ? (dn ? 1 : 0) - (up ? 1 : 0) : 0;
      const tx = dx * p.speed;
      const tz = dz * 1.15;
      if (p.onOoze && p.h <= 0) {
        // escorregadio: resposta lenta, mantém o deslize
        p.mvx += (tx - p.mvx) * Math.min(1, 1.6 * dt);
        p.mvz += (tz - p.mvz) * Math.min(1, 1.6 * dt);
        if (Math.abs(p.mvx) > 60 && Math.random() < 0.3)
          this.particles.push({
            x: p.x - Math.sign(p.mvx) * 10,
            y: p.feetY(),
            vx: -p.mvx * 0.2,
            vy: -60,
            t: 0,
            life: 0.35,
            color: "#b27ae6",
            size: 3,
            grav: 500,
          });
      } else {
        p.mvx = tx;
        p.mvz = tz;
      }
      if (canMove) {
        if (dx) p.facing = dx;
        p.x += p.mvx * dt;
        p.z += p.mvz * dt;
        if (p.state !== "jump") p.setState(dx || dz || Math.abs(p.mvx) > 25 ? "walk" : "idle");
      }
    }
    if (["hurt", "fall"].includes(p.state)) {
      p.x += p.vx * dt;
      if (p.h <= 0) p.vx *= 1 - 4 * dt;
      p.mvx *= 1 - 5 * dt;
    }
    this.integrateAir(p, dt);
    this.clampWorld(p);

    // ataques
    if ((p.state === "attack" || p.state === "special") && p.attack && !p.didHit) {
      if (p.frameIndex() >= p.attack.hitFrame) {
        p.didHit = true;
        this.resolveHit(p, this.enemies, p.attack);
        this.hitObjects(p, p.attack);
      }
    }
    if ((p.state === "attack" || p.state === "special") && p.animDone() && p.h <= 0 && p.attack) {
      p.attack = null;
      p.setState("idle");
    }
    if (p.state === "hurt" && p.animDone()) p.setState("idle");
    if (p.state === "fall" && p.animDone() && p.h <= 0) {
      if (p.hp <= 0) {
        p.dead = true;
        p.setState("dead");
      } else p.setState("down");
      p.downT = 0.7;
    }
    if (p.state === "down") {
      p.downT -= dt;
      if (p.downT <= 0) p.setState("getup");
    }
    if (p.state === "getup" && p.animDone()) {
      p.invuln = 0.8;
      p.setState("idle");
    }
    // game over apenas quando TODOS os jogadores estão caídos
    if (p.state === "dead" && !this.over && p.animDone() && p.t > 1.6) {
      if (this.alivePlayers().length === 0) {
        this.over = true;
        sfx.gameover();
        this.cb.onGameOver(this.score, this.phase);
      }
    }
  }

  /* ---------- chefe final: Ivan Ooze ---------- */

  updateBoss(dt: number) {
    const b = this.boss!;
    const p = this.nearestPlayer(b.x);
    b.t += dt;
    b.invuln = Math.max(0, b.invuln - dt);
    b.hitFlash = Math.max(0, b.hitFlash - dt);
    b.flicker = Math.max(0, b.flicker - dt);
    const dx = p.x - b.x;
    const dz = (p.z - b.z) * 110;
    b.facing = dx >= 0 ? 1 : -1;

    if (b.knocked()) {
      b.x += b.vx * dt;
      this.integrateAir(b, dt);
      this.clampWorld(b);
      if (b.state === "fall" && b.animDone() && b.h <= 0) {
        if (b.hp <= 0) {
          // morte do chefe: dissolve em gosma com explosão final
          b.removeT = 1.6;
          b.flicker = 1.6;
          this.burst(b.x, b.feetY() - 80, "#b06be0", 60, 420, 300, 6);
          this.burst(b.x, b.feetY() - 80, "#ffffff", 24, 300, 200, 4);
          this.shake = 0.8;
          sfx.thunder();
          return;
        }
        if (b.slamPending) {
          b.slamPending = false;
          this.bossSlam();
        }
        b.setState("idle");
        b.attackCd = 1.8 + Math.random();
      }
      if (b.state === "hurt" && b.animDone()) b.setState("idle");
      return;
    }

    if (this.over || p.dead || this.phaseEndT > 0) {
      if (b.state !== "attack" && b.state !== "special") b.setState("idle");
      return;
    }

    b.attackCd -= dt;
    if (b.state === "attack") {
      if (b.attack && !b.didHit && b.frameIndex() >= b.attack.hitFrame) {
        b.didHit = true;
        this.resolveEnemyHit(b);
      }
      if (b.animDone()) {
        b.attack = null;
        b.setState("idle");
        b.attackCd = 1.6 + Math.random() * 1.8;
      }
      return;
    }

    const adx = Math.abs(dx);
    if (adx < 240 && Math.abs(dz) < 30 && b.attackCd <= 0) {
      // perto: soco esticado do Oozeman
      b.attack = {
        anim: { frames: b.anims.punch, fps: 4, loop: false },
        hitFrame: 1,
        dmg: Math.round(14 * this.diff.dmgMul),
        range: 250,
        knockdown: true,
      };
      b.setState("attack");
      sfx.kick();
    } else if (adx > 300 && b.attackCd <= 0) {
      // longe: rajada de gosma
      this.bossBarrage();
      b.attackCd = 2.6 + Math.random() * 1.6;
      sfx.special();
    } else {
      b.x += Math.sign(dx) * b.speed * dt;
      b.z += Math.sign(p.z - b.z) * 0.5 * dt;
      b.x = Math.max(60, Math.min(this.worldW - 60, b.x));
      b.z = Math.max(Z_MIN, Math.min(Z_MAX, b.z));
      b.setState("walk");
    }
    // renasce capangas periodicamente
    this.bossMinionT -= dt;
    if (this.bossMinionT <= 0) {
      this.bossMinionT = 9 + Math.random() * 4;
      const minions = this.enemies.filter((e) => !e.isBoss).length;
      if (minions < 2) {
        const m = new Fighter("oozeman", buildEnemyAnims("oozeman"), Math.round(40 * this.diff.hpMul), 42, false, {
          kind: "oozeman",
        });
        m.x = this.camX + (Math.random() < 0.5 ? -60 : VIEW_W + 60);
        m.z = Math.random();
        m.attackCd = 1.5;
        this.enemies.push(m);
        this.addFloater(m.x, m.feetY() - 100, "AJUDANTE DE OOZE!", "#b06be0");
      }
    }
  }

  bossBarrage() {
    const b = this.boss!;
    const n = 3;
    for (let i = 0; i < n; i++) {
      const t = this.nearestPlayer(b.x);
      const ang = Math.atan2((t.z - b.z) * 110, t.x - b.x) + (i - 1) * 0.22;
      const spd = 300 + this.diff.speedMul * 40;
      this.projectiles.push({
        x: b.x,
        z: b.z,
        vx: Math.cos(ang) * spd,
        vz: Math.sin(ang) * spd / 110,
        t: 0,
        life: 3.2,
        r: 12,
        kind: "goo",
      });
    }
    this.burst(b.x + b.facing * 60, b.feetY() - 130, "#b06be0", 10, 120, 200, 3);
  }

  bossSlam() {
    const b = this.boss!;
    this.shake = 0.55;
    this.hitstop = Math.max(this.hitstop, 0.06);
    sfx.thunder();
    this.burst(b.x, b.feetY(), "#b06be0", 26, 300, 500, 5);
    for (const p of this.players) {
      if (p.dead || p.h > 40) continue;
      if (Math.abs(p.x - b.x) < 150 && Math.abs(p.z - b.z) * 110 < 40) {
        this.damage(p, Math.round(18 * this.diff.dmgMul), Math.sign(p.x - b.x) || 1, true, 480, "trap");
      }
    }
  }

  updateProjectiles(dt: number) {
    for (const pr of this.projectiles) {
      pr.t += dt;
      pr.x += pr.vx * dt;
      pr.z += pr.vz * dt;
      if (pr.x < 20 || pr.x > this.worldW - 20) {
        pr.t = pr.life; // some ao bater na borda
        this.burst(pr.x, GROUND_TOP + pr.z * ZPX - 30, "#b06be0", 8, 120, 300, 3);
        continue;
      }
      for (const p of this.players) {
        if (p.dead || p.invuln > 0 || p.h > 40) continue;
        if (Math.abs(p.x - pr.x) < 26 && Math.abs(p.z - pr.z) * 110 < 30) {
          pr.t = pr.life;
          this.damage(p, Math.round(10 * this.diff.dmgMul), Math.sign(pr.vx) || 1, true, 380, "trap");
          this.burst(pr.x, GROUND_TOP + pr.z * ZPX - 30, "#b06be0", 10, 150, 300, 4);
          break;
        }
      }
    }
    this.projectiles = this.projectiles.filter((pr) => pr.t < pr.life);
  }

  /* ---------- dicas contextuais (fase 1) ---------- */

  tip(key: string, txt: string, dur = 3.6) {
    if (!settings.tutorial || this.phase !== 0 || this.tipsShown.has(key)) return;
    this.tipsShown.add(key);
    this.tipTxt = txt;
    this.tipT = dur;
  }

  updateTips(_dt: number) {
    if (!settings.tutorial || this.phase !== 0 || this.over) return;
    if (this.tipT > 0) return;
    const p = this.nearestPlayer(0);
    // nunca se mexeu
    if (!this.tipsShown.has("move") && this.time > 3 && p.x < 200 && p.mvx === 0 && p.mvz === 0) {
      this.tip("move", "USE AS SETAS / WASD PARA ANDAR", 3);
      return;
    }
    // morfar disponível
    for (const pl of this.players) {
      if (!pl.morphed && pl.morphMeter >= 1) {
        this.tip("morph", "MEDIDOR CHEIO! APERTE M PARA MORFAR!", 4);
        return;
      }
    }
    // objetos próximos
    for (const o of this.objects) {
      if (o.dead) continue;
      const near = Math.abs(o.x - p.x) < 150 && Math.abs(o.z - p.z) < 0.2;
      if (!near) continue;
      if (o.kind === "crate" && !this.tipsShown.has("crate")) {
        this.tip("crate", "QUEBRE CAIXOTES PARA RECUPERAR ENERGIA", 3.2);
        return;
      }
      if (o.kind === "barrel" && !this.tipsShown.has("barrel")) {
        this.tip("barrel", "CHUTE O BARRIL PARA ATROPELAR OS PUTTIES!", 3.2);
        return;
      }
      if ((o.kind === "spikes" || (o.kind === "retract" && o.up)) && !this.tipsShown.has("spikes")) {
        this.tip("spikes", "CUIDADO COM OS ESPINHOS — PULE POR CIMA!", 3.2);
        return;
      }
    }
  }

  clampWorld(f: Fighter) {
    const minX = f.isPlayer ? 30 : 10;
    const maxX = this.worldW - minX;
    if (f.x < minX) {
      f.x = minX;
      if (f.state === "fall" && f.vx < -80) {
        f.vx = -f.vx * 0.45; // bounce off the world edge
        this.shake = Math.max(this.shake, 0.1);
      } else f.vx = Math.max(0, f.vx);
    } else if (f.x > maxX) {
      f.x = maxX;
      if (f.state === "fall" && f.vx > 80) {
        f.vx = -f.vx * 0.45;
        this.shake = Math.max(this.shake, 0.1);
      } else f.vx = Math.min(0, f.vx);
    }
    f.z = Math.max(Z_MIN, Math.min(Z_MAX, f.z));
  }

  integrateAir(f: Fighter, dt: number) {
    if (f.state === "jump" || f.h > 0) {
      f.vy += GRAV * dt;
      f.h += -f.vy * dt;
      if (f.h <= 0) {
        f.h = 0;
        if (f.state === "fall" && f.vy > 260) {
          // bounce on landing, dust puff
          f.vy = -f.vy * 0.32;
          f.h = 0.001;
          this.burst(f.x, f.feetY(), "#cbb89a", 6, 90, 400, 3);
          this.shake = Math.max(this.shake, 0.08);
          return;
        }
        f.vy = 0;
        if (f.state === "jump") f.setState("idle");
        else if (f.state === "attack") {
          f.attack = null;
          f.setState("idle");
        }
      }
    }
  }

  /* ---------- stage objects ---------- */

  /** zr is the half-depth (radius) of the object in world z-units; padZ is the
      extra body radius of the fighter (same value pushOut resolves against). */
  overlaps(f: Fighter, o: StageObj, padX = 14, padZ = 0.06): boolean {
    return Math.abs(f.x - o.x) < o.w + padX && Math.abs(f.z - o.z) < o.zr + padZ;
  }

  onOoze(f: Fighter): boolean {
    if (f.h > 0) return false;
    for (const o of this.objects)
      if (o.kind === "ooze" && !o.dead && this.overlaps(f, o, 0, 0)) return true;
    return false;
  }

  isSolid(o: StageObj): boolean {
    if (o.dead) return false;
    if (o.kind === "crate" || o.kind === "firebarrel") return true;
    if (o.kind === "barrel") return Math.abs(o.vx) < 40;
    return false;
  }

  /** push a fighter out of a solid footprint */
  pushOut(f: Fighter, o: StageObj): "x" | "z" | null {
    if (!this.overlaps(f, o)) return null;
    const dx = f.x - o.x;
    const dz = f.z - o.z;
    const ox = o.w + 14 - Math.abs(dx);
    const oz = (o.zr + 0.06 - Math.abs(dz)) * ZPX;
    if (ox < oz) {
      f.x += (dx >= 0 ? 1 : -1) * ox;
      return "x";
    }
    f.z += (dz >= 0 ? 1 : -1) * (oz / ZPX);
    return "z";
  }

  updateObjects(dt: number) {
    updateObjects(this, dt);
  }
  breakCrateHit(o: StageObj, dmg: number) {
    breakCrateHit(this, o, dmg);
  }
  breakCrate(o: StageObj) {
    breakCrate(this, o);
  }
  objY(o: StageObj): number {
    return GROUND_TOP + o.z * ZPX;
  }

  /** player attacks interact with crates and barrels */
  hitObjects(attacker: Fighter, atk: AttackSpec) {
    hitObjects(this, attacker, atk);
  }
  updatePickups(dt: number) {
    for (const it of this.pickups) {
      it.t += dt;
      for (const p of this.players) {
        if (p.dead) continue;
        if (Math.abs(p.x - it.x) < 26 && Math.abs(p.z - it.z) < 0.1 && p.h < 20) {
          it.t = 999;
          p.hp = Math.min(p.maxHp, p.hp + it.heal);
          this.addFloater(p.x, p.feetY() - 90, "+" + it.heal, "#7bf26b");
          this.burst(p.x, p.feetY() - 40, "#ffe26b", 14, 160, -100, 3);
          sfx.select();
          this.score += 20;
          break;
        }
      }
    }
    this.pickups = this.pickups.filter((it) => it.t < 14);
  }

  /* ---------- dynamic hazards ---------- */

  updateHazards(dt: number) {
    updateHazards(this, dt);
  }

  updateParticles(dt: number) {
    for (const q of this.particles) {
      q.t += dt;
      q.vy += q.grav * dt;
      q.x += q.vx * dt;
      q.y += q.vy * dt;
    }
    this.particles = this.particles.filter((q) => q.t < q.life);
  }

  updateAmbient(dt: number) {
    const st = this.stage();
    if (st.ambient === "none") return;
    this.ambientT -= dt;
    if (this.ambientT > 0) return;
    this.ambientT = st.ambient === "embers" ? 0.06 : 0.16;
    const x = this.camX + Math.random() * VIEW_W;
    if (st.ambient === "embers")
      this.particles.push({
        x,
        y: VIEW_H + 4,
        vx: (Math.random() - 0.5) * 30,
        vy: -60 - Math.random() * 70,
        t: 0,
        life: 3 + Math.random() * 2,
        color: Math.random() < 0.5 ? "#ff9a3a" : "#ffd36b",
        size: 2 + Math.random() * 2,
        grav: -10,
      });
    else if (st.ambient === "dust")
      this.particles.push({
        x,
        y: Math.random() * VIEW_H,
        vx: 18 + Math.random() * 20,
        vy: (Math.random() - 0.5) * 8,
        t: 0,
        life: 4,
        color: "rgba(255,230,190,0.45)",
        size: 2,
        grav: 0,
      });
    else
      this.particles.push({
        x,
        y: 40 + Math.random() * 240,
        vx: 0,
        vy: 0,
        t: 0,
        life: 1.2,
        color: "rgba(255,255,255,0.8)",
        size: 2,
        grav: 0,
      });
  }

  /* ---------- combat resolution ---------- */

  resolveHit(attacker: Fighter, targets: Fighter[], atk: AttackSpec) {
    resolveHit(this, attacker, targets, atk);
  }
  resolveEnemyHit(e: Fighter) {
    resolveEnemyHit(this, e);
  }
  /* ================= rendering ================= */

  render() {
    const ctx = this.ctx;
    const st = this.stage();
    const shakeK = settings.reducedFx ? 0.35 : 1;
    const shakeX = this.shake > 0 ? (Math.random() - 0.5) * 12 * this.shake * shakeK : 0;
    const shakeY = this.shake > 0 ? (Math.random() - 0.5) * 8 * this.shake * shakeK : 0;
    ctx.save();
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.translate(shakeX, shakeY);

    // cinematic camera: zoom toward the morphing player
    const zoom = this.morphZoom();
    if (zoom > 1) {
      const mp = this.morphing ?? this.player;
      const px = mp.x - this.camX;
      const py = mp.feetY() - 60;
      ctx.translate(px, py);
      ctx.scale(zoom, zoom);
      ctx.translate(-px, -py);
    }

    const img = getImage(st.img);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, Math.round(-this.camX), 0, this.worldW, VIEW_H);
    if (this.isBossPhase()) {
      // atmosfera roxa do covil de Ivan Ooze
      ctx.fillStyle = "rgba(88,20,150,0.22)";
      ctx.fillRect(-20, -20, VIEW_W + 40, VIEW_H + 40);
    }
    if (this.morphT >= 0) {
      // dim the world so the hero pops
      ctx.fillStyle = "rgba(0,0,20,0.35)";
      ctx.fillRect(-VIEW_W, -VIEW_H, VIEW_W * 3, VIEW_H * 3);
    }

    const g = ctx.createLinearGradient(0, GROUND_TOP - 40, 0, VIEW_H);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0,0.28)");
    ctx.fillStyle = g;
    ctx.fillRect(0, GROUND_TOP - 40, VIEW_W, VIEW_H - GROUND_TOP + 40);

    // flat decals first
    for (const o of this.objects) if (o.kind === "ooze" && !o.dead) this.drawOoze(o);
    for (const h of this.hazards) this.drawHazardGround(h);

    // z-sorted world: fighters, solid objects, spikes, pickups
    type Item = { z: number; draw: () => void };
    const items: Item[] = [];
    for (const f of [...this.enemies, ...this.players])
      items.push({ z: f.z, draw: () => this.drawFighter(f) });
    for (const o of this.objects) {
      if (o.dead || o.kind === "ooze") continue;
      items.push({
        z: o.z - (o.kind === "spikes" || o.kind === "retract" ? 0.02 : 0),
        draw: () => this.drawObject(o),
      });
    }
    for (const it of this.pickups) items.push({ z: it.z, draw: () => this.drawPickup(it) });
    items.sort((a, b) => a.z - b.z);
    for (const it of items) it.draw();

    for (const h of this.hazards) this.drawHazardAir(h);

    // projéteis do chefe
    for (const pr of this.projectiles) drawProjectile(this, pr);

    // morph lightning
    if (this.morphT >= 0) this.drawMorphFx();

    // particles
    for (const q of this.particles) {
      const a = 1 - q.t / q.life;
      ctx.globalAlpha = Math.max(0, Math.min(1, a * 1.4));
      ctx.fillStyle = q.color;
      const px = Math.round(q.x - this.camX - q.size / 2);
      const py = Math.round(q.y - q.size / 2);
      ctx.fillRect(px, py, Math.max(1, Math.round(q.size)), Math.max(1, Math.round(q.size)));
    }
    ctx.globalAlpha = 1;

    for (const s of this.sparks) {
      const sx = s.x - this.camX;
      const pr = s.t / 0.3;
      const r = (s.big ? 34 : 18) * (0.5 + pr);
      ctx.globalAlpha = 1 - pr;
      ctx.strokeStyle = s.big ? "#ffe26b" : "#ffffff";
      ctx.lineWidth = s.big ? 4 : 3;
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI * 2 * i) / 6 + pr * 2;
        ctx.beginPath();
        ctx.moveTo(sx + Math.cos(a) * r * 0.4, s.y + Math.sin(a) * r * 0.4);
        ctx.lineTo(sx + Math.cos(a) * r, s.y + Math.sin(a) * r);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    ctx.font = "bold 16px 'Courier New', monospace";
    ctx.textAlign = "center";
    for (const f of this.floaters) {
      const pr = f.t / 0.8;
      ctx.globalAlpha = 1 - pr;
      ctx.fillStyle = f.color;
      ctx.fillText(f.txt, f.x - this.camX, f.y - pr * 34);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = "left";

    for (const p of this.players) {
      if (p.state === "special" && p.attack?.weaponFx) {
        this.drawWeaponFx(p.attack.weaponFx, p);
      }
    }

    // undo the cinematic zoom for screen-space overlays
    if (zoom > 1) {
      const mp = this.morphing ?? this.player;
      const px = mp.x - this.camX;
      const py = mp.feetY() - 60;
      ctx.translate(px, py);
      ctx.scale(1 / zoom, 1 / zoom);
      ctx.translate(-px, -py);
    }

    if (this.flashT > 0) {
      ctx.globalAlpha = Math.min(1, this.flashT * 2.2);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(-20, -20, VIEW_W + 40, VIEW_H + 40);
      ctx.globalAlpha = 1;
    }

    if (this.morphT >= 0) this.drawMorphOverlay();
    else if (!this.paused) this.drawHud();
    if (this.paused) this.drawPauseOverlay();
    ctx.restore();
  }

  drawPauseOverlay() {
    const ctx = this.ctx;
    const alpha = Math.min(1, this.pauseShake * 5);
    ctx.fillStyle = `rgba(4,6,16,${(0.66 * alpha).toFixed(3)})`;
    ctx.fillRect(-20, -20, VIEW_W + 40, VIEW_H + 40);
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffe26b";
    ctx.font = "bold 46px 'Courier New', monospace";
    ctx.fillText("PAUSA", VIEW_W / 2, VIEW_H / 2 - 20);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 16px 'Courier New', monospace";
    ctx.fillText(
      "P / ESC para continuar  ·  controles abaixo do jogo",
      VIEW_W / 2,
      VIEW_H / 2 + 16,
    );
    ctx.textAlign = "left";
  }

  /** zoom factor of the cinematic camera during the morph (eases in and out) */
  morphZoom(): number {
    const el = this.morphElapsed();
    if (el < 0) return 1;
    const inK = Math.min(1, el / 0.5);
    const outK = Math.min(1, Math.max(0, (MORPH_DUR - el) / 0.45));
    const k = Math.min(inK, outK);
    const ease = k * k * (3 - 2 * k);
    return 1 + 0.38 * ease;
  }

  /** letterbox bars + captions of the morph cutscene */
  drawMorphOverlay() {
    const ctx = this.ctx;
    const el = this.morphElapsed();
    const inK = Math.min(1, el / 0.3);
    const outK = Math.min(1, Math.max(0, (MORPH_DUR - el) / 0.4));
    const bar = 44 * Math.min(inK, outK);
    ctx.fillStyle = "#000";
    ctx.fillRect(-20, -20, VIEW_W + 40, bar + 20);
    ctx.fillRect(-20, VIEW_H - bar, VIEW_W + 40, bar + 20);

    ctx.textAlign = "center";
    if (el < MORPH_STRIKE) {
      // "IT'S MORPHIN TIME!" — slams in, then holds with a subtle pulse
      const k = Math.min(1, el / 0.25);
      const scale = 1.6 - 0.6 * (k * k * (3 - 2 * k));
      const pulse = 1 + Math.sin(el * 14) * 0.02;
      ctx.save();
      ctx.translate(VIEW_W / 2, 84);
      ctx.scale(scale * pulse, scale * pulse);
      ctx.globalAlpha = k;
      ctx.font = "bold 40px 'Courier New', monospace";
      ctx.lineWidth = 6;
      ctx.strokeStyle = "#000";
      ctx.strokeText("IT'S MORPHIN TIME!", 0, 0);
      ctx.fillStyle = "#ffe26b";
      ctx.fillText("IT'S MORPHIN TIME!", 0, 0);
      ctx.restore();
    } else {
      // dino call in the ranger color + name below
      const key = (this.morphing ?? this.player).charKey!;
      const k = Math.min(1, (el - MORPH_STRIKE) / 0.22);
      const scale = 1.8 - 0.8 * (k * k * (3 - 2 * k));
      const glow = RANGER_GLOW[key];
      ctx.save();
      ctx.translate(VIEW_W / 2, 84);
      ctx.scale(scale, scale);
      ctx.globalAlpha = k;
      ctx.font = "bold 44px 'Courier New', monospace";
      ctx.lineWidth = 7;
      ctx.strokeStyle = "#000";
      ctx.strokeText(this.morphCall(key), 0, 0);
      ctx.fillStyle = glow === "#ffffff" ? "#f4f4ff" : glow;
      ctx.fillText(this.morphCall(key), 0, 0);
      ctx.restore();
      if (el > MORPH_STRIKE + 0.35) {
        ctx.globalAlpha = Math.min(1, (el - MORPH_STRIKE - 0.35) / 0.25);
        ctx.font = "bold 16px 'Courier New', monospace";
        ctx.fillStyle = "#ffffff";
        ctx.fillText(this.rangerName(key), VIEW_W / 2, VIEW_H - bar - 14);
        ctx.globalAlpha = 1;
      }
    }
    ctx.textAlign = "left";
  }

  drawMorphFx() {
    const ctx = this.ctx;
    const p = this.morphing ?? this.player;
    const sx = p.x - this.camX;
    const fy = p.feetY();
    const glow = RANGER_GLOW[p.charKey!];
    const el = this.morphElapsed();
    const charging = el >= MORPH_ARM_UP && el < MORPH_STRIKE;
    const done = el >= MORPH_STRIKE;

    // aura: grows while charging, blooms in the ranger color after the strike
    const chargeK = charging ? (el - MORPH_ARM_UP) / (MORPH_STRIKE - MORPH_ARM_UP) : done ? 1 : 0;
    const auraR = 26 + chargeK * 44 + (done ? Math.sin(el * 9) * 6 : 0);
    const rg = ctx.createRadialGradient(sx, fy - 60, 4, sx, fy - 60, auraR + 50);
    rg.addColorStop(0, glow + (done ? "cc" : "88"));
    rg.addColorStop(1, glow + "00");
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.arc(sx, fy - 60, auraR + 50, 0, Math.PI * 2);
    ctx.fill();

    // energy motes orbiting up into the raised morpher
    if (charging || done) {
      for (let i = 0; i < 10; i++) {
        const a = el * 5 + i * 0.63;
        const r = 30 + ((el * 60 + i * 13) % 40);
        const mx = sx + Math.cos(a) * r;
        const my = fy - 40 - ((el * 90 + i * 17) % 110);
        ctx.fillStyle = i % 2 ? "#ffffff" : glow;
        ctx.fillRect(mx - 1.5, my - 1.5, 3, 3);
      }
    }

    // lightning: sparse while charging, a full strike right at the transformation
    const strikeWindow = done && el < MORPH_STRIKE + 0.35;
    if (charging || strikeWindow) {
      const bolts = strikeWindow ? 6 : 2 + Math.floor(chargeK * 3);
      ctx.lineWidth = strikeWindow ? 5 : 3;
      for (let b = 0; b < bolts; b++) {
        if (!strikeWindow && Math.random() < 0.45) continue; // flicker
        ctx.strokeStyle = Math.random() < 0.5 ? "#ffffff" : "#ffe26b";
        ctx.beginPath();
        let x = sx + (Math.random() - 0.5) * (strikeWindow ? 60 : 180);
        let y = -60;
        ctx.moveTo(x, y);
        const tx = sx + (Math.random() - 0.5) * 16;
        const ty = fy - 124 - Math.random() * 16;
        const segs = 8;
        for (let s = 1; s <= segs; s++) {
          const k = s / segs;
          x = x + (tx - x) * k + (Math.random() - 0.5) * 30;
          y = -60 + (ty + 60) * k;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = strikeWindow ? 0.9 : 0.5;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(sx, fy - 130, (strikeWindow ? 18 : 9) + Math.random() * 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // shockwave rings after the strike
    if (done) {
      const k = Math.min(1, (el - MORPH_STRIKE) / 0.6);
      ctx.strokeStyle = glow;
      ctx.lineWidth = 3;
      for (let r = 0; r < 2; r++) {
        const rad = 40 + r * 30 + k * 160;
        ctx.globalAlpha = (1 - k) * (r === 0 ? 0.9 : 0.5);
        ctx.beginPath();
        ctx.ellipse(sx, fy, rad, rad * 0.32, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  }

  drawOoze(o: StageObj) {
    drawOoze(this, o);
  }
  drawObject(o: StageObj) {
    drawObject(this, o);
  }
  drawPickup(it: Pickup) {
    drawPickup(this, it);
  }
  hazardScreenPos(h: Hazard): [number, number] {
    return hazardScreenPos(this, h);
  }
  drawHazardGround(h: Hazard) {
    drawHazardGround(this, h);
  }
  drawHazardAir(h: Hazard) {
    drawHazardAir(this, h);
  }
  drawFighter(f: Fighter) {
    drawFighter(this, f);
  }
  drawWeaponFx(fx: WeaponFx, p: Fighter) {
    drawWeaponFx(this, fx, p);
  }
  drawHud() {
    const ctx = this.ctx;
    const st = this.stage(),
      p = this.player;
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(20, 18, 320, 54);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 18, 320, 54);
    ctx.font = "bold 13px 'Courier New', monospace";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(this.players.length > 1 ? "ENERGIA P1" : "ENERGIA", 32, 36);
    ctx.fillStyle = "#3a3f4a";
    ctx.fillRect(32, 44, 296, 16);
    const ratio = Math.max(0, p.hp) / p.maxHp;
    const hpg = ctx.createLinearGradient(32, 0, 328, 0);
    hpg.addColorStop(0, ratio > 0.35 ? "#37d05c" : "#e0442e");
    hpg.addColorStop(1, ratio > 0.35 ? "#9cf22e" : "#ff9a2e");
    ctx.fillStyle = hpg;
    ctx.fillRect(32, 44, 296 * ratio, 16);
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(VIEW_W - 290, 18, 270, 54);
    ctx.strokeRect(VIEW_W - 290, 18, 270, 54);
    ctx.fillStyle = "#ffe26b";
    ctx.font = "bold 15px 'Courier New', monospace";
    ctx.fillText(`PONTOS ${String(this.score).padStart(6, "0")}`, VIEW_W - 276, 40);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(
      this.isBossPhase()
        ? "CHEFE FINAL"
        : `FASE ${this.phase + 1}/${STAGES.length}  ONDA ${Math.min(this.wave + 1, this.waves.length)}/${this.waves.length}  VILÕES ${this.enemies.filter((e) => e.removeT === -1 && !e.isBoss).length + this.toSpawn}`,
      VIEW_W - 276,
      62,
    );
    // barra do chefe no topo
    if (this.boss) drawBossBar(this);
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(20, 80, 180, 26);
    ctx.strokeRect(20, 80, 180, 26);
    ctx.font = "bold 11px 'Courier New', monospace";
    if (!p.morphed) {
      if (p.morphMeter >= 1) {
        ctx.fillStyle = Math.floor(this.time / 0.25) % 2 ? "#ffe26b" : "#ffffff";
        ctx.fillText("MORFAR! [M]", 30, 97);
      } else {
        ctx.fillStyle = "#8a6ad4";
        ctx.fillRect(22, 82, 176 * p.morphMeter, 22);
        ctx.fillStyle = "#dfe6ee";
        ctx.fillText("PODER DE MORFAGEM", 30, 97);
      }
    } else if (p.specialCd <= 0) {
      ctx.fillStyle = "#ffe26b";
      ctx.fillText("ARMA PRONTA! [C]", 30, 97);
    } else {
      ctx.fillStyle = "#2b7fd4";
      ctx.fillRect(22, 82, 176 * (1 - p.specialCd / 5), 22);
      ctx.fillStyle = "#dfe6ee";
      ctx.fillText("RECARREGANDO...", 30, 97);
    }
    // combo counter (below the score box, right side)
    if (p.comboStep > 0) {
      const labels = ["SOCO", "SOCO 2", "SOCO 3!"];
      const colors = ["#ffe26b", "#ffd24a", "#ff9a2e"];
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(VIEW_W - 200, 80, 180, 26);
      ctx.font = "bold 13px 'Courier New', monospace";
      ctx.fillStyle = colors[p.comboStep - 1];
      ctx.fillText(`COMBO ${p.comboStep} ${labels[p.comboStep - 1]}`, VIEW_W - 192, 97);
    }
    // HUD do P2 em co-op
    if (this.players[1]) {
      const q = this.players[1];
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(20, 112, 200, 24);
      ctx.strokeRect(20, 112, 200, 24);
      ctx.font = "bold 11px 'Courier New', monospace";
      ctx.fillStyle = "#ffffff";
      ctx.fillText("ENERGIA P2", 28, 123);
      const r2 = Math.max(0, q.hp) / q.maxHp;
      const hp2 = ctx.createLinearGradient(96, 0, 212, 0);
      hp2.addColorStop(0, r2 > 0.35 ? "#37d05c" : "#e0442e");
      hp2.addColorStop(1, r2 > 0.35 ? "#9cf22e" : "#ff9a2e");
      ctx.fillStyle = hp2;
      ctx.fillRect(96, 114, 116 * r2, 14);
      ctx.fillStyle = "#dfe6ee";
      ctx.fillText(q.dead ? "CAÍDO..." : q.morphed ? "ARMADO" : "CIVIL", 212, 123);
    }
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(20, VIEW_H - 34, 250, 22);
    ctx.fillStyle = "#9fb6d8";
    ctx.font = "bold 11px 'Courier New', monospace";
    ctx.fillText(`${this.phase + 1}. ${st.name}`, 28, VIEW_H - 19);
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(VIEW_W - 150, VIEW_H - 34, 130, 22);
    ctx.fillStyle = "#8a93a8";
    ctx.fillText("P — PAUSA", VIEW_W - 142, VIEW_H - 19);
    if (this.tipT > 0 && !this.over) {
      const a = Math.min(1, this.tipT);
      ctx.globalAlpha = a;
      ctx.fillStyle = "rgba(0,0,0,0.62)";
      ctx.fillRect(0, VIEW_H - 90, VIEW_W, 34);
      ctx.fillStyle = "#ffe26b";
      ctx.font = "bold 16px 'Courier New', monospace";
      ctx.textAlign = "center";
      ctx.fillText(this.tipTxt, VIEW_W / 2, VIEW_H - 68);
      ctx.textAlign = "left";
      ctx.globalAlpha = 1;
    }
    if (this.bannerT > 0 && !this.over) {
      const a = Math.min(1, this.bannerT);
      ctx.globalAlpha = a;
      ctx.fillStyle = "rgba(0,0,0,0.62)";
      ctx.fillRect(0, 158, VIEW_W, 96);
      ctx.fillStyle = "#ffe26b";
      ctx.font = "bold 42px 'Courier New', monospace";
      ctx.textAlign = "center";
      ctx.fillText(this.bannerBig, VIEW_W / 2, 206);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 16px 'Courier New', monospace";
      ctx.fillText(this.bannerSmall, VIEW_W / 2, 236);
      ctx.textAlign = "left";
      ctx.globalAlpha = 1;
    }
    if (this.endT > 0) {
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(0, 162, VIEW_W, 84);
      ctx.fillStyle = "#7bf26b";
      ctx.font = "bold 40px 'Courier New', monospace";
      ctx.textAlign = "center";
      ctx.fillText(
        this.isBossPhase() ? "IVAN OOZE FOI DERROTADO!" : "ANGEL GROVE ESTÁ SALVA!",
        VIEW_W / 2,
        216,
      );
      ctx.textAlign = "left";
    }
  }
}


