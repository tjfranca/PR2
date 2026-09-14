/* Constantes de tela, física e cinemática da morfagem. */
export const VIEW_W = 960;
export const VIEW_H = 448; // 224 (SNES) × 2 — pixel-perfect

export const Z_MIN = 0;
export const Z_MAX = 1;
// ground line is calibrated to the SNES sheets (224 tall): the scenery’s
// playable floor begins at y=176 and extends to y=216 (240×2 in our 448-tall view).
export const GROUND_TOP = 352; // = 176 × 2
export const GROUND_BOT = 432; // = 216 × 2
export const ZPX = GROUND_BOT - GROUND_TOP; // screen px per z unit
export const SCALE = 2;
export const GRAV = 2600;

// morph cinematic timings (seconds)
export const MORPH_DUR = 2.9;
export const MORPH_ARM_UP = 0.9; // arm thrust to the sky
export const MORPH_STRIKE = 1.7; // lightning strike + transformation
