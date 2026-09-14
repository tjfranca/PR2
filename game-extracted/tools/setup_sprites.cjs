#!/usr/bin/env node
/* ============================================================
   SETUP DOS SPRITES — roda tudo de uma vez:
     1) baixa as folhas originais do The Spriters Resource
     2) converte os GIFs (Mega Drive) para PNG
     3) recorta os frames (slice2.cjs)  → src/game/frames.json
     4) monta os cenários (build_stages.cjs) → src/assets/sprites/stage*.png

   Uso:   node tools/setup_sprites.cjs
          node tools/setup_sprites.cjs --skip-download   (se você baixou na mão)
          node tools/setup_sprites.cjs --placeholders    (gera arte provisória)
   ============================================================ */
const fs = require("fs");
const path = require("path");
const https = require("https");
const { execSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const RAW = path.join(ROOT, "raw_sprites");
fs.mkdirSync(RAW, { recursive: true });

const BASE = "https://www.spriters-resource.com/media/assets";

// nome do arquivo → caminho no site (todos são rips públicos do jogo)
const SHEETS = {
  // Rangers morfados — MMPR: The Movie (Mega Drive / Genesis), rips de Belial
  "gred.gif":    "23/25017.gif",
  "gblue.gif":   "23/25015.gif",
  "gpink.gif":   "23/25016.gif",
  "gblack.gif":  "22/23902.gif",
  "gwhite.gif":  "23/25121.gif",
  "gyellow.gif": "23/25122.gif",
  "oozeman.gif": "23/25120.gif",
  // Civis, Putty, Skelerena e cenários — MMPR: The Movie (SNES)
  "civ_rocky.png": "44/46468.png",
  "civ_adam.png":  "52/55364.png",
  "civ_billy.png": "52/55366.png",
  "civ_aisha.png": "52/55365.png",
  "civ_kim.png":   "52/55429.png",
  "civ_tommy.png": "11/11549.png",
  "putty.png":     "246/248759.png",
  "skelerena.png": "244/247339.png",
  "stage1.png":    "66/69587.png",
  "stage2.png":    "66/69586.png",
  "stage3.png":    "78/80889.png",
};

const args = new Set(process.argv.slice(2));

function log(msg) {
  console.log(msg);
}

function isImage(buf) {
  if (!buf || buf.length < 8) return false;
  const png = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  const gif = buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46;
  return png || gif;
}

function download(url) {
  return new Promise((resolve) => {
    const req = https.get(
      url,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
          Accept: "image/avif,image/webp,image/png,image/gif,*/*",
          Referer: "https://www.spriters-resource.com/",
        },
        timeout: 20000,
      },
      (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const next = res.headers.location.startsWith("http")
            ? res.headers.location
            : "https://www.spriters-resource.com" + res.headers.location;
          res.resume();
          download(next).then(resolve);
          return;
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks)));
        res.on("error", () => resolve(null));
      }
    );
    req.on("error", () => resolve(null));
    req.on("timeout", () => {
      req.destroy();
      resolve(null);
    });
  });
}

async function step1_download() {
  log("\n[1/4] Baixando folhas de sprites…");
  const missing = [];
  for (const [file, rel] of Object.entries(SHEETS)) {
    const dest = path.join(RAW, file);
    if (fs.existsSync(dest) && isImage(fs.readFileSync(dest))) {
      log(`   ✓ ${file} (já existe)`);
      continue;
    }
    const buf = await download(`${BASE}/${rel}`);
    if (buf && isImage(buf)) {
      fs.writeFileSync(dest, buf);
      log(`   ✓ ${file}`);
    } else {
      missing.push([file, `${BASE}/${rel}`]);
      log(`   ✗ ${file}  (bloqueado ou indisponível)`);
    }
  }
  return missing;
}

function step2_convertGifs() {
  log("\n[2/4] Convertendo GIFs (Mega Drive) para PNG…");
  const { GifReader } = require("omggif");
  const { PNG } = require("pngjs");
  for (const file of Object.keys(SHEETS)) {
    if (!file.endsWith(".gif")) continue;
    const src = path.join(RAW, file);
    const dst = path.join(RAW, file.replace(/\.gif$/, ".png"));
    if (!fs.existsSync(src)) continue;
    const gr = new GifReader(fs.readFileSync(src));
    const png = new PNG({ width: gr.width, height: gr.height });
    gr.decodeAndBlitFrameRGBA(0, png.data);
    fs.writeFileSync(dst, PNG.sync.write(png));
    log(`   ✓ ${file} → ${path.basename(dst)} (${gr.width}x${gr.height})`);
  }
}

function step3_slice() {
  log("\n[3/4] Recortando frames (slice2.cjs)…");
  execSync(`node "${path.join(__dirname, "slice2.cjs")}"`, { stdio: "inherit", cwd: ROOT });
}

function step4_stages() {
  log("\n[4/4] Montando cenários (build_stages.cjs)…");
  execSync(`node "${path.join(__dirname, "build_stages.cjs")}"`, { stdio: "inherit", cwd: ROOT });
}

function placeholders() {
  log("\nGerando arte provisória (placeholders)…");
  execSync(`node "${path.join(__dirname, "make_placeholders.cjs")}"`, { stdio: "inherit", cwd: ROOT });
  execSync(`node "${path.join(__dirname, "make_min_frames.cjs")}"`, { stdio: "inherit", cwd: ROOT });
  log("\n✔ Placeholders prontos. Rode `npm run dev` para jogar (sem os sprites originais).");
}

function allRawPresent() {
  const needed = Object.keys(SHEETS).map((f) => f.replace(/\.gif$/, ".png"));
  return needed.every((f) => {
    const p = path.join(RAW, f);
    return fs.existsSync(p) && isImage(fs.readFileSync(p));
  });
}

(async () => {
  console.log("==============================================");
  console.log("  POWER RANGERS — Batalha de Angel Grove");
  console.log("  Setup de sprites");
  console.log("==============================================");

  if (args.has("--placeholders")) {
    placeholders();
    return;
  }

  let missing = [];
  if (!args.has("--skip-download")) missing = await step1_download();

  step2_convertGifs();

  if (!allRawPresent()) {
    console.log("\n⚠  Alguns arquivos não puderam ser baixados automaticamente.");
    console.log("   Baixe-os manualmente no navegador e salve em:  raw_sprites/\n");
    const list = missing.length
      ? missing
      : Object.entries(SHEETS).map(([f, rel]) => [f, `${BASE}/${rel}`]);
    for (const [file, url] of list) console.log(`   ${file.padEnd(16)} ←  ${url}`);
    console.log("\n   Depois rode:  node tools/setup_sprites.cjs --skip-download");
    console.log("   Ou, para jogar já com arte provisória:  node tools/setup_sprites.cjs --placeholders\n");
    process.exit(1);
  }

  step3_slice();
  step4_stages();
  console.log("\n✔ Sprites prontos! Agora rode:  npm run dev   (ou npm run build)\n");
})();
