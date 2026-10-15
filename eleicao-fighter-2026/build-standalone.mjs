// Build script: gera um único arquivo HTML autocontido (standalone),
// embutindo o bundle JS, o CSS e todas as imagens/fontes como data URIs.
// Uso: node build-standalone.mjs
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOT = new URL('.', import.meta.url).pathname;

function mime(path) {
  const ext = extname(path).toLowerCase();
  return {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
  }[ext] || 'application/octet-stream';
}

function toDataURI(relPath) {
  const buf = readFileSync(join(ROOT, relPath));
  return `data:${mime(relPath)};base64,${buf.toString('base64')}`;
}

// 1) Empacota os módulos JS num único arquivo IIFE (sem import/export)
console.log('Empacotando JS com esbuild...');
execSync('node_modules/.bin/esbuild js/main.js --bundle --format=iife --target=es2019 --outfile=/tmp/eleicao-bundle.js', {
  cwd: ROOT, stdio: 'inherit'
});
let bundle = readFileSync('/tmp/eleicao-bundle.js', 'utf8');

// 2) Substitui todas as referências a assets/portraits/*.png e assets/stages/*.jpg
//    por data URIs embutidos, para não depender de arquivos externos.
const assetRefs = [...bundle.matchAll(/assets\/(portraits|stages)\/[\w.-]+\.(png|jpg|jpeg)/g)]
  .map((m) => m[0]);
const uniqueRefs = [...new Set(assetRefs)];
console.log(`Embutindo ${uniqueRefs.length} imagens...`);
for (const ref of uniqueRefs) {
  const uri = toDataURI(ref);
  bundle = bundle.split(`'${ref}'`).join(`'${uri}'`).split(`"${ref}"`).join(`"${uri}"`);
}

// 3) Monta o CSS com as fontes embutidas como data URIs
console.log('Embutindo fontes no CSS...');
let css = readFileSync(join(ROOT, 'style.css'), 'utf8');
css = css.replace(/url\((['"]?)(assets\/fonts\/[\w.-]+)\1\)/g, (_, _q, p) => `url('${toDataURI(p)}')`);

// 4) Monta o HTML final com tudo inline
const htmlTemplate = readFileSync(join(ROOT, 'index.html'), 'utf8');
const finalHtml = htmlTemplate
  .replace('<link rel="stylesheet" href="style.css" />', `<style>\n${css}\n</style>`)
  .replace('<script type="module" src="js/main.js"></script>', `<script>\n${bundle}\n</script>`);

writeFileSync(join(ROOT, '..', 'Eleicao-Fighter-2026.html'), finalHtml, 'utf8');
console.log('Arquivo gerado: ../Eleicao-Fighter-2026.html');
