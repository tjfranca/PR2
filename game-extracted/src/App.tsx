import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  buildAnims,
  buildCivAnims,
  CharKey,
  CIV_SHEET,
  Frame,
  loadImages,
  RANGER_SHEET,
  RANGERS,
  SHEETS,
  sheetSize,
} from "./game/sprites";
import { Game, VIEW_H, VIEW_W } from "./game/engine";
import { sfx } from "./game/audio";
import { music } from "./game/music";
import { settings, setSetting } from "./game/settings";
import type { Difficulty } from "./game/settings";
import { loadRecords, submitScore } from "./game/records";
import type { RecordsData } from "./game/records";
import { diffMods } from "./game/logic";
import { playBirthday } from "./game/birthday";

type Screen = "title" | "select" | "play" | "over" | "win";

const DIFF_LABEL: Record<Difficulty, string> = {
  easy: "FÁCIL",
  normal: "NORMAL",
  hard: "DIFÍCIL",
};
const DIFF_NEXT: Record<Difficulty, Difficulty> = {
  easy: "normal",
  normal: "hard",
  hard: "easy",
};

/* ---------- sprite preview via CSS crop of the real sheet ---------- */
function SpriteFrame({ sheet, frame, scale = 2 }: { sheet: string; frame: Frame; scale?: number }) {
  const size = sheetSize(sheet);
  return (
    <div
      style={{
        width: frame.w * scale,
        height: frame.h * scale,
        backgroundImage: `url(${SHEETS[sheet]})`,
        backgroundPosition: `${-frame.x * scale}px ${-frame.y * scale}px`,
        backgroundSize: `${size.w * scale}px ${size.h * scale}px`,
        imageRendering: "pixelated",
      }}
    />
  );
}

function AnimatedRanger({
  charKey,
  form = "ranger",
  anim = "idle",
  fps = 6,
  scale = 2,
}: {
  charKey: CharKey;
  form?: "ranger" | "civ";
  anim?: "idle" | "walk" | "victory";
  fps?: number;
  scale?: number;
}) {
  const frames = (form === "civ" ? buildCivAnims(charKey) : buildAnims(charKey))[anim];
  const sheet = form === "civ" ? CIV_SHEET[charKey] : RANGER_SHEET[charKey];
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((v) => v + 1), 1000 / fps);
    return () => clearInterval(id);
  }, [fps]);
  const frame = frames[i % frames.length];
  return (
    <div className="flex items-end justify-center" style={{ height: 74 * scale }}>
      <SpriteFrame sheet={sheet} frame={frame} scale={scale} />
    </div>
  );
}

