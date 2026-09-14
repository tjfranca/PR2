/* Generate pixel-art placeholder sprites as PNG so the project still runs.
   These are simple silhouettes by ranger color. Used only when external
   downloads are blocked. They are intentionally chunky to look like
   "retro placeholder" art. */
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const OUT = path.join(__dirname, '..', 'src', 'assets', 'sprites');
fs.mkdirSync(OUT, { recursive: true });

function png(w, h) { return new PNG({ width: w, height: h }); }
function px(p, x, y, r, g, b, a = 255) {
  if (x < 0 || y < 0 || x >= p.width || y >= p.height) return;
  const i = (y * p.width + x) * 4;
  p.data[i] = r; p.data[i + 1] = g; p.data[i + 2] = b; p.data[i + 3] = a;
}
function fill(p, r, g, b) {
  for (let i = 0; i < p.data.length; i += 4) {
    p.data[i] = r; p.data[i + 1] = g; p.data[i + 2] = b; p.data[i + 3] = 255;
  }
}

/* ---------------- ranger placeholders (Genesis) ----------------
   1 sprite, ~64×128, with helmet (head band) + body in the ranger color */
const RANGERS = {
  red:    { body: [192, 32,  32],  band: [255, 80, 80] },
  blue:   { body: [32,  64, 192],  band: [80, 140, 255] },
  black:  { body: [48,  48, 60],  band: [160, 160, 180] },
  pink:   { body: [224, 64, 144], band: [255, 150, 200] },
  yellow: { body: [216, 192, 32], band: [255, 230, 100] },
  white:  { body: [220, 220, 230],band: [255, 255, 255] },
};


for (const [key, c] of Object.entries(RANGERS)) {
  const w = 56, h = 110;
  const p = png(w, h);
  // shadow at feet
  for (let x = 12; x < 44; x++) px(p, x, h - 2, 0, 0, 0, 100);
  // legs
  for (let y = 80; y < 105; y++) {
    px(p, 18, y, ...c.body); px(p, 19, y, ...c.body);
    px(p, 36, y, ...c.body); px(p, 37, y, ...c.body);
  }
  // boots (gold/black band)
  for (let y = 100; y < 108; y++) {
    px(p, 16, y, ...c.band); px(p, 17, y, ...c.band);
    px(p, 38, y, ...c.band); px(p, 39, y, ...c.band);
  }
  // torso
  for (let y = 50; y < 85; y++) {
    for (let x = 14; x < 42; x++) px(p, x, y, ...c.body);
  }
  // arms
  for (let y = 52; y < 85; y++) {
    px(p, 11, y, ...c.body); px(p, 12, y, ...c.body);
    px(p, 43, y, ...c.body); px(p, 44, y, ...c.body);
  }
  // chest emblem (white diamond)
  for (let y = 60; y < 72; y++) {
    px(p, 26, y, 255, 255, 255); px(p, 27, y, 255, 255, 255); px(p, 28, y, 255, 255, 255);
    px(p, 27, y, 255, 255, 255);
  }
  // shoulders
  for (let y = 45; y < 55; y++) {
    px(p, 13, y, ...c.band); px(p, 14, y, ...c.band);
    px(p, 41, y, ...c.band); px(p, 42, y, ...c.band);
  }
  // head
  for (let y = 15; y < 45; y++) {
    for (let x = 18; x < 38; x++) px(p, x, y, ...c.band);
  }
  // visor (gold/silver band across helmet)
  for (let x = 18; x < 38; x++) px(p, x, 32, 255, 230, 100);
  // visor glow (one eye)
  px(p, 23, 35, 0, 0, 0); px(p, 32, 35, 0, 0, 0);
  // belt
  for (let x = 14; x < 42; x++) px(p, x, 86, ...c.band);
  fs.writeFileSync(path.join(OUT, `g${key}.png`), PNG.sync.write(p));
}

/* ---------------- civilian placeholders ----------------
   civilian (Rocky etc.) — shirt + pants, ranger color band on shoulder */
const CIVS = {
  rocky:  { shirt: [180, 60, 60],   pants: [40, 60, 100],  hair: [60, 40, 20],  band: [192, 32, 32] },
  adam:   { shirt: [40, 80, 160],   pants: [40, 40, 60],   hair: [40, 30, 20],  band: [48, 48, 60] },
  billy:  { shirt: [80, 160, 240],  pants: [60, 60, 100],  hair: [120, 100, 80],band: [32, 64, 192] },
  aisha:  { shirt: [240, 180, 60],  pants: [120, 80, 80],  hair: [80, 40, 20],  band: [216, 192, 32] },
  kim:    { shirt: [240, 120, 180], pants: [100, 80, 100], hair: [120, 80, 30], band: [224, 64, 144] },
  tommy:  { shirt: [240, 240, 240], pants: [120, 100, 80], hair: [80, 60, 30],  band: [220, 220, 230] },
};
for (const [k, c] of Object.entries(CIVS)) {
  const w = 44, h = 96;
  const p = png(w, h);
  // legs
  for (let y = 70; y < 92; y++) {
    px(p, 14, y, ...c.pants); px(p, 15, y, ...c.pants);
    px(p, 28, y, ...c.pants); px(p, 29, y, ...c.pants);
  }
  // torso
  for (let y = 38; y < 72; y++) for (let x = 10; x < 34; x++) px(p, x, y, ...c.shirt);
  // shoulder band (ranger color)
  for (let x = 10; x < 34; x++) px(p, x, 40, ...c.band);
  // arms
  for (let y = 42; y < 72; y++) {
    px(p, 7, y, ...c.shirt); px(p, 8, y, ...c.shirt);
    px(p, 35, y, ...c.shirt); px(p, 36, y, ...c.shirt);
  }
  // head
  for (let y = 8; y < 36; y++) for (let x = 14; x < 30; x++) px(p, x, y, ...c.hair);
  // skin face (small triangle below hair)
  for (let y = 22; y < 36; y++) for (let x = 17; x < 27; x++) px(p, x, y, 240, 200, 160);
  // eyes
  px(p, 19, 30, 0, 0, 0); px(p, 24, 30, 0, 0, 0);
  fs.writeFileSync(path.join(OUT, `civ_${k}.png`), PNG.sync.write(p));
}

