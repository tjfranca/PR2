// =============================================================
// Áudio 100% sintetizado via WebAudio (estilo chiptune de 16-bit).
// Não depende de nenhum arquivo de som externo.
// =============================================================

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.sfxGain = null;
    this.musicGain = null;
    this.musicTimer = null;
    this.musicStep = 0;
    this.enabled = true;
    this.volume = 0.7;
    this.musicVolume = 0.35;
  }

  ensure() {
    if (this.ctx) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = 1;
    this.master.connect(this.ctx.destination);
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = this.volume;
    this.sfxGain.connect(this.master);
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = this.musicVolume;
    this.musicGain.connect(this.master);
  }

  resume() {
    this.ensure();
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  setVolume(v) {
    this.volume = v;
    if (this.sfxGain) this.sfxGain.gain.value = v;
  }

  setMusicVolume(v) {
    this.musicVolume = v;
    if (this.musicGain) this.musicGain.gain.value = v;
  }

  // ---- blips genéricos ----
  tone({ freq = 440, dur = 0.1, type = 'square', gain = 0.25, slideTo = null, delay = 0 }) {
    if (!this.enabled) return;
    this.ensure();
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(slideTo, 1), t0 + dur);
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  noiseHit({ dur = 0.12, gain = 0.4, delay = 0 }) {
    if (!this.enabled) return;
    this.ensure();
    const t0 = this.ctx.currentTime + delay;
    const bufferSize = this.ctx.sampleRate * dur;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filt = this.ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = 1800;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(filt);
    filt.connect(g);
    g.connect(this.sfxGain);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  punch() { this.noiseHit({ dur: 0.1, gain: 0.5 }); this.tone({ freq: 160, dur: 0.08, type: 'square', gain: 0.2, slideTo: 60 }); }
  kick() { this.noiseHit({ dur: 0.14, gain: 0.55 }); this.tone({ freq: 120, dur: 0.12, type: 'square', gain: 0.25, slideTo: 40 }); }
  block() { this.tone({ freq: 700, dur: 0.06, type: 'square', gain: 0.2 }); }
  special() { this.tone({ freq: 300, dur: 0.22, type: 'sawtooth', gain: 0.22, slideTo: 900 }); }
  superMove() {
    this.tone({ freq: 220, dur: 0.4, type: 'sawtooth', gain: 0.3, slideTo: 1200 });
    this.tone({ freq: 440, dur: 0.4, type: 'square', gain: 0.2, slideTo: 1600, delay: 0.05 });
  }
  jump() { this.tone({ freq: 400, dur: 0.12, type: 'square', gain: 0.18, slideTo: 800 }); }
  land() { this.tone({ freq: 150, dur: 0.07, type: 'square', gain: 0.18 }); }
  select() { this.tone({ freq: 600, dur: 0.06, type: 'square', gain: 0.22 }); }
  confirm() { this.tone({ freq: 500, dur: 0.08, type: 'square', gain: 0.25, slideTo: 900 }); }
  back() { this.tone({ freq: 400, dur: 0.08, type: 'square', gain: 0.2, slideTo: 200 }); }
  ko() {
    this.tone({ freq: 500, dur: 0.6, type: 'square', gain: 0.3, slideTo: 80 });
  }
  roundStart() {
    this.tone({ freq: 523, dur: 0.12, type: 'square', gain: 0.25 });
    this.tone({ freq: 659, dur: 0.12, type: 'square', gain: 0.25, delay: 0.14 });
    this.tone({ freq: 784, dur: 0.22, type: 'square', gain: 0.28, delay: 0.28 });
  }
  countdownBeep() { this.tone({ freq: 880, dur: 0.1, type: 'square', gain: 0.25 }); }
  win() {
    [0, 1, 2, 3].forEach((i) => this.tone({ freq: 440 + i * 110, dur: 0.18, type: 'square', gain: 0.25, delay: i * 0.15 }));
  }

  // ---- música de fundo (loop gerado proceduralmente) ----
  startMusic(pattern = 'title') {
    this.ensure();
    this.stopMusic();
    const scales = {
      title: [392, 440, 523, 587, 659, 587, 523, 440],
      fight: [220, 220, 262, 220, 196, 220, 262, 294],
      select: [330, 392, 440, 392, 349, 392, 440, 494]
    };
    const notes = scales[pattern] || scales.title;
    let i = 0;
    const step = () => {
      if (!this.enabled) return;
      const freq = notes[i % notes.length];
      this.tone({ freq, dur: 0.18, type: 'triangle', gain: 0.12 * this.musicVolume * 2.2 });
      if (i % 4 === 0) this.tone({ freq: freq / 2, dur: 0.3, type: 'sine', gain: 0.1 * this.musicVolume * 2.2 });
      i++;
    };
    this.musicTimer = setInterval(step, 260);
  }

  stopMusic() {
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }
}

export const Audio2026 = new AudioEngine();
