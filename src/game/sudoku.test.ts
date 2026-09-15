import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canPlace,
  cloneGrid,
  conflictSet,
  countSolutions,
  generatePuzzle,
  isCompleteAndValid,
} from "./sudoku.ts";
import { SIZE, type Digit, type Grid } from "./types.ts";

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function filledCount(grid: Grid): number {
  return grid.flat().filter((n) => n !== 0).length;
}

describe("6×6 mini sudoku generator", () => {
  it("builds unique easy and medium puzzles", () => {
    for (const difficulty of ["easy", "medium"] as const) {
      const puzzle = generatePuzzle(difficulty, mulberry32(difficulty === "easy" ? 11 : 29));
      assert.equal(puzzle.solution.length, SIZE);
      assert.equal(isCompleteAndValid(puzzle.solution), true);
      assert.equal(countSolutions(cloneGrid(puzzle.givens), 2), 1);
      const clues = filledCount(puzzle.givens);
      assert.ok(clues <= (difficulty === "easy" ? 24 : 20), `${difficulty} has ${clues} clues`);
      assert.ok(clues >= (difficulty === "easy" ? 18 : 12), `${difficulty} has ${clues} clues`);
    }
  });

  it("flags row, column, and 2×3 box conflicts", () => {
    const grid = generatePuzzle("easy", mulberry32(7)).solution;
    grid[0][1] = grid[0][0];
    const hits = conflictSet(grid);
    assert.ok(hits.has(0));
    assert.ok(hits.has(1));
  });

  it("rejects a duplicate in the same 2×3 box", () => {
    const grid = generatePuzzle("easy", mulberry32(3)).solution;
    const value = grid[0][0] as Digit;
    grid[1][2] = 0;
    assert.equal(canPlace(grid, 1, 2, value), false);
  });
});
