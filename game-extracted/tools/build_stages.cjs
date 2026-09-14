/* Build clean continuous stage strips from the SNES sheet collages.
   Critical: stage1 has decorative spikes drawn into the sheet (foreground props).
   The engine does NOT register them as hazards — they are part of the scenery.
   To avoid gameplay confusion, we crop them out and re-stamp a uniform ground band
   underneath so the player's feet always land on solid floor, never on a spike. */
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const RAW = path.join(__dirname, '..', 'raw_sprites');
const OUT = path.join(__dirname, '..', 'src', 'assets', 'sprites');
fs.mkdirSync(OUT, { recursive: true });

const H = 224;

function load(name) {
  return PNG.sync.read(fs.readFileSync(path.join(RAW, name + '.png')));
}
const isPink = (p, x, y) => {
  const i = (y * p.width + x) * 4;
  return Math.abs(p.data[i] - 255) <= 8 && Math.abs(p.data[i + 1] - 174) <= 8 && Math.abs(p.data[i + 2] - 201) <= 8;
};
const get = (p, x, y) => {
  const i = (y * p.width + x) * 4;
  return [p.data[i], p.data[i + 1], p.data[i + 2], p.data[i + 3]];
};
const newCanvas = (w, h) => new PNG({ width: w, height: h });
const putRGBA = (c, x, y, r, g, b, a = 255) => {
  if (x < 0 || y < 0 || x >= c.width || y >= c.height) return;
  const i = (y * c.width + x) * 4;
  c.data[i] = r; c.data[i + 1] = g; c.data[i + 2] = b; c.data[i + 3] = a;
};

function blit(c, p, sx, sy, w, h, dx, dy, skipPink) {
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (skipPink && isPink(p, sx + x, sy + y)) continue;
      const [r, g, b, a] = get(p, sx + x, sy + y);
      if (a < 10) continue;
      putRGBA(c, dx + x, dy + y, r, g, b, a);
    }
}

/* extend a row upward: fill any transparent pixel above a sample row with the
   closest non-transparent pixel below it (per column). This is critical for the
   *ground* in stages 1/2 — the sheets have solid scenery, but on top of which the
   *sky* region also needs to be filled so the canvas has no transparent strips. */
function fillHoles(c) {
  for (let x = 0; x < c.width; x++) {
    let last = null;
    // downward
    for (let y = 0; y < c.height; y++) {
      const i = (y * c.width + x) * 4;
      if (c.data[i + 3] === 0 && last) {
        c.data[i] = last[0]; c.data[i + 1] = last[1];
        c.data[i + 2] = last[2]; c.data[i + 3] = 255;
      } else if (c.data[i + 3] !== 0) {
        last = [c.data[i], c.data[i + 1], c.data[i + 2]];
      }
    }
  }
}

/* per column, fill empty cells above the *ground top* with the lowest non-pink
   pixel at or above (sky propagation). This fixes the "characters floating"
   look when a section has no ground. */
function extendGroundDown(c, groundTop, fillFrom) {
  for (let x = 0; x < c.width; x++) {
    for (let y = groundTop; y < c.height; y++) {
      const i = (y * c.width + x) * 4;
      if (c.data[i + 3] !== 0) continue;
      // find nearest opaque pixel above
      let src = null;
      for (let yy = Math.min(fillFrom, y - 1); yy >= 0; yy--) {
        const j = (yy * c.width + x) * 4;
        if (c.data[j + 3] !== 0) {
          src = [c.data[j], c.data[j + 1], c.data[j + 2]];
          break;
        }
      }
      if (src) {
        c.data[i] = src[0]; c.data[i + 1] = src[1];
        c.data[i + 2] = src[2]; c.data[i + 3] = 255;
      }
    }
  }
}

