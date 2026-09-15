/// <reference types="vite/client" />

interface MiniSudokuProbe {
  fillSolution: () => void;
  getBest: () => { easy: number | null; medium: number | null };
  getElapsed: () => number;
  hasProgress: () => boolean;
  getProgress: () => unknown;
}

interface Window {
  __miniSudoku?: MiniSudokuProbe;
}