#!/usr/bin/env node
/* Empacota as folhas processadas (src/assets/sprites/*.png) em um único módulo
   de texto: src/assets/sheets.json  → { nome: "data:image/png;base64,..." }.
   O jogo importa esse JSON (não os PNGs), então o build funciona mesmo que os
   arquivos binários se percam. Rode após slice2.cjs + build_stages.cjs.
   Uso: node tools/pack_sheets.cjs
        node tools/pack_sheets.cjs --unpack   (recria os PNGs a partir do JSON) */
const fs = require("fs");
const path = require("path");

const DIR = path.join(__dirname, "..", "src", "assets", "sprites");
const OUT = path.join(__dirname, "..", "src", "assets", "sheets.json");

const NAMES = [
  "gred", "gblue", "gblack", "gpink", "gyellow", "gwhite",
  "civ_rocky", "civ_adam", "civ_billy", "civ_aisha", "civ_kim", "civ_tommy",
  "putty", "skelerena", "oozeman",
  "stage1", "stage2", "stage3", "stage4", "stage5", "stage6",
];

if (process.argv.includes("--unpack")) {
  const data = JSON.parse(fs.readFileSync(OUT, "utf8"));
  fs.mkdirSync(DIR, { recursive: true });
  for (const [name, url] of Object.entries(data)) {
    const b64 = String(url).split(",")[1];
    fs.writeFileSync(path.join(DIR, name + ".png"), Buffer.from(b64, "base64"));
  }
  console.log(`PNGs recriados em ${path.relative(process.cwd(), DIR)}`);
  process.exit(0);
}

const out = {};
let total = 0;
const missing = [];
for (const name of NAMES) {
  const p = path.join(DIR, name + ".png");
  if (!fs.existsSync(p)) {
    missing.push(name);
    continue;
  }
  const buf = fs.readFileSync(p);
  if (!(buf[0] === 0x89 && buf[1] === 0x50)) {
    missing.push(name + " (não é PNG)");
    continue;
  }
  out[name] = "data:image/png;base64," + buf.toString("base64");
  total += buf.length;
}
if (missing.length) {
  console.error("Faltando: " + missing.join(", "));
  process.exit(1);
}
fs.writeFileSync(OUT, JSON.stringify(out));
console.log(`sheets.json escrito (${NAMES.length} folhas, ${(total / 1024).toFixed(0)} KB de PNG)`);
