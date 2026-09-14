import { beforeEach, describe, expect, it, vi } from "vitest";

/** stub mínimo de localStorage */
function stubStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    clear: () => map.clear(),
  };
}

describe("records", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", stubStorage());
  });

  it("grava novo recorde e devolve isNew", async () => {
    const { submitScore } = await import("../records");
    const r1 = submitScore("red", 1500);
    expect(r1.isNew).toBe(true);
    expect(r1.best).toBe(1500);
    const r2 = submitScore("red", 900);
    expect(r2.isNew).toBe(false);
    expect(r2.best).toBe(1500);
    const r3 = submitScore("red", 2000);
    expect(r3.isNew).toBe(true);
    expect(r3.best).toBe(2000);
  });

  it("separa recordes por ranger", async () => {
    const { submitScore, loadRecords } = await import("../records");
    submitScore("red", 1000);
    submitScore("blue", 2000);
    const rec = loadRecords();
    expect(rec.best.red).toBe(1000);
    expect(rec.best.blue).toBe(2000);
  });
});

describe("settings", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", stubStorage());
  });

  it("usa padrões e persiste mudanças", async () => {
    const { settings, setSetting } = await import("../settings");
    expect(settings.music).toBe(true);
    expect(settings.reducedFx).toBe(false);
    setSetting("music", false);
    expect(settings.music).toBe(false);
    const raw = JSON.parse(localStorage.getItem("pr2.settings")!);
    expect(raw.music).toBe(false);
  });
});
