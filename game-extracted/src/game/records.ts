/* Recordes salvos no localStorage (por ranger) */
const KEY = "pr2.records";

export interface RecordsData {
  best: Record<string, number>;
}

export function loadRecords(): RecordsData {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.best === "object") return parsed as RecordsData;
    }
  } catch {
    /* ignore */
  }
  return { best: {} };
}

export interface ScoreResult {
  score: number;
  best: number;
  isNew: boolean;
}

export function submitScore(charKey: string, score: number): ScoreResult {
  const rec = loadRecords();
  const prev = rec.best[charKey] || 0;
  const isNew = score > 0 && score > prev;
  if (isNew) rec.best[charKey] = score;
  try {
    localStorage.setItem(KEY, JSON.stringify(rec));
  } catch {
    /* ignore */
  }
  return { score, best: Math.max(prev, score), isNew };
}
