/* Interfaces do mundo: objetos de fase, partículas, pickups, perigos e callbacks. */
import type { Fighter } from "./fighter";
import type { HazardType, ObjKind } from "./stages";
import type { CharKey } from "./sprites";

/* ---------------- world objects / fx ---------------- */

export interface StageObj {
  kind: ObjKind;
  x: number;
  z: number;
  w: number;
  zr: number;
  hp: number;
  vx: number;
  rot: number;
  timer: number;
  up: boolean;
  warn: boolean;
  cool: Map<Fighter, number>;
  dead: boolean;
  wobble: number;
}

export interface Spark {
  x: number;
  y: number;
  t: number;
  big: boolean;
}
export interface Floater {
  x: number;
  y: number;
  txt: string;
  color: string;
  t: number;
}
export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  t: number;
  life: number;
  color: string;
  size: number;
  grav: number;
}
export interface Pickup {
  x: number;
  z: number;
  t: number;
  heal: number;
}
export interface Hazard {
  type: HazardType;
  x: number;
  z: number;
  t: number;
  warnT: number;
  activeT: number;
  dmg: number;
  hitDone: Set<Fighter>;
}

export interface Projectile {
  x: number;
  z: number;
  vx: number;
  vz: number;
  t: number;
  life: number;
  r: number;
  kind: "goo";
}

export interface EngineCallbacks {
  onGameOver: (score: number, phase: number) => void;
  onVictory: (score: number) => void;
}

export type TouchAction = "punch" | "kick" | "special" | "jump" | "morph";

export const RANGER_GLOW: Record<CharKey, string> = {
  red: "#ff4a3a",
  blue: "#4a7dff",
  black: "#9a9ab8",
  pink: "#ff7ac2",
  yellow: "#ffe24a",
  white: "#ffffff",
};

