import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import {
  SAVE_VERSION,
  STORAGE_KEY,
  clearProgress,
  loadBestTimes,
  loadProgress,
  loadStore,
  parseProgress,
  recordBestTime,
  saveProgress,
  type SavedProgress,
} from "./storage.ts";
import { emptyGrid, generatePuzzle } from "./sudoku.ts";
import { SIZE, type Grid } from "./types.ts";

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function mockStorage() {
  const map = new Map<string, string>();
  const storage = {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
    clear: () => map.clear(),
    key: (index: number) => [...map.keys()][index] ?? null,
    get length() {
      return map.size;
    },
  };
  Object.defineProperty(globalThis, "localStorage", {
    value: storage,
    configurable: true,
  });
}

function sampleProgress(overrides: Partial<SavedProgress> = {}): SavedProgress {
  const puzzle = generatePuzzle("medium", mulberry32(42));
  const grid = puzzle.givens.map((row) => row.slice()) as Grid;
  grid[0][0] = grid[0][0] === 0 ? 1 : grid[0][0];
  const notes = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
  notes[5][5] = 1 << 3;
  return {
    difficulty: "medium",
    givens: puzzle.givens,
    grid,
    notes,
    selected: [2, 3],
    pencil: true,
    history: [
      {
        row: 2,
        col: 3,
        prevValue: 0,
        nextValue: 4,
        prevNotes: 0,
        nextNotes: 0,
      },
    ],
    elapsed: 87,
    solution: puzzle.solution,
    ...overrides,
  };
}

beforeEach(() => {
  mockStorage();
});

describe("mini-sudoku storage", () => {
  it("migrates v1 best times and keeps them when saving progress", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ easy: 54, medium: 142 }));
    assert.deepEqual(loadBestTimes(), { easy: 54, medium: 142 });
    saveProgress(sampleProgress());
    const store = loadStore();
    assert.equal(store.version, SAVE_VERSION);
    assert.equal(store.easy, 54);
    assert.equal(store.medium, 142);
    assert.equal(store.progress?.difficulty, "medium");
    assert.equal(store.progress?.elapsed, 87);
    assert.deepEqual(store.progress?.selected, [2, 3]);
  });

  it("restores the same board, notes, timer, and selected cell", () => {
    const progress = sampleProgress();
    saveProgress(progress);
    const loaded = loadProgress();
    assert.ok(loaded);
    assert.deepEqual(loaded, {
      ...progress,
      elapsed: 87,
    });
  });

  it("clears in-progress save without dropping BEST times", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ easy: 40, medium: null }));
    saveProgress(sampleProgress({ difficulty: "easy", elapsed: 12 }));
    recordBestTime("easy", 33);
    clearProgress();
    assert.equal(loadProgress(), null);
    assert.deepEqual(loadBestTimes(), { easy: 33, medium: null });
  });

  it("rejects corrupt progress instead of crashing", () => {
    assert.equal(parseProgress({ difficulty: "hard" }), null);
    assert.equal(parseProgress({ difficulty: "easy", givens: emptyGrid() }), null);
    saveProgress({
      difficulty: "easy",
      givens: emptyGrid(),
      grid: emptyGrid(),
      notes: [],
      selected: [9, 9],
      pencil: false,
      history: [],
      elapsed: 1,
      solution: emptyGrid(),
    });
    assert.equal(loadProgress(), null);
  });
});
