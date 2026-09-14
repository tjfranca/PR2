/* Render mapped animations as labeled strips to verify crops visually */
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'src', 'game', 'frames.json'), 'utf8'));

const sz = (f, w, h, t) => Math.abs(f.w - w) <= t && Math.abs(f.h - h) <= t;
const findSeq = (s, sizes, tol = 2) => { for (const row of s.rows) { for (let i = 0; i + sizes.length <= row.length; i++) { let ok = true; for (let j = 0; j < sizes.length; j++) if (!sz(row[i + j], sizes[j][0], sizes[j][1], tol)) { ok = false; break; } if (ok) return row.slice(i, i + sizes.length); } } return null; };
const findFrame = (s, w, h, tol = 2) => { for (const r of s.rows) for (const f of r) if (sz(f, w, h, tol)) return f; return null; };
const findRowWith = (s, w, h, tol = 2) => { for (const r of s.rows) for (const f of r) if (sz(f, w, h, tol)) return r; return null; };

function mapRanger(key) {
  const s = data[key];
  const out = {};
  out.idle = findSeq(s, [[35, 63], [35, 63], [35, 63], [35, 63]]) || [s.rows[0][0]];
  let walk = findSeq(s, [[26, 64], [42, 63], [47, 62], [30, 64], [45, 63], [45, 62]]);
  if (!walk) { const rev = findSeq(s, [[45, 62], [45, 63], [30, 64], [47, 62], [42, 63], [26, 64]]); if (rev) walk = [...rev].reverse(); }
  out.walk = walk || out.idle;
  const jump = findSeq(s, [[35, 70], [32, 56]]);
  out.jump = jump || [out.idle[0]];
  out.punch = findSeq(s, [[50, 56], [40, 53], [53, 60]]) || out.idle.slice(0, 3);
  out.punch2 = findSeq(s, [[36, 70], [60, 57], [33, 59]], 3) || findSeq(s, [[36, 70], [60, 57]], 3) || out.punch;
  out.kick = findSeq(s, [[39, 72], [76, 50], [44, 61]], 3) || out.punch;
  for (const row of s.rows) for (let i = 0; i < row.length; i++) if (sz(row[i], 66, 25, 3)) { out.fall = row.slice(Math.max(0, i - 2), i + 1); }
  if (key === 'red') { const f1 = findFrame(s, 45, 120, 8), f2 = findFrame(s, 110, 190, 14); out.special = f1 && f2 ? [f1, f2] : null; }
  else if (key === 'pink') out.special = findSeq(s, [[43, 65], [53, 75], [53, 74], [49, 75], [49, 76]], 3);
  else if (key === 'yellow') out.special = findRowWith(s, 88, 59, 3);
  else out.special = findRowWith(s, 85, 62, 5);
  out.victory = [findFrame(s, 40, 86, 2)].filter(Boolean);
  return out;
}
function mapWhite() {
  const s = data.white;
  const out = {};
  const uni = (s.rows[0] || []).filter(f => sz(f, 39, 62, 1));
  out.idle = uni.slice(0, 3);
  out.walk = findSeq(s, [[43, 62], [43, 60], [26, 63], [41, 62], [41, 61], [28, 63]]) || uni.slice(4, 12);
  out.jump = [findFrame(s, 41, 103, 2)].filter(Boolean);
  out.punch = findSeq(s, [[42, 60], [40, 61], [39, 62], [46, 62]]) || out.idle;
  const ke = findFrame(s, 68, 56, 2), kw = findFrame(s, 38, 58, 1);
  out.kick = ke ? [kw, ke].filter(Boolean) : out.punch;
  out.fall = [findFrame(s, 48, 63, 2), findFrame(s, 71, 24, 4)].filter(Boolean);
  const sp1 = findFrame(s, 63, 53, 2), sp2 = findFrame(s, 61, 52, 2), sp3 = findFrame(s, 70, 62, 2);
  out.special = [sp1, sp2, sp3].filter(Boolean);
  out.victory = [findFrame(s, 64, 131, 5)].filter(Boolean);
  return out;
}
function mapPutty() {
  const s = data.putty;
  const out = {};
  out.idle = findSeq(s, [[41, 61], [41, 60], [45, 62]]) || [s.rows[0][0]];
  for (const row of s.rows) { const run = row.filter(f => f.h >= 62 && f.h <= 66 && f.w >= 38 && f.w <= 50); if (run.length >= 6) { out.walk = run.slice(0, 7); break; } }
  out.punch = [findFrame(s, 47, 53, 2), findFrame(s, 48, 55, 2), findFrame(s, 112, 48, 5)].filter(Boolean);
  out.hurt = [findFrame(s, 47, 44, 2), findFrame(s, 50, 54, 2)].filter(Boolean);
  out.fall = [findFrame(s, 93, 55, 3), findFrame(s, 76, 55, 3)].filter(Boolean);
  return out;
}

const KEYS = process.argv.slice(2).length ? process.argv.slice(2) : ['red', 'blue', 'black', 'pink', 'yellow', 'white', 'putty'];
for (const key of KEYS) {
  const sheet = PNG.sync.read(fs.readFileSync(path.join(__dirname, '..', 'src', 'assets', 'sprites', key + '.png')));
  const map = key === 'white' ? mapWhite() : key === 'putty' ? mapPutty() : mapRanger(key);
  const entries = Object.entries(map).filter(([, v]) => v && v.length);
  const PADX = 6, ROWH = 200 + 8;
  let maxW = 0;
  for (const [, frames] of entries) {
    const w = frames.reduce((a, f) => a + f.w + PADX, 80);
    if (w > maxW) maxW = w;
  }
  const out = new PNG({ width: maxW, height: entries.length * ROWH });
  // checker bg
  for (let y = 0; y < out.height; y++) for (let x = 0; x < out.width; x++) {
    const i = (y * out.width + x) * 4;
    const c = ((x >> 3) + (y >> 3)) % 2 ? 210 : 170;
    out.data[i] = c; out.data[i + 1] = c; out.data[i + 2] = c; out.data[i + 3] = 255;
  }
  entries.forEach(([, frames], r) => {
    let cx = 4;
    const baseY = r * ROWH + ROWH - 10;
    for (const f of frames) {
      for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) {
        const si = ((f.y + y) * sheet.width + (f.x + x)) * 4;
        if (sheet.data[si + 3] < 10) continue;
        const dy = baseY - f.h + y, dx = cx + x;
        if (dy < 0 || dy >= out.height || dx >= out.width) continue;
        const di = (dy * out.width + dx) * 4;
        out.data[di] = sheet.data[si]; out.data[di + 1] = sheet.data[si + 1]; out.data[di + 2] = sheet.data[si + 2]; out.data[di + 3] = 255;
      }
      cx += f.w + PADX;
    }
  });
  fs.writeFileSync(path.join(__dirname, `mont_${key}.png`), PNG.sync.write(out));
  console.log(key, entries.map(([n, v]) => `${n}:${v.length}`).join(' '));
}