function ToggleChip({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-[10px] font-bold tracking-widest transition ${
        on
          ? "border-yellow-400 bg-yellow-400/15 text-yellow-300"
          : "border-zinc-700 bg-black/40 text-zinc-500 hover:text-zinc-300"
      }`}
    >
      {children}
    </button>
  );
}

/* ---------- touch controls (mobile) ---------- */
const isTouchDevice = () =>
  typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0);

function TouchControls({ gameRef }: { gameRef: React.MutableRefObject<Game | null> }) {
  // d-pad: tracks the active direction per pointer
  const dirRef = useRef<Map<number, string[]>>(new Map());

  const applyDpad = (e: React.PointerEvent, el: HTMLDivElement, end = false) => {
    e.preventDefault();
    const g = gameRef.current;
    if (!g) return;
    const prev = dirRef.current.get(e.pointerId) || [];
    for (const d of prev) g.release(d);
    dirRef.current.delete(e.pointerId);
    if (end) return;
    const r = el.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    if (Math.hypot(dx, dy) < r.width * 0.12) return;
    const dirs: string[] = [];
    const ang = Math.atan2(dy, dx);
    const oct = (a: number, b: number) => ang >= a && ang < b;
    const PI = Math.PI;
    if (oct(-PI / 8, PI / 8)) dirs.push("right");
    else if (oct(PI / 8, (3 * PI) / 8)) dirs.push("right", "down");
    else if (oct((3 * PI) / 8, (5 * PI) / 8)) dirs.push("down");
    else if (oct((5 * PI) / 8, (7 * PI) / 8)) dirs.push("left", "down");
    else if (ang >= (7 * PI) / 8 || ang < (-7 * PI) / 8) dirs.push("left");
    else if (oct((-7 * PI) / 8, (-5 * PI) / 8)) dirs.push("left", "up");
    else if (oct((-5 * PI) / 8, (-3 * PI) / 8)) dirs.push("up");
    else dirs.push("right", "up");
    for (const d of dirs) g.press(d);
    dirRef.current.set(e.pointerId, dirs);
  };

  const btn = (
    label: string,
    action: Parameters<Game["action"]>[0],
    cls: string,
    small = false,
  ) => (
    <button
      onPointerDown={(e) => {
        e.preventDefault();
        gameRef.current?.action(action);
      }}
      onContextMenu={(e) => e.preventDefault()}
      className={`${small ? "h-12 w-12 text-[10px]" : "h-16 w-16 text-sm"} select-none rounded-full border-2 font-black tracking-wider active:scale-90 active:brightness-150 ${cls}`}
      style={{ touchAction: "none" }}
    >
      {label}
    </button>
  );

  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-end justify-between px-3 pb-3 sm:px-6"
      style={{ touchAction: "none" }}
    >
      {/* d-pad */}
      <div
        className="pointer-events-auto relative h-32 w-32 rounded-full border-2 border-white/25 bg-black/35 backdrop-blur-[2px]"
        style={{ touchAction: "none" }}
        onPointerDown={(e) => applyDpad(e, e.currentTarget)}
        onPointerMove={(e) => {
          if (dirRef.current.has(e.pointerId) || e.buttons > 0) applyDpad(e, e.currentTarget);
        }}
        onPointerUp={(e) => applyDpad(e, e.currentTarget, true)}
        onPointerCancel={(e) => applyDpad(e, e.currentTarget, true)}
        onPointerLeave={(e) => applyDpad(e, e.currentTarget, true)}
        onContextMenu={(e) => e.preventDefault()}
      >
        <span className="absolute left-1/2 top-1 -translate-x-1/2 text-white/50">▲</span>
        <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-white/50">▼</span>
        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-white/50">◀</span>
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-white/50">▶</span>
      </div>
      {/* action buttons */}
      <div className="pointer-events-auto flex flex-col items-end gap-2">
        <div className="flex gap-2">
          {btn("MORF", "morph", "border-purple-400 bg-purple-500/30 text-purple-100", true)}
          {btn("ARMA", "special", "border-yellow-400 bg-yellow-500/30 text-yellow-100", true)}
        </div>
        <div className="flex items-end gap-2">
          {btn("PULO", "jump", "border-sky-400 bg-sky-500/30 text-sky-100", true)}
          {btn("CHUTE", "kick", "border-red-400 bg-red-500/35 text-red-100")}
          {btn("SOCO", "punch", "border-orange-400 bg-orange-500/35 text-orange-100")}
        </div>
      </div>
    </div>
  );
}

/* ---------- game canvas wrapper ---------- */
function GameView({
  charKeys,
  startPhase = 0,
  startScore = 0,
  onEnd,
}: {
  charKeys: CharKey[];
  startPhase?: number;
  startScore?: number;
  onEnd: (won: boolean, score: number, phase: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const endRef = useRef(onEnd);
  endRef.current = onEnd;
  const [touch] = useState(isTouchDevice);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const game = new Game(
      canvas,
      charKeys,
      {
        onGameOver: (score, phase) => endRef.current(false, score, phase),
        onVictory: (score) => endRef.current(true, score, startPhase),
      },
      { score: startScore, phase: startPhase },
    );
    gameRef.current = game;
    return () => {
      game.destroy();
      gameRef.current = null;
    };
  }, [charKeys, startPhase, startScore]);

  return (
    <div className="relative w-full max-w-[960px]">
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={VIEW_W}
          height={VIEW_H}
          className="w-full rounded-lg border-4 border-zinc-700 shadow-[0_0_60px_rgba(60,120,255,0.25)]"
          style={{
            imageRendering: "pixelated",
            aspectRatio: `${VIEW_W}/${VIEW_H}`,
            touchAction: "none",
          }}
        />
        <button
          onClick={() => gameRef.current?.togglePause()}
          onContextMenu={(e) => e.preventDefault()}
          aria-label="Pausar (P ou Esc)"
          title="Pausar (P ou Esc)"
          className="absolute right-3 top-3 rounded-lg border border-white/25 bg-black/45 px-2 py-1 text-sm font-black tracking-widest text-white/80 backdrop-blur-[2px] transition hover:bg-black/70"
          style={{ touchAction: "none" }}
        >
          ⏸
        </button>
        {touch && <TouchControls gameRef={gameRef} />}
      </div>
      <div className="mt-3 hidden flex-wrap justify-center gap-x-6 gap-y-1 text-[11px] tracking-wider text-zinc-400 sm:flex">
        <span>← ↑ ↓ → / WASD mover</span>
        <span>ESPAÇO pular</span>
        <span className="text-zinc-300">P/ESC pausar</span>
        <span>Z/J soco</span>
        <span>X/K chute (derruba)</span>
        <span className="text-purple-300">M morfar (medidor cheio)</span>
        <span>C/L arma especial (morfado)</span>
        <span className="text-zinc-500">chute no ar = voadora</span>
        <span className="text-amber-300">🔗 soco combo 1→2→3 (com knockback)</span>
      </div>
      {charKeys.length > 1 && (
        <div className="mt-2 flex flex-wrap justify-center gap-x-5 gap-y-1 text-center text-[10px] tracking-wider text-zinc-500">
          <span className="font-bold text-cyan-300">
            CO-OP · P1: setas · P2: WASD mover — F pular · G soco · H chute · Y arma · T morfar
          </span>
        </div>
      )}
      <div className="mt-2 flex flex-wrap justify-center gap-x-5 gap-y-1 text-center text-[10px] tracking-wider text-zinc-500">
        <span>
          ⚠ pule os <span className="text-zinc-300">espinhos</span> (ou jogue inimigos neles)
        </span>
        <span>
          📦 quebre <span className="text-zinc-300">caixotes</span> = energia
        </span>
        <span>
          🛢 chute <span className="text-zinc-300">barris</span> para atropelar vilões
        </span>
        <span>
          🟣 <span className="text-zinc-300">gosma</span> escorrega
        </span>
        <span>🔥 não encoste nos tonéis em chamas</span>
      </div>
    </div>
  );
}

/* ---------- screens ---------- */
const bolt = (
  <svg
    viewBox="0 0 24 24"
    className="h-10 w-10 fill-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.8)]"
  >
    <path d="M13 2 4.5 13.5H11L9.5 22 19 10h-6.5L13 2z" />
  </svg>
);

/* ---------- confete do aniversário (CSS puro) ---------- */
function Confetti({ pieces = 110 }: { pieces?: number }) {
  const conf = useMemo(
    () =>
      Array.from({ length: pieces }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 1.2,
        dur: 2.6 + Math.random() * 2.6,
        color: ["#ff3d2e", "#ffe26b", "#37d05c", "#4da6ff", "#ff9ad5", "#b06be0"][i % 6],
        size: 6 + Math.random() * 8,
        rot: Math.random() * 360,
        sway: -30 + Math.random() * 60,
      })),
    [pieces],
  );
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden>
      {conf.map((c, i) => (
        <div
          key={i}
          className="absolute confetti-piece"
          style={{
            left: `${c.left}%`,
            top: "-24px",
            width: c.size,
            height: c.size * 0.45,
            backgroundColor: c.color,
            animationDelay: `${c.delay}s`,
            animationDuration: `${c.dur}s`,
            ["--sway" as string]: `${c.sway}px`,
            transform: `rotate(${c.rot}deg)`,
          }}
        />
      ))}
    </div>
  );
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("title");
  const [loaded, setLoaded] = useState(false);
  const [charKey, setCharKey] = useState<CharKey>("red");
  const [charKey2, setCharKey2] = useState<CharKey>("black");
  const [mode, setMode] = useState<"solo" | "coop">("solo");
  const [p1, setP1] = useState<CharKey | null>(null);
  const [score, setScore] = useState(0);
  const [endPhase, setEndPhase] = useState(0);
  const [selIdx, setSelIdx] = useState(0);
  const [record, setRecord] = useState<{ score: number; best: number; isNew: boolean } | null>(
    null,
  );
  const [records, setRecords] = useState<RecordsData>(loadRecords);
  const [, setSettingsV] = useState(0);
  const [continues, setContinues] = useState(0);
  const [resume, setResume] = useState<{ score: number; phase: number } | null>(null);
  const [runId, setRunId] = useState(0);
  const [birthday, setBirthday] = useState(false);
  const [bdCaption, setBdCaption] = useState(false);
  const birthdayStop = useRef<(() => void) | null>(null);

  const charKeys = useMemo(
    () => (mode === "coop" ? [charKey, charKey2] : [charKey]),
    [mode, charKey, charKey2],
  );

  useEffect(() => {
    loadImages()
      .then(() => setLoaded(true))
      .catch((e) => console.error(e));
  }, []);

  // música de fundo por tela
  useEffect(() => {
    if (!loaded) return;
    if (screen === "play") music.play("battle");
    else music.play("title");
  }, [screen, loaded]);

  // 🎂 easter egg: digitando 33 na tela de título, os Rangers cantam Parabéns
  useEffect(() => {
    if (screen !== "title" || birthday) return;
    let buf = "";
    const onKey = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) {
        buf = (buf + e.key).slice(-4);
        if (!buf.endsWith("33")) return;
        music.stop();
        birthdayStop.current?.();
        birthdayStop.current = playBirthday();
        setBirthday(true);
        setBdCaption(true);
        sfx.morphin();
        window.setTimeout(() => setBdCaption(false), 9000);
        window.setTimeout(() => {
          if (settings.music) music.play("title");
        }, 27500);
        buf = "";
      } else if (e.key.length === 1) {
        buf = "";
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [screen, birthday]);

  useEffect(
    () => () => {
      birthdayStop.current?.();
    },
    [],
  );

  const startGame = useCallback((keys: CharKey[]) => {
    setCharKey(keys[0]);
    if (keys[1]) setCharKey2(keys[1]);
    setRecord(null);
    setResume(null);
    setBirthday(false);
    birthdayStop.current?.();
    setContinues(diffMods(settings.difficulty).continues);
    setRunId((v) => v + 1);
    sfx.morphin();
    setScreen("play");
  }, []);

  const onEnd = useCallback(
    (won: boolean, s: number, phase: number) => {
      const rec = submitScore(charKey, s);
      setRecord(rec);
      setRecords(loadRecords());
      setScore(s);
      setEndPhase(phase);
      setScreen(won ? "win" : "over");
    },
    [charKey],
  );

  const doContinue = useCallback(() => {
    if (continues <= 0) return;
    setContinues((c) => c - 1);
    setResume({ score, phase: endPhase });
    setRunId((v) => v + 1);
    sfx.morphin();
    setScreen("play");
  }, [continues, endPhase]);

  const bump = () => setSettingsV((v) => v + 1);

  return (
    <div className="min-h-screen bg-[#0a0a14] text-white [background-image:radial-gradient(ellipse_at_top,rgba(40,60,140,0.35),transparent_60%),radial-gradient(ellipse_at_bottom,rgba(120,20,40,0.25),transparent_60%)]">
      <style>{`@keyframes confetti-fall { 0% { transform: translateY(-4vh) translateX(0) rotate(0); opacity: 1 } 100% { transform: translateY(108vh) translateX(var(--sway, 0px)) rotate(720deg); opacity: 0.85 } } .confetti-piece { animation-name: confetti-fall; animation-timing-function: linear; animation-iteration-count: infinite; }`}</style>
      {birthday && <Confetti />}
      <div className="mx-auto flex min-h-[100dvh] max-w-6xl flex-col items-center justify-center px-2 py-4 sm:px-4 sm:py-8">
        {!loaded ? (
          <div className="animate-pulse text-xl tracking-[0.3em] text-zinc-400">
            CARREGANDO SPRITES…
          </div>
        ) : screen === "title" ? (
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 flex items-center gap-3">
              {bolt}
              <span className="text-sm font-bold tracking-[0.5em] text-zinc-400">
                MIGHTY MORPHIN
              </span>
              {bolt}
            </div>
            <h1
              className="text-6xl font-black italic tracking-tight text-transparent sm:text-8xl"
              style={{
                backgroundImage:
                  "linear-gradient(180deg,#fff 0%,#ffd94a 35%,#ff3d2e 70%,#8a1010 100%)",
                WebkitBackgroundClip: "text",
                filter: "drop-shadow(0 4px 0 #300) drop-shadow(0 0 30px rgba(255,80,40,0.5))",
              }}
            >
              POWER RANGERS
            </h1>
            <p className="mt-3 text-lg font-bold tracking-[0.35em] text-blue-300">
              BATALHA DE ANGEL GROVE
            </p>
            <div className="mt-10 flex items-end gap-4 rounded-2xl border border-zinc-700/60 bg-black/40 px-8 py-4">
              {RANGERS.map((r) => (
                <div key={r.key} className="hidden sm:block">
                  <AnimatedRanger charKey={r.key} anim={birthday ? "victory" : "idle"} fps={birthday ? 3 : 6} scale={2} />
                </div>
              ))}
              <div className="sm:hidden">
                <AnimatedRanger charKey="red" anim={birthday ? "victory" : "idle"} fps={birthday ? 3 : 6} scale={2} />
              </div>
            </div>
            {bdCaption && (
              <div className="mt-8 animate-pulse text-center">
                <p className="text-4xl font-black italic tracking-widest text-yellow-300 drop-shadow-[0_0_25px_rgba(250,204,21,0.7)]">
                  🎂 PARABÉNS! 🎂
                </p>
                <p className="mt-2 text-lg font-bold tracking-[0.3em] text-pink-300">
                  FELIZ ANIVERSÁRIO DE 33 ANOS!
                </p>
              </div>
            )}
            <button
              onClick={() => {
                sfx.unlock();
                sfx.select();
                setP1(null);
                setBirthday(false);
                birthdayStop.current?.();
                setScreen("select");
              }}
              className="mt-10 animate-pulse rounded-xl border-2 border-yellow-400 bg-yellow-400/10 px-10 py-4 text-xl font-black tracking-[0.3em] text-yellow-300 transition hover:scale-105 hover:bg-yellow-400/25"
            >
              INICIAR
            </button>
            <div className="mt-4 flex items-center gap-2 text-[10px] tracking-widest text-zinc-500">
              <span>MODO:</span>
              <ToggleChip on={mode === "solo"} onClick={() => setMode("solo")}>
                🎮 1 JOGADOR
              </ToggleChip>
              <ToggleChip
                on={mode === "coop"}
                onClick={() => {
                  setMode("coop");
                  sfx.select();
                }}
              >
                🎮🎮 2 JOGADORES
              </ToggleChip>
            </div>
            <p className="mt-6 max-w-md text-xs leading-5 text-zinc-500">
              Ivan Ooze soltou a Patrulha Putty em Angel Grove. Você começa{" "}
              <span className="text-zinc-300">à paisana</span> — lute para encher o medidor de
              morfagem e aperte <span className="text-purple-300">M</span> para se transformar!
              Atravesse <span className="text-zinc-300">6 fases</span> cheias de espinhos, barris
              para chutar, caixotes com energia, gosma escorregadia, tonéis em chamas, vigas caindo
              e novos vilões — Skelerena e os Homens de Gosma — e enfrente{" "}
              <span className="text-purple-300">IVAN OOZE</span> no covil final! Cada Ranger tem
              seu próprio combo 1-2-3 e a arma personalizada do Mega Drive. Chame um amigo para o{" "}
              <span className="text-cyan-300">co-op de 2 jogadores</span> no mesmo teclado!
            </p>
            <div className="mt-4 flex max-w-xl flex-wrap justify-center gap-2 text-[10px] tracking-widest text-zinc-500">
              <span className="rounded border border-zinc-700 px-2 py-1">1 · OBRAS DA CIDADE</span>
              <span className="rounded border border-zinc-700 px-2 py-1">
                2 · PARQUE DE DIVERSÕES
              </span>
              <span className="rounded border border-zinc-700 px-2 py-1">3 · RODOVIA DA PONTE</span>
              <span className="rounded border border-amber-900 px-2 py-1 text-amber-500">
                4 · OBRAS AO ENTARDECER ⚠
              </span>
              <span className="rounded border border-blue-900 px-2 py-1 text-blue-400">
                5 · PARQUE À NOITE ⚡
              </span>
              <span className="rounded border border-red-900 px-2 py-1 text-red-400">
                6 · PONTE EM CHAMAS 🔥
              </span>
              <span className="rounded border border-purple-900 px-2 py-1 text-purple-300">
                7 · COVIL DE IVAN OOZE ☠
              </span>
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              <span className="text-[10px] tracking-widest text-zinc-600">OPÇÕES:</span>
              <ToggleChip
                on={settings.music}
                onClick={() => {
                  const v = !settings.music;
                  setSetting("music", v);
                  music.setMuted(!v);
                  if (v) music.play("title");
                  bump();
                }}
              >
                🎵 MÚSICA
              </ToggleChip>
              <ToggleChip
                on={settings.sfx}
                onClick={() => {
                  setSetting("sfx", !settings.sfx);
                  bump();
                }}
              >
                🔊 EFEITOS
              </ToggleChip>
              <ToggleChip
                on={settings.reducedFx}
                onClick={() => {
                  setSetting("reducedFx", !settings.reducedFx);
                  bump();
                }}
              >
                ✨ MENOS FLASHES
              </ToggleChip>
              <ToggleChip
                on={settings.tutorial}
                onClick={() => {
                  setSetting("tutorial", !settings.tutorial);
                  bump();
                }}
              >
                💡 DICAS
              </ToggleChip>
              <button
                onClick={() => {
                  const next = DIFF_NEXT[settings.difficulty];
                  setSetting("difficulty", next);
                  sfx.select();
                  bump();
                }}
                title="Dificuldade: afeta HP, dano, quantidade e velocidade dos inimigos, e o número de continues"
                className={`rounded-full border px-3 py-1 text-[10px] font-bold tracking-widest transition ${
                  settings.difficulty === "easy"
                    ? "border-green-400 bg-green-400/15 text-green-300"
                    : settings.difficulty === "hard"
                      ? "border-red-400 bg-red-400/15 text-red-300"
                      : "border-yellow-400 bg-yellow-400/15 text-yellow-300"
                }`}
              >
                ⚔ {DIFF_LABEL[settings.difficulty]} · {diffMods(settings.difficulty).continues}{" "}
                CONTINUES
              </button>
            </div>
          </div>
        ) : screen === "select" ? (
          <div className="flex w-full flex-col items-center">
            <h2 className="mb-1 text-3xl font-black italic tracking-widest text-yellow-300">
              {mode === "coop"
                ? p1
                  ? "ESCOLHA O RANGER DO JOGADOR 2"
                  : "ESCOLHA O RANGER DO JOGADOR 1"
                : "ESCOLHA SEU RANGER"}
            </h2>
            <p className="mb-8 text-xs tracking-[0.3em] text-zinc-400">
              {mode === "coop" ? "CO-OP: P1 USARÁ AS SETAS · P2 USARÁ WASD" : "É HORA DE MORFAR!"}
            </p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {RANGERS.map((r, i) => (
                <button
                  key={r.key}
                  onMouseEnter={() => setSelIdx(i)}
                  onClick={() => {
                    sfx.select();
                    if (mode === "coop") {
                      if (!p1) setP1(r.key);
                      else startGame([p1, r.key]);
                    } else startGame([r.key]);
                  }}
                  disabled={mode === "coop" && p1 === r.key}
                  className={`group flex flex-col items-center rounded-xl border-2 bg-black/50 px-4 pb-4 pt-2 transition hover:scale-105 ${
                    selIdx === i ? "shadow-[0_0_25px_var(--glow)]" : ""
                  } ${mode === "coop" && p1 === r.key ? "opacity-40" : ""}`}
                  style={
                    {
                      borderColor: r.color,
                      "--glow": r.glow + "66",
                    } as React.CSSProperties
                  }
                >
                  <div className="hidden items-end gap-1 sm:flex">
                    <AnimatedRanger charKey={r.key} form="civ" anim="idle" fps={5} scale={1} />
                    <span className="pb-6 text-[10px] text-zinc-500">➜</span>
                    <AnimatedRanger
                      charKey={r.key}
                      anim={selIdx === i ? "walk" : "idle"}
                      fps={selIdx === i ? 10 : 5}
                      scale={1.5}
                    />
                  </div>
                  <div className="flex items-end justify-center sm:hidden">
                    <AnimatedRanger
                      charKey={r.key}
                      anim={selIdx === i ? "walk" : "idle"}
                      fps={selIdx === i ? 10 : 5}
                      scale={2}
                    />
                  </div>
                  {mode === "coop" && p1 === r.key && (
                    <div className="mt-1 rounded bg-cyan-500/25 px-2 text-[9px] font-black tracking-widest text-cyan-300">
                      JOGADOR 1
                    </div>
                  )}
                  <div className="mt-2 text-sm font-black tracking-wider" style={{ color: r.glow }}>
                    {r.name.replace("Ranger ", "").toUpperCase()}
                  </div>
                  <div className="text-[10px] text-zinc-400">{r.human}</div>
                  <div className="mt-1 text-[9px] tracking-wider text-zinc-500">{r.weapon}</div>
                  <div className="mt-1 h-3 text-[9px] tracking-wider text-yellow-500/80">
                    {(records.best[r.key] || 0) > 0
                      ? `RECORDE ${String(records.best[r.key]).padStart(6, "0")}`
                      : "\u00A0"}
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                setP1(null);
                setScreen("title");
              }}
              className="mt-8 text-xs tracking-[0.3em] text-zinc-500 hover:text-zinc-300"
            >
              ← VOLTAR
            </button>
          </div>
        ) : screen === "play" ? (
          <GameView
            key={runId}
            charKeys={charKeys}
            startPhase={resume?.phase ?? 0}
            startScore={resume?.score ?? 0}
            onEnd={onEnd}
          />
        ) : (
          <div className="flex flex-col items-center text-center">
            {screen === "win" ? (
              <>
                <h2 className="text-5xl font-black italic text-green-400 drop-shadow-[0_0_25px_rgba(74,222,128,0.5)]">
                  VITÓRIA!
                </h2>
                <p className="mt-2 text-sm tracking-[0.25em] text-zinc-300">
                  ANGEL GROVE ESTÁ SALVA
                </p>
                <div className="mt-6">
                  <AnimatedRanger charKey={charKey} anim="victory" fps={3} scale={2} />
                </div>
              </>
            ) : (
              <>
                <h2 className="text-5xl font-black italic text-red-500 drop-shadow-[0_0_25px_rgba(239,68,68,0.5)]">
                  GAME OVER
                </h2>
                <p className="mt-2 text-sm tracking-[0.25em] text-zinc-400">
                  OS PUTTIES DOMINARAM ANGEL GROVE…
                </p>
              </>
            )}
            <div className="mt-6 rounded-xl border border-zinc-700 bg-black/50 px-10 py-4 text-2xl font-black tracking-widest text-yellow-300">
              {String(score).padStart(6, "0")} PTS
            </div>
            {record && (
              <div
                className={`mt-3 text-xs font-black tracking-[0.3em] ${
                  record.isNew ? "animate-pulse text-green-400" : "text-zinc-400"
                }`}
              >
                {record.isNew
                  ? "🏆 NOVO RECORDE!"
                  : `RECORDE: ${String(record.best).padStart(6, "0")} PTS`}
              </div>
            )}
            {screen === "over" && continues > 0 && (
              <div className="mt-6 flex flex-col items-center gap-2">
                <button
                  onClick={doContinue}
                  className="animate-pulse rounded-lg border-2 border-green-400 bg-green-400/10 px-8 py-3 text-sm font-black tracking-widest text-green-300 hover:bg-green-400/25"
                >
                  ▶ CONTINUAR ({continues} {continues === 1 ? "CONTINUE" : "CONTINUES"})
                </button>
                <p className="text-[10px] tracking-widest text-zinc-500">
                  VOCÊ RENASCE NO INÍCIO DA FASE ATUAL COM OS PONTOS MANTIDOS
                </p>
              </div>
            )}
            <div className="mt-8 flex gap-4">
              <button
                onClick={() => {
                  sfx.select();
                  setP1(null);
                  startGame(charKeys);
                }}
                className="rounded-lg border-2 border-yellow-400 px-6 py-3 text-sm font-black tracking-widest text-yellow-300 hover:bg-yellow-400/15"
              >
                JOGAR DE NOVO
              </button>
              <button
                onClick={() => {
                  sfx.select();
                  setP1(null);
                  setScreen("select");
                }}
                className="rounded-lg border-2 border-zinc-600 px-6 py-3 text-sm font-black tracking-widest text-zinc-300 hover:bg-zinc-700/40"
              >
                TROCAR RANGER
              </button>
            </div>
          </div>
        )}
        <div className="mt-8 text-center text-[10px] leading-4 text-zinc-600">
          Rangers morfados: “MMPR: The Movie” (Mega Drive/Genesis). Civis, Putties e cenários:
          “MMPR: The Movie” (SNES) — rips de Belial &amp; Cyrus Annihilator (The Spriters Resource).
        </div>
      </div>
    </div>
  );
}
