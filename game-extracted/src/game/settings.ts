/* Configurações persistidas (localStorage) */
export type Difficulty = "easy" | "normal" | "hard";

export interface Settings {
  music: boolean;
  sfx: boolean;
  reducedFx: boolean;
  difficulty: Difficulty;
  tutorial: boolean;
}

const KEY = "pr2.settings";
const DEFAULTS: Settings = {
  music: true,
  sfx: true,
  reducedFx: false,
  difficulty: "normal",
  tutorial: true,
};

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return { ...DEFAULTS };
}

export const settings: Settings = load();

export function saveSettings() {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    /* ignore */
  }
}

export function setSetting<K extends keyof Settings>(k: K, v: Settings[K]) {
  settings[k] = v;
  saveSettings();
}
