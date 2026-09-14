/* Probe problem sheets with recursive segmentation and small gaps */
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

function load(name) {
  const png = PNG.sync.read(fs.readFileSync(path.join(__dirname, '..', 'raw_sprites', name + '.png')));
  const { width: W, height: H } = png;
  const i0 = 0;
  const bg = [png.data[i0], png.data[i0 + 1], png.data[i0 + 2]];
  const fg = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    const isBg = png.data[i + 3] < 10 || (Math.abs(png.data[i] - bg[0]) <= 12 && Math.abs(png.data[i + 1] - bg[1]) <= 12 && Math.abs(png.data[i + 2] - bg[2]) <= 12);
    fg[y * W + x] = isBg ? 0 : 1;
  }
  return { W, H, fg };
}

function segment(sheet, box, axis, gy, gx, depth, out) {
  const { W, fg } = sheet;
  const { x0, y0, x1, y1 } = box;
  if (depth > 8) { out.push(box); return; }
  if (axis === 'y') {
    const has = [];
    for (let y = y0; y <= y1; y++) { let h = 0; for (let x = x0; x <= x1; x++) if (fg[y * W + x]) { h = 1; break; } has.push(h); }
    const bands = split(has, gy);
    if (bands.length === 1 && bands[0][0] === 0 && bands[0][1] === y1 - y0) {
      // no split possible on y; try x
      segmentX(sheet, box, gy, gx, depth, out, true);
    } else {
      for (const [a, b] of bands) segmentX(sheet, { x0, y0: y0 + a, x1, y1: y0 + b }, gy, gx, depth + 1, out, false);
    }
  }
}
function segmentX(sheet, box, gy, gx, depth, out, noY) {
  const { W, fg } = sheet;
  const { x0, y0, x1, y1 } = box;
  const has = [];
  for (let x = x0; x <= x1; x++) { let h = 0; for (let y = y0; y <= y1; y++) if (fg[y * W + x]) { h = 1; break; } has.push(h); }
  const cols = split(has, gx);
  if (cols.length === 1 && noY) { out.push(trim(sheet, box)); return; }
  for (const [a, b] of cols) {
    const sub = { x0: x0 + a, y0, x1: x0 + b, y1 };
    if (cols.length === 1) {
      // couldn't split x either after y stable -> emit
      out.push(trim(sheet, sub));
    } else {
      segment(sheet, sub, 'y', gy, gx, depth + 1, out);
    }
  }
}
function split(has, minGap) {
  const bands = []; let i = 0;
  while (i < has.length) {
    if (has[i]) { let j = i, gap = 0, end = i;
      while (j < has.length) { if (has[j]) { end = j; gap = 0; } else { gap++; if (gap >= minGap) break; } j++; }
      bands.push([i, end]); i = end + 1;
    } else i++;
  }
  return bands;
}
function trim(sheet, box) {
  const { W, fg } = sheet;
  let { x0, y0, x1, y1 } = box;
  let ty0 = y1, ty1 = y0, tx0 = x1, tx1 = x0;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (fg[y * W + x]) {
    if (y < ty0) ty0 = y; if (y > ty1) ty1 = y; if (x < tx0) tx0 = x; if (x > tx1) tx1 = x;
  }
  return { x: tx0, y: ty0, w: tx1 - tx0 + 1, h: ty1 - ty0 + 1 };
}

for (const [name, gy, gx] of [['red', 2, 2], ['red', 1, 1], ['white', 3, 3], ['putty', 2, 2], ['putty', 1, 1]]) {
  const sheet = load(name);
  const out = [];
  segment(sheet, { x0: 0, y0: 0, x1: sheet.W - 1, y1: sheet.H - 1 }, 'y', gy, gx, 0, out);
  // group into rows by y center
  out.sort((a, b) => (a.y + a.h / 2) - (b.y + b.h / 2));
  const rows = [];
  for (const f of out) {
    const cy = f.y + f.h / 2;
    let r = rows.find(r => Math.abs(r.cy - cy) < Math.max(20, f.h * 0.6));
    if (!r) { r = { cy, frames: [] }; rows.push(r); }
    r.frames.push(f);
  }
  rows.forEach(r => r.frames.sort((a, b) => a.x - b.x));
  console.log(`== ${name} gy=${gy} gx=${gx}: ${out.length} frames, ${rows.length} rows ==`);
  rows.forEach((r, i) => console.log(`  row ${i} (y~${Math.round(r.cy)}): ${r.frames.length}  [${r.frames.map(f => f.w + 'x' + f.h).join(' ')}]`));
}
