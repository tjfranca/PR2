/* Tiny WebAudio synth for retro SFX */
import { settings } from "./settings";

let ctx: AudioContext | null = null;

function ac(): AudioContext | null {
  if (!settings.sfx) return null;
  if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function tone(
  freq: number,
  dur: number,
  type: OscillatorType = "square",
  vol = 0.08,
  slide = 0,
  delay = 0,
) {
  try {
    const a = ac();
    if (!a) return;
    const t0 = a.currentTime + delay;
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(a.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  } catch {
    /* audio not available */
  }
}

function noise(dur: number, vol = 0.1, delay = 0) {
  try {
    const a = ac();
    if (!a) return;
    const t0 = a.currentTime + delay;
    const len = Math.floor(a.sampleRate * dur);
    const buf = a.createBuffer(1, len, a.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = a.createBufferSource();
    s.buffer = buf;
    const g = a.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(g).connect(a.destination);
    s.start(t0);
  } catch {
    /* ignore */
  }
}

export const sfx = {
  unlock() {
    ac();
  },
  punch() {
    noise(0.08, 0.12);
    tone(180, 0.07, "square", 0.06, -80);
  },
  kick() {
    noise(0.1, 0.14);
    tone(120, 0.1, "square", 0.07, -60);
  },
  hitConnect() {
    noise(0.12, 0.16);
    tone(90, 0.12, "sawtooth", 0.09, -50);
  },
  hurt() {
    tone(220, 0.15, "sawtooth", 0.07, -140);
  },
  jump() {
    tone(300, 0.15, "square", 0.05, 260);
  },
  special() {
    tone(523, 0.09, "square", 0.08);
    tone(659, 0.09, "square", 0.08, 0, 0.08);
    tone(784, 0.12, "square", 0.08, 0, 0.16);
    noise(0.25, 0.12, 0.16);
  },
  fall() {
    tone(160, 0.25, "sawtooth", 0.08, -120);
    noise(0.2, 0.12, 0.1);
  },
  wave() {
    tone(392, 0.12, "square", 0.07);
    tone(523, 0.12, "square", 0.07, 0, 0.12);
    tone(659, 0.2, "square", 0.07, 0, 0.24);
  },
  select() {
    tone(660, 0.08, "square", 0.06);
    tone(880, 0.1, "square", 0.06, 0, 0.07);
  },
  morphin() {
    // it's morphin time!
    const seq = [392, 523, 659, 784, 1046];
    seq.forEach((f, i) => tone(f, 0.14, "square", 0.08, 0, i * 0.09));
    noise(0.3, 0.08, 0.45);
  },
  thunder() {
    // lightning strike: crack + low rumble
    noise(0.12, 0.22);
    tone(90, 0.5, "sawtooth", 0.09, -60, 0.05);
    noise(0.6, 0.1, 0.1);
  },
  powerUp() {
    // transformation complete: rising arpeggio + shimmer
    const seq = [523, 659, 784, 1046, 1318];
    seq.forEach((f, i) => tone(f, 0.18, "square", 0.07, 0, i * 0.07));
    tone(1568, 0.6, "triangle", 0.06, 0, 0.36);
    noise(0.35, 0.06, 0.3);
  },
  gameover() {
    const seq = [523, 392, 330, 262, 196];
    seq.forEach((f, i) => tone(f, 0.25, "triangle", 0.09, 0, i * 0.22));
  },
  victory() {
    const seq = [523, 523, 523, 659, 784, 1046];
    seq.forEach((f, i) => tone(f, i === 5 ? 0.5 : 0.16, "square", 0.08, 0, i * 0.14));
  },
};
