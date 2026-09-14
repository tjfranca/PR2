/* Música de fundo sintetizada (WebAudio) — loops chiptune gerados em tempo real,
   sem nenhum arquivo de áudio externo.
   Formato de faixa: sequenciador de semicolcheias com lead, baixo e chimbal. */
import { settings } from "./settings";

type Note = [number | null, number]; // [midi | silêncio, duração em semicolcheias]

interface Event {
  t: number; // semicolcheia de início
  midi: number;
  dur: number; // semicolcheias
  type: OscillatorType;
  vol: number;
}

interface Song {
  bpm: number;
  total: number; // semicolcheias por loop
  events: Event[];
  hats: boolean[]; // chimbal por semicolcheia
}

const A4 = 69;
const m = (midi: number) => 440 * Math.pow(2, (midi - A4) / 12);

function seq(bpm: number, lead: Note[], bass: Note[], hatEvery = 2): Song {
  const events: Event[] = [];
  let t = 0;
  const leadTotal = lead.reduce((s, n) => s + n[1], 0);
  const bassTotal = bass.reduce((s, n) => s + n[1], 0);
  for (const [midi, dur] of lead) {
    if (midi != null) events.push({ t, midi, dur, type: "square", vol: 0.045 });
    t += dur;
  }
  t = 0;
  for (const [midi, dur] of bass) {
    if (midi != null) events.push({ t, midi, dur, type: "triangle", vol: 0.09 });
    t += dur;
  }
  const total = Math.max(leadTotal, bassTotal);
  const hats = new Array<boolean>(total).fill(false);
  for (let i = 0; i < total; i += hatEvery) hats[i] = true;
  return { bpm, total, events, hats };
}

/* --- tema do título (heroico, 96 bpm, Mi menor) --- */
const TITLE_LEAD: Note[] = [
  [64, 2],
  [67, 2],
  [71, 2],
  [76, 4],
  [74, 2],
  [71, 2],
  [67, 2],
  [66, 2],
  [67, 2],
  [64, 2],
  [59, 2],
  [62, 2],
  [64, 4],
  [71, 2],
  [67, 2],
  [66, 2],
  [67, 2],
  [71, 2],
  [74, 2],
  [79, 4],
  [78, 2],
  [74, 2],
  [71, 2],
  [69, 2],
  [71, 2],
  [67, 2],
  [64, 2],
  [66, 2],
  [67, 4],
  [null, 4],
];
const TITLE_BASS: Note[] = [
  [40, 2],
  [47, 2],
  [52, 2],
  [47, 2],
  [40, 2],
  [47, 2],
  [52, 2],
  [47, 2],
  [38, 2],
  [45, 2],
  [50, 2],
  [45, 2],
  [38, 2],
  [45, 2],
  [50, 2],
  [45, 2],
  [36, 2],
  [43, 2],
  [48, 2],
  [43, 2],
  [36, 2],
  [43, 2],
  [48, 2],
  [43, 2],
  [35, 2],
  [43, 2],
  [47, 2],
  [43, 2],
  [35, 2],
  [43, 2],
  [47, 2],
  [43, 2],
];

/* --- tema de batalha (Lá menor, 138 bpm, riff de 32 semicolcheias) --- */
const BATTLE_LEAD: Note[] = [
  [57, 1],
  [60, 1],
  [64, 1],
  [67, 1],
  [72, 2],
  [67, 1],
  [64, 1],
  [60, 1],
  [57, 1],
  [60, 1],
  [64, 1],
  [67, 1],
  [74, 2],
  [72, 1],
  [67, 1],
  [64, 1],
  [62, 1],
  [65, 1],
  [69, 1],
  [72, 1],
  [77, 2],
  [72, 1],
  [69, 1],
  [65, 1],
  [64, 1],
  [67, 1],
  [71, 1],
  [74, 1],
  [79, 2],
  [74, 1],
  [71, 1],
  [67, 1],
];
const BATTLE_BASS: Note[] = [
  [45, 2],
  [null, 1],
  [45, 1],
  [52, 2],
  [null, 1],
  [52, 1],
  [43, 2],
  [null, 1],
  [43, 1],
  [50, 2],
  [null, 1],
  [50, 1],
  [41, 2],
  [null, 1],
  [41, 1],
  [48, 2],
  [null, 1],
  [48, 1],
  [40, 2],
  [null, 1],
  [40, 1],
  [47, 2],
  [null, 1],
  [47, 1],
];

