/* Easter egg de aniversário: os Rangers "cantam" Parabéns pra Você
   (sintetizado via WebAudio, como todo o áudio do jogo).
   Melodia em Fá maior, 120 bpm; duas vozes "cantadas" (saw + filtro),
   baixo e acompanhamento. Retorna uma função para interromper. */
import { settings } from "./settings";

type Ev = {
  t: number; // batida de início (1 batida = semínima)
  midi: number;
  dur: number; // em batidas
  type: OscillatorType;
  vol: number;
  vib?: number; // profundidade do vibrato (Hz)
  chorus?: number; // 2ª voz em oitavas acima
};

const m = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);
const BPM = 120;
const BEAT = 60 / BPM;

/* melodia — F: fá, G: sol, A: lá, B: si bemol, C: dó, D: ré, E: mi */
const C4 = 60,
  D4 = 62,
  E4 = 64,
  F4 = 65,
  G4 = 67,
  A4 = 69,
  Bb4 = 70,
  C5 = 72,
  F5 = 77;
const F2 = 41,
  C3 = 48,
  Bb2 = 46,
  F3 = 53;

const voice = (t: number, midi: number, dur: number, vib = 0): Ev[] => [
  { t, midi, dur, type: "sawtooth", vol: 0.16, vib },
  { t, midi: midi + 12, dur, type: "sawtooth", vol: 0.06, vib },
];

const bass = (t: number, midi: number, dur: number): Ev => ({
  t,
  midi,
  dur,
  type: "triangle",
  vol: 0.14,
});

function buildEvents(): Ev[] {
  const ev: Ev[] = [];
  let t = 0;
  // frase: "pa-ra-béns" = colcheia pontuada + semicolcheia (0.75 + 0.25)
  const phrase = (p: [number, number][]) => {
    for (const [midi, beats] of p) {
      ev.push(...voice(t, midi, beats * BEAT > 0.6 ? 5.5 : 0, beats));
      t += beats;
    }
  };

  // 1ª: Pa-ra-béns pra vo-cê
  phrase([
    [C4, 0.75], [C4, 0.25], [D4, 1], [C4, 1], [F4, 1], [E4, 2],
  ]);
  // 2ª: nes-ta da-ta que-ri-da
  phrase([
    [C4, 0.75], [C4, 0.25], [D4, 1], [C4, 1], [G4, 1], [F4, 2],
  ]);
  // 3ª: mui-tas fe-li-ci-da-des
  phrase([
    [C4, 0.75], [C4, 0.25], [C5, 1], [A4, 1], [F4, 1], [E4, 1], [D4, 2],
  ]);
  // 4ª: mui-tos a-nos de vi-da
  phrase([
    [Bb4, 0.75], [Bb4, 0.25], [A4, 1], [F4, 1], [G4, 1], [F4, 2],
  ]);
  // repete a 3ª e 4ª com final sustentado
  phrase([
    [C4, 0.75], [C4, 0.25], [C5, 1], [A4, 1], [F4, 1], [E4, 1], [D4, 2],
  ]);
  phrase([
    [Bb4, 0.75], [Bb4, 0.25], [A4, 1], [F4, 1], [G4, 1], [F4, 3],
  ]);
  // gran finale: "PARABÉNS!" — arpejo F4 A4 C5 F5
  const end = t;
  ev.push(...voice(end, F4, 0.5));
  ev.push(...voice(end + 0.5, A4, 0.5));
  ev.push(...voice(end + 1, C5, 0.5));
  ev.push(...voice(end + 1.5, F5, 3.5, 6));

  // baixo: F2 sob as frases 1/3, C3 sob a 2ª, Bb2/C3 na 4ª
  const line = (from: number, seq: [number, number][]) => {
    let bt = from;
    for (const [midi, beats] of seq) {
      ev.push(bass(bt, midi, beats));
      bt += beats;
    }
  };
  line(0, [[F2, 8]]);
  line(8, [[C3, 8]]);
  line(16, [[F2, 8]]);
  line(24, [[Bb2, 4], [C3, 4]]);
  line(32, [[F2, 8]]);
  line(40, [[Bb2, 4], [C3, 4]]);
  line(end, [[F2, 2], [F3, 4]]);

  return ev;
}

export function playBirthday(): (() => void) | null {
  if (!settings.music) return null;
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ac = new Ctor();
  if (ac.state === "suspended") ac.resume().catch(() => {});
  const master = ac.createGain();
  master.gain.value = 0.9;
  master.connect(ac.destination);

  const notes: AudioScheduledSourceNode[] = [];
  const t0 = ac.currentTime + 0.15;
  const events = buildEvents();
  for (const e of events) {
    const st = t0 + e.t * BEAT;
    const dur = e.dur * BEAT;
    const o = ac.createOscillator();
    const lp = ac.createBiquadFilter();
    const g = ac.createGain();
    o.type = e.type;
    o.frequency.setValueAtTime(m(e.midi), st);
    if (e.vib) {
      const lfo = ac.createOscillator();
      const lg = ac.createGain();
      lfo.frequency.value = e.vib;
      lg.gain.value = e.midi > 70 ? 4 : 2;
      lfo.connect(lg).connect(o.frequency);
      lfo.start(st);
      lfo.stop(st + dur);
    }
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(e.type === "triangle" ? 900 : 3200, st);
    lp.Q.value = e.type === "triangle" ? 0 : 2.5;
    g.gain.setValueAtTime(0.0001, st);
    g.gain.exponentialRampToValueAtTime(e.vol, st + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, st + dur * 0.94);
    o.connect(lp).connect(g).connect(master);
    o.start(st);
    o.stop(st + dur + 0.05);
    notes.push(o);
  }
  // brilho final (aplausos/champagne)
  const end = t0 + 52 * BEAT;
  const len = Math.floor(ac.sampleRate * 1.6);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    const k = i / len;
    d[i] = (Math.random() * 2 - 1) * Math.pow(1 - k, 2) * 0.4;
  }
  const s = ac.createBufferSource();
  s.buffer = buf;
  const hg = ac.createGain();
  hg.gain.setValueAtTime(0.0001, end);
  hg.gain.exponentialRampToValueAtTime(0.5, end + 0.05);
  hg.gain.exponentialRampToValueAtTime(0.0001, end + 1.6);
  s.connect(hg).connect(master);
  s.start(end);
  notes.push(s);

  return () => {
    for (const n of notes) {
      try {
        n.stop();
      } catch {
        /* já parado */
      }
    }
    ac.close().catch(() => {});
  };
}
