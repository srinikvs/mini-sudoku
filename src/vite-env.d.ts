/// <reference types="vite/client" />

interface MiniSudokuProbe {
  fillSolution: () => void;
  getBest: () => { easy: number | null; medium: number | null };
  getElapsed: () => number;
}

interface Window {
  __miniSudoku?: MiniSudokuProbe;
}
