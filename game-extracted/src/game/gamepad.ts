/* Gamepad API — mapeia controles padrão para as mesmas ações do teclado.
   Controle 1 → Jogador 1, controle 2 → Jogador 2 (co-op).
   Mapeamento (layout Xbox): A=pulo, X=soco, Y=chute, B=arma,
   LB=morfar, Start=pausa, D-pad/analógico=movimento. */
import type { Game, TouchAction } from "./engine";

interface PadState {
  holdButtons: Set<string>;
}

const PAD_TO_PLAYER = [0, 1];

export function pollGamepads(game: Game | null): void {
  if (typeof navigator === "undefined" || !navigator.getGamepads) return;
  const pads = navigator.getGamepads();
  for (const pad of pads) {
    if (!pad) continue;
    let st = (pad as unknown as { pr2State?: PadState }).pr2State;
    if (!st) {
      st = { holdButtons: new Set() };
      (pad as unknown as { pr2State: PadState }).pr2State = st;
    }
    const pIdx = PAD_TO_PLAYER[pad.index] ?? 0;

    // direcional (analógico + D-pad)
    const dirs: string[] = [];
    const ax = pad.axes[0] ?? 0;
    const ay = pad.axes[1] ?? 0;
    if (ax < -0.4) dirs.push("left");
    if (ax > 0.4) dirs.push("right");
    if (ay < -0.4) dirs.push("up");
    if (ay > 0.4) dirs.push("down");
    const dMap = [12, 13, 14, 15]; // cima, baixo, esquerda, direita
    for (const idx of dMap) {
      if (!pad.buttons[idx]?.pressed) continue;
      if (idx === 12) dirs.push("up");
      if (idx === 13) dirs.push("down");
      if (idx === 14) dirs.push("left");
      if (idx === 15) dirs.push("right");
    }
    for (const d of ["left", "right", "up", "down"]) {
      const key = "dpad:" + d;
      if (dirs.includes(d) && !st.holdButtons.has(key)) {
        st.holdButtons.add(key);
        game?.press(d, pIdx);
      }
    }
    for (const held of [...st.holdButtons]) {
      if (held.startsWith("dpad:") && !dirs.includes(held.slice(5))) {
        st.holdButtons.delete(held);
        game?.release(held.slice(5), pIdx);
      }
    }

    // botões de ação (disparam na borda de subida)
    const buttons: Record<string, TouchAction | "pause"> = {
      b0: "jump",
      b1: "special",
      b2: "punch",
      b3: "kick",
      b4: "morph",
      b9: "pause",
    };
    for (const [idx, action] of Object.entries(buttons)) {
      const b = pad.buttons[Number(idx)];
      if (!b) continue;
      const key = "btn:" + idx;
      if (b.pressed && !st.holdButtons.has(key)) {
        st.holdButtons.add(key);
        if (action === "pause") game?.togglePause();
        else game?.action(action, pIdx);
      } else if (!b.pressed) {
        st.holdButtons.delete(key);
      }
    }
  }
}