/* ---------------- putty patrol ---------------- */
{
  const w = 48, h = 90;
  const p = png(w, h);
  fill(p, 0, 0, 0);
  // putty body: clay blob
  for (let y = 18; y < 80; y++) {
    for (let x = 8; x < 40; x++) {
      const dx = (x - 24) / 14;
      const dy = (y - 50) / 22;
      const inside = dx * dx + dy * dy < 1;
      if (inside) px(p, x, y, 220, 200, 170);
    }
  }
  // eyes (glowing)
  px(p, 18, 38, 220, 60, 60); px(p, 28, 38, 220, 60, 60);
  px(p, 19, 39, 255, 200, 100); px(p, 29, 39, 255, 200, 100);
  fs.writeFileSync(path.join(OUT, 'putty.png'), PNG.sync.write(p));
}

/* ---------------- skelerena ---------------- */
{
  const w = 80, h = 90;
  const p = png(w, h);
  fill(p, 0, 0, 0);
  // hound silhouette
  for (let y = 50; y < 80; y++) for (let x = 10; x < 70; x++) px(p, x, y, 220, 200, 150);
  for (let y = 30; y < 50; y++) for (let x = 30; x < 50; x++) px(p, x, y, 220, 200, 150);
  // legs
  for (let y = 75; y < 90; y++) {
    px(p, 18, y, 180, 160, 120); px(p, 30, y, 180, 160, 120);
    px(p, 50, y, 180, 160, 120); px(p, 62, y, 180, 160, 120);
  }
  // eye glow
  px(p, 60, 40, 220, 60, 60);
  fs.writeFileSync(path.join(OUT, 'skelerena.png'), PNG.sync.write(p));
}

/* ---------------- oozeman ---------------- */
{
  const w = 100, h = 90;
  const p = png(w, h);
  fill(p, 0, 0, 0);
  // purple blob with eyes
  for (let y = 18; y < 78; y++) {
    for (let x = 12; x < 88; x++) {
      const dx = (x - 50) / 30;
      const dy = (y - 50) / 24;
      if (dx * dx + dy * dy < 1) {
        const tone = y < 50 ? 130 : 90;
        px(p, x, y, tone, 30, 150);
      }
    }
  }
  px(p, 38, 42, 220, 80, 80); px(p, 60, 42, 220, 80, 80);
  fs.writeFileSync(path.join(OUT, 'oozeman.png'), PNG.sync.write(p));
}

/* ---------------- stages: simple gradient backgrounds ---------------- */
function stage(filename, w, h, top, mid, bot) {
  const p = png(w, h);
  for (let y = 0; y < h; y++) {
    const t = y / h;
    let r, g, b;
    if (t < 0.5) {
      const k = t * 2;
      r = top[0] * (1 - k) + mid[0] * k;
      g = top[1] * (1 - k) + mid[1] * k;
      b = top[2] * (1 - k) + mid[2] * k;
    } else {
      const k = (t - 0.5) * 2;
      r = mid[0] * (1 - k) + bot[0] * k;
      g = mid[1] * (1 - k) + bot[1] * k;
      b = mid[2] * (1 - k) + bot[2] * k;
    }
    for (let x = 0; x < w; x++) px(p, x, y, r | 0, g | 0, b | 0);
  }
  // ground band darker
  const groundY = 170;
  for (let y = groundY; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      p.data[i] = (p.data[i] * 0.6) | 0;
      p.data[i + 1] = (p.data[i + 1] * 0.6) | 0;
      p.data[i + 2] = (p.data[i + 2] * 0.7) | 0;
    }
  }
  fs.writeFileSync(path.join(OUT, filename), PNG.sync.write(p));
}
stage('stage1.png', 2048, 224, [255, 174, 201], [200, 100, 60], [110, 60, 30]);
stage('stage2.png', 1920, 224, [120, 200, 240], [180, 80, 120], [80, 80, 100]);
stage('stage3.png', 2048, 224, [10, 10, 40], [30, 0, 60], [10, 0, 30]);
stage('stage4.png', 2048, 224, [255, 100, 80], [200, 60, 30], [80, 30, 10]);
stage('stage5.png', 1920, 224, [10, 10, 50], [40, 0, 60], [10, 0, 30]);
stage('stage6.png', 2048, 224, [180, 40, 40], [120, 30, 20], [60, 10, 10]);

console.log('placeholders written');
