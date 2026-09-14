/* Analyze sprite sheets: detect background, slice into row bands and frames,
   write transparent sheets to public/sprites and frames JSON to src/game/frames.json */
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const SHEETS = ['red', 'blue', 'black', 'pink', 'yellow', 'white', 'putty', 'stage'];
const IN = path.join(__dirname, '..', 'raw_sprites');
const OUT = path.join(__dirname, '..', 'public', 'sprites');
fs.mkdirSync(OUT, { recursive: true });

function colorAt(png, x, y) {
  const i = (y * png.width + x) * 4;
  return [png.data[i], png.data[i + 1], png.data[i + 2], png.data[i + 3]];
}
function near(c, bg, tol) {
  return Math.abs(c[0] - bg[0]) <= tol && Math.abs(c[1] - bg[1]) <= tol && Math.abs(c[2] - bg[2]) <= tol;
}

const result = {};
for (const name of SHEETS) {
  const png = PNG.sync.read(fs.readFileSync(path.join(IN, name + '.png')));
  const { width: W, height: H } = png;
  const bg = colorAt(png, 0, 0);
  const tol = 12;
  // build mask of foreground
  const fg = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const c = [png.data[i], png.data[i + 1], png.data[i + 2], png.data[i + 3]];
      const isBg = c[3] < 10 || near(c, bg, tol);
      fg[y * W + x] = isBg ? 0 : 1;
      if (isBg) png.data[i + 3] = 0; // make transparent
    }
  }
  if (name === 'stage') {
    fs.writeFileSync(path.join(OUT, name + '.png'), PNG.sync.write(png));
    result[name] = { w: W, h: H, rows: [] };
    console.log(`== ${name}: ${W}x${H} background sheet ==`);
    continue;
  }
  // row bands: consecutive scanlines with any fg pixel; merge bands separated by < MINGAP
  const rowHas = [];
  for (let y = 0; y < H; y++) {
    let has = 0;
    for (let x = 0; x < W; x++) if (fg[y * W + x]) { has = 1; break; }
    rowHas.push(has);
  }
  const MINGAP_Y = 4;
  const bands = [];
  let y = 0;
  while (y < H) {
    if (rowHas[y]) {
      let y2 = y;
      let gap = 0;
      let end = y;
      while (y2 < H) {
        if (rowHas[y2]) { end = y2; gap = 0; } else { gap++; if (gap >= MINGAP_Y) break; }
        y2++;
      }
      bands.push([y, end]);
      y = end + 1;
    } else y++;
  }
  // frames within band: columns with fg, split on gaps >= MINGAP_X
  const MINGAP_X = 6;
  const rows = [];
  for (const [y0, y1] of bands) {
    const colHas = new Uint8Array(W);
    for (let x = 0; x < W; x++) {
      for (let yy = y0; yy <= y1; yy++) if (fg[yy * W + x]) { colHas[x] = 1; break; }
    }
    const frames = [];
    let x = 0;
    while (x < W) {
      if (colHas[x]) {
        let x2 = x, gap = 0, end = x;
        while (x2 < W) {
          if (colHas[x2]) { end = x2; gap = 0; } else { gap++; if (gap >= MINGAP_X) break; }
          x2++;
        }
        // tight y bounds for this frame
        let ty0 = y1, ty1 = y0;
        for (let yy = y0; yy <= y1; yy++) {
          for (let xx = x; xx <= end; xx++) {
            if (fg[yy * W + xx]) { if (yy < ty0) ty0 = yy; if (yy > ty1) ty1 = yy; break; }
          }
        }
        frames.push({ x, y: ty0, w: end - x + 1, h: ty1 - ty0 + 1 });
        x = end + 1;
      } else x++;
    }
    rows.push(frames);
  }
  fs.writeFileSync(path.join(OUT, name + '.png'), PNG.sync.write(png));
  result[name] = { w: W, h: H, rows };
  console.log(`== ${name}: ${W}x${H}, bg rgb(${bg[0]},${bg[1]},${bg[2]}) ==`);
  rows.forEach((r, i) => {
    const sizes = r.map(f => `${f.w}x${f.h}`).join(' ');
    console.log(`  row ${i} (y=${r[0] ? r[0].y : '?'}): ${r.length} frames  [${sizes}]`);
  });
}
fs.mkdirSync(path.join(__dirname, '..', 'src', 'game'), { recursive: true });
fs.writeFileSync(path.join(__dirname, '..', 'src', 'game', 'frames.json'), JSON.stringify(result));
console.log('done');
