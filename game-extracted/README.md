# ⚡ Power Rangers — Batalha de Angel Grove

Beat 'em up em React + Canvas com os sprites originais de
**Mighty Morphin Power Rangers: The Movie** (Mega Drive para os Rangers morfados;
SNES para os civis, Putties, Skelerena e cenários).

---

## 1. O que você precisa instalar

| Programa | Para quê | Onde baixar |
|---|---|---|
| **Node.js 18 ou mais novo** (vem com o `npm`) | rodar/compilar o jogo | https://nodejs.org (versão LTS) |
| Um navegador (Chrome, Edge, Firefox, Safari) | jogar | — |

Para conferir se instalou: abra o terminal (Prompt de Comando / PowerShell no Windows, Terminal no Mac/Linux) e digite:

```bash
node -v
npm -v
```

Se aparecerem números de versão, está tudo certo.

> **💻 Quer só jogar no PC, sem instalar nada?** Baixe o executável pronto na página
> de [Releases do GitHub](https://github.com/tjfranca/PR2/releases): tem o **Setup**
> (instala e cria atalho) e o **Portátil** (dois cliques e joga, pode levar num pendrive).
> Se o Windows SmartScreen avisar, clique em "Mais informações → Executar assim mesmo".

---

## 2. Baixar o projeto

- **Pelo ZIP:** baixe o projeto, extraia a pasta e abra o terminal **dentro dela**
  (no Windows: clique com o botão direito na pasta → *Abrir no Terminal*).
- **Pelo git:**
  ```bash
  git clone <url-do-repositorio>
  cd <pasta-do-projeto>
  ```

---

## 3. Instalar as dependências (só na primeira vez)

```bash
npm install
```

---

## 4. Baixar e processar os sprites (só na primeira vez)

Os sprites processados **já vêm no repositório** (embutidos em `src/assets/sheets.json`
e `src/game/frames.json`) — você só precisa rodar o pipeline se for trocá-los.
O script faz tudo sozinho: baixa os rips públicos do The Spriters Resource, converte,
recorta os frames e monta os cenários:

```bash
node tools/setup_sprites.cjs
```

Isso cria `raw_sprites/` (folhas originais), `src/assets/sprites/` (folhas limpas
e cenários) e `src/game/frames.json` (coordenadas de cada frame). Depois, rode
`node tools/pack_sheets.cjs` para reembutir as folhas em `sheets.json`.

### Se o download automático falhar
O site às vezes bloqueia downloads por script. Nesse caso o comando acima mostra a
lista de arquivos. Abra cada link **no navegador**, salve com o nome indicado dentro
da pasta `raw_sprites/` e rode:

```bash
node tools/setup_sprites.cjs --skip-download
```

| Salvar como | Link |
|---|---|
| `gred.gif` | https://www.spriters-resource.com/media/assets/23/25017.gif |
| `gblue.gif` | https://www.spriters-resource.com/media/assets/23/25015.gif |
| `gpink.gif` | https://www.spriters-resource.com/media/assets/23/25016.gif |
| `gblack.gif` | https://www.spriters-resource.com/media/assets/22/23902.gif |
| `gwhite.gif` | https://www.spriters-resource.com/media/assets/23/25121.gif |
| `gyellow.gif` | https://www.spriters-resource.com/media/assets/23/25122.gif |
| `oozeman.gif` | https://www.spriters-resource.com/media/assets/23/25120.gif |
| `civ_rocky.png` | https://www.spriters-resource.com/media/assets/44/46468.png |
| `civ_adam.png` | https://www.spriters-resource.com/media/assets/52/55364.png |
| `civ_billy.png` | https://www.spriters-resource.com/media/assets/52/55366.png |
| `civ_aisha.png` | https://www.spriters-resource.com/media/assets/52/55365.png |
| `civ_kim.png` | https://www.spriters-resource.com/media/assets/52/55429.png |
| `civ_tommy.png` | https://www.spriters-resource.com/media/assets/11/11549.png |
| `putty.png` | https://www.spriters-resource.com/media/assets/246/248759.png |
| `skelerena.png` | https://www.spriters-resource.com/media/assets/244/247339.png |
| `stage1.png` | https://www.spriters-resource.com/media/assets/66/69587.png |
| `stage2.png` | https://www.spriters-resource.com/media/assets/66/69586.png |
| `stage3.png` | https://www.spriters-resource.com/media/assets/78/80889.png |

> Quer só testar sem baixar nada? Gere arte provisória:
> `node tools/setup_sprites.cjs --placeholders`

---

## 5. Jogar

### Modo desenvolvimento (recomendado para testar)
```bash
npm run dev
```
Abra no navegador o endereço que aparecer (normalmente **http://localhost:5173**).

### Gerar a versão final (um único arquivo HTML)
```bash
npm run build
```
Isso cria **`dist/index.html`** com tudo embutido (código + sprites + sons).
Basta dar **dois cliques** nesse arquivo para jogar — funciona offline, e você pode
copiar só ele para um pendrive, mandar para um amigo ou hospedar em qualquer site
(GitHub Pages, Netlify, Vercel, etc.).

### Publicar no Netlify
**Jeito mais rápido (drag & drop):** abra [app.netlify.com/drop](https://app.netlify.com/drop)
e arraste o **`dist/index.html`** (ou o zip `Power-Rangers-Angel-Grove-netlify.zip`).
O site fica no ar em segundos, sem build.

**Deploy contínuo via Git:** no Netlify, escolha *"Import from Git"* e aponte para o
repositório. O `netlify.toml` na **raiz do repositório** (base `game-extracted`) já
configura build e pasta de publicação — é só confirmar sem mexer em nada. (Este
projeto também tem um `netlify.toml` próprio, caso seja publicado como repositório
independente.)

### Gerar o executável para PC (Windows)

A pasta `desktop/` contém o wrapper Electron que empacota o `dist/index.html` num
executável nativo. O build oficial roda no CI e publica na página de Releases, mas
também dá para gerar localmente (no Windows):

```bash
cd desktop
npm ci
mkdir -p app/dist && cp ../dist/index.html app/dist/index.html
npm run dist:win        # gera instalador + portátil em desktop/release/
```

### Jogar no celular
1. Rode `npm run dev -- --host` no computador.
2. No celular (mesma rede Wi-Fi), abra o endereço `http://<IP-do-seu-PC>:5173`
   que o terminal mostra.
3. Os controles de toque (direcional + botões) aparecem automaticamente.

Ou simplesmente copie o `dist/index.html` para o celular e abra no navegador.

---

## 6. Controles

| Ação | Teclado | Celular | Gamepad |
|---|---|---|---|
| Mover | Setas ou WASD | Direcional virtual | Analógico / D-pad |
| Pular | Espaço | PULO | A |
| Soco (combo 1-2-3) | Z ou J | SOCO | X |
| Chute / voadora no ar | X ou K | CHUTE | Y |
| **Morfar** (medidor cheio) | M ou Enter | MORF | LB |
| Arma especial (morfado) | C ou L | ARMA | B |
| **Pausar** | P ou Esc | botão ⏸ no canto | Start |

Dicas: pule os espinhos (ou jogue inimigos neles), quebre caixotes para recuperar
energia, chute barris para atropelar vilões, cuidado com a gosma escorregadia,
tonéis em chamas e vigas caindo.

**Extras:** a música de fundo é sintetizada em tempo real (sem arquivos de áudio);
o recorde fica salvo no navegador por ranger; na tela inicial há opções de
MÚSICA / EFEITOS / MENOS FLASHES. O jogo pausa sozinho se você trocar de aba.

---

## 7. Estrutura do projeto

```
src/
  App.tsx            telas (título, seleção, jogo, fim) + controles de toque
  game/engine.ts     motor do jogo (física, combate, fases, armadilhas, HUD, pausa)
  game/sprites.ts    mapeamento das animações em cada folha de sprites
  game/audio.ts      efeitos sonoros sintetizados (WebAudio)
  game/music.ts      música de fundo sintetizada (sequenciador chiptune)
  game/gamepad.ts    suporte a controles via Gamepad API
  game/settings.ts   opções persistidas (música, efeitos, flashes)
  game/records.ts    recordes salvos no navegador (por ranger)
  game/frames.json   coordenadas dos frames (gerado)
  assets/sheets.json folhas processadas embutidas em base64 (gerado)
tools/
  setup_sprites.cjs  faz todo o pipeline de sprites de uma vez
  pack_sheets.cjs    embute as folhas PNG em sheets.json
  slice2.cjs         recorta frames por componentes conectados
  build_stages.cjs   reconstrói os cenários em faixas contínuas
  make_placeholders.cjs / make_min_frames.cjs   arte provisória
```

Qualidade de código:

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm run format      # prettier
```

---

## Problemas comuns

- **`npm: comando não encontrado`** → instale o Node.js (item 1) e reabra o terminal.
- **Tela "CARREGANDO SPRITES…" não sai** → rode o item 4 novamente; algum arquivo de
  `src/assets/sheets.json` está faltando ou corrompido.
- **Erro `Could not resolve "..."` no build** → mesma causa: regenere os sprites.
- **Sem som** → clique em INICIAR primeiro; o navegador só libera áudio após um clique.
  Se continuar sem som, veja as opções MÚSICA/EFEITOS na tela inicial.

---

*Sprites: rips de Belial the Hedgehog, Cyrus Annihilator, Sid Starkiller e
Franketepoke2 (The Spriters Resource). Este é um projeto de fã, sem fins comerciais.*
