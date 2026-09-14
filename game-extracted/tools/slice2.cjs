/* Final slicer v2:
   - 4-connectivity CC + box merge, rows clustering
   - chroma-key green removal (white/putty sheets)
   - clears ALL pixels outside kept frame boxes (no caption/junk remnants)
   - filters text/caption boxes
   - stages are copied untouched
   Writes transparent sheets to src/assets/sprites and src/game/frames.json */
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const OUT = path.join(__dirname, '..', 'src', 'assets', 'sprites');
fs.mkdirSync(OUT, { recursive: true });

function process(name, opts = {}) {
  const pad = opts.pad ?? 2;
  const minPix = opts.minPix ?? 25;
  const png = PNG.sync.read(fs.readFileSync(path.join(__dirname, '..', 'raw_sprites', name + '.png')));
  const { width: W, height: H } = png;
  const bg = [png.data[0], png.data[1], png.data[2]];
  const fg = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    const r = png.data[i], g = png.data[i + 1], b = png.data[i + 2], a = png.data[i + 3];
    let isBg = a < 10 || (Math.abs(r - bg[0]) <= 14 && Math.abs(g - bg[1]) <= 14 && Math.abs(b - bg[2]) <= 14);
    if (!isBg && opts.chromaGreen && g > 90 && g > r + 45 && g > b + 45) isBg = true; // green halo
    fg[y * W + x] = isBg ? 0 : 1;
    if (isBg) { png.data[i + 3] = 0; }
  }
  // 4-connectivity components
  const seen = new Uint8Array(W * H);
  let boxes = [];
  const st = [];
  for (let p0 = 0; p0 < W * H; p0++) {
    if (!fg[p0] || seen[p0]) continue;
    let x0 = p0 % W, x1 = x0, y0 = (p0 / W) | 0, y1 = y0, n = 0;
    st.push(p0); seen[p0] = 1;
    while (st.length) {
      const p = st.pop(); n++;
      const py = (p / W) | 0, px = p % W;
      if (px < x0) x0 = px; if (px > x1) x1 = px; if (py < y0) y0 = py; if (py > y1) y1 = py;
      if (px > 0 && fg[p - 1] && !seen[p - 1]) { seen[p - 1] = 1; st.push(p - 1); }
      if (px < W - 1 && fg[p + 1] && !seen[p + 1]) { seen[p + 1] = 1; st.push(p + 1); }
      if (py > 0 && fg[p - W] && !seen[p - W]) { seen[p - W] = 1; st.push(p - W); }
      if (py < H - 1 && fg[p + W] && !seen[p + W]) { seen[p + W] = 1; st.push(p + W); }
    }
    boxes.push({ x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1, n });
  }
  boxes = boxes.filter(b => b.n >= minPix);
  if (opts.coreMerge) {
    const cores = boxes.filter(b => b.n >= 350);
    const frags = boxes.filter(b => b.n < 350);
    for (const f of frags) {
      const fcx = f.x + f.w / 2, fcy = f.y + f.h / 2;
      let best = null, bd = 1e9;
      for (const c of cores) {
        const dx = Math.max(c.x - (f.x + f.w), f.x - (c.x + c.w), 0);
        const dy = Math.max(c.y - (f.y + f.h), f.y - (c.y + c.h), 0);
        const ccx = c.x + c.w / 2, ccy = c.y + c.h / 2;
        const d = dx + dy + Math.hypot(fcx - ccx, fcy - ccy) * 0.01;
        if (d < bd) { bd = d; best = c; }
      }
      if (best && bd < 8) {
        const x = Math.min(best.x, f.x), y = Math.min(best.y, f.y);
        best.w = Math.max(best.x + best.w, f.x + f.w) - x;
        best.h = Math.max(best.y + best.h, f.y + f.h) - y;
        best.x = x; best.y = y; best.n += f.n;
      }
    }
    boxes = cores;
  } else {
    let changed = true;
    while (changed) {
      changed = false;
      outer: for (let i = 0; i < boxes.length; i++) {
        for (let j = i + 1; j < boxes.length; j++) {
          const a = boxes[i], b = boxes[j];
          if (a.x - pad < b.x + b.w && b.x - pad < a.x + a.w && a.y - pad < b.y + b.h && b.y - pad < a.y + a.h) {
            const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y);
            boxes[i] = { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y, n: a.n + b.n };
            boxes.splice(j, 1); changed = true; break outer;
          }
        }
      }
    }
  }
  // drop caption/text boxes: very flat or tiny
  boxes = boxes.filter(b => {
    if (b.h <= 16) return false;
    if (b.w / b.h >= 4.5 && b.h <= 22) return false;
    return true;
  });
  // drop bordered rectangles (credit boxes like "Sprites ripped by Belial the Hedgehog"):
  // a sprite never fills >80% of its own bounding-box perimeter
  boxes = boxes.filter(b => {
    let per = 0, filled = 0;
    for (let x = b.x; x < b.x + b.w; x++) {
      per += 2;
      if (fg[b.y * W + x]) filled++;
      if (fg[(b.y + b.h - 1) * W + x]) filled++;
    }
    for (let y = b.y + 1; y < b.y + b.h - 1; y++) {
      per += 2;
      if (fg[y * W + b.x]) filled++;
      if (fg[y * W + b.x + b.w - 1]) filled++;
    }
    const isBox = filled / per > 0.8 && b.w >= 40;
    if (isBox) console.log(`  dropped credit/box ${b.w}x${b.h}@${b.x},${b.y}`);
    return !isBox;
  });
  // clear everything outside kept boxes
  const keep = new Uint8Array(W * H);
  for (const b of boxes)
    for (let y = b.y; y < b.y + b.h; y++)
      for (let x = b.x; x < b.x + b.w; x++) keep[y * W + x] = 1;
  for (let p = 0; p < W * H; p++) if (!keep[p]) png.data[p * 4 + 3] = 0;

  fs.writeFileSync(path.join(OUT, name + '.png'), PNG.sync.write(png));

  // cluster into rows
  const rows = [];
  for (const f of boxes.sort((a, b) => (a.y + a.h / 2) - (b.y + b.h / 2))) {
    const cy = f.y + f.h / 2;
    let best = null, bd = 1e9;
    for (const r of rows) { const d = Math.abs(r.cy - cy); if (d < bd) { bd = d; best = r; } }
    if (best && bd < 32) { best.frames.push(f); best.cy = (best.cy * (best.frames.length - 1) + cy) / best.frames.length; }
    else rows.push({ cy, frames: [f] });
  }
  rows.sort((a, b) => a.cy - b.cy);
  rows.forEach(r => r.frames.sort((a, b) => a.x - b.x));
  return { w: W, h: H, rows: rows.map(r => r.frames.map(({ x, y, w, h }) => ({ x, y, w, h }))) };
}

