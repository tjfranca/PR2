# 🥊 Eleição Fighter 2026

Um fã-game de luta inspirado nos clássicos de **16-bit** (estilo Street
Fighter II do SNES), feito inteiramente em **HTML5 Canvas + JavaScript puro**
(sem frameworks, sem build, sem instalação) — com os **12 pré-candidatos** à
Presidência da República do Brasil homologados pelo TSE para as **eleições de
2026** como lutadores.

> ⚠️ **Aviso importante:** este é um projeto de **paródia e humor**, feito por
> fã, **sem qualquer vínculo oficial** com os candidatos, partidos, coligações
> ou com o Tribunal Superior Eleitoral (TSE). Não tem fins eleitorais,
> comerciais ou de desinformação. Nenhuma foto real de nenhuma pessoa é
> usada — todos os lutadores são **ilustrações de caricatura 100% geradas
> digitalmente**, no estilo clássico de charge/cartum editorial de jornal
> (como uma charge política exagerada e bem-humorada, não uma foto). Veja a
> tela de **Créditos** no jogo para o texto completo. Se você é uma das
> pessoas retratadas (ou representante legal) e tem alguma objeção, abra uma
> *issue* neste repositório.

## 🎮 Jogue agora

O jogo é 100% estático — basta abrir `index.html` num navegador moderno
(Chrome, Firefox, Edge) ou subir uma página estática qualquer. Não depende de
internet para funcionar (todo o áudio é sintetizado na hora via Web Audio
API e as imagens de cenário ficam dentro do próprio repositório).

### Rodando localmente

```bash
git clone https://github.com/<seu-usuario>/eleicao-fighter-2026.git
cd eleicao-fighter-2026
python3 -m http.server 8080
# ou: npx serve .
```

Depois abra `http://localhost:8080` no navegador. É necessário servir os
arquivos por HTTP (não abrir o `index.html` direto com `file://`) porque o
jogo usa módulos ES (`import`/`export`).

### Publicando no GitHub Pages

1. Em **Settings → Pages**, escolha a branch `main` e a pasta raiz (`/`).
2. Pronto — o jogo fica disponível em
   `https://<seu-usuario>.github.io/eleicao-fighter-2026/`.

## 🕹️ Controles

| Ação | Jogador 1 | Jogador 2 |
|---|---|---|
| Mover / Agachar / Pular | `W A S D` | `Setas` |
| Soco | `F` | `K` |
| Chute | `G` | `L` |
| Especial 1 (projétil) | `R` | `O` |
| Especial 2 (avanço corpo a corpo) | `T` | `P` |
| Super (com medidor cheio) | `Y` | `;` |
| Bloquear | segure a direção **para trás** (longe do rival) | idem |
| Pausar | `Enter` ou `Esc` durante a luta | idem |

Vence a partida quem fizer **2 de 3 rounds** de 99 segundos cada. O medidor
azul enche ao acertar e ao apanhar — quando chega a 100%, dá para usar o
**golpe Super** de cada candidato.

## 🏛️ O elenco (12 candidaturas — eleições 2026)

| # | Candidato(a) | Partido | Nº | Vice |
|---|---|---|---|---|
| 1 | Luiz Inácio Lula da Silva | PT | 13 | Geraldo Alckmin |
| 2 | Flávio Bolsonaro | PL | 22 | Alfredo Gaspar |
| 3 | Ronaldo Caiado | PSD | 55 | Gilberto Kassab |
| 4 | Romeu Zema | Novo | 30 | Eduardo Girão |
| 5 | Renan Santos | Missão | 14 | Coronel Medina |
| 6 | Augusto Cury | Avante | 70 | Júlio Delgado |
| 7 | Samara Martins | UP | 80 | Raquel Brício |
| 8 | Rui Costa Pimenta | PCO | 29 | Antônio Carlos |
| 9 | Edmilson Costa | PCB | 21 | Cleusa Santos |
| 10 | Hertz Dias | PSTU | 16 | Vanessa Portugal |
| 11 | Clariana Barão | DC | 27 | Fabiana Torquato |
| 12 | Wilson Grassi | Democrata | 35 | Suêd Haidar |

Nomes, partidos, números e vices são baseados em informações públicas sobre
as candidaturas. Tudo o mais (golpes especiais, estatísticas, falas e
aparência) é **ficção cômica original** sem nenhuma pretensão de realismo.

## ✨ Funcionalidades

- Seleção de personagem com **12 lutadores**, grade 4×3, navegação
  independente para 1 ou 2 jogadores.
- Retratos em **caricatura estilo charge de jornal**, 100% ilustrações
  originais geradas digitalmente (sem fotos reais), animados na luta com
  inclinação, solavanco e "flash" de acerto/bloqueio.
- **5 cenários** em pixel art 16-bit, gerados digitalmente (Congresso
  Nacional, Palácio do Planalto, depósito de urnas do TSE, comício de
  campanha e estúdio de debate).
- Tela de **VS**, banners de **ROUND/LUTAR!/K.O./TEMPO ESGOTADO**, barra de
  vida, medidor de especial, placar de rounds.
- Modo **1 jogador** (com IA em 3 dificuldades) e **2 jogadores** locais.
- Cada candidato tem **2 golpes especiais** + **1 super** temáticos e
  inofensivos (ex.: "Caneta da Reforma", "Vacina Giratória", "Riff Liberal").
- Menu de **pausa**, tela de **Como Jogar**, **Créditos/Aviso legal** e
  **Opções** de volume.
- Áudio 100% **sintetizado** (chiptune) via Web Audio API — nenhum arquivo de
  som externo.
- Fonte retrô *Press Start 2P* (licença OFL, incluída localmente).

## 🧪 Testes

Há testes de "fumaça" em Node (sem navegador) que simulam toda a jornada do
jogo (menus, seleção, luta completa, bloqueio, super, pausa, revanche) para
garantir que nada quebra:

```bash
npm test
# ou individualmente:
node tests/smoke.mjs
node tests/smoke-2p.mjs
```

## 🗂️ Estrutura do projeto

```
index.html / style.css      shell da página e fonte pixelada
js/characters.js            dados do elenco (nome, partido, nº, vice, golpes)
js/stages.js                lista de cenários
js/renderer.js              "boneco pixelado" desenhado 100% por código
js/fighter.js               física e máquina de estados de cada lutador
js/ai.js                    IA simples por distância, com 3 dificuldades
js/game.js                  motor da partida (rounds, HUD, projéteis, dano)
js/app.js                   telas (título, menus, seleção, VS, pausa, etc.)
js/audio.js                 efeitos sonoros e música sintetizados
js/input.js                 teclado para 2 jogadores + navegação em menu
assets/stages/              cenários (pixel art original, JPEG)
assets/fonts/                fonte Press Start 2P (OFL)
tests/                       testes de fumaça em Node
```

## 📜 Licença

- **Código**: MIT (veja `LICENSE`).
- **Fonte "Press Start 2P"**: SIL Open Font License (veja
  `assets/fonts/LICENSE-press-start-2p.txt`).
- **Cenários**: ilustrações originais geradas digitalmente para este
  projeto.
- Este é um projeto de fã feito para fins de **entretenimento e humor
  cívico**, sem fins lucrativos.
