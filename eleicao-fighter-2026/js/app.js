import { ROSTER } from './characters.js';
import { STAGES, STAGE_LIST } from './stages.js';
import { drawFighterSprite, computePose } from './renderer.js';
import { Input, KEYMAP } from './input.js';
import { Audio2026 } from './audio.js';
import { Match, GAME_W, GAME_H } from './game.js';

const FONT = '"Press Start 2P", monospace';

function fmtKey(code) {
  const names = {
    ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓', Semicolon: ';'
  };
  if (names[code]) return names[code];
  return code.replace('Key', '').replace('Digit', '');
}

export class App {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.images = {};
    this.scene = 'boot';
    this.t = 0;
    this.match = null;
    this.setup = { mode: '1p', difficulty: 'normal', p1Id: ROSTER[0].id, p2Id: ROSTER[1].id, stage: null, p1Cursor: 0, p2Cursor: 1, p1Confirmed: false, p2Confirmed: false };
    this.menu = { index: 0 };
    this.paused = false;
    this._resizeBound = () => this.resize();
    window.addEventListener('resize', this._resizeBound);
    this.resize();
    this.boot();
  }

  async boot() {
    const entries = Object.entries(STAGES);
    await Promise.all(entries.map(([key, s]) => new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => resolve();
      img.src = s.file;
      this.images[key] = img;
    })));
    if (document.fonts && document.fonts.load) {
      try { await document.fonts.load('16px "Press Start 2P"'); } catch (e) { /* ignore */ }
    }
    this.scene = 'title';
    Audio2026.startMusic('title');
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.viewW = w; this.viewH = h;
  }

  handleKey(code) {
    Audio2026.resume();
    switch (this.scene) {
      case 'title': return this.keyTitle(code);
      case 'mode': return this.keyMode(code);
      case 'difficulty': return this.keyDifficulty(code);
      case 'select': return this.keySelect(code);
      case 'stageselect': return this.keyStageSelect(code);
      case 'vs': return this.keyVs(code);
      case 'fight': return this.keyFight(code);
      case 'results': return this.keyResults(code);
      case 'howto': case 'credits': case 'options':
        if (code === 'Escape' || code === 'Enter') { this.scene = this._backTo || 'title'; Audio2026.back(); }
        if (this.scene === 'options') this.keyOptions(code);
        return;
      default: return;
    }
  }

  // ---------------- TITLE ----------------
  keyTitle(code) {
    if (code === 'Enter' || code === 'Space') {
      this.scene = 'mode'; this.menu.index = 0; Audio2026.confirm();
    }
  }

  // ---------------- MODE ----------------
  get modeOptions() { return ['1 JOGADOR (VS CPU)', '2 JOGADORES (VS HUMANO)', 'COMO JOGAR', 'CRÉDITOS', 'OPÇÕES']; }
  keyMode(code) {
    const n = this.modeOptions.length;
    if (code === 'ArrowUp' || code === 'KeyW') { this.menu.index = (this.menu.index - 1 + n) % n; Audio2026.select(); }
    if (code === 'ArrowDown' || code === 'KeyS') { this.menu.index = (this.menu.index + 1) % n; Audio2026.select(); }
    if (code === 'Escape') { this.scene = 'title'; Audio2026.back(); }
    if (code === 'Enter') {
      Audio2026.confirm();
      const i = this.menu.index;
      if (i === 0) { this.setup.mode = '1p'; this.scene = 'difficulty'; this.menu.index = 1; }
      else if (i === 1) { this.setup.mode = '2p'; this.startSelect(); }
      else if (i === 2) { this._backTo = 'mode'; this.scene = 'howto'; }
      else if (i === 3) { this._backTo = 'mode'; this.scene = 'credits'; }
      else if (i === 4) { this._backTo = 'mode'; this.scene = 'options'; this.menu.index = 0; }
    }
  }

  // ---------------- DIFFICULTY ----------------
  get diffOptions() { return ['FÁCIL', 'NORMAL', 'DIFÍCIL']; }
  keyDifficulty(code) {
    const n = this.diffOptions.length;
    if (code === 'ArrowUp' || code === 'KeyW') { this.menu.index = (this.menu.index - 1 + n) % n; Audio2026.select(); }
    if (code === 'ArrowDown' || code === 'KeyS') { this.menu.index = (this.menu.index + 1) % n; Audio2026.select(); }
    if (code === 'Escape') { this.scene = 'mode'; this.menu.index = 0; Audio2026.back(); }
    if (code === 'Enter') {
      this.setup.difficulty = ['facil', 'normal', 'dificil'][this.menu.index];
      Audio2026.confirm();
      this.startSelect();
    }
  }

  // ---------------- CHARACTER SELECT ----------------
  startSelect() {
    this.scene = 'select';
    this.setup.p1Cursor = 0; this.setup.p2Cursor = 1;
    this.setup.p1Confirmed = false; this.setup.p2Confirmed = false;
    Audio2026.startMusic('select');
  }

  keySelect(code) {
    const cols = 4, rows = 3, n = ROSTER.length;
    const move = (cursor, dx, dy) => {
      let c = cursor % cols, r = Math.floor(cursor / cols);
      c = (c + dx + cols) % cols; r = (r + dy + rows) % rows;
      return r * cols + c;
    };
    const m1 = KEYMAP.p1, m2 = KEYMAP.p2;

    if (!this.setup.p1Confirmed) {
      if (code === m1.left) { this.setup.p1Cursor = move(this.setup.p1Cursor, -1, 0); Audio2026.select(); }
      if (code === m1.right) { this.setup.p1Cursor = move(this.setup.p1Cursor, 1, 0); Audio2026.select(); }
      if (code === m1.up) { this.setup.p1Cursor = move(this.setup.p1Cursor, 0, -1); Audio2026.select(); }
      if (code === m1.down) { this.setup.p1Cursor = move(this.setup.p1Cursor, 0, 1); Audio2026.select(); }
      if (code === m1.punch || code === 'Enter') { this.setup.p1Confirmed = true; Audio2026.confirm(); }
    } else if (code === m1.kick) { this.setup.p1Confirmed = false; Audio2026.back(); }

    if (this.setup.mode === '2p') {
      if (!this.setup.p2Confirmed) {
        if (code === m2.left) { this.setup.p2Cursor = move(this.setup.p2Cursor, -1, 0); Audio2026.select(); }
        if (code === m2.right) { this.setup.p2Cursor = move(this.setup.p2Cursor, 1, 0); Audio2026.select(); }
        if (code === m2.up) { this.setup.p2Cursor = move(this.setup.p2Cursor, 0, -1); Audio2026.select(); }
        if (code === m2.down) { this.setup.p2Cursor = move(this.setup.p2Cursor, 0, 1); Audio2026.select(); }
        if (code === m2.punch) { this.setup.p2Confirmed = true; Audio2026.confirm(); }
      } else if (code === m2.kick) { this.setup.p2Confirmed = false; Audio2026.back(); }
    }

    if (code === 'Escape') { this.scene = this.setup.mode === '1p' ? 'difficulty' : 'mode'; Audio2026.back(); }

    const ready = this.setup.mode === '1p'
      ? this.setup.p1Confirmed
      : this.setup.p1Confirmed && this.setup.p2Confirmed;

    if (ready && (code === 'Enter')) {
      this.confirmSelect();
    }
    // auto-advance quando os dois confirmarem num mesmo frame-ish
    if (ready && !this._advancing) {
      this._advancing = true;
      setTimeout(() => { this.confirmSelect(); }, 350);
    }
  }

  confirmSelect() {
    if (this.scene !== 'select') return;
    this.setup.p1Id = ROSTER[this.setup.p1Cursor % ROSTER.length].id;
    if (this.setup.mode === '1p') {
      let r;
      do { r = Math.floor(Math.random() * ROSTER.length); } while (ROSTER[r].id === this.setup.p1Id && ROSTER.length > 1);
      this.setup.p2Cursor = r;
    }
    this.setup.p2Id = ROSTER[this.setup.p2Cursor % ROSTER.length].id;
    this._advancing = false;
    this.scene = 'stageselect';
    this.menu.index = 0;
  }

  // ---------------- STAGE SELECT ----------------
  keyStageSelect(code) {
    const n = STAGE_LIST.length;
    if (code === 'ArrowLeft' || code === KEYMAP.p1.left) { this.menu.index = (this.menu.index - 1 + n) % n; Audio2026.select(); }
    if (code === 'ArrowRight' || code === KEYMAP.p1.right) { this.menu.index = (this.menu.index + 1) % n; Audio2026.select(); }
    if (code === 'Escape') { this.scene = 'select'; Audio2026.back(); }
    if (code === 'Enter') {
      this.setup.stage = STAGE_LIST[this.menu.index];
      Audio2026.confirm();
      this.scene = 'vs';
      this.t = 0;
    }
  }

  // ---------------- VS ----------------
  keyVs(code) {
    if (code === 'Enter') this.startFight();
  }

  startFight() {
    const p1Def = ROSTER.find((c) => c.id === this.setup.p1Id);
    const p2Def = ROSTER.find((c) => c.id === this.setup.p2Id);
    this.match = new Match({
      p1Def, p2Def,
      p1CPU: false,
      p2CPU: this.setup.mode === '1p',
      difficulty: this.setup.difficulty,
      stageKey: this.setup.stage,
      images: this.images
    });
    this.match.onMatchEnd = () => { this.scene = 'results'; };
    this.scene = 'fight';
    this.paused = false;
  }

  // ---------------- FIGHT ----------------
  keyFight(code) {
    if (code === 'Escape' || code === 'Enter') {
      this.paused = !this.paused;
      this.menu.index = 0;
      if (this.paused) Audio2026.back(); else Audio2026.confirm();
      return;
    }
    if (this.paused) {
      const opts = 3;
      if (code === 'ArrowUp') { this.menu.index = (this.menu.index - 1 + opts) % opts; Audio2026.select(); }
      if (code === 'ArrowDown') { this.menu.index = (this.menu.index + 1) % opts; Audio2026.select(); }
      if (code === 'KeyJ' || code === 'Space') {
        Audio2026.confirm();
        if (this.menu.index === 0) { this.paused = false; }
        else if (this.menu.index === 1) { this.startFight(); }
        else { this.match.destroy(); this.scene = 'mode'; this.menu.index = 0; Audio2026.startMusic('title'); }
      }
    }
  }

  // ---------------- RESULTS ----------------
  keyResults(code) {
    if (code === 'Enter') { this.startFight(); }
    if (code === 'Escape') { this.match.destroy(); this.scene = 'mode'; this.menu.index = 0; Audio2026.startMusic('title'); }
  }

  // ---------------- OPTIONS ----------------
  keyOptions(code) {
    const n = 2;
    if (code === 'ArrowUp') { this.menu.index = (this.menu.index - 1 + n) % n; }
    if (code === 'ArrowDown') { this.menu.index = (this.menu.index + 1) % n; }
    if (code === 'ArrowLeft') {
      if (this.menu.index === 0) Audio2026.setVolume(Math.max(0, Audio2026.volume - 0.1));
      else Audio2026.setMusicVolume(Math.max(0, Audio2026.musicVolume - 0.1));
    }
    if (code === 'ArrowRight') {
      if (this.menu.index === 0) Audio2026.setVolume(Math.min(1, Audio2026.volume + 0.1));
      else Audio2026.setMusicVolume(Math.min(1, Audio2026.musicVolume + 0.1));
    }
  }

  // ================= UPDATE / RENDER =================
  update(dt) {
    this.t += dt;
    if (this.scene === 'fight' && this.match && !this.paused) {
      const inputs = { p1: Input.playerState('p1'), p2: Input.playerState('p2') };
      this.match.update(dt, inputs);
    }
  }

  render() {
    const ctx = this.ctx;
    const w = this.viewW, h = this.viewH;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#05060a';
    ctx.fillRect(0, 0, w, h);

    switch (this.scene) {
      case 'boot': this.renderBoot(ctx, w, h); break;
      case 'title': this.renderTitle(ctx, w, h); break;
      case 'mode': this.renderMode(ctx, w, h); break;
      case 'difficulty': this.renderDifficulty(ctx, w, h); break;
      case 'select': this.renderSelect(ctx, w, h); break;
      case 'stageselect': this.renderStageSelect(ctx, w, h); break;
      case 'vs': this.renderVs(ctx, w, h); break;
      case 'fight': this.match && this.match.render(ctx, w, h); if (this.paused) this.renderPause(ctx, w, h); break;
      case 'results': this.renderResults(ctx, w, h); break;
      case 'howto': this.renderHowTo(ctx, w, h); break;
      case 'credits': this.renderCredits(ctx, w, h); break;
      case 'options': this.renderOptions(ctx, w, h); break;
      default: break;
    }
  }

  // ---- helpers de desenho ----
  centerText(ctx, text, x, y, size, color = '#fff', stroke = '#000') {
    ctx.font = `${size}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = Math.max(2, size * 0.22); ctx.strokeText(text, x, y); }
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
  }

  drawBackdrop(ctx, w, h, key) {
    const img = this.images[key];
    if (img && img.complete) {
      const scale = Math.max(w / img.width, h / img.height);
      const iw = img.width * scale, ih = img.height * scale;
      ctx.drawImage(img, (w - iw) / 2, (h - ih) / 2, iw, ih);
      ctx.fillStyle = 'rgba(5,6,10,0.55)';
      ctx.fillRect(0, 0, w, h);
    }
  }

  renderBoot(ctx, w, h) {
    this.centerText(ctx, 'CARREGANDO...', w / 2, h / 2, 16);
  }

  renderTitle(ctx, w, h) {
    const keys = STAGE_LIST;
    const idx = Math.floor(this.t / 3) % keys.length;
    this.drawBackdrop(ctx, w, h, keys[idx]);

    this.centerText(ctx, 'ELEIÇÃO FIGHTER', w / 2, h * 0.28, Math.min(46, w * 0.06), '#ffce00');
    this.centerText(ctx, '2 0 2 6', w / 2, h * 0.28 + 56, Math.min(30, w * 0.04), '#ffffff');
    this.centerText(ctx, 'EDIÇÃO SUPER URNA — 12 PRÉ-CANDIDATOS À PRESIDÊNCIA', w / 2, h * 0.28 + 96, Math.min(13, w * 0.016), '#8fd3ff');

    if (Math.floor(this.t * 2) % 2 === 0) {
      this.centerText(ctx, 'APERTE ENTER', w / 2, h * 0.72, 18, '#fff');
    }
    this.centerText(ctx, 'JOGO DE PARÓDIA / FÃ-GAME — SEM FINS ELEITORAIS', w / 2, h - 28, 9, '#999', null);
  }

  renderMode(ctx, w, h) {
    this.drawBackdrop(ctx, w, h, 'congresso');
    this.centerText(ctx, 'MENU PRINCIPAL', w / 2, h * 0.18, 24, '#ffce00');
    const opts = this.modeOptions;
    opts.forEach((o, i) => {
      const y = h * 0.38 + i * 46;
      const sel = i === this.menu.index;
      this.centerText(ctx, (sel ? '► ' : '  ') + o, w / 2, y, 16, sel ? '#ffce00' : '#fff');
    });
    this.centerText(ctx, 'SETAS: NAVEGAR   ENTER: CONFIRMAR   ESC: VOLTAR', w / 2, h - 28, 10, '#999', null);
  }

  renderDifficulty(ctx, w, h) {
    this.drawBackdrop(ctx, w, h, 'debate');
    this.centerText(ctx, 'ESCOLHA A DIFICULDADE', w / 2, h * 0.22, 20, '#ffce00');
    this.diffOptions.forEach((o, i) => {
      const sel = i === this.menu.index;
      this.centerText(ctx, (sel ? '► ' : '  ') + o, w / 2, h * 0.42 + i * 46, 16, sel ? '#ffce00' : '#fff');
    });
    this.centerText(ctx, 'ENTER: CONFIRMAR   ESC: VOLTAR', w / 2, h - 28, 10, '#999', null);
  }

  drawPortraitCard(ctx, cx, cy, size, fighter, selected, labelTop) {
    ctx.save();
    ctx.fillStyle = selected ? 'rgba(255,206,0,0.22)' : 'rgba(255,255,255,0.06)';
    ctx.fillRect(cx - size / 2, cy - size / 2, size, size);
    ctx.strokeStyle = selected ? '#ffce00' : '#555';
    ctx.lineWidth = selected ? 4 : 2;
    ctx.strokeRect(cx - size / 2, cy - size / 2, size, size);
    const pose = computePose('idle', this.t * 6);
    drawFighterSprite(ctx, { x: cx, y: cy + size * 0.32, facing: 1, scale: size / 92, visual: fighter.visual, pose });
    ctx.restore();
    if (labelTop) {
      this.centerText(ctx, fighter.name.toUpperCase(), cx, cy + size / 2 + 14, Math.max(8, size * 0.09), selected ? '#ffce00' : '#fff', null);
    }
  }

  renderSelect(ctx, w, h) {
    this.drawBackdrop(ctx, w, h, 'tse');
    this.centerText(ctx, 'ESCOLHA SEU CANDIDATO', w / 2, h * 0.08, 18, '#ffce00');

    const cols = 4, rows = 3;
    const gridW = Math.min(w * 0.72, 760), gridH = gridW * (rows / cols);
    const startX = w / 2 - gridW / 2;
    const startY = h * 0.18;
    const cellW = gridW / cols, cellH = gridH / rows;
    const size = Math.min(cellW, cellH) * 0.86;

    ROSTER.forEach((f, i) => {
      const c = i % cols, r = Math.floor(i / cols);
      const cx = startX + c * cellW + cellW / 2;
      const cy = startY + r * cellH + cellH / 2;
      const isP1 = i === this.setup.p1Cursor;
      const isP2 = this.setup.mode === '2p' && i === this.setup.p2Cursor;
      ctx.save();
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.fillRect(cx - size / 2, cy - size / 2, size, size);
      ctx.strokeStyle = isP1 && isP2 ? '#ff6bd6' : isP1 ? '#ffce00' : isP2 ? '#00e5ff' : '#444';
      ctx.lineWidth = (isP1 || isP2) ? 4 : 1.5;
      ctx.strokeRect(cx - size / 2, cy - size / 2, size, size);
      const pose = computePose('idle', this.t * 6 + i);
      drawFighterSprite(ctx, { x: cx, y: cy + size * 0.32, facing: 1, scale: size / 100, visual: f.visual, pose });
      ctx.restore();
      this.centerText(ctx, `#${f.number}`, cx, cy - size / 2 - 8, Math.max(8, size * 0.1), '#ffce00', null);
      this.centerText(ctx, f.name.toUpperCase(), cx, cy + size / 2 + 12, Math.max(7, size * 0.085), '#fff', null);
    });

    // painel de detalhes do personagem sob o mouse do P1
    const p1f = ROSTER[this.setup.p1Cursor];
    const infoY = startY + gridH + 44;
    this.centerText(ctx, `${p1f.name} — ${p1f.party} Nº${p1f.number}`, w / 2, infoY, 13, '#ffce00', null);
    this.centerText(ctx, p1f.tagline, w / 2, infoY + 22, 10, '#fff', null);

    const p1ready = this.setup.p1Confirmed;
    this.centerText(ctx, `JOGADOR 1: ${p1ready ? 'PRONTO!' : 'ESCOLHENDO...'}`, w * 0.26, h - 54, 11, p1ready ? '#8aff8a' : '#fff');
    if (this.setup.mode === '2p') {
      const p2ready = this.setup.p2Confirmed;
      this.centerText(ctx, `JOGADOR 2: ${p2ready ? 'PRONTO!' : 'ESCOLHENDO...'}`, w * 0.74, h - 54, 11, p2ready ? '#8aff8a' : '#fff');
    } else {
      this.centerText(ctx, 'CPU VAI ESCOLHER O ADVERSÁRIO', w * 0.74, h - 54, 11, '#ccc');
    }
    this.centerText(ctx, 'MOVER: SETAS/WASD   CONFIRMAR: SOCO   VOLTAR: CHUTE', w / 2, h - 24, 9, '#999', null);
  }

  renderStageSelect(ctx, w, h) {
    const key = STAGE_LIST[this.menu.index];
    this.drawBackdrop(ctx, w, h, key);
    this.centerText(ctx, 'ESCOLHA O CENÁRIO', w / 2, h * 0.14, 20, '#ffce00');
    this.centerText(ctx, STAGES[key].name.toUpperCase(), w / 2, h * 0.84, 16, '#fff');
    this.centerText(ctx, `◄  ${this.menu.index + 1} / ${STAGE_LIST.length}  ►`, w / 2, h * 0.84 + 30, 11, '#8fd3ff', null);
    this.centerText(ctx, 'SETAS: TROCAR   ENTER: CONFIRMAR   ESC: VOLTAR', w / 2, h - 28, 10, '#999', null);
  }

  renderVs(ctx, w, h) {
    this.drawBackdrop(ctx, w, h, this.setup.stage);
    const p1 = ROSTER.find((c) => c.id === this.setup.p1Id);
    const p2 = ROSTER.find((c) => c.id === this.setup.p2Id);
    this.centerText(ctx, p1.name.toUpperCase(), w * 0.26, h * 0.2, 18, '#ffce00');
    this.centerText(ctx, `${p1.party} Nº${p1.number}`, w * 0.26, h * 0.2 + 26, 11, '#fff', null);
    this.centerText(ctx, p2.name.toUpperCase(), w * 0.74, h * 0.2, 18, '#00e5ff');
    this.centerText(ctx, `${p2.party} Nº${p2.number}`, w * 0.74, h * 0.2 + 26, 11, '#fff', null);

    const pose1 = computePose('idle', this.t * 6);
    const pose2 = computePose('idle', this.t * 6 + 2);
    drawFighterSprite(ctx, { x: w * 0.26, y: h * 0.62, facing: 1, scale: Math.min(w, h) * 0.0035, visual: p1.visual, pose: pose1 });
    drawFighterSprite(ctx, { x: w * 0.74, y: h * 0.62, facing: -1, scale: Math.min(w, h) * 0.0035, visual: p2.visual, pose: pose2 });

    this.centerText(ctx, 'VS', w / 2, h * 0.42, 40, '#ff4040');

    this.centerText(ctx, p1.tagline, w * 0.26, h * 0.78, 9, '#ddd', null);
    this.centerText(ctx, p2.tagline, w * 0.74, h * 0.78, 9, '#ddd', null);

    if (Math.floor(this.t * 2) % 2 === 0) this.centerText(ctx, 'APERTE ENTER PARA LUTAR', w / 2, h - 36, 12, '#fff');
  }

  renderPause(ctx, w, h) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, w, h);
    this.centerText(ctx, 'PAUSADO', w / 2, h * 0.32, 26, '#ffce00');
    const opts = ['CONTINUAR', 'REINICIAR LUTA', 'MENU PRINCIPAL'];
    opts.forEach((o, i) => {
      const sel = i === this.menu.index;
      this.centerText(ctx, (sel ? '► ' : '  ') + o, w / 2, h * 0.5 + i * 42, 15, sel ? '#ffce00' : '#fff');
    });
    this.centerText(ctx, 'SETAS: NAVEGAR   SOCO/ESPAÇO: CONFIRMAR', w / 2, h - 28, 10, '#999', null);
  }

  renderResults(ctx, w, h) {
    const m = this.match;
    this.drawBackdrop(ctx, w, h, m.stageKey);
    const winner = m.matchWinner;
    this.centerText(ctx, `${winner.def.name.toUpperCase()} VENCEU A ELEIÇÃO!`, w / 2, h * 0.3, Math.min(22, w * 0.03), '#ffce00');
    this.centerText(ctx, `${winner.def.party} Nº${winner.def.number} — Vice: ${winner.def.vice}`, w / 2, h * 0.38, 12, '#fff', null);
    const pose = computePose('win', this.t * 6);
    drawFighterSprite(ctx, { x: w / 2, y: h * 0.72, facing: winner.playerIndex === 0 ? 1 : -1, scale: Math.min(w, h) * 0.0045, visual: winner.def.visual, pose });
    this.centerText(ctx, `PLACAR: ${m.p1.def.name} ${m.p1.roundsWon} x ${m.p2.roundsWon} ${m.p2.def.name}`, w / 2, h * 0.5, 11, '#8fd3ff', null);
    this.centerText(ctx, 'ENTER: REVANCHE   ESC: MENU PRINCIPAL', w / 2, h - 28, 11, '#fff', null);
  }

  renderHowTo(ctx, w, h) {
    this.drawBackdrop(ctx, w, h, 'planalto');
    this.centerText(ctx, 'COMO JOGAR', w / 2, h * 0.1, 20, '#ffce00');
    const lines = [
      ['JOGADOR 1', 'WASD mover/pular/agachar · F soco · G chute · R especial 1 · T especial 2 · Y super'],
      ['JOGADOR 2', 'SETAS mover/pular/agachar · K soco · L chute · O especial 1 · P especial 2 · ; super'],
      ['DEFESA', 'Segure a direção para TRÁS (longe do rival) para bloquear ataques.'],
      ['SUPER', 'Acerte e receba golpes para encher o medidor azul. Com 100%, use o super!'],
      ['RODADAS', 'Vence quem ganhar 2 das 3 rodadas de 99 segundos cada.'],
      ['PAUSA', 'ESC ou ENTER durante a luta abre o menu de pausa.']
    ];
    let y = h * 0.24;
    lines.forEach(([t, d]) => {
      this.centerText(ctx, t, w / 2, y, 13, '#8fd3ff', null);
      this.centerText(ctx, d, w / 2, y + 22, Math.min(11, w * 0.013), '#fff', null);
      y += 56;
    });
    this.centerText(ctx, 'ENTER / ESC: VOLTAR', w / 2, h - 28, 10, '#999', null);
  }

  renderCredits(ctx, w, h) {
    this.drawBackdrop(ctx, w, h, 'comicio');
    this.centerText(ctx, 'CRÉDITOS & AVISO LEGAL', w / 2, h * 0.1, 18, '#ffce00');
    const lines = [
      'Eleição Fighter 2026 é um fã-game de paródia e humor, sem fins',
      'eleitorais, comerciais ou de desinformação, e sem qualquer vínculo',
      'com os candidatos, partidos, coligações ou com o TSE.',
      '',
      'Nomes, números, partidos e vices são baseados em informações',
      'públicas sobre as candidaturas à Presidência da República em 2026.',
      'Todos os demais elementos (aparência, poderes e falas) são ficção',
      'cômica original — nenhuma imagem real de nenhuma pessoa é usada.',
      '',
      'Lutadores: arte vetorial pixelada 100% original.',
      'Cenários: ilustrações originais geradas digitalmente.',
      'Fonte: "Press Start 2P" por Cody "CodeMan38" Boisclair (OFL).',
      'Som: sintetizado via Web Audio API.',
      '',
      'Projeto fã-feito para fins de entretenimento e educação cívica.'
    ];
    let y = h * 0.2;
    lines.forEach((l) => { this.centerText(ctx, l, w / 2, y, Math.min(11, w * 0.013), '#fff', null); y += 24; });
    this.centerText(ctx, 'ENTER / ESC: VOLTAR', w / 2, h - 28, 10, '#999', null);
  }

  renderOptions(ctx, w, h) {
    this.drawBackdrop(ctx, w, h, 'debate');
    this.centerText(ctx, 'OPÇÕES', w / 2, h * 0.16, 20, '#ffce00');
    const rows = [
      ['VOLUME EFEITOS', Audio2026.volume],
      ['VOLUME MÚSICA', Audio2026.musicVolume]
    ];
    rows.forEach(([label, val], i) => {
      const sel = i === this.menu.index;
      const y = h * 0.4 + i * 50;
      this.centerText(ctx, (sel ? '► ' : '  ') + label, w / 2 - 40, y, 13, sel ? '#ffce00' : '#fff');
      const bw = 160, filled = Math.round(val * 10);
      const bx = w / 2 + 140;
      ctx.fillStyle = '#222'; ctx.fillRect(bx - bw / 2, y - 6, bw, 12);
      ctx.fillStyle = '#ffce00'; ctx.fillRect(bx - bw / 2, y - 6, bw * val, 12);
      ctx.strokeStyle = '#fff'; ctx.strokeRect(bx - bw / 2, y - 6, bw, 12);
    });
    this.centerText(ctx, 'SETAS: AJUSTAR   ENTER/ESC: VOLTAR', w / 2, h - 28, 10, '#999', null);
  }
}
