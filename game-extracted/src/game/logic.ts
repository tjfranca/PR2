/* Funções puras do jogo — sem dependência de DOM/canvas, testáveis unitariamente. */
import { ZPX } from "./consts";

/** Progressão do combo de soco: 1 → 2 → 3 → reinicia em 1. */
export function comboNext(step: number): number {
  return step >= 3 ? 0 : step + 1;
}

/** Ciclo dos espinhos retráteis: baixo 2.2s → aviso 0.6s → erguido 1.4s. */
export const RETRACT_CYCLE = 4.2;
export const RETRACT_WARN_AT = 2.2;
export const RETRACT_UP_AT = 2.8;

export function retractState(t: number): { warn: boolean; up: boolean } {
  const c = ((t % RETRACT_CYCLE) + RETRACT_CYCLE) % RETRACT_CYCLE;
  return {
    warn: c >= RETRACT_WARN_AT && c < RETRACT_UP_AT,
    up: c >= RETRACT_UP_AT,
  };
}

/** Resolve a sobreposição lutador × objeto sólido (menor eixo de empurrão). */
export function pushOutCalc(
  fx: number,
  fz: number,
  ox: number,
  oz: number,
  ow: number,
  ozr: number,
  padX = 14,
  padZ = 0.06,
): { dx: number; dz: number; axis: "x" | "z" | null } {
  const dx = fx - ox;
  const dz = fz - oz;
  if (Math.abs(dx) >= ow + padX || Math.abs(dz) >= ozr + padZ) {
    return { dx: 0, dz: 0, axis: null };
  }
  const oxd = ow + padX - Math.abs(dx);
  const ozd = (ozr + padZ - Math.abs(dz)) * ZPX;
  if (oxd < ozd) {
    return { dx: (dx >= 0 ? 1 : -1) * oxd, dz: 0, axis: "x" };
  }
  return { dx: 0, dz: (dz >= 0 ? 1 : -1) * (ozd / ZPX), axis: "z" };
}

/** Dificuldade: multiplicadores de HP/dano/quantidade/velocidade + continues. */
export type Difficulty = "easy" | "normal" | "hard";

export interface DifficultyMods {
  hpMul: number;
  dmgMul: number;
  countMul: number;
  speedMul: number;
  playerHpMul: number;
  continues: number;
}

export const DIFFICULTY_MODS: Record<Difficulty, DifficultyMods> = {
  easy: { hpMul: 0.75, dmgMul: 0.8, countMul: 0.8, speedMul: 0.9, playerHpMul: 1.25, continues: 3 },
  normal: { hpMul: 1, dmgMul: 1, countMul: 1, speedMul: 1, playerHpMul: 1, continues: 2 },
  hard: { hpMul: 1.3, dmgMul: 1.25, countMul: 1.25, speedMul: 1.1, playerHpMul: 0.9, continues: 1 },
};

export function diffMods(d: string): DifficultyMods {
  return DIFFICULTY_MODS[d as Difficulty] ?? DIFFICULTY_MODS.normal;
}

/** Aplica o multiplicador de quantidade às ondas de inimigos (mínimo 1). */
export function scaledWaves(waves: number[], countMul: number): number[] {
  return waves.map((w) => Math.max(1, Math.round(w * countMul)));
}

/** MIDI → frequência (Hz). */
export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}
