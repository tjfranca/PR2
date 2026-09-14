#!/usr/bin/env node
/* Se a folha da Skelerena não estiver disponível, cria um substituto a partir do
   Putty já processado: um "Z-Putty" recolorido (tom vermelho-escuro). O frames.json
   recebe a entrada "skelerena" copiada do putty com a flag fallback: true, e o
   sprites.ts usa então o mapeamento de animações do Putty para esse inimigo. */
const fs = require("fs");
const path = require("path");
const { PNG } = require("pngjs");

const DIR = path.join(__dirname, "..", "src", "assets", "sprites");
const FRAMES = path.join(__dirname, "..", "src", "game", "frames.json");
const data = JSON.parse(fs.readFileSync(FRAMES, "utf8"));

if (data.skelerena && !data.skelerena.fallback && fs.existsSync(path.join(DIR, "skelerena.png"))) {
  console.log("skelerena: folha original presente, nada a fazer");
  process.exit(0);
}
if (!data.putty || !fs.existsSync(path.join(DIR, "putty.png"))) {
  console.error("putty.png processado não encontrado — rode slice2.cjs antes");
  process.exit(1);
}

const src = PNG.sync.read(fs.readFileSync(path.join(DIR, "putty.png")));
const out = new PNG({ width: src.width, height: src.height });
for (let i = 0; i < src.data.length; i += 4) {
  const r = src.data[i], g = src.data[i + 1], b = src.data[i + 2], a = src.data[i + 3];
  if (a < 10) {
    out.data[i + 3] = 0;
    continue;
  }
  // dark crimson tint, keeps shading
  const lum = (r * 0.3 + g * 0.59 + b * 0.11) / 255;
  out.data[i] = Math.min(255, 70 + lum * 190);
  out.data[i + 1] = Math.min(255, 20 + lum * 70);
  out.data[i + 2] = Math.min(255, 30 + lum * 80);
  out.data[i + 3] = a;
}
fs.writeFileSync(path.join(DIR, "skelerena.png"), PNG.sync.write(out));
data.skelerena = { ...data.putty, fallback: true };
fs.writeFileSync(FRAMES, JSON.stringify(data));
console.log("skelerena: substituto (Z-Putty) gerado a partir do putty");