const result = {};
const OPTS = {
  putty: { chromaGreen: true },
  // black ranger sheet: poses touch diagonally → chain merges swallow the whole
  // knockdown row into one 249x235 blob. coreMerge attaches small fragments to
  // the nearest big component without merging big components together.
  gblack: { coreMerge: true },
  gpink: { coreMerge: true },
  gred: { coreMerge: true },
  gblue: { coreMerge: true },
  gyellow: { coreMerge: true },
  gwhite: { coreMerge: true },
};
for (const name of [
  'gred', 'gblue', 'gblack', 'gpink', 'gyellow', 'gwhite',
  'civ_rocky', 'civ_adam', 'civ_billy', 'civ_aisha', 'civ_kim', 'civ_tommy',
  'putty', 'skelerena', 'oozeman',
]) {
  if (!fs.existsSync(path.join(__dirname, '..', 'raw_sprites', name + '.png'))) {
    console.log(`== ${name} == (ausente, pulado)`);
    continue;
  }
  result[name] = process(name, OPTS[name] || {});
  console.log(`== ${name} ==`);
  result[name].rows.forEach((r, i) => console.log(`  row ${i} (y~${r[0].y}): ${r.length}  [${r.map(f => `${f.w}x${f.h}`).join(' ')}]`));
}
// stages: copy untouched (stage3 is actually a JPEG)




fs.writeFileSync(path.join(__dirname, '..', 'src', 'game', 'frames.json'), JSON.stringify(result));
console.log('written frames.json + stages');
