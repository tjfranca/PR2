# ⚡ Power Rangers — Batalha de Angel Grove
## Análise técnica + sugestões de melhoria

**Status:** ZIP extraído em `game-extracted/`, TypeScript compila sem erros (`tsc --noEmit` ✅),
build de produção funciona ✅ (gera `dist/index.html` único de ~3,6 MB / 2,2 MB gzip),
jogo rodando no preview ao vivo.

## ✅ Implementado (atualização 1)

| Item | Como ficou |
|---|---|
| **Pausa (P/Esc/Start/⏸)** | Congela o jogo com overlay "PAUSA"; pausa automática ao perder foco/trocar de aba; teclas "presas" são limpas no `blur` |
| **Música de fundo** | Sintetizada em tempo real (WebAudio, sequenciador chiptune) — tema de título + tema de batalha, sem arquivos externos; botão 🎵 MÚSICA |
| **Mudo de efeitos** | Botão 🔊 EFEITOS (`audio.ts` respeita a configuração) |
| **Menos flashes** | Botão ✨ MENOS FLASHES: reduz shake de tela e desliga piscar dos avisos |
| **Recordes** | Salvos por ranger em `localStorage` (`records.ts`); mostrados na seleção e na tela de fim com "🏆 NOVO RECORDE!" |
| **Gamepad** | Gamepad API (`gamepad.ts`): analógico/D-pad + A/X/Y/B/LB/Start |
| **Configurações persistentes** | `settings.ts` (localStorage `pr2.settings`) |
| **Higiene de código** | ESLint (flat config) + Prettier + `npm run typecheck/lint/format`; CI no GitHub Actions; `engine.ts` usa `this.time` no blink do medidor; números de dano também aparecem nos inimigos |
| **Página** | `lang="pt-BR"`, favicon ⚡, meta description/OG, `theme-color` |
| **Pacote** | `package.json` renomeado para `power-rangers-angel-grove`, LICENSE MIT + nota sobre os sprites |
| **Asset morto** | `src/assets/sprites/gred.png` (~1 MB, sem referências) removido |
| **README** | Reescrito: controles novos (pausa, gamepad), extras, estrutura atual, scripts de qualidade |

**Veredito rápido:** o jogo está num estado muito bom — engine de beat 'em up completa
(física com profundidade Z, combo 1-2-3, morfagem cinematográfica, 6 fases, 3 tipos de
inimigo, armadilhas, cenários, HUD e toque mobile). O que falta é mais **polimento de
produto** (pausa, boss final, música, recordes) e **higiene de código** (arquivo gigante,
zero testes/lint, uns detalhes de acessibilidade).

---

## ✅ Implementado (atualização 2 — os itens grandes)

| Item | Como ficou |
|---|---|
| **Chefe final: Ivan Ooze** | Fase extra "7 · COVIL DE IVAN OOZE" após as 6 fases: boss gigante (3×) com barra de vida no topo, soco em área, rajada tripla de gosma (projéteis), capangas renascendo e golpe de queda com tremor de tela; ao morrer, dissolve em gosma com explosão. Covil tem atmosfera roxa própria e sem perigos da fase |
| **Dificuldade + continues** | Chip ⚔ no título: FÁCIL/NORMAL/DIFÍCIL persistida em `pr2.settings`. Mods em `logic.ts`: HP, dano, quantidade, velocidade dos inimigos, HP do jogador e **continues** (3/2/1). Game over agora tem botão **▶ CONTINUAR**: renasce no início da fase atual com pontos mantidos |
| **Tutorial contextual** | Dicas na fase 1 (opção 💡 DICAS): andar, socar (no 1º inimigo), morfar (medidor cheio), caixotes, barris e espinhos — cada uma aparece 1× no contexto certo, sem poluir |
| **Co-op de 2 jogadores** | Chips 🎮/🎮🎮 no título; seleção P1→P2 no mesmo teclado (P1: setas + Z/X/C/M/Espaço · P2: WASD + F/G/H/Y/T) e 2 gamepads (controle 1=P1, 2=P2). HUD com energia de ambos, câmera segue o ponto médio, game over só quando os dois caem |
| **Split do `engine.ts`** | De ~2.500 linhas para módulos: `consts`, `stages`, `fighter`, `world`, `logic` (funções puras), `combat`, `objects`, `hazards`, `render`; classe `Game` com delegadores finos |
| **Testes unitários (Vitest)** | 23 testes: funções puras (`comboNext`, `retractState`, `pushOutCalc`, dificuldade/ondas, `midiToFreq`), persistência, sanity das fases e **smoke test do engine** com stubs de DOM (boot solo/co-op/boss/continue). CI: `tsc` + `eslint` + `vitest` + build |
| **Easter egg de aniversário 🎂** | Na tela de título, digitar **33** faz os Rangers "cantarem" Parabéns (melodia sintetizada via WebAudio, com vibrato e final com aplausos) + chuva de confete e legenda "FELIZ ANIVERSÁRIO DE 33 ANOS!" |



