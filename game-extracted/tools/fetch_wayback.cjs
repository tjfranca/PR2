#!/usr/bin/env node
/* Baixa as folhas de sprites pelo Wayback Machine (web.archive.org) quando o
   The Spriters Resource bloqueia downloads diretos.
   Para cada asset: consulta o índice CDX (caminho antigo /resources/sheets e
   novo /media/assets), pega uma captura 200 image/* e baixa com o sufixo id_
   (conteúdo original, sem a barra do Wayback).
   Uso: node tools/fetch_wayback.cjs            → baixa o que falta em raw_sprites/
        node tools/fetch_wayback.cjs --force    → baixa tudo de novo */
const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");

const RAW = path.join(__dirname, "..", "raw_sprites");
fs.mkdirSync(RAW, { recursive: true });

const ASSETS = {
  "gred.gif": "23/25017.gif",
  "gblue.gif": "23/25015.gif",
  "gpink.gif": "23/25016.gif",
  "gblack.gif": "22/23902.gif",
  "gwhite.gif": "23/25121.gif",
  "gyellow.gif": "23/25122.gif",
  "oozeman.gif": "23/25120.gif",
  "civ_rocky.png": "44/46468.png",
  "civ_adam.png": "52/55364.png",
  "civ_billy.png": "52/55366.png",
  "civ_aisha.png": "52/55365.png",
  "civ_kim.png": "52/55429.png",
  "civ_tommy.png": "11/11549.png",
  "putty.png": "246/248759.png",
  "skelerena.png": "244/247339.png",
  "stage1.png": "66/69587.png",
  "stage2.png": "66/69586.png",
  "stage3.png": "78/80889.png",
};

const force = process.argv.includes("--force");

function isImage(buf) {
  if (!buf || buf.length < 8) return false;
  const png = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  const gif = buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46;
  return png || gif;
}

function get(url, timeoutMs = 60000, redirects = 5) {
  return new Promise((resolve) => {
    const mod = url.startsWith("https") ? https : http;
    const req = mod.get(
      url,
      { headers: { "User-Agent": "Mozilla/5.0 (compatible; sprite-setup/1.0)" }, timeout: timeoutMs },
      (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirects > 0) {
          const next = res.headers.location.startsWith("http")
            ? res.headers.location
            : new URL(res.headers.location, url).toString();
          res.resume();
          get(next, timeoutMs, redirects - 1).then(resolve);
          return;
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve({ status: res.statusCode, body: Buffer.concat(chunks) }));
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

async function cdxLookup(rel) {
  const variants = [
    `spriters-resource.com/resources/sheets/${rel}*`,
    `spriters-resource.com/media/assets/${rel}*`,
  ];
  for (const v of variants) {
    for (let attempt = 0; attempt < 4; attempt++) {
      const q = `http://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(v)}&output=txt&fl=timestamp,original,statuscode,mimetype&filter=statuscode:200&limit=5`;
      const r = await get(q, 45000);
      const txt = r && r.body ? r.body.toString("utf8") : "";
      // empty body or the "Temporarily Offline" page → wait and retry
      if (!txt.trim() || txt.includes("<html") || (r && r.status !== 200)) {
        await new Promise((s) => setTimeout(s, 4000 + attempt * 3000));
        continue;
      }
      const lines = txt.trim().split("\n").filter(Boolean);
      const hit = lines
        .map((l) => l.split(" "))
        .find((p) => p.length >= 4 && p[2] === "200" && /^image\//.test(p[3]));
      if (hit) return { ts: hit[0], original: hit[1] };
      break; // valid answer but no capture on this variant → try next variant
    }
  }
  return null;
}

async function fetchOne(file, rel) {
  const dest = path.join(RAW, file);
  if (!force && fs.existsSync(dest) && isImage(fs.readFileSync(dest))) {
    console.log(`   ✓ ${file} (já existe)`);
    return true;
  }
  const cap = await cdxLookup(rel);
  if (!cap) {
    console.log(`   ✗ ${file}: sem captura no Wayback`);
    return false;
  }
  const url = `https://web.archive.org/web/${cap.ts}id_/${cap.original}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    const r = await get(url, 90000);
    if (r && r.status === 200 && isImage(r.body)) {
      fs.writeFileSync(dest, r.body);
      console.log(`   ✓ ${file}  (${r.body.length} bytes, captura ${cap.ts})`);
      return true;
    }
    await new Promise((s) => setTimeout(s, 2500));
  }
  console.log(`   ✗ ${file}: falha ao baixar ${url}`);
  return false;
}

(async () => {
  console.log("Baixando pelo Wayback Machine…");
  let ok = 0;
  const failed = [];
  for (const [file, rel] of Object.entries(ASSETS)) {
    const good = await fetchOne(file, rel);
    if (good) ok++;
    else failed.push(file);
  }
  console.log(`\n${ok}/${Object.keys(ASSETS).length} arquivos prontos.`);
  if (failed.length) {
    console.log("Faltando: " + failed.join(", "));
    process.exit(1);
  }
})();
