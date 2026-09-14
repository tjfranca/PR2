/* Desenho do mundo: objetos, pickups, perigos, lutadores e efeitos de arma. */
import { GROUND_TOP, VIEW_H, VIEW_W, ZPX } from "./consts";
import { getImage } from "./sprites";
import type { WeaponFx } from "./sprites";
import { settings } from "./settings";
import type { Game } from "./engine";
import type { Fighter } from "./fighter";
import type { Hazard, Pickup, Projectile, StageObj } from "./world";

export function drawOoze(g: Game, o: StageObj) {
    const ctx = g.ctx;
    const sx = o.x - g.camX;
    const sy = g.objY(o);
    if (sx < -150 || sx > VIEW_W + 150) return;
    const rz = o.zr * ZPX;
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = "#3d1466";
    ctx.beginPath();
    ctx.ellipse(sx, sy, o.w, rz, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#6a2ea3";
    ctx.beginPath();
    ctx.ellipse(sx, sy - 2, o.w - 6, rz - 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#b27ae6";
    ctx.beginPath();
    ctx.ellipse(sx - o.w * 0.35, sy - rz * 0.35, o.w * 0.25, rz * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    // bubbles
    for (let i = 0; i < 4; i++) {
      const ph = (g.time * 1.3 + i * 1.7) % 2;
      const bx = sx + Math.sin(i * 2.3 + o.x) * o.w * 0.6;
      const by = sy + Math.cos(i * 1.9 + o.x) * rz * 0.5;
      ctx.globalAlpha = Math.max(0, 0.8 - ph * 0.4);
      ctx.strokeStyle = "#d9b8ff";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(bx, by, 2 + ph * 4, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }


export function drawObject(g: Game, o: StageObj) {
    const ctx = g.ctx;
    const sx = Math.round(o.x - g.camX);
    const sy = Math.round(g.objY(o));
    if (sx < -150 || sx > VIEW_W + 150) return;
    // shadow
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.ellipse(sx, sy + 3, o.w + 4, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    if (o.kind === "spikes" || o.kind === "retract") {
      const W = o.w * 2;
      const x0 = sx - o.w;
      ctx.fillStyle = "#3a3d44";
      ctx.fillRect(x0, sy - 8, W, 10);
      ctx.fillStyle = "#5b606a";
      ctx.fillRect(x0, sy - 8, W, 3);
      const n = Math.floor(W / 12);
      let hgt = 22;
      if (o.kind === "retract") hgt = o.up ? 22 : o.warn ? 5 + Math.sin(g.time * 40) * 2 : 0;
      if (o.kind === "retract" && !o.up) {
        ctx.fillStyle = "#1b1d22";
        for (let i = 0; i < n; i++) ctx.fillRect(x0 + i * 12 + 3, sy - 7, 6, 2);
        if (o.warn) {
          ctx.fillStyle = Math.floor(g.time * 10) % 2 ? "#ffde4a" : "#ff8a3a";
          ctx.font = "bold 14px 'Courier New', monospace";
          ctx.textAlign = "center";
          ctx.fillText("!", sx, sy - 14);
          ctx.textAlign = "left";
        }
      }
      if (hgt > 0) {
        for (let i = 0; i < n; i++) {
          const bx = x0 + i * 12 + 6;
          ctx.fillStyle = "#c9ced6";
          ctx.beginPath();
          ctx.moveTo(bx - 5, sy - 7);
          ctx.lineTo(bx, sy - 7 - hgt);
          ctx.lineTo(bx + 5, sy - 7);
          ctx.fill();
          ctx.fillStyle = "#6c737d";
          ctx.beginPath();
          ctx.moveTo(bx, sy - 7 - hgt);
          ctx.lineTo(bx + 5, sy - 7);
          ctx.lineTo(bx + 1, sy - 7);
          ctx.fill();
        }
      }
      return;
    }
    if (o.kind === "crate") {
      const s = 44,
        wob = o.wobble > 0 ? Math.sin(g.time * 60) * 3 : 0;
      const x0 = sx - s / 2 + wob,
        y0 = sy - s;
      ctx.fillStyle = "#a86a2c";
      ctx.fillRect(x0, y0, s, s);
      ctx.fillStyle = "#6b3f14";
      ctx.fillRect(x0, y0, s, 4);
      ctx.fillRect(x0, y0 + s - 4, s, 4);
      ctx.fillRect(x0, y0, 4, s);
      ctx.fillRect(x0 + s - 4, y0, 4, s);
      ctx.strokeStyle = "#6b3f14";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x0 + 5, y0 + 5);
      ctx.lineTo(x0 + s - 5, y0 + s - 5);
      ctx.moveTo(x0 + s - 5, y0 + 5);
      ctx.lineTo(x0 + 5, y0 + s - 5);
      ctx.stroke();
      ctx.fillStyle = "#d9a15c";
      ctx.fillRect(x0 + 6, y0 + 6, s - 12, 2);
      if (o.hp <= 2) {
        ctx.strokeStyle = "#2a1608";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x0 + 10, y0 + 8);
        ctx.lineTo(x0 + 18, y0 + 20);
        ctx.lineTo(x0 + 12, y0 + 30);
        ctx.stroke();
      }
      if (o.hp <= 1) {
        ctx.beginPath();
        ctx.moveTo(x0 + s - 8, y0 + 12);
        ctx.lineTo(x0 + s - 20, y0 + 22);
        ctx.lineTo(x0 + s - 10, y0 + 36);
        ctx.stroke();
      }
      return;
    }
    if (o.kind === "barrel" || o.kind === "firebarrel") {
      const rolling = o.kind === "barrel" && Math.abs(o.vx) >= 40;
      const body = o.kind === "firebarrel" ? "#6b3a1e" : "#4c6b8a";
      const band = o.kind === "firebarrel" ? "#3d2010" : "#2b3d50";
      const hi = o.kind === "firebarrel" ? "#9a5a34" : "#7f9fbd";
      if (rolling) {
        const w = 52,
          h = 40,
          x0 = sx - w / 2,
          y0 = sy - h;
        ctx.fillStyle = body;
        ctx.fillRect(x0, y0, w, h);
        ctx.fillStyle = band;
        ctx.fillRect(x0 + 8, y0, 5, h);
        ctx.fillRect(x0 + w - 13, y0, 5, h);
        const off = ((o.rot % (Math.PI * 2)) / (Math.PI * 2)) * h;
        ctx.fillStyle = hi;
        ctx.fillRect(x0, y0 + ((off + h) % h), w, 4);
        ctx.fillStyle = band;
        ctx.fillRect(x0, y0, w, 3);
        ctx.fillRect(x0, y0 + h - 3, w, 3);
      } else {
        const w = 40,
          h = 52,
          wob = o.wobble > 0 ? Math.sin(g.time * 50) * 2 : 0;
        const x0 = sx - w / 2 + wob,
          y0 = sy - h;
        ctx.fillStyle = body;
        ctx.fillRect(x0, y0, w, h);
        ctx.fillStyle = hi;
        ctx.fillRect(x0 + 6, y0 + 4, 5, h - 8);
        ctx.fillStyle = band;
        ctx.fillRect(x0, y0 + 8, w, 5);
        ctx.fillRect(x0, y0 + h - 14, w, 5);
        ctx.beginPath();
        ctx.ellipse(sx + wob, y0, w / 2, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        if (o.kind === "firebarrel") {
          for (let i = 0; i < 5; i++) {
            const fx = sx + wob - 14 + i * 7 + Math.sin(g.time * 18 + i * 2) * 2;
            const fh = 22 + Math.sin(g.time * 14 + i * 3.1 + o.x) * 9;
            const grad = ctx.createLinearGradient(0, y0 - fh, 0, y0);
            grad.addColorStop(0, "#ffe26b");
            grad.addColorStop(0.5, "#ff8c2e");
            grad.addColorStop(1, "#d43518");
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(fx - 5, y0 + 2);
            ctx.quadraticCurveTo(fx - 4, y0 - fh * 0.5, fx, y0 - fh);
            ctx.quadraticCurveTo(fx + 4, y0 - fh * 0.5, fx + 5, y0 + 2);
            ctx.fill();
          }
        }
      }
    }
  }


export function drawPickup(g: Game, it: Pickup) {
    const ctx = g.ctx;
    const sx = it.x - g.camX;
    const groundY = GROUND_TOP + it.z * ZPX;
    const sy = groundY - 14 - Math.abs(Math.sin(it.t * 3)) * 10;
    if (sx < -50 || sx > VIEW_W + 50) return;
    if (groundY < 60 || groundY > VIEW_H + 20) return;
    if (it.t > 11 && Math.floor(it.t * 8) % 2 === 0) return;
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath();
    ctx.ellipse(sx, GROUND_TOP + it.z * ZPX + 2, 10, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    const rg = ctx.createRadialGradient(sx, sy, 2, sx, sy, 26);
    rg.addColorStop(0, "rgba(255,226,107,0.5)");
    rg.addColorStop(1, "rgba(255,226,107,0)");
    ctx.fillStyle = rg;
    ctx.fillRect(sx - 26, sy - 26, 52, 52);
    ctx.fillStyle = "#ffe26b";
    ctx.strokeStyle = "#b07a00";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sx + 4, sy - 16);
    ctx.lineTo(sx - 8, sy + 2);
    ctx.lineTo(sx - 1, sy + 2);
    ctx.lineTo(sx - 4, sy + 16);
    ctx.lineTo(sx + 8, sy - 3);
    ctx.lineTo(sx + 1, sy - 3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }


export function hazardScreenPos(g: Game, h: Hazard): [number, number] {
    return [h.x - g.camX, GROUND_TOP + h.z * ZPX];
  }


export function drawHazardGround(g: Game, h: Hazard) {
    const ctx = g.ctx;
    const [sx, sy] = g.hazardScreenPos(h);
    if (sx < -80 || sx > VIEW_W + 80) return;
    const warning = h.t <= h.warnT,
      active = h.t > h.warnT && h.t < h.warnT + h.activeT;
    if (warning) {
      const blink = settings.reducedFx ? false : Math.floor(h.t * 8) % 2 === 0;
      ctx.globalAlpha = blink ? 0.85 : 0.4;
      ctx.strokeStyle = "#ffde4a";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(sx, sy, 42, 13, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "#ffde4a";
      ctx.font = "bold 18px 'Courier New', monospace";
      ctx.textAlign = "center";
      ctx.fillText("!", sx, sy - 6);
      ctx.textAlign = "left";
      ctx.globalAlpha = 1;
      return;
    }
    if (!active) return;
    const at = h.t - h.warnT;
    if (h.type === "fire") {
      ctx.fillStyle = "rgba(20,10,5,0.55)";
      ctx.beginPath();
      ctx.ellipse(sx, sy, 48, 13, 0, 0, Math.PI * 2);
      ctx.fill();
      for (let i = 0; i < 7; i++) {
        const fx = sx - 36 + i * 12 + Math.sin(at * 20 + i * 2) * 3;
        const fh = 26 + Math.sin(at * 16 + i * 3.1) * 10;
        const grad = ctx.createLinearGradient(0, sy - fh, 0, sy);
        grad.addColorStop(0, "#ffe26b");
        grad.addColorStop(0.5, "#ff8c2e");
        grad.addColorStop(1, "#d43518");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(fx - 6, sy);
        ctx.quadraticCurveTo(fx - 4, sy - fh * 0.5, fx, sy - fh);
        ctx.quadraticCurveTo(fx + 4, sy - fh * 0.5, fx + 6, sy);
        ctx.fill();
      }
    } else if (h.type === "spark") {
      ctx.strokeStyle = Math.floor(at * 24) % 2 ? "#9adfff" : "#ffffff";
      ctx.lineWidth = 2.5;
      for (let b = 0; b < 3; b++) {
        ctx.beginPath();
        let px = sx - 44,
          py = sy - 4 - b * 3;
        ctx.moveTo(px, py);
        for (let seg = 0; seg < 6; seg++) {
          px += 15;
          py = sy - 4 - Math.random() * 26;
          ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
    }
  }


export function drawHazardAir(g: Game, h: Hazard) {
    if (h.type !== "girder") return;
    const ctx = g.ctx;
    const [sx, sy] = g.hazardScreenPos(h);
    if (sx < -80 || sx > VIEW_W + 80) return;
    const active = h.t > h.warnT && h.t < h.warnT + h.activeT + 0.35;
    if (!active) return;
    const at = h.t - h.warnT,
      fallDur = 0.22,
      prog = Math.min(1, at / fallDur);
    // cap beam so it never draws past the bottom of the viewport
    const groundY = Math.min(sy - 4, VIEW_H);
    const skyY = -160;
    const beamH = groundY - skyY;
    const y = skyY + prog * (groundY - skyY);
    const topY = Math.min(y, groundY - 6);
    const drawY = Math.max(0, topY);
    const drawH = Math.min(beamH, groundY - drawY);
    if (drawH <= 0) return;
    ctx.fillStyle = "#8d939e";
    ctx.fillRect(sx - 13, drawY, 26, drawH);
    ctx.fillStyle = "#6b7076";
    ctx.fillRect(sx - 13, drawY, 5, drawH);
    ctx.fillStyle = "#b9bec7";
    ctx.fillRect(sx + 7, drawY, 4, drawH);
  }


export function drawFighter(g: Game, f: Fighter) {
    const ctx = g.ctx;
    if (f.flicker > 0 && Math.floor(f.flicker * 20) % 2 === 0) return;
    if (f.invuln > 0 && f.isPlayer && g.morphT < 0 && Math.floor(f.invuln * 24) % 3 === 0)
      return;
    const an = f.currentAnim();
    const fr = an.frames[f.frameIndex()] || an.frames[0];
    if (!fr) return;
    const img = getImage(f.sheet);
    const sx = f.x - g.camX;
    if (sx < -120 || sx > VIEW_W + 120) return;
    const fy = f.feetY();
    const sh = Math.max(0.4, 1 - f.h / 220);
    ctx.fillStyle = `rgba(0,0,0,${0.35 * sh})`;
    ctx.beginPath();
    ctx.ellipse(sx, fy + 4, 26 * sh, 8 * sh, 0, 0, Math.PI * 2);
    ctx.fill();
    const w = fr.w * f.drawScale,
      h = fr.h * f.drawScale;
    ctx.save();
    ctx.translate(Math.round(sx), Math.round(fy - f.h));
    if (f.facing < 0) ctx.scale(-1, 1);
    if (f.hitFlash > 0) {
      ctx.filter = "brightness(2.6) saturate(0.4)";
      ctx.drawImage(img, fr.x, fr.y, fr.w, fr.h, Math.round(-w / 2), -h, w, h);
      ctx.filter = "none";
    } else {
      ctx.drawImage(img, fr.x, fr.y, fr.w, fr.h, Math.round(-w / 2), -h, w, h);
    }
    ctx.restore();
    if (!f.isPlayer && f.hp < f.maxHp && f.hp > 0) {
      const bw = 46;
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(sx - bw / 2, fy - f.h - h - 14, bw, 5);
      ctx.fillStyle =
        f.kind === "oozeman" ? "#b06be0" : f.kind === "skelerena" ? "#e0c46b" : "#c8cad0";
      ctx.fillRect(sx - bw / 2, fy - f.h - h - 14, (bw * f.hp) / f.maxHp, 5);
    }
  }


export function drawWeaponFx(g: Game, fx: WeaponFx, p: Fighter) {
    const ctx = g.ctx;
    const sx = p.x - g.camX;
    const fy = p.feetY();
    const dir = p.facing;
    const t = p.t;
    switch (fx) {
      case "sword_slash": {
        // big diagonal arc traveling right
        const prog = Math.min(1, t * 1.6);
        ctx.strokeStyle = "#ffe26b";
        ctx.lineWidth = 4;
        const r = 110 * prog;
        const ang = -Math.PI * 0.7 + prog * Math.PI * 0.4;
        const cx = sx + dir * 70,
          cy = fy - 60;
        ctx.beginPath();
        ctx.arc(cx, cy, r, ang - 0.5, ang + 0.5);
        ctx.stroke();
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.6, ang - 0.4, ang + 0.4);
        ctx.stroke();
        break;
      }
      case "axe_smash": {
        const prog = Math.min(1, t * 1.5);
        ctx.fillStyle = "rgba(255,200,80,0.7)";
        ctx.beginPath();
        ctx.ellipse(sx + dir * 50, fy - 30, 70 * prog, 90 * prog, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#ffec7a";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(sx, fy - 60);
        ctx.lineTo(sx + dir * 90, fy - 10);
        ctx.stroke();
        break;
      }
      case "lance_thrust": {
        const prog = Math.min(1, t * 2.0);
        const reach = 200 * prog;
        const cy = fy - 50;
        ctx.fillStyle = "rgba(80,160,255,0.85)";
        ctx.beginPath();
        ctx.moveTo(sx + dir * 6, cy - 8);
        ctx.lineTo(sx + dir * (reach + 8), cy);
        ctx.lineTo(sx + dir * 6, cy + 8);
        ctx.closePath();
        ctx.fill();
        // tip flare
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(sx + dir * reach, cy, 6, 0, Math.PI * 2);
        ctx.fill();
        // sparkles along
        for (let i = 1; i < 4; i++) {
          const px = sx + dir * (reach * (i / 4));
          const py = cy + (Math.random() - 0.5) * 6;
          ctx.fillStyle = "#9adfff";
          ctx.fillRect(px - 1, py - 1, 2, 2);
        }
        break;
      }
      case "dagger_slash": {
        // twin crossing dagger arcs with a golden sparkle trail
        const prog = Math.min(1, t * 1.8);
        const cx = sx + dir * 48,
          cy = fy - 58;
        ctx.lineWidth = 3;
        for (let k = 0; k < 2; k++) {
          const flip = k === 0 ? 1 : -1;
          const r = 52 + prog * 26;
          const a0 = (flip > 0 ? -1.1 : 0.2) + prog * 0.9 * flip;
          ctx.strokeStyle = k === 0 ? "#ffe26b" : "#ffffff";
          ctx.beginPath();
          ctx.arc(cx, cy + flip * 8, r, a0, a0 + 0.9, false);
          ctx.stroke();
        }
        for (let i = 0; i < 6; i++) {
          const ang = -0.9 + i * 0.35 + prog;
          const rr = 60 + Math.random() * 30;
          ctx.fillStyle = i % 2 ? "#fff3a6" : "#ffffff";
          ctx.fillRect(cx + Math.cos(ang) * rr * dir - 1, cy + Math.sin(ang) * rr - 1, 3, 3);
        }
        break;
      }
      case "arrow_rain": {
        // 3 arrows arcing
        const col2 = "#ffe26b";
        for (let i = 0; i < 3; i++) {
          const k = (t * 2 - i * 0.3 + 1) % 1.3;
          const ay = fy - 130 + k * 130;
          const ax = sx + dir * (40 + i * 50);
          ctx.fillStyle = col2;
          ctx.beginPath();
          ctx.moveTo(ax - 6, ay);
          ctx.lineTo(ax + 6, ay);
          ctx.lineTo(ax, ay + 8);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = "#fff";
          ctx.fillRect(ax - 0.5, ay - 12, 1, 14);
        }
        break;
      }
      case "sabersword": {
        // twin crescent waves
        const cx = sx + dir * 40,
          cy = fy - 60;
        const prog = Math.min(1, t * 1.5);
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 5;
        for (let w = 0; w < 2; w++) {
          ctx.beginPath();
          for (let s = 0; s <= 30; s++) {
            const a = -Math.PI * 0.5 + s * 0.1;
            const r = (110 + w * 24) * prog;
            const xx = cx + Math.cos(a) * r * dir;
            const yy = cy + Math.sin(a) * r + (w === 0 ? -10 : 10);
            if (s === 0) ctx.moveTo(xx, yy);
            else ctx.lineTo(xx, yy);
          }
          ctx.stroke();
        }
        break;
      }
    }
  }



/* ---------- chefe final ---------- */

export function drawProjectile(g: Game, pr: Projectile) {
  const ctx = g.ctx;
  const sx = pr.x - g.camX;
  const groundY = GROUND_TOP + pr.z * ZPX;
  if (sx < -60 || sx > VIEW_W + 60) return;
  const sy = groundY - 26 - Math.sin(pr.t * 14) * 6;
  // sombra
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath();
  ctx.ellipse(sx, groundY + 2, pr.r * 0.8, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  // bolha de gosma
  const rg = ctx.createRadialGradient(sx - 4, sy - 4, 2, sx, sy, pr.r + 6);
  rg.addColorStop(0, "#d9b8ff");
  rg.addColorStop(0.6, "#6a2ea3");
  rg.addColorStop(1, "#3d1466");
  ctx.fillStyle = rg;
  ctx.beginPath();
  ctx.arc(sx, sy, pr.r + 4 + Math.sin(pr.t * 20) * 2, 0, Math.PI * 2);
  ctx.fill();
  // brilho
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.beginPath();
  ctx.arc(sx - 4, sy - 5, 3, 0, Math.PI * 2);
  ctx.fill();
}

export function drawBossBar(g: Game) {
  const ctx = g.ctx;
  const b = g.boss;
  if (!b || b.hp <= 0) return;
  const w = 460;
  const x = (VIEW_W - w) / 2;
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(x - 4, 18, w + 8, 30);
  ctx.strokeStyle = "#b06be0";
  ctx.lineWidth = 2;
  ctx.strokeRect(x - 4, 18, w + 8, 30);
  ctx.font = "bold 13px 'Courier New', monospace";
  ctx.fillStyle = "#e9d5ff";
  ctx.textAlign = "center";
  ctx.fillText("IVAN OOZE — O OOZE SUPREMO", VIEW_W / 2, 32);
  ctx.fillStyle = "#2a0f3d";
  ctx.fillRect(x, 36, w, 8);
  const ratio = Math.max(0, b.hp) / g.bossMaxHp;
  const grad = ctx.createLinearGradient(x, 0, x + w, 0);
  grad.addColorStop(0, "#b06be0");
  grad.addColorStop(1, "#e050d0");
  ctx.fillStyle = grad;
  ctx.fillRect(x, 36, w * ratio, 8);
  ctx.textAlign = "left";
}