const SONGS: Record<string, Song> = {
  title: seq(96, TITLE_LEAD, TITLE_BASS, 4),
  battle: seq(138, BATTLE_LEAD, BATTLE_BASS, 2),
};

class MusicPlayer {
  private ac: AudioContext | null = null;
  private master: GainNode | null = null;
  private timer: number | null = null;
  private active: { n: AudioScheduledSourceNode; end: number }[] = [];
  private nextT = 0;
  private step = 0;
  private song: Song | null = null;
  current: string | null = null;

  private ensure() {
    if (!this.ac) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ac = new Ctor();
      this.master = this.ac.createGain();
      this.master.gain.value = settings.music ? 0.9 : 0;
      this.master.connect(this.ac.destination);
    }
    if (this.ac.state === "suspended") this.ac.resume().catch(() => {});
  }

  private schedule() {
    if (!this.ac || !this.master || !this.song) return;
    const stepDur = 60 / this.song.bpm / 4;
    while (this.nextT < this.ac.currentTime + 0.15) {
      const s = this.song;
      for (const ev of s.events) {
        if (ev.t !== this.step) continue;
        const t0 = this.nextT;
        const dur = ev.dur * stepDur;
        const o = this.ac.createOscillator();
        const g = this.ac.createGain();
        o.type = ev.type;
        o.frequency.setValueAtTime(m(ev.midi), t0);
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(ev.vol, t0 + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur * 0.92);
        o.connect(g).connect(this.master);
        o.start(t0);
        o.stop(t0 + dur);
        this.active.push({ n: o, end: t0 + dur });
      }
      if (s.hats[this.step % s.hats.length]) this.hat(this.nextT, 0.018);
      this.nextT += stepDur;
      this.step = (this.step + 1) % s.total;
    }
    this.active = this.active.filter((a) => a.end > this.ac!.currentTime);
  }

  private hat(t0: number, vol: number) {
    if (!this.ac || !this.master) return;
    const len = Math.floor(this.ac.sampleRate * 0.04);
    const buf = this.ac.createBuffer(1, len, this.ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = this.ac.createBufferSource();
    s.buffer = buf;
    const g = this.ac.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.04);
    s.connect(g).connect(this.master);
    s.start(t0);
    this.active.push({ n: s, end: t0 + 0.04 });
  }

  play(name: string) {
    if (!settings.music || this.current === name) return;
    this.ensure();
    this.stopLoop();
    const song = SONGS[name];
    if (!song) return;
    this.song = song;
    this.step = 0;
    this.current = name;
    this.nextT = this.ac!.currentTime + 0.06;
    this.timer = window.setInterval(() => this.schedule(), 25);
  }

  private stopLoop() {
    if (this.timer != null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    for (const a of this.active) {
      try {
        a.n.stop();
      } catch {
        /* já parado */
      }
    }
    this.active = [];
    this.song = null;
    this.current = null;
  }

  stop() {
    this.stopLoop();
  }

  pause() {
    if (this.ac && this.ac.state === "running") this.ac.suspend().catch(() => {});
  }

  resume() {
    this.ensure();
  }

  setMuted(muted: boolean) {
    if (muted) this.stop();
    if (this.master) this.master.gain.value = muted ? 0 : 0.9;
    if (!muted && this.current) this.ensure();
  }
}

export const music = new MusicPlayer();
