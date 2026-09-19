import { SAVE_VERSION, STORAGE_KEY, type SavedProgress, type Store } from "../../src/game/storage.ts";
import { SIZE, type CellValue, type Grid } from "../../src/game/types.ts";

export { STORAGE_KEY, SAVE_VERSION };

export const FIXTURE_GIVENS: Grid = [
  [1, 0, 4, 3, 5, 0],
  [5, 0, 2, 4, 6, 0],
  [0, 1, 0, 6, 2, 3],
  [3, 0, 0, 5, 0, 4],
  [0, 0, 1, 2, 3, 5],
  [0, 5, 3, 1, 0, 0],
];

export const FIXTURE_SOLUTION: Grid = [
  [1, 6, 4, 3, 5, 2],
  [5, 3, 2, 4, 6, 1],
  [4, 1, 5, 6, 2, 3],
  [3, 2, 6, 5, 1, 4],
  [6, 4, 1, 2, 3, 5],
  [2, 5, 3, 1, 4, 6],
];

/** Solution minus the first player cell (0,1) = 6. */
export const ONE_AWAY_GRID: Grid = [
  [1, 0, 4, 3, 5, 2],
  [5, 3, 2, 4, 6, 1],
  [4, 1, 5, 6, 2, 3],
  [3, 2, 6, 5, 1, 4],
  [6, 4, 1, 2, 3, 5],
  [2, 5, 3, 1, 4, 6],
];

/** Givens plus the first player cell filled. */
export const MID_GAME_GRID: Grid = [
  [1, 6, 4, 3, 5, 0],
  [5, 0, 2, 4, 6, 0],
  [0, 1, 0, 6, 2, 3],
  [3, 0, 0, 5, 0, 4],
  [0, 0, 1, 2, 3, 5],
  [0, 5, 3, 1, 0, 0],
];

export const LAST_CELL = { row: 0, col: 1, digit: 6 as CellValue };

export function emptyNotes(): number[][] {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
}

export function makeProgress(overrides: Partial<SavedProgress> = {}): SavedProgress {
  return {
    difficulty: "easy",
    givens: FIXTURE_GIVENS.map((row) => row.slice()) as Grid,
    grid: FIXTURE_GIVENS.map((row) => row.slice()) as Grid,
    notes: emptyNotes(),
    selected: null,
    pencil: false,
    history: [],
    elapsed: 0,
    solution: FIXTURE_SOLUTION.map((row) => row.slice()) as Grid,
    ...overrides,
  };
}

export function makeStore(overrides: Partial<Store> = {}): Store {
  return {
    version: SAVE_VERSION,
    easy: null,
    medium: null,
    progress: null,
    ...overrides,
  };
}

export type SeedPreset = "playable" | "oneAway" | "midGame";

export function progressForPreset(preset: SeedPreset): SavedProgress {
  if (preset === "oneAway") {
    return makeProgress({
      grid: ONE_AWAY_GRID.map((row) => row.slice()) as Grid,
      selected: [LAST_CELL.row, LAST_CELL.col],
      elapsed: 0,
    });
  }
  if (preset === "midGame") {
    return makeProgress({
      grid: MID_GAME_GRID.map((row) => row.slice()) as Grid,
      selected: [LAST_CELL.row, LAST_CELL.col],
      elapsed: 12,
      history: [
        {
          row: LAST_CELL.row,
          col: LAST_CELL.col,
          prevValue: 0,
          nextValue: LAST_CELL.digit,
          prevNotes: 0,
          nextNotes: 0,
        },
      ],
    });
  }
  return makeProgress();
}
