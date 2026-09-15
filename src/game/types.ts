export const SIZE = 6;
export const BOX_ROWS = 2;
export const BOX_COLS = 3;
export const DIGITS = [1, 2, 3, 4, 5, 6] as const;

export type Digit = (typeof DIGITS)[number];
export type CellValue = 0 | Digit;
export type Grid = CellValue[][];
export type Difficulty = "easy" | "medium";
export type Notes = number[][];

export type Puzzle = {
  givens: Grid;
  solution: Grid;
  difficulty: Difficulty;
};

export type Move = {
  row: number;
  col: number;
  prevValue: CellValue;
  nextValue: CellValue;
  prevNotes: number;
  nextNotes: number;
};
