/* Perigos dinâmicos: vigas, fogo e faíscas por fase. */
import { GROUND_TOP, VIEW_W, Z_MAX, Z_MIN, ZPX } from "./consts";
import { sfx } from "./audio";
import type { Game } from "./engine";
import type { Fighter } from "./fighter";
import type { Hazard } from "./world";

export function spawnHazard(g: Game) {
    const st = g.stage();
    if (g.isBossPhase() || !st.hazard) return;
    const type = st.hazard.type;
    const h: Hazard = {
      type,
      x: g.camX + 120 + Math.random() * (VIEW_W - 240),
      z: 0.15 + Math.random() * 0.7,
      t: 0,
      warnT: type === "girder" ? 1.1 : 0.9,
      activeT: type === "girder" ? 0.35 : 2.2,
      dmg: st.hazard.dmg,
      hitDone: new Set(),
    };
    if (Math.random() < 0.45) {
      const tp = g.players[Math.floor(Math.random() * g.players.length)];
      h.x = tp.x + (Math.random() - 0.5) * 160;
      h.z = Math.max(Z_MIN, Math.min(Z_MAX, tp.z + (Math.random() - 0.5) * 0.3));
    }
    h.x = Math.max(40, Math.min(g.worldW - 40, h.x));
    g.hazards.push(h);
  }

  /* ---------- helpers ---------- */


export function updateHazards(g: Game, dt: number) {
    const st = g.stage();
    if (st.hazard && !g.over && g.phaseEndT < 0) {
      g.hazardTimer -= dt;
      if (g.hazardTimer <= 0) {
        g.spawnHazard();
        const [a, b] = st.hazard.every;
        g.hazardTimer = a + Math.random() * (b - a);
      }
    }
    for (const h of g.hazards) {
      h.t += dt;
      const active = h.t > h.warnT && h.t < h.warnT + h.activeT;
      if (!active) continue;
      if (h.type === "girder" && h.t - dt <= h.warnT) {
        g.shake = Math.max(g.shake, 0.3);
        sfx.fall();
        g.burst(h.x, GROUND_TOP + h.z * ZPX, "#cbb89a", 12, 150, 500, 4);
      }
      const R = h.type === "girder" ? 46 : 52;
      const targets: Fighter[] = [...g.players, ...g.enemies];
      for (const f of targets) {
        if (h.hitDone.has(f) || f.invuln > 0 || f.h > 40) continue;
        if (["fall", "down", "getup", "dead"].includes(f.state)) continue;
        const dx = Math.abs(f.x - h.x);
        const dz = Math.abs(f.z - h.z) * 110;
        if (dx < R && dz < 30) {
          h.hitDone.add(f);
          const dmg = f.isPlayer ? h.dmg : Math.ceil(h.dmg * 0.75);
          g.damage(f, dmg, f.x >= h.x ? 1 : -1, true, 420, "trap");
          g.sparks.push({ x: f.x, y: f.feetY() - 60, t: 0, big: true });
          if (!f.isPlayer) sfx.fall();
        }
      }
    }
    g.hazards = g.hazards.filter((h) => h.t < h.warnT + h.activeT + 0.4);
  }

  /* ---------- particles / ambient ---------- */