## 1. Jogabilidade — o que faz mais falta

| # | Melhoria | Por quê / como |
|---|---|---|
| 1 | **Pausa (P/Esc)** | Não existe. Numa partida de ~15–20 min isso é essencial. Congelar `update()` e desenhar menu com retomar/reiniciar/sair. |
| 2 | **Chefe final: Ivan Ooze** | A história o cita, o título deixa implícito… e ele **não aparece**. As 6 fases terminam em ondas comuns. Adicionar 1 chefe (ou mini-chefes nas fases 3 e 6) mudaria o jogo. |
| 3 | **Música de fundo** | Só existem SFX sintetizados (WebAudio). Um beat 'em up sem BGM perde metade da energia. Dá para sintetizar loops simples (mesma técnica do `audio.ts`) ou usar faixas sem direitos. Incluir **botão de mudo** (M) e volume. |
| 4 | **Suporte a gamepad** | Beat 'em up pede controle. A Gamepad API cabe em ~100 linhas (polling no loop + mapeamento de botões). |
| 5 | **Recorde salvo (localStorage)** | Pontuação some ao fechar a aba. Guardar recorde por ranger + tela de game over mostrando "NOVO RECORDE!". |
| 6 | **Vidas / continues / dificuldade** | Hoje é HP único: morreu, acabou. Opção de dificuldade (dano/hp/ondas) ou 2–3 continues daria ritmo mais amigável. |
| 7 | **Co-op de 2 jogadores** | É o "sonho grande", mas a engine já tem a base (lista `enemies` + `player`; basta promover para `players[]`). Entrada: teclado compartilhado ou 2 gamepads. |
| 8 | **Mais movimentos** | Agarrar/arremessar (clássico do gênero — e combina com "jogue inimigos nos espinhos"), dash, esquiva, ataque especial por medidor (Power Blaster). |

**Pequenos ajustes de combate:**
- Números de dano só aparecem quando **o jogador** apanha; inimigos não mostram `-dmg` (faria o dano parecer mais "pesado").
- Arma especial (C/L) fica com cooldown de 5 s; feedback visual de quando recarrega já existe, mas um "punch" do cooldown no HUD (icone piscando) ajudaria.
- Chute no ar = voadora funciona, mas o dano aéreo não escala com altura — dá para recompensar voadoras altas.

---

## 2. Código — higiene e estrutura

| # | Item | Observação |
|---|---|---|
| 1 | **`engine.ts` com ~2.200 linhas** | Um único arquivo com física, spawn, objetos, HUD e render. Sugestão de split: `engine/entities.ts` (Fighter), `engine/combat.ts`, `engine/objects.ts`, `engine/hazards.ts`, `engine/render.ts`, `engine/hud.ts`. |
| 2 | **Zero testes** | Combo, dano, pushOut, morfagem e HUD são testáveis sem DOM. Adicionar **Vitest** + testes unitários das funções puras (ex.: `damage`, `resolveHit`, ciclo de `retract` spikes). |
| 3 | **Zero lint/format** | Não há ESLint/Prettier. Com um projeto desse tamanho, `eslint` + `prettier` + script `typecheck` no CI (GitHub Actions) evitam regressão. |
| 4 | **`loadImages()` sem tratamento de erro** | Se qualquer imagem falha, o usuário fica eternamente em "CARREGANDO SPRITES…" (só `console.error`). Adicionar estado de erro com botão "TENTAR DE NOVO". |
| 5 | **Teclas "presas" ao perder foco** | Sem listener de `blur`, se o jogador segura ← e dá Alt+Tab, o personagem anda sozinho para sempre. Limpar `keys` no `window.blur`. |
| 6 | **`package.json` genérico** | `"name": "react-vite-tailwind"` (template). Renomear para `power-rangers-angel-grove`, adicionar `license`, `description`. |
| 7 | **`<html lang="en">`** | Conteúdo 100% pt-BR. Trocar para `lang="pt-BR"`. |
| 8 | **Sem favicon / meta tags** | Falta favicon (um ⚡ ou o logo), `meta description`, Open Graph. `document.title` está ok. |
| 9 | **`ctx.filter = "brightness(...)"` no hit flash** | Filtro por frame é caro em alguns navegadores. Alternativa: desenhar um overlay retangular colorido com `globalCompositeOperation` ou uma versão pré-clareada do sprite. |
| 10 | **`performance.now()` dentro de `drawHud`** | O piscar do "MORFAR!" usa relógio de parede e não o relógio do jogo — durante hitstop/pausa o blink dessincroniza. Usar `this.time`. |
| 11 | **Animação dos menus via `setInterval` por sprite** | São ~18 `setInterval` + `setState` na tela de seleção. Um único `requestAnimationFrame` (ou CSS `steps()`) resolve e reduz re-renders do React. |
| 12 | **StrictMode + `new Game()` no efeito** | Ok porque `destroy()` limpa, mas vale adicionar `AbortController`/guarda contra double-mount para o `loadImages` não rodar duas vezes em dev. |

