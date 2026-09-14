/* Objetos de fase: caixotes, barris, espinhos, gosma — atualização e interação. */
import { sfx } from "./audio";
import type { Game } from "./engine";
import type { AttackSpec, Fighter } from "./fighter";
import type { StageObj } from "./world";

export function updateObjects(g: Game, dt: number) {
    const fighters: Fighter[] = [...g.players, ...g.enemies.filter((e) => e.removeT === -1)];
    for (const o of g.objects) {
      if (o.dead) continue;
      for (const [f, c] of o.cool) {
        const n = c - dt;
        if (n <= 0) o.cool.delete(f);
        else o.cool.set(f, n);
      }
      o.wobble = Math.max(0, o.wobble - dt);

      // retractable spikes cycle: down 2.2s → warning 0.6s → up 1.4s
      if (o.kind === "retract") {
        o.timer += dt;
        const c = o.timer % 4.2;
        const wasUp = o.up;
        o.warn = c >= 2.2 && c < 2.8;
        o.up = c >= 2.8;
        if (o.up && !wasUp) sfx.kick();
      }

      // rolling barrel physics
      if (o.kind === "barrel" && Math.abs(o.vx) >= 40) {
        o.x += o.vx * dt;
        o.rot += (o.vx / 22) * dt;
        o.vx *= 1 - 0.9 * dt;
        if (o.x < 30 || o.x > g.worldW - 30) {
          o.x = Math.max(30, Math.min(g.worldW - 30, o.x));
          o.vx = -o.vx * 0.5;
          sfx.kick();
        }
        // smash enemies in its path
        for (const e of g.enemies) {
          if (e.removeT !== -1 || e.invuln > 0 || e.knocked()) continue;
          if (g.overlaps(e, o, 18, 0.05)) {
            g.damage(e, 18, Math.sign(o.vx) || 1, true, 420);
            g.sparks.push({ x: e.x, y: e.feetY() - 50, t: 0, big: true });
            g.score += 25;
            for (const pl of g.players) if (!pl.morphed) pl.morphMeter = Math.min(1, pl.morphMeter + 0.1);
            o.vx *= 0.7;
          }
        }
        // rolling barrel also breaks crates
        for (const c of g.objects) {
          if (
            c.kind === "crate" &&
            !c.dead &&
            Math.abs(c.x - o.x) < c.w + o.w &&
            Math.abs(c.z - o.z) < c.zr + o.zr
          ) {
            g.breakCrate(c);
            o.vx *= 0.5;
          }
        }
        if (Math.abs(o.vx) < 40) o.vx = 0;
      }

      for (const f of fighters) {
        if (f.state === "dead") continue;
        const grounded = f.h < 10;
        const airborneOver = f.h > 40;

        // solids: block movement (jumping over is allowed)
        if (g.isSolid(o) && !airborneOver) {
          const axis = g.pushOut(f, o);
          if (axis && !f.knocked()) {
            if (!f.isPlayer && f.blockT <= 0) {
              f.blockT = 0.55;
              f.blockDir = f.z < o.z ? -1 : 1;
              if ((f.z < 0.12 && f.blockDir < 0) || (f.z > 0.88 && f.blockDir > 0))
                f.blockDir *= -1;
            } else if (f.isPlayer) {
              // player gets a tiny grace period so they don't feel stuck
              if (f.blockT <= 0) f.blockT = 0.18;
            }
          }
          // a fighter knocked into a solid object: bounce back
          if (axis === "x" && f.state === "fall" && Math.abs(f.vx) > 120) {
            f.vx = -f.vx * 0.5;
            if (o.kind === "crate") g.breakCrateHit(o, 1);
            if (o.kind === "barrel") o.vx = Math.sign(f.x < o.x ? 1 : -1) * 260;
          }
        }

        // spikes / retractable spikes: damage on ground contact
        if ((o.kind === "spikes" || (o.kind === "retract" && o.up)) && grounded) {
          if (!f.isPlayer && !f.knocked()) {
            // walking enemies treat spikes as a solid they avoid
            const axis = g.pushOut(f, o);
            if (axis && f.blockT <= 0) {
              f.blockT = 0.5;
              f.blockDir = f.z < o.z ? -1 : 1;
            }
          } else if (g.overlaps(f, o, 4, 0.02) && !o.cool.has(f) && f.invuln <= 0) {
            o.cool.set(f, 1.2);
            const dir = f.x >= o.x ? 1 : -1;
            g.damage(f, f.isPlayer ? 12 : 10, dir, true, 470, "trap");
            f.vx = dir * 300;
            g.sparks.push({ x: f.x, y: f.feetY() - 20, t: 0, big: true });
            g.burst(f.x, f.feetY() - 10, "#e04040", 8, 140, 800, 3);
            if (!f.isPlayer) {
              g.score += 30;
              for (const pl of g.players) if (!pl.morphed) pl.morphMeter = Math.min(1, pl.morphMeter + 0.1);
            }
          }
        }

        // fire drums: burn anyone grounded next to them (enemies only when knocked into it)
        if (o.kind === "firebarrel" && grounded && (f.isPlayer || f.knocked())) {
          if (
            g.overlaps(f, o, 26, 0.09) &&
            !o.cool.has(f) &&
            f.invuln <= 0 &&
            f.state !== "down" &&
            f.state !== "getup"
          ) {
            o.cool.set(f, 1.0);
            const dir = f.x >= o.x ? 1 : -1;
            g.damage(f, f.isPlayer ? 10 : 12, dir, true, 400, "trap");
            f.vx = dir * 260;
            g.burst(f.x, f.feetY() - 50, "#ff8c2e", 10, 160, 200, 4);
            if (!f.isPlayer) g.score += 30;
          }
        }
      }
    }
  }


