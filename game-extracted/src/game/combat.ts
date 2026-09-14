/* Resolução de combate: dano, acertos do jogador e dos inimigos. */
import { sfx } from "./audio";
import type { Game } from "./engine";
import type { AttackSpec, Fighter } from "./fighter";

export function damage(g: Game, f: Fighter, dmg: number, dirX: number, knockdown: boolean, launch = 380, source = "hit") {
    f.hp -= dmg;
    f.hitFlash = 0.14;
    f.vx = dirX * (knockdown ? 240 : 140);
    const color = f.isPlayer ? "#ff6b6b" : source === "trap" ? "#ff9d4a" : "#ffe26b";
    g.addFloater(f.x, f.feetY() - f.h - 84 - Math.random() * 16, "-" + dmg, color);
    if (f.isPlayer) sfx.hurt();
    if (f.hp <= 0 || knockdown) {
      if (f.isPlayer && f.hp <= 0) f.hp = 0;
      f.setState("fall");
      f.vy = -launch;
      f.h = Math.max(f.h, 0.001);
      if (f.isBoss) f.slamPending = true; // golpe de queda do chefe ao aterrissar
      if (!f.isPlayer) sfx.fall();
      g.hitstop = Math.max(g.hitstop, 0.08);
      g.shake = Math.max(g.shake, 0.16);
    } else {
      f.setState("hurt");
      if (!f.isPlayer) sfx.hitConnect();
      g.hitstop = Math.max(g.hitstop, 0.05);
    }
    if (f.isPlayer) f.invuln = Math.max(f.invuln, knockdown ? 0.6 : 0.35);
  }

  /* ---------- main loop ---------- */


export function resolveHit(g: Game, attacker: Fighter, targets: Fighter[], atk: AttackSpec) {
    let connected = false;
    for (const t of targets) {
      if (t.invuln > 0 || t.removeT > 0) continue;
      if (["fall", "down", "getup"].includes(t.state) && !atk.aoe) continue;
      const dx = t.x - attacker.x;
      const inFront = atk.aoe
        ? Math.abs(dx) < atk.range
        : dx * attacker.facing > -14 && Math.abs(dx) < atk.range;
      const dz = Math.abs(t.z - attacker.z) * 110;
      if (inFront && dz < 34) {
        connected = true;
        g.sparks.push({
          x: t.x + attacker.facing * 10,
          y: t.feetY() - 60 - Math.random() * 30,
          t: 0,
          big: atk.aoe === true || atk.knockdown,
        });
        if (!attacker.morphed) attacker.morphMeter = Math.min(1, attacker.morphMeter + 0.12);
        const willDie = t.hp - atk.dmg <= 0;
        g.damage(t, atk.dmg, attacker.facing, atk.knockdown, atk.aoe ? 520 : 380);
        if (!attacker.morphed && willDie) attacker.morphMeter = Math.min(1, attacker.morphMeter + 0.15);
        g.score += 10;
        if (!atk.aoe) break;
      }
    }
    if (connected && atk.aoe) {
      g.shake = 0.4;
      g.hitstop = Math.max(g.hitstop, 0.12);
    }
  }


export function resolveEnemyHit(g: Game, e: Fighter) {
    const p = g.nearestPlayer(e.x);
    if (!e.attack || p.invuln > 0 || p.dead) return;
    if (["fall", "down", "getup", "dead", "morph"].includes(p.state)) return;
    const dx = p.x - e.x;
    const dz = Math.abs(p.z - e.z) * 110;
    if (dx * e.facing > -14 && Math.abs(dx) < e.attack.range && dz < 34) {
      g.sparks.push({ x: p.x, y: p.feetY() - 70, t: 0, big: e.attack.knockdown });
      const kd = e.attack.knockdown || Math.random() < 0.18;
      g.damage(p, e.attack.dmg, e.facing, kd, 360);
      g.shake = Math.max(g.shake, 0.12);
    }
  }


