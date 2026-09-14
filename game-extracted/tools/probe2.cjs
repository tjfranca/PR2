/* Connected-component segmentation with box merging */
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

function load(name) {
  const png = PNG.sync.read(fs.readFileSync(path.join(__dirname, '..', 'raw_sprites', name + '.png')));
  const { width: W, height: H } = png;
  const bg = [png.data[0], png.data[1], png.data[2]];
  const fg = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    const isBg = png.data[i + 3] < 10 || (Math.abs(png.data[i] - bg[0]) <= 12 && Math.abs(png.data[i + 1] - bg[1]) <= 12 && Math.abs(png.data[i + 2] - bg[2]) <= 12);
    fg[y * W + x] = isBg ? 0 : 1;
  }
  return { W, H, fg };
}

function components(sheet) {
  const { W, H, fg } = sheet;
  const seen = new Uint8Array(W * H);
  const boxes = [];
  const stack = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const idx = y * W + x;
    if (!fg[idx] || seen[idx]) continue;
    let x0 = x, x1 = x, y0 = y, y1 = y, n = 0;
    stack.push(idx); seen[idx] = 1;
    while (stack.length) {
      const p = stack.pop(); n++;
      const py = (p / W) | 0, px = p % W;
      if (px < x0) x0 = px; if (px > x1) x1 = px; if (py < y0) y0 = py; if (py > y1) y1 = py;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = px + dx, ny = py + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const ni = ny * W + nx;
        if (fg[ni] && !seen[ni]) { seen[ni] = 1; stack.push(ni); }
      }
    }
    boxes.push({ x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1, n });
  }
  return boxes;
}

function mergeBoxes(boxes, pad) {
  let changed = true;
  while (changed) {
    changed = false;
    outer: for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i], b = boxes[j];
        if (a.x - pad < b.x + b.w && b.x - pad < a.x + a.w && a.y - pad < b.y + b.h && b.y - pad < a.y + a.h) {
          const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y);
          const w = Math.max(a.x + a.w, b.x + b.w) - x, h = Math.max(a.y + a.h, b.y + b.h) - y;
          boxes[i] = { x, y, w, h, n: a.n + b.n };
          boxes.splice(j, 1);
          changed = true;
          break outer;
        }
      }
    }
  }
  return boxes;
}

for (const [name, pad, minPix] of [['red', 1, 30], ['white', 2, 40], ['putty', 1, 30]]) {
  const sheet = load(name);
  let boxes = components(sheet).filter(b => b.n >= minPix);
  boxes = mergeBoxes(boxes, pad);
  boxes.sort((a, b) => (a.y + a.h) - (b.y + b.h));
  const rows = [];
  for (const f of boxes.sort((a, b) => (a.y + a.h / 2) - (b.y + b.h / 2))) {
    const cy = f.y + f.h / 2;
    let r = rows.find(r => Math.abs(r.cy - cy) < 30);
    if (!r) { r = { cy, frames: [] }; rows.push(r); }
    r.frames.push(f);
  }
  rows.sort((a, b) => a.cy - b.cy);
  rows.forEach(r => r.frames.sort((a, b) => a.x - b.x));
  console.log(`== ${name} pad=${pad}: ${boxes.length} boxes, ${rows.length} rows ==`);
  rows.forEach((r, i) => console.log(`  row ${i} (y~${Math.round(r.cy)}): ${r.frames.length}  [${r.frames.map(f => `${f.w}x${f.h}@${f.x},${f.y}`).join(' ')}]`));
}
