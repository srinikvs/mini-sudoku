import { SIZE, type CellValue, type Difficulty, type Grid, type Move } from "./types.ts";

export const STORAGE_KEY = "mini-sudoku-v1";
export const SAVE_VERSION = 2;

export type BestTimes = {
  easy: number | null;
  medium: number | null;
};

export type SavedProgress = {
  difficulty: Difficulty;
  givens: Grid;
  grid: Grid;
  notes: number[][];
  selected: [number, number] | null;
  pencil: boolean;
  history: Move[];
  elapsed: number;
  solution: Grid;
};

export type Store = {
  version: number;
  easy: number | null;
  medium: number | null;
  progress: SavedProgress | null;
};

const emptyStore = (): Store => ({
  version: SAVE_VERSION,
  easy: null,
  medium: null,
  progress: null,
});

function asBest(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.floor(value) : null;
}

function isCellValue(value: unknown): value is CellValue {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 6;
}

function isGrid(value: unknown): value is Grid {
  if (!Array.isArray(value) || value.length !== SIZE) return false;
  return value.every(
    (row) => Array.isArray(row) && row.length === SIZE && row.every((cell) => isCellValue(cell)),
  );
}

function isNotes(value: unknown): value is number[][] {
  if (!Array.isArray(value) || value.length !== SIZE) return false;
  return value.every(
    (row) =>
      Array.isArray(row) &&
      row.length === SIZE &&
      row.every((mask) => typeof mask === "number" && Number.isInteger(mask) && mask >= 0),
  );
}

function isSelected(value: unknown): value is [number, number] | null {
  if (value === null) return true;
  if (!Array.isArray(value) || value.length !== 2) return false;
  const [row, col] = value;
  return (
    typeof row === "number" &&
    typeof col === "number" &&
    Number.isInteger(row) &&
    Number.isInteger(col) &&
    row >= 0 &&
    row < SIZE &&
    col >= 0 &&
    col < SIZE
  );
}

function isMove(value: unknown): value is Move {
  if (!value || typeof value !== "object") return false;
  const move = value as Move;
  return (
    typeof move.row === "number" &&
    Number.isInteger(move.row) &&
    move.row >= 0 &&
    move.row < SIZE &&
    typeof move.col === "number" &&
    Number.isInteger(move.col) &&
    move.col >= 0 &&
    move.col < SIZE &&
    isCellValue(move.prevValue) &&
    isCellValue(move.nextValue) &&
    typeof move.prevNotes === "number" &&
    Number.isInteger(move.prevNotes) &&
    move.prevNotes >= 0 &&
    typeof move.nextNotes === "number" &&
    Number.isInteger(move.nextNotes) &&
    move.nextNotes >= 0
  );
}

function isDifficulty(value: unknown): value is Difficulty {
  return value === "easy" || value === "medium";
}

export function parseProgress(value: unknown): SavedProgress | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<SavedProgress>;
  if (!isDifficulty(raw.difficulty)) return null;
  if (!isGrid(raw.givens) || !isGrid(raw.grid) || !isGrid(raw.solution)) return null;
  if (!isNotes(raw.notes)) return null;
  if (!isSelected(raw.selected ?? null)) return null;
  if (!Array.isArray(raw.history) || !raw.history.every(isMove)) return null;
  if (typeof raw.elapsed !== "number" || !Number.isFinite(raw.elapsed) || raw.elapsed < 0) return null;
  return {
    difficulty: raw.difficulty,
    givens: raw.givens,
    grid: raw.grid,
    notes: raw.notes,
    selected: raw.selected ?? null,
    pencil: Boolean(raw.pencil),
    history: raw.history,
    elapsed: Math.floor(raw.elapsed),
    solution: raw.solution,
  };
}

export function loadStore(): Store {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw) as Partial<Store> & Partial<BestTimes>;
    if (!parsed || typeof parsed !== "object") return emptyStore();
    return {
      version: SAVE_VERSION,
      easy: asBest(parsed.easy),
      medium: asBest(parsed.medium),
      progress: parseProgress(parsed.progress),
    };
  } catch {
    return emptyStore();
  }
}

function writeStore(store: Store): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: SAVE_VERSION,
        easy: store.easy,
        medium: store.medium,
        progress: store.progress,
      }),
    );
  } catch {
    /* private mode / quota */
  }
}

export function loadBestTimes(): BestTimes {
  const store = loadStore();
  return { easy: store.easy, medium: store.medium };
}

export function recordBestTime(difficulty: Difficulty, seconds: number): BestTimes {
  const store = loadStore();
  const prev = store[difficulty];
  if (prev === null || seconds < prev) {
    store[difficulty] = seconds;
    writeStore(store);
  }
  return { easy: store.easy, medium: store.medium };
}

export function loadProgress(): SavedProgress | null {
  return loadStore().progress;
}

export function saveProgress(progress: SavedProgress): void {
  const parsed = parseProgress(progress);
  if (!parsed) return;
  const store = loadStore();
  store.progress = parsed;
  writeStore(store);
}

export function clearProgress(): void {
  const store = loadStore();
  if (!store.progress) return;
  store.progress = null;
  writeStore(store);
}

export function formatTime(totalSeconds: number | null): string {
  if (totalSeconds === null || !Number.isFinite(totalSeconds)) return "—";
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
