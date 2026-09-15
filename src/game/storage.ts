import type { Difficulty } from "./types.ts";

export const STORAGE_KEY = "mini-sudoku-v1";

export type BestTimes = {
  easy: number | null;
  medium: number | null;
};

const empty: BestTimes = { easy: null, medium: null };

export function loadBestTimes(): BestTimes {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...empty };
    const parsed = JSON.parse(raw) as Partial<BestTimes>;
    return {
      easy: typeof parsed.easy === "number" && parsed.easy > 0 ? parsed.easy : null,
      medium: typeof parsed.medium === "number" && parsed.medium > 0 ? parsed.medium : null,
    };
  } catch {
    return { ...empty };
  }
}

export function recordBestTime(difficulty: Difficulty, seconds: number): BestTimes {
  const current = loadBestTimes();
  const prev = current[difficulty];
  if (prev === null || seconds < prev) {
    current[difficulty] = seconds;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  }
  return current;
}

export function formatTime(totalSeconds: number | null): string {
  if (totalSeconds === null || !Number.isFinite(totalSeconds)) return "—";
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
