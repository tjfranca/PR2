/* Smoke test do engine: boot do Game (solo/co-op/boss/continue) com stubs
   mínimos de DOM/canvas/áudio. Garante que o fluxo principal não explode
   em runtime após refactors do engine. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Game } from "../engine";
import { music } from "../music";
import { diffMods } from "../logic";
import type { CharKey } from "../sprites";

/* ---------- stubs ---------- */

class FakeGradient {
  addColorStop() {}
}
class FakeCtx {
  imageSmoothingEnabled = false;
  fillStyle: string | FakeGradient = "";
  strokeStyle = "";
  lineWidth = 1;
  font = "";
  textAlign: CanvasTextAlign = "left";
  globalAlpha = 1;
  filter = "none";
  save() {}
  restore() {}
  translate() {}
  scale() {}
  rotate() {}
  fillRect() {}
  strokeRect() {}
  clearRect() {}
  beginPath() {}
  closePath() {}
  moveTo() {}
  lineTo() {}
  arc() {}
  ellipse() {}
  fill() {}
  stroke() {}
  fillText() {}
  strokeText() {}
  drawImage() {}
  setTransform() {}
  createLinearGradient() {
    return new FakeGradient();
  }
  createRadialGradient() {
    return new FakeGradient();
  }
}
class FakeParam {
  value = 0;
  setValueAtTime() {}
  exponentialRampToValueAtTime() {}
  linearRampToValueAtTime() {}
  cancelScheduledValues() {}
}
class FakeNode {
  connect(n?: unknown) {
    return n ?? this;
  }
  start() {}
  stop() {}
}
class FakeOsc extends FakeNode {
  type: OscillatorType = "square";
  frequency = new FakeParam();
  detune = new FakeParam();
}
class FakeGain extends FakeNode {
  gain = new FakeParam();
}
class FakeFilter extends FakeNode {
  type: BiquadFilterType = "lowpass";
  frequency = new FakeParam();
  Q = new FakeParam();
}
class FakeBufferSource extends FakeNode {
  buffer: unknown = null;
  playbackRate = new FakeParam();
}
class FakeAudioContext {
  state: AudioContextState = "running";
  currentTime = 0;
  sampleRate = 44100;
  destination = new FakeNode();
  createGain() {
    return new FakeGain();
  }
  createOscillator() {
    return new FakeOsc();
  }
  createBiquadFilter() {
    return new FakeFilter();
  }
  createBuffer() {
    return { getChannelData: () => new Float32Array(1) };
  }
  createBufferSource() {
    return new FakeBufferSource();
  }
  resume() {
    return Promise.resolve();
  }
  suspend() {
    return Promise.resolve();
  }
  close() {
    return Promise.resolve();
  }
}

function installDomStubs() {
  const listeners: Record<string, Set<() => void>> = {};
  const w = {
    addEventListener: (t: string, fn: () => void) => {
      (listeners[t] ??= new Set()).add(fn);
    },
    removeEventListener: (t: string, fn: () => void) => listeners[t]?.delete(fn),
    AudioContext: FakeAudioContext,
    setInterval: () => 0,
    clearInterval: () => {},
  };
  vi.stubGlobal("window", w);
  vi.stubGlobal("document", {
    addEventListener: () => {},
    removeEventListener: () => {},
    hidden: false,
  });
  vi.stubGlobal("performance", { now: () => 0 });
  vi.stubGlobal("requestAnimationFrame", () => 1);
  vi.stubGlobal("cancelAnimationFrame", () => {});
}

function makeCanvas(): HTMLCanvasElement {
  const ctx = new FakeCtx() as unknown as CanvasRenderingContext2D;
  return { getContext: () => ctx, width: 960, height: 540 } as unknown as HTMLCanvasElement;
}

function bootGame(charKeys: CharKey[], opts?: { score?: number; phase?: number }): Game {
  const g = new Game(
    makeCanvas(),
    charKeys,
    { onGameOver: () => {}, onVictory: () => {} },
    opts,
  );
  return g;
}

/* ---------- testes ---------- */

describe("engine smoke", () => {
  beforeEach(() => {
    installDomStubs();
  });
  afterEach(() => {
    music.stop();
    vi.unstubAllGlobals();
  });

  it("dá boot em solo e roda alguns updates sem lançar", () => {
    const g = bootGame(["red"]);
    for (let i = 0; i < 90; i++) g.update(1 / 60);
    expect(g.player.hp).toBeGreaterThan(0);
    g.action("punch");
    g.action("jump");
    for (let i = 0; i < 30; i++) g.update(1 / 60);
    g.render();
    g.destroy();
  });

  it("dá boot em co-op com 2 rangers distintos", () => {
    const g = bootGame(["red", "pink"]);
    expect(g.players).toHaveLength(2);
    expect(g.players[0].charKey).toBe("red");
    expect(g.players[1].charKey).toBe("pink");
    g.action("punch", 1);
    g.press("left", 1);
    for (let i = 0; i < 30; i++) g.update(1 / 60);
    g.release("left", 1);
    g.render();
    g.destroy();
  });

  it("monta a fase do chefe com Ivan Ooze e o derrota → vitória", () => {
    const g = bootGame(["red"], { phase: 6 });
    expect(g.isBossPhase()).toBe(true);
    expect(g.boss).not.toBeNull();
    expect(g.boss!.isBoss).toBe(true);
    expect(g.boss!.hp).toBe(g.bossMaxHp);
    // rajada de gosma gera projéteis
    g.bossBarrage();
    expect(g.projectiles.length).toBeGreaterThan(0);
    for (let i = 0; i < 120 && !g.over; i++) {
      g.update(1 / 60);
      g.updateProjectiles(1 / 60);
      if (g.boss!.hp > 0) g.damage(g.boss!, 50, 1, false, 300);
    }
    expect(g.endT).toBeGreaterThan(0); // vitória disparada
    expect(g.score).toBeGreaterThanOrEqual(5000);
    g.destroy();
  });

  it("dá boot com continue (fase e pontos preservados)", () => {
    const g = bootGame(["blue"], { score: 12345, phase: 3 });
    expect(g.score).toBe(12345);
    expect(g.phase).toBe(3);
    expect(g.stage().name).toBe("OBRAS AO ENTARDECER");
    g.destroy();
  });

  it("a dificuldade altera o HP dos inimigos spawnados", () => {
    const hard = diffMods("hard");
    const easy = diffMods("easy");
    expect(hard.hpMul).toBeGreaterThan(easy.hpMul);
    expect(hard.continues).toBeLessThan(easy.continues);
  });
});