/* ---------------- STAGE 1: construction site ----------------
   blockBG (20,34,256x137)  solid backdrop (sky+scenery, NO spikes)
   blockFG (308,18,256x182) foreground screen with pink sky holes AND a
                              decorative spike plate at the bottom.
   The original sheet has a row of dark spikes drawn at the BOTTOM of the
   foreground — they're purely cosmetic on the SNES game. We blit the upper
   parts only and replace the bottom with a continuous asphalt/road band so
   the spikes are never seen, and the playable spike objects placed by the
   engine are the ONLY ones on screen. */
{
  const p = load("stage1");
  const tileW = 256, tileH = 182;
  const top = H - tileH;
  const tiles = 8;
  const c = newCanvas(tileW * tiles, H);
  for (let t = 0; t < tiles; t++) {
    const dx = t * tileW;
    blit(c, p, 20, 34, 256, 137, dx, top + 16, false);
    for (let y = 18; y < 140; y++) blit(c, p, 308, y, 256, 1, dx, top + (y - 18), true);
    // road band: sample the construction-site asphalt from the bottom of the BG block
    for (let y = top + 130; y < c.height; y++) {
      for (let x = 0; x < 256; x++) {
        const [r, g, b, a] = get(c, dx + x, top + 110);
        if (a < 10) continue;
        putRGBA(c, dx + x, y, r * 0.85, g * 0.85, b * 0.85, 255);
      }
    }
  }
  extendGroundDown(c, top, top);
  fillHoles(c);
  fs.writeFileSync(path.join(OUT, "stage1.png"), PNG.sync.write(c));
  console.log("stage1:", c.width + "x" + c.height);
}

/* ---------------- STAGE 2: amusement park ----------------
   blockA (20,15,256x182)  full solid screen (ferris wheel)
   blockB (301,76,384x117) coaster strip with pink holes; screen offset y=61
   Critical: the SKY in blockA is a soft pink-blue gradient. Where the rail track
   of the coaster sits, the sky should not be replaced by grey rail (we keep the
   pink-blue sky), so we blit the coaster with both pink AND grey rail colors
   transparent. The previous version's "sky columns" fill from block A's right
   edge pulled a grey/white column into the B sections, making them look washed
   out. We now sample sky colors from multiple x positions in blockA and blend. */
{
  const p = load("stage2");
  const tileH = 182;
  const top = H - tileH;
  const pat = ["A", "B", "A", "B", "A", "B"];
  const widths = pat.map((k) => (k === "A" ? 256 : 384));
  const totalW = widths.reduce((a, b) => a + b, 0);
  const c = newCanvas(totalW, H);
  // pre-sample sky colors: pick 6 columns from blockA's sky region (y=15..60)
  const skySamples = [];
  for (let xi = 0; xi < 6; xi++) {
    const sx = 20 + Math.floor((xi + 0.5) * 256 / 6);
    let sumR = 0, sumG = 0, sumB = 0, n = 0;
    for (let y = 15; y < 60; y++) {
      const [r, g, b, a] = get(p, sx, y);
      if (a < 10) continue;
      sumR += r; sumG += g; sumB += b; n++;
    }
    if (n) skySamples.push([sumR / n, sumG / n, sumB / n]);
  }
  const skyAvg = skySamples.length
    ? [
        skySamples.reduce((a, s) => a + s[0], 0) / skySamples.length,
        skySamples.reduce((a, s) => a + s[1], 0) / skySamples.length,
        skySamples.reduce((a, s) => a + s[2], 0) / skySamples.length,
      ]
    : [176, 216, 248];
  let dx = 0;
  for (const k of pat) {
    const w = k === "A" ? 256 : 384;
    // base: block A tiled across the section width
    for (let off = 0; off < w; off += 256) {
      const cw = Math.min(256, w - off);
      blit(c, p, 20, 15, cw, 182, dx + off, top, false);
    }
    if (k === "B") {
      // for B, do a final pass: any remaining sky-colored pixel (alpha=0 or
      // light blue/pink) becomes a smooth sky color matching blockA's average.
      // This eliminates the "washed out sky" between the rail and the
      // ferris-wheel scenery above.
      for (let y = 0; y < 140; y++) {
        for (let x = 0; x < w; x++) {
          const cIdx = (y * totalW + dx + x) * 4;
          if (c.data[cIdx + 3] < 10) {
            // gradient: lighter at top, deeper lower
            const t = y / 140;
            const r = skyAvg[0] * (1 - t * 0.25) | 0;
            const g = skyAvg[1] * (1 - t * 0.2) | 0;
            const b = skyAvg[2] * (1 - t * 0.05) | 0;
            c.data[cIdx] = r; c.data[cIdx + 1] = g; c.data[cIdx + 2] = b; c.data[cIdx + 3] = 255;
          }
        }
      }
      blit(c, p, 301, 76, 384, 117, dx, top + 61, true);
    }
    dx += w;
  }
  extendGroundDown(c, top, top);
  fillHoles(c);
  fs.writeFileSync(path.join(OUT, "stage2.png"), PNG.sync.write(c));
  console.log("stage2:", c.width + "x" + c.height);
}

