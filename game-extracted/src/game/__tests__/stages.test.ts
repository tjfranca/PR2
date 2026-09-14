import { describe, expect, it } from "vitest";
import { STAGES } from "../stages";

describe("STAGES", () => {
  it("tem 6 fases com ondas e inimigos", () => {
    expect(STAGES).toHaveLength(6);
    for (const st of STAGES) {
      expect(st.waves.length).toBeGreaterThan(0);
      expect(st.enemies.length).toBeGreaterThan(0);
      expect(st.imgW).toBeGreaterThan(VIEW_MIN);
      expect(st.name.length).toBeGreaterThan(0);
    }
  });
  it("objetos de fase ficam dentro dos limites do mundo", () => {
    for (const st of STAGES) {
      for (const o of st.objects) {
        expect(o.x).toBeGreaterThanOrEqual(0);
        expect(o.x).toBeLessThanOrEqual(1);
        expect(o.z).toBeGreaterThanOrEqual(0);
        expect(o.z).toBeLessThanOrEqual(1);
      }
    }
  });
  it("perigos dinâmicos têm intervalo e dano válidos", () => {
    for (const st of STAGES) {
      if (!st.hazard) continue;
      expect(st.hazard.every[1]).toBeGreaterThanOrEqual(st.hazard.every[0]);
      expect(st.hazard.dmg).toBeGreaterThan(0);
    }
  });
});

const VIEW_MIN = 100;