---

## 3. Assets e pipeline de sprites

| # | Item | Observação |
|---|---|---|
| 1 | **`src/assets/sprites/gred.png` é arquivo morto (~1 MB)** | Nenhum código o importa — os sprites vêm embutidos em base64 no `sheets.json`. Remover ou usar como fallback offline. |
| 2 | **README desatualizado** | Ele diz que os sprites ficam em `src/assets/sprites/` e que o erro "CARREGANDO SPRITES…" indica arquivo faltando ali — hoje a fonte real é `sheets.json`. O `gred.png` solto causa exatamente essa confusão. |
| 3 | **Skelerena está em fallback** | `frames.json` marca `"skelerena": {"fallback": true}` — o jogo usa uma folha recoloria de Putty como substituta. Ou integrar o rip real do SNES (o `tools/setup_sprites.cjs` baixa), ou assumir visualmente ("Z-Putty") e tirar a expectativa de Skelerena real. |
| 4 | **Tudo embutido em um único HTML de 3,6 MB** | Ótimo para distribuir 1 arquivo offline, mas o **custo inicial é alto**: todas as folhas (20) são decodificadas na carga. Sugestões: (a) carregar `sheets.json` em `import()` dinâmico e decodificar sob demanda por fase; (b) se abrir mão do single-file, servir PNG/WebP com cache normal. |
| 5 | **Base64 infla ~33%** | As folhas em PNG dentro do JSON poderiam ser armazenadas como `data:` em WebP/PNG otimizado (`pngquant`/`oxipng`) — o `pack_sheets.cjs` já existe, é só otimizar antes de empacotar. |
| 6 | **Pipeline depende de download do Spriters Resource** | O site pode bloquear (o README já prevê download manual + `--skip-download`, e há `fetch_wayback.cjs` — bom). Faltaria registrar **checksums** dos arquivos para detectar rip alterado e um teste de integridade no CI. |
| 7 | **Sem LICENSE/aviso legal** | Projeto de fã com rips de terceiros. Um `LICENSE` (ex.: MIT para o código) + nota explícita de "sprites © seus autores, projeto sem fins comerciais" reduz risco se for publicar em loja/hospedagem. |

---

## 4. UX e acessibilidade

1. **Controles dentro do jogo**: as instruções ficam abaixo do canvas e somem no mobile; um menu de pausa com a tabela de controles resolve.
2. **Reduzir efeitos fotossensíveis**: shake + flash branco da morfagem são fortes. Opção "reduzir efeitos" (ou respeitar `prefers-reduced-motion`) é barato e importante.
3. **Acessibilidade de contraste**: HUD usa fontes pequenas (11–13 px) em canvas; subir um pouco e adicionar contorno ajuda muito em TV/projetor.
4. **Mobile**: botões de toque funcionam, mas (a) não há `vibrate()` no feedback de dano, (b) o layout assume paisagem sem aviso, (c) o d-pad poderia aceitar gesto deslizante contínuo.
5. **Tutorial**: a fase 1 podia ter dicas contextuais ("M para morfar" quando o medidor enche pela 1ª vez) em vez de depender do texto abaixo.
6. **Feedback de dano no jogador**: existe flicker por invulnerabilidade — ok. Mas uma vinheta vermelha rápida quando HP < 25% ajudaria a percepção de perigo.

---

## 5. Conteúdo / visão de produto (se quiser crescer)

- **Bosses**: Ivan Ooze + mini-chefes (Tengu Warriors do filme combinariam com os sprites).
- **Cutscenes entre fases**: hoje é só banner de texto; dá para usar os sprites civis em diálogos simples.
- **Modo sobrevivência/infinito** (fácil de derivar da engine existente) e **conquistas**.
- **Seleção de paleta** (trajes "movie" vs série clássica) — só depende de outra folha de sprites.
- **Tradução EN** além do pt-BR (o HTML já "quer" ser inglês).

---

## 6. Plano sugerido (por onde começar)

**Onda 1 — higiene e correções rápidas (meio dia de trabalho):**
`lang="pt-BR"` · favicon · erro + retry no `loadImages` · `blur` limpando teclas · remover `gred.png` morto · renomear `package.json` · piscar com `this.time` · ESLint/Prettier + `npm run typecheck` no CI.

**Onda 2 — produto (1–2 dias):**
Pausa · recorde em localStorage · música + mute · gamepad · números de dano nos inimigos · split do `engine.ts`.

**Onda 3 — conteúdo (3–5 dias):**
Chefe final (Ivan Ooze) · dificuldade/continues · tutorial contextual · reduzir efeitos (acessibilidade).

**Onda 4 — sonho:**
Co-op 2 jogadores · bosses intermediários · modo infinito.
