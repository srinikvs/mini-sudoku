import {
  BOX_COLS,
  BOX_ROWS,
  DIGITS,
  SIZE,
  type CellValue,
  type Difficulty,
  type Digit,
  type Grid,
  type Puzzle,
} from "./types.ts";

export function emptyGrid(): Grid {
  return Array.from({ length: SIZE }, () => Array<CellValue>(SIZE).fill(0));
}

export function cloneGrid(grid: Grid): Grid {
  return grid.map((row) => row.slice()) as Grid;
}

export function boxOrigin(row: number, col: number): [number, number] {
  return [Math.floor(row / BOX_ROWS) * BOX_ROWS, Math.floor(col / BOX_COLS) * BOX_COLS];
}

export function sameBox(aRow: number, aCol: number, bRow: number, bCol: number): boolean {
  const [ar, ac] = boxOrigin(aRow, aCol);
  const [br, bc] = boxOrigin(bRow, bCol);
  return ar === br && ac === bc;
}

export function canPlace(grid: Grid, row: number, col: number, value: Digit): boolean {
  for (let i = 0; i < SIZE; i++) {
    if (grid[row][i] === value || grid[i][col] === value) return false;
  }
  const [br, bc] = boxOrigin(row, col);
  for (let r = br; r < br + BOX_ROWS; r++) {
    for (let c = bc; c < bc + BOX_COLS; c++) {
      if (grid[r][c] === value) return false;
    }
  }
  return true;
}

function shuffle<T>(items: readonly T[], rng: () => number): T[] {
  const next = items.slice();
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function fillGrid(grid: Grid, rng: () => number): boolean {
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      if (grid[row][col] !== 0) continue;
      for (const value of shuffle(DIGITS, rng)) {
        if (!canPlace(grid, row, col, value)) continue;
        grid[row][col] = value;
        if (fillGrid(grid, rng)) return true;
        grid[row][col] = 0;
      }
      return false;
    }
  }
  return true;
}

export function countSolutions(grid: Grid, limit = 2): number {
  let found = 0;

  const solve = (): void => {
    if (found >= limit) return;
    for (let row = 0; row < SIZE; row++) {
      for (let col = 0; col < SIZE; col++) {
        if (grid[row][col] !== 0) continue;
        for (const value of DIGITS) {
          if (!canPlace(grid, row, col, value)) continue;
          grid[row][col] = value;
          solve();
          grid[row][col] = 0;
          if (found >= limit) return;
        }
        return;
      }
    }
    found += 1;
  };

  solve();
  return found;
}

export function isCompleteAndValid(grid: Grid): boolean {
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      const value = grid[row][col];
      if (value === 0) return false;
      grid[row][col] = 0;
      const ok = canPlace(grid, row, col, value);
      grid[row][col] = value;
      if (!ok) return false;
    }
  }
  return true;
}

export function conflictSet(grid: Grid): Set<number> {
  const hits = new Set<number>();

  const markDupes = (coords: Array<[number, number]>) => {
    const seen = new Map<number, number[]>();
    for (const [row, col] of coords) {
      const value = grid[row][col];
      if (value === 0) continue;
      const list = seen.get(value) ?? [];
      list.push(row * SIZE + col);
      seen.set(value, list);
    }
    for (const list of seen.values()) {
      if (list.length < 2) continue;
      for (const index of list) hits.add(index);
    }
  };

  for (let row = 0; row < SIZE; row++) {
    markDupes(Array.from({ length: SIZE }, (_, col) => [row, col]));
  }
  for (let col = 0; col < SIZE; col++) {
    markDupes(Array.from({ length: SIZE }, (_, row) => [row, col]));
  }
  for (let br = 0; br < SIZE; br += BOX_ROWS) {
    for (let bc = 0; bc < SIZE; bc += BOX_COLS) {
      const coords: Array<[number, number]> = [];
      for (let r = br; r < br + BOX_ROWS; r++) {
        for (let c = bc; c < bc + BOX_COLS; c++) coords.push([r, c]);
      }
      markDupes(coords);
    }
  }

  return hits;
}

const CLUES: Record<Difficulty, number> = {
  easy: 22,
  medium: 16,
};

export function generatePuzzle(difficulty: Difficulty, rng: () => number = Math.random): Puzzle {
  const solution = emptyGrid();
  if (!fillGrid(solution, rng)) {
    throw new Error("Failed to fill a 6×6 grid");
  }

  const puzzle = cloneGrid(solution);
  const cells = shuffle(
    Array.from({ length: SIZE * SIZE }, (_, i) => [Math.floor(i / SIZE), i % SIZE] as const),
    rng,
  );

  const target = CLUES[difficulty];
  let clues = SIZE * SIZE;

  for (const [row, col] of cells) {
    if (clues <= target) break;
    const saved = puzzle[row][col];
    puzzle[row][col] = 0;
    if (countSolutions(cloneGrid(puzzle), 2) === 1) {
      clues -= 1;
    } else {
      puzzle[row][col] = saved;
    }
  }

  return { givens: puzzle, solution, difficulty };
}

export function emptyNotes(): number[][] {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
}

export function toggleNoteBit(mask: number, digit: Digit): number {
  return mask ^ (1 << digit);
}

export function noteDigits(mask: number): Digit[] {
  return DIGITS.filter((digit) => (mask & (1 << digit)) !== 0);
}