export function breakCrateHit(g: Game, o: StageObj, dmg: number) {
    o.hp -= dmg;
    o.wobble = 0.25;
    g.burst(o.x, g.objY(o) - 30, "#b07a3a", 5, 120, 900, 3);
    sfx.punch();
    if (o.hp <= 0) g.breakCrate(o);
  }


export function breakCrate(g: Game, o: StageObj) {
    if (o.dead) return;
    o.dead = true;
    g.burst(o.x, g.objY(o) - 30, "#a86a2c", 18, 220, 900, 5);
    g.burst(o.x, g.objY(o) - 30, "#e0b070", 10, 180, 900, 3);
    g.shake = Math.max(g.shake, 0.15);
    sfx.fall();
    g.pickups.push({ x: o.x, z: o.z, t: 0, heal: 30 });
    g.score += 50;
  }


export function hitObjects(g: Game, attacker: Fighter, atk: AttackSpec) {
    for (const o of g.objects) {
      if (o.dead) continue;
      if (o.kind !== "crate" && o.kind !== "barrel") continue;
      const dx = o.x - attacker.x;
      const inFront = atk.aoe
        ? Math.abs(dx) < atk.range
        : dx * attacker.facing > -10 && Math.abs(dx) < atk.range + o.w;
      const dz = Math.abs(o.z - attacker.z) * 110;
      if (!inFront || dz > 30) continue;
      if (o.kind === "crate") {
        g.breakCrateHit(o, atk.aoe ? 3 : 1);
        g.sparks.push({ x: o.x, y: g.objY(o) - 30, t: 0, big: false });
        g.hitstop = Math.max(g.hitstop, 0.04);
      } else {
        // kick sends the barrel rolling, punch nudges it
        const power = atk.knockdown ? 560 : 300;
        o.vx = attacker.facing * power;
        o.wobble = 0.2;
        g.sparks.push({ x: o.x, y: g.objY(o) - 30, t: 0, big: atk.knockdown });
        sfx.kick();
      }
    }
  }


