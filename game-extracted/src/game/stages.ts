/* Definições das 6 fases: ondas, inimigos, perigos dinâmicos, objetos e ambiente. */
import type { EnemyKind } from "./sprites";

/* ---------------- stage / hazard definitions ---------------- */

export type HazardType = "girder" | "fire" | "spark";

export interface HazardDef {
  type: HazardType;
  every: [number, number];
  dmg: number;
}

export type ObjKind = "spikes" | "retract" | "ooze" | "crate" | "barrel" | "firebarrel";

export interface ObjDef {
  kind: ObjKind;
  x: number; // fraction of world width
  z: number; // 0..1
}

export type Ambient = "dust" | "embers" | "sparkles" | "none";

export interface StageDef {
  img: string;
  imgW: number;
  name: string;
  waves: number[];
  enemies: EnemyKind[];
  hazard?: HazardDef;
  objects: ObjDef[];
  ambient: Ambient;
}

export const STAGES: StageDef[] = [
  {
    img: "stage1",
    imgW: 2048,
    name: "OBRAS DA CIDADE",
    waves: [3, 5],
    enemies: ["putty"],
    ambient: "dust",
    objects: [
      { kind: "crate", x: 0.17, z: 0.72 },
      { kind: "crate", x: 0.19, z: 0.3 },
      { kind: "barrel", x: 0.4, z: 0.5 },
      { kind: "spikes", x: 0.58, z: 0.25 },
      { kind: "crate", x: 0.76, z: 0.62 },
      { kind: "barrel", x: 0.9, z: 0.3 },
    ],
  },
  {
    img: "stage2",
    imgW: 1920,
    name: "PARQUE DE DIVERSÕES",
    waves: [4, 6],
    enemies: ["putty"],
    ambient: "none",
    objects: [
      { kind: "ooze", x: 0.22, z: 0.5 },
      { kind: "crate", x: 0.4, z: 0.28 },
      { kind: "retract", x: 0.55, z: 0.62 },
      { kind: "barrel", x: 0.7, z: 0.5 },
      { kind: "ooze", x: 0.85, z: 0.4 },
      { kind: "crate", x: 0.93, z: 0.7 },
    ],
  },
  {
    img: "stage3",
    imgW: 2048,
    name: "RODOVIA DA PONTE",
    waves: [5, 7],
    enemies: ["putty", "skelerena"],
    ambient: "none",
    objects: [
      { kind: "firebarrel", x: 0.2, z: 0.2 },
      { kind: "spikes", x: 0.38, z: 0.72 },
      { kind: "barrel", x: 0.5, z: 0.4 },
      { kind: "barrel", x: 0.53, z: 0.78 },
      { kind: "firebarrel", x: 0.7, z: 0.8 },
      { kind: "crate", x: 0.85, z: 0.5 },
    ],
  },
  {
    img: "stage4",
    imgW: 2048,
    name: "OBRAS AO ENTARDECER",
    waves: [5, 6, 7],
    enemies: ["putty", "skelerena"],
    hazard: { type: "girder", every: [4, 7], dmg: 16 },
    ambient: "dust",
    objects: [
      { kind: "spikes", x: 0.15, z: 0.5 },
      { kind: "crate", x: 0.3, z: 0.25 },
      { kind: "barrel", x: 0.45, z: 0.6 },
      { kind: "retract", x: 0.6, z: 0.35 },
      { kind: "spikes", x: 0.75, z: 0.8 },
      { kind: "crate", x: 0.88, z: 0.5 },
      { kind: "barrel", x: 0.93, z: 0.2 },
    ],
  },
  {
    img: "stage5",
    imgW: 1920,
    name: "PARQUE À NOITE",
    waves: [6, 7, 8],
    enemies: ["putty", "oozeman"],
    hazard: { type: "spark", every: [3.5, 6], dmg: 12 },
    ambient: "sparkles",
    objects: [
      { kind: "ooze", x: 0.15, z: 0.6 },
      { kind: "retract", x: 0.3, z: 0.4 },
      { kind: "crate", x: 0.42, z: 0.72 },
      { kind: "ooze", x: 0.55, z: 0.3 },
      { kind: "retract", x: 0.68, z: 0.7 },
      { kind: "barrel", x: 0.8, z: 0.5 },
      { kind: "ooze", x: 0.9, z: 0.5 },
    ],
  },
  {
    img: "stage6",
    imgW: 2048,
    name: "PONTE EM CHAMAS",
    waves: [6, 8, 9],
    enemies: ["putty", "skelerena", "oozeman"],
    hazard: { type: "fire", every: [3, 5.5], dmg: 14 },
    ambient: "embers",
    objects: [
      { kind: "firebarrel", x: 0.12, z: 0.3 },
      { kind: "spikes", x: 0.25, z: 0.62 },
      { kind: "ooze", x: 0.38, z: 0.4 },
      { kind: "barrel", x: 0.5, z: 0.5 },
      { kind: "firebarrel", x: 0.6, z: 0.76 },
      { kind: "spikes", x: 0.72, z: 0.25 },
      { kind: "ooze", x: 0.82, z: 0.6 },
      { kind: "firebarrel", x: 0.9, z: 0.4 },
      { kind: "crate", x: 0.95, z: 0.7 },
    ],
  },
];

export const OBJ_SIZE: Record<ObjKind, { w: number; zr: number }> = {
  spikes: { w: 62, zr: 0.13 },
  retract: { w: 54, zr: 0.12 },
  ooze: { w: 84, zr: 0.22 },
  crate: { w: 22, zr: 0.09 },
  barrel: { w: 20, zr: 0.08 },
  firebarrel: { w: 20, zr: 0.08 },
};