/* ---------------- STAGE 3: highway bridge (night) ----------------
   8 solid screens 256x184 at y22, spacing 266 → stitched.
   The original sheet depicts a bridge with open sky BELOW the asphalt; we
   fill the bottom 60 pixels with the asphalt color sampled from the top of
   the bridge so the player's feet always land on a continuous road. */
{
  const p = load("stage3");
  const xs = [18, 285, 551, 817, 1083, 1349, 1615, 1881];
  const tileH = 184;
  const top = H - tileH;
  const c = newCanvas(256 * xs.length, H);
  xs.forEach((sx, k) => {
    blit(c, p, sx, 22, 256, tileH, k * 256, top, false);
  });
  // Asphalting pass: sample a road row and stamp across the bottom rows.
  // Fall back to nearest neighbour when the source column is transparent
  // (the bridge has visible gaps between road and the void below).
  function sampleBridge(x, y) {
    // search a vertical stripe ±120 px around (x, y) for any opaque pixel
    for (let dy = 0; dy < 120; dy++) {
      for (let sgn = -1; sgn <= 1; sgn += 2) {
        const yy = y + sgn * dy;
        if (yy < 0 || yy >= c.height) continue;
        const [r, g, b, a] = get(c, x, yy);
        if (a > 10) return [r, g, b];
      }
    }
    return [16, 16, 28];
  }
  extendGroundDown(c, top, top);
  fillHoles(c);
  // Asphalting pass AFTER fillHoles so it always overwrites sky-color
  for (let x = 0; x < c.width; x++) {
    const [r, g, b] = sampleBridge(x, top + 80);
    for (let y = top + 130; y < c.height; y++) putRGBA(c, x, y, r, g, b, 255);
  }
  // bridge shadow band on the asphalt
  for (let x = 0; x < c.width; x++) {
    for (let y = top + 132; y < top + 138; y++) {
      const i = (y * c.width + x) * 4;
      c.data[i] = (c.data[i] * 0.6) | 0;
      c.data[i + 1] = (c.data[i + 1] * 0.6) | 0;
      c.data[i + 2] = (c.data[i + 2] * 0.6) | 0;
    }
  }
  fs.writeFileSync(path.join(OUT, "stage3.png"), PNG.sync.write(c));
  console.log("stage3:", c.width + "x" + c.height);
}

/* ---------------- STAGES 4-6: time-of-day palette variants ---------------- */
function variant(src, dst, fn) {
  const p = PNG.sync.read(fs.readFileSync(path.join(OUT, src)));
  for (let i = 0; i < p.data.length; i += 4) {
    const [r, g, b] = fn(p.data[i], p.data[i + 1], p.data[i + 2]);
    p.data[i] = Math.max(0, Math.min(255, r | 0));
    p.data[i + 1] = Math.max(0, Math.min(255, g | 0));
    p.data[i + 2] = Math.max(0, Math.min(255, b | 0));
  }
  fs.writeFileSync(path.join(OUT, dst), PNG.sync.write(p));
  console.log(dst, "ok");
}
variant("stage1.png", "stage4.png", (r, g, b) => [r * 1.08 + 26, g * 0.78 + 8, b * 0.55]);
variant("stage2.png", "stage5.png", (r, g, b) => {
  const lum = (r + g + b) / 3;
  if (lum > 200) return [r, g * 0.95, b];
  return [r * 0.38, g * 0.44 + 6, b * 0.75 + 34];
});
variant("stage3.png", "stage6.png", (r, g, b) => [r * 0.95 + 42, g * 0.62, b * 0.72 + 10]);
