import { describe, expect, it } from "vitest";
import {
  comboNext,
  diffMods,
  midiToFreq,
  pushOutCalc,
  retractState,
  scaledWaves,
} from "../logic";

describe("comboNext", () => {
  it("avança 1→2→3 e reinicia", () => {
    expect(comboNext(0)).toBe(1);
    expect(comboNext(1)).toBe(2);
    expect(comboNext(2)).toBe(3);
    expect(comboNext(3)).toBe(0);
  });
});

describe("retractState (espinhos retráteis)", () => {
  it("começa baixo", () => {
    expect(retractState(0)).toEqual({ warn: false, up: false });
    expect(retractState(2.1)).toEqual({ warn: false, up: false });
  });
  it("avisa antes de subir", () => {
    expect(retractState(2.5)).toEqual({ warn: true, up: false });
  });
  it("fica erguido após o aviso", () => {
    expect(retractState(3.0)).toEqual({ warn: false, up: true });
    expect(retractState(4.1)).toEqual({ warn: false, up: true });
  });
  it("repete o ciclo", () => {
    expect(retractState(4.3)).toEqual({ warn: false, up: false });
    expect(retractState(6.7)).toEqual({ warn: true, up: false });
  });
});

describe("pushOutCalc", () => {
  it("não faz nada sem sobreposição", () => {
    const r = pushOutCalc(100, 0.5, 0, 0.5, 20, 0.08);
    expect(r.axis).toBeNull();
  });
  it("empurra pelo menor eixo (x)", () => {
    // lutador à direita do objeto, sobreposto em x mas não em z? Força overlap:
    const r = pushOutCalc(30, 0.5, 0, 0.5, 20, 0.08); // |dx|=30 < 20+14 → overlap em x; dz=0
    expect(r.axis).toBe("x");
    expect(r.dx).toBeGreaterThan(0);
    expect(r.dz).toBe(0);
  });
  it("empurra pelo eixo z quando mais barato", () => {
    // |dx|=33 → oxd=1px; |dz|=0.13 → ozd=0.8px < 1 → eixo z vence
    const r = pushOutCalc(33, 0.63, 0, 0.5, 20, 0.08);
    expect(r.axis).toBe("z");
    expect(r.dz).toBeGreaterThan(0);
  });
});

describe("dificuldade", () => {
  it("tem continues decrescentes", () => {
    expect(diffMods("easy").continues).toBe(3);
    expect(diffMods("normal").continues).toBe(2);
    expect(diffMods("hard").continues).toBe(1);
  });
  it("desconhecido cai no normal", () => {
    expect(diffMods("sei la")).toEqual(diffMods("normal"));
  });
  it("escala ondas com mínimo de 1", () => {
    expect(scaledWaves([3, 5], 0.8)).toEqual([2, 4]);
    expect(scaledWaves([6, 8, 9], 1.25)).toEqual([8, 10, 11]);
    expect(scaledWaves([2, 1], 0.1)).toEqual([1, 1]);
  });
});

describe("midiToFreq", () => {
  it("converte notas corretamente", () => {
    expect(midiToFreq(69)).toBeCloseTo(440);
    expect(midiToFreq(81)).toBeCloseTo(880);
    expect(midiToFreq(57)).toBeCloseTo(220);
  });
});
