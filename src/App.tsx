import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Eraser, HelpCircle, Pencil, Sparkles, Undo2 } from "lucide-react";
import { leaveToPortal } from "./game/portal";
import {
  clearProgress,
  formatTime,
  loadBestTimes,
  loadProgress,
  recordBestTime,
  saveProgress,
  type BestTimes,
  type SavedProgress,
} from "./game/storage";
import {
  cloneGrid,
  conflictSet,
  emptyGrid,
  emptyNotes,
  generatePuzzle,
  isCompleteAndValid,
  noteDigits,
  toggleNoteBit,
} from "./game/sudoku";
import { DIGITS, SIZE, type CellValue, type Difficulty, type Digit, type Grid, type Move } from "./game/types";
import { GAME_TITLE, GAME_VERSION } from "./game/version";

type Screen = "howto" | "play";

const HOW_TO = [
  "Fill the 6×6 grid with digits 1–6. Each row, column, and 2×3 box must use every digit once.",
  "Tap a cell, then pick a number. Given clues stay locked.",
  "Conflicts light up in coral. Clear a cell or undo if you change your mind.",
  "Optional pencil notes help you track candidates. Beat your BEST time to update the score.",
];

function generateSafe(difficulty: Difficulty) {
  try {
    return generatePuzzle(difficulty);
  } catch {
    return generatePuzzle(difficulty);
  }
}

function cloneNotes(notes: number[][]): number[][] {
  return notes.map((row) => row.slice());
}

export function App() {
  const [screen, setScreen] = useState<Screen>("howto");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [best, setBest] = useState<BestTimes>(() => loadBestTimes());
  const [saved, setSaved] = useState<SavedProgress | null>(() => loadProgress());
  const [givens, setGivens] = useState<Grid>(() => emptyGrid());
  const [grid, setGrid] = useState<Grid>(() => emptyGrid());
  const [notes, setNotes] = useState<number[][]>(() => emptyNotes());
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [pencil, setPencil] = useState(false);
  const [history, setHistory] = useState<Move[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [won, setWon] = useState(false);
  const [beatBest, setBeatBest] = useState(false);
  const [busy, setBusy] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const startedAt = useRef<number | null>(null);
  const wonRef = useRef(false);
  const solutionRef = useRef<Grid>(emptyGrid());
  const elapsedRef = useRef(0);
  elapsedRef.current = elapsed;

  const conflicts = useMemo(() => conflictSet(grid), [grid]);
  const selectedValue = selected ? grid[selected[0]][selected[1]] : 0;
  const selectedGiven = selected ? givens[selected[0]][selected[1]] !== 0 : false;

  useEffect(() => {
    if (screen !== "play" || won || leaveOpen) return;
    const id = window.setInterval(() => {
      if (startedAt.current === null) return;
      setElapsed(Math.floor((Date.now() - startedAt.current) / 1000));
    }, 250);
    return () => window.clearInterval(id);
  }, [leaveOpen, screen, won]);

  const snapshotProgress = useCallback((): SavedProgress => {
    const seconds =
      startedAt.current !== null
        ? Math.max(0, Math.floor((Date.now() - startedAt.current) / 1000))
        : elapsedRef.current;
    return {
      difficulty,
      givens: cloneGrid(givens),
      grid: cloneGrid(grid),
      notes: cloneNotes(notes),
      selected,
      pencil,
      history: history.map((move) => ({ ...move })),
      elapsed: seconds,
      solution: cloneGrid(solutionRef.current),
    };
  }, [difficulty, givens, grid, history, notes, pencil, selected]);

  const applyMove = useCallback((move: Move, record: boolean) => {
    setGrid((prev) => {
      const next = cloneGrid(prev);
      next[move.row][move.col] = move.nextValue;
      return next;
    });
    setNotes((prev) => {
      const next = prev.map((row) => row.slice());
      next[move.row][move.col] = move.nextNotes;
      if (move.nextValue !== 0) {
        for (let i = 0; i < SIZE; i++) {
          next[move.row][i] &= ~(1 << move.nextValue);
          next[i][move.col] &= ~(1 << move.nextValue);
        }
        const br = Math.floor(move.row / 2) * 2;
        const bc = Math.floor(move.col / 3) * 3;
        for (let r = br; r < br + 2; r++) {
          for (let c = bc; c < bc + 3; c++) next[r][c] &= ~(1 << move.nextValue);
        }
        next[move.row][move.col] = 0;
      }
      return next;
    });
    if (record) setHistory((prev) => [...prev, move]);
  }, []);

  const startPuzzle = useCallback((nextDifficulty: Difficulty) => {
    setBusy(true);
    window.setTimeout(() => {
      const puzzle = generateSafe(nextDifficulty);
      clearProgress();
      setSaved(null);
      solutionRef.current = puzzle.solution;
      setDifficulty(nextDifficulty);
      setGivens(puzzle.givens);
      setGrid(cloneGrid(puzzle.givens));
      setNotes(emptyNotes());
      setSelected(null);
      setPencil(false);
      setHistory([]);
      setElapsed(0);
      setWon(false);
      setBeatBest(false);
      setLeaveOpen(false);
      wonRef.current = false;
      startedAt.current = Date.now();
      setScreen("play");
      setBusy(false);
    }, 20);
  }, []);

  const continuePuzzle = useCallback((progress: SavedProgress) => {
    solutionRef.current = cloneGrid(progress.solution);
    setDifficulty(progress.difficulty);
    setGivens(cloneGrid(progress.givens));
    setGrid(cloneGrid(progress.grid));
    setNotes(cloneNotes(progress.notes));
    setSelected(progress.selected);
    setPencil(progress.pencil);
    setHistory(progress.history.map((move) => ({ ...move })));
    setElapsed(progress.elapsed);
    setWon(false);
    setBeatBest(false);
    setLeaveOpen(false);
    wonRef.current = false;
    startedAt.current = Date.now() - progress.elapsed * 1000;
    setScreen("play");
  }, []);

  useEffect(() => {
    if (screen !== "play" || wonRef.current) return;
    if (!isCompleteAndValid(grid)) return;
    wonRef.current = true;
    const seconds = startedAt.current
      ? Math.max(1, Math.floor((Date.now() - startedAt.current) / 1000))
      : elapsed;
    setElapsed(seconds);
    const previous = best[difficulty];
    const nextBest = recordBestTime(difficulty, seconds);
    setBest(nextBest);
    setBeatBest(previous === null || seconds < previous);
    setWon(true);
    setSelected(null);
    clearProgress();
    setSaved(null);
  }, [best, difficulty, elapsed, grid, screen]);

  const enterDigit = useCallback(
    (digit: Digit) => {
      if (!selected || won) return;
      const [row, col] = selected;
      if (givens[row][col] !== 0) return;
      if (pencil) {
        const prevNotes = notes[row][col];
        const nextNotes = toggleNoteBit(prevNotes, digit);
        applyMove(
          { row, col, prevValue: grid[row][col], nextValue: 0, prevNotes, nextNotes },
          true,
        );
        return;
      }
      const nextValue = (grid[row][col] === digit ? 0 : digit) as CellValue;
      applyMove(
        {
          row,
          col,
          prevValue: grid[row][col],
          nextValue,
          prevNotes: notes[row][col],
          nextNotes: 0,
        },
        true,
      );
    },
    [applyMove, givens, grid, notes, pencil, selected, won],
  );

  const clearCell = useCallback(() => {
    if (!selected || won) return;
    const [row, col] = selected;
    if (givens[row][col] !== 0) return;
    if (grid[row][col] === 0 && notes[row][col] === 0) return;
    applyMove(
      {
        row,
        col,
        prevValue: grid[row][col],
        nextValue: 0,
        prevNotes: notes[row][col],
        nextNotes: 0,
      },
      true,
    );
  }, [applyMove, givens, grid, notes, selected, won]);

  const undo = useCallback(() => {
    if (won) return;
    setHistory((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setGrid((g) => {
        const next = cloneGrid(g);
        next[last.row][last.col] = last.prevValue;
        return next;
      });
      setNotes((n) => {
        const next = n.map((row) => row.slice());
        next[last.row][last.col] = last.prevNotes;
        return next;
      });
      setSelected([last.row, last.col]);
      return prev.slice(0, -1);
    });
  }, [won]);

  const pauseTimer = useCallback(() => {
    if (startedAt.current === null) return;
    const seconds = Math.max(0, Math.floor((Date.now() - startedAt.current) / 1000));
    setElapsed(seconds);
    elapsedRef.current = seconds;
    startedAt.current = null;
  }, []);

  const resumeTimer = useCallback(() => {
    if (wonRef.current || startedAt.current !== null) return;
    startedAt.current = Date.now() - elapsedRef.current * 1000;
  }, []);

  const requestLeave = useCallback(() => {
    if (screen === "play" && !wonRef.current) {
      pauseTimer();
      setLeaveOpen(true);
      return;
    }
    leaveToPortal();
  }, [pauseTimer, screen]);

  const stayHere = useCallback(() => {
    setLeaveOpen(false);
    if (screen === "play" && !wonRef.current) resumeTimer();
  }, [resumeTimer, screen]);

  const saveAndLeave = useCallback(() => {
    const progress = snapshotProgress();
    saveProgress(progress);
    setSaved(progress);
    leaveToPortal();
  }, [snapshotProgress]);

  const discardAndLeave = useCallback(() => {
    clearProgress();
    setSaved(null);
    leaveToPortal();
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (leaveOpen) {
        if (event.key === "Escape") {
          event.preventDefault();
          stayHere();
        }
        return;
      }
      if (screen !== "play" || won) return;
      if (import.meta.env.DEV && event.key === "Enter" && event.shiftKey && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setGrid(cloneGrid(solutionRef.current));
        return;
      }
      if (event.key === "z" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        undo();
        return;
      }
      if (event.key === "n" || event.key === "N") {
        setPencil((value) => !value);
        return;
      }
      if (event.key === "Backspace" || event.key === "Delete") {
        event.preventDefault();
        clearCell();
        return;
      }
      if (event.key >= "1" && event.key <= "6") {
        enterDigit(Number(event.key) as Digit);
        return;
      }
      if (!selected) return;
      const [row, col] = selected;
      const step: Record<string, [number, number]> = {
        ArrowUp: [-1, 0],
        ArrowDown: [1, 0],
        ArrowLeft: [0, -1],
        ArrowRight: [0, 1],
      };
      const delta = step[event.key];
      if (!delta) return;
      event.preventDefault();
      setSelected([(row + delta[0] + SIZE) % SIZE, (col + delta[1] + SIZE) % SIZE]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [clearCell, enterDigit, leaveOpen, screen, selected, stayHere, undo, won]);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const probe = {
      fillSolution: () => {
        setGrid(cloneGrid(solutionRef.current));
      },
      getBest: () => loadBestTimes(),
      getElapsed: () => elapsed,
      hasProgress: () => !!loadProgress(),
      getProgress: () => loadProgress(),
    };
    window.__miniSudoku = probe;
    return () => {
      delete window.__miniSudoku;
    };
  }, [elapsed]);

  const bestForDifficulty = best[difficulty];

  return (
    <div className="app" data-testid="app">
      {screen === "howto" ? (
        <StartScreen
          difficulty={difficulty}
          onDifficulty={setDifficulty}
          best={best}
          busy={busy}
          saved={saved}
          onStart={() => startPuzzle(difficulty)}
          onContinue={() => saved && continuePuzzle(saved)}
          onGames={requestLeave}
        />
      ) : (
        <PlayScreen
          difficulty={difficulty}
          best={bestForDifficulty}
          elapsed={elapsed}
          grid={grid}
          givens={givens}
          notes={notes}
          selected={selected}
          selectedValue={selectedValue}
          selectedGiven={selectedGiven}
          conflicts={conflicts}
          pencil={pencil}
          canUndo={history.length > 0 && !won}
          won={won}
          beatBest={beatBest}
          busy={busy}
          onSelect={setSelected}
          onDigit={enterDigit}
          onClear={clearCell}
          onUndo={undo}
          onPencil={() => setPencil((value) => !value)}
          onNew={() => startPuzzle(difficulty)}
          onHelp={() => setScreen("howto")}
          onGames={requestLeave}
        />
      )}
      {leaveOpen && (
        <LeaveDialog onSave={saveAndLeave} onDiscard={discardAndLeave} onStay={stayHere} />
      )}
    </div>
  );
}

function StartScreen({
  difficulty,
  onDifficulty,
  best,
  busy,
  saved,
  onStart,
  onContinue,
  onGames,
}: {
  difficulty: Difficulty;
  onDifficulty: (value: Difficulty) => void;
  best: BestTimes;
  busy: boolean;
  saved: SavedProgress | null;
  onStart: () => void;
  onContinue: () => void;
  onGames: () => void;
}) {
  return (
    <div className="start-screen" data-testid="start-screen">
      <header className="start-top">
        <GamesBack onClick={onGames} />
        <div className="brand">
          <p className="kicker">Playadda</p>
          <h1>{GAME_TITLE}</h1>
          <span className="ver-badge" data-testid="version" aria-label={`Version ${GAME_VERSION}`}>
            v{GAME_VERSION}
          </span>
        </div>
      </header>

      <p className="start-tag">A 6×6 puzzle with 2×3 boxes. Fast, tidy, and phone-first.</p>

      <div className="best-row" aria-live="polite">
        <BestChip label="BEST Easy" value={formatTime(best.easy)} testId="best-easy" />
        <BestChip label="BEST Medium" value={formatTime(best.medium)} testId="best-medium" />
      </div>

      <section className="start-card" data-testid="start-panel" aria-labelledby="howto-title">
        <div className="card-head">
          <p className="eyebrow">How to play</p>
          <span className="ver-badge ink" data-testid="howto-version" aria-label={`Version ${GAME_VERSION}`}>
            v{GAME_VERSION}
          </span>
        </div>
        <h2 id="howto-title">Fill every cell without repeats</h2>
        <ol className="howto-list" data-testid="howto">
          {HOW_TO.map((step, index) => (
            <li key={step}>
              <span className="howto-n">{index + 1}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>

        <div className="modes" role="radiogroup" aria-label="Difficulty">
          {(["easy", "medium"] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={difficulty === value}
              className={`chip${difficulty === value ? " chip-on" : ""}`}
              data-testid={`difficulty-${value}`}
              onClick={() => onDifficulty(value)}
            >
              {value}
            </button>
          ))}
        </div>

        {saved && (
          <button type="button" className="cta start-go" data-testid="continue" onClick={onContinue} disabled={busy}>
            Continue {saved.difficulty === "easy" ? "Easy" : "Medium"} · {formatTime(saved.elapsed)}
          </button>
        )}
        <button
          type="button"
          className={`cta start-go${saved ? " ghost" : ""}`}
          data-testid="start"
          onClick={onStart}
          disabled={busy}
        >
          {busy ? "Shuffling…" : saved ? "Start fresh" : "Start"}
        </button>
        <p className="start-version" data-testid="start-version">
          Playadda · v{GAME_VERSION}
        </p>
      </section>
    </div>
  );
}

function PlayScreen({
  difficulty,
  best,
  elapsed,
  grid,
  givens,
  notes,
  selected,
  selectedValue,
  selectedGiven,
  conflicts,
  pencil,
  canUndo,
  won,
  beatBest,
  busy,
  onSelect,
  onDigit,
  onClear,
  onUndo,
  onPencil,
  onNew,
  onHelp,
  onGames,
}: {
  difficulty: Difficulty;
  best: number | null;
  elapsed: number;
  grid: Grid;
  givens: Grid;
  notes: number[][];
  selected: [number, number] | null;
  selectedValue: CellValue;
  selectedGiven: boolean;
  conflicts: Set<number>;
  pencil: boolean;
  canUndo: boolean;
  won: boolean;
  beatBest: boolean;
  busy: boolean;
  onSelect: (cell: [number, number]) => void;
  onDigit: (digit: Digit) => void;
  onClear: () => void;
  onUndo: () => void;
  onPencil: () => void;
  onNew: () => void;
  onHelp: () => void;
  onGames: () => void;
}) {
  return (
    <div className="play-screen" data-testid="play-screen">
      <header className="topbar">
        <GamesBack onClick={onGames} />
        <div className="brand compact">
          <p className="kicker">Playadda</p>
          <h1>{GAME_TITLE}</h1>
          <span className="ver-badge" data-testid="version" aria-label={`Version ${GAME_VERSION}`}>
            v{GAME_VERSION}
          </span>
        </div>
        <button type="button" className="icon-btn" aria-label="How to play" onClick={onHelp}>
          <HelpCircle size={20} strokeWidth={2} />
        </button>
      </header>

      <div className="hud" data-testid="hud">
        <div className={`best-chip${beatBest && won ? " is-hot" : ""}`} data-testid="best" aria-live="polite">
          <span className="stat-label">BEST</span>
          <span className="stat-value">{formatTime(best)}</span>
        </div>
        <div className="best-chip" data-testid="time">
          <span className="stat-label">TIME</span>
          <span className="stat-value">{formatTime(elapsed)}</span>
        </div>
      </div>

      <div className="paper-wrap">
        <div className="board" data-testid="board" role="grid" aria-label="Mini Sudoku board">
          {Array.from({ length: 3 }, (_, boxRow) =>
            Array.from({ length: 2 }, (_, boxCol) => (
              <div className="box" key={`${boxRow}-${boxCol}`} role="presentation">
                {Array.from({ length: 2 }, (_, localRow) =>
                  Array.from({ length: 3 }, (_, localCol) => {
                    const row = boxRow * 2 + localRow;
                    const col = boxCol * 3 + localCol;
                    const value = grid[row][col];
                    const given = givens[row][col] !== 0;
                    const index = row * SIZE + col;
                    const isSelected = selected?.[0] === row && selected?.[1] === col;
                    const same = selectedValue !== 0 && value === selectedValue;
                    const related =
                      selected !== null &&
                      (selected[0] === row || selected[1] === col || sameBoxAs(selected, row, col));
                    const classes = [
                      "cell",
                      given ? "cell-given" : "",
                      isSelected ? "cell-on" : "",
                      same && !isSelected ? "cell-same" : "",
                      related && !isSelected && !same ? "cell-related" : "",
                      conflicts.has(index) ? "cell-error" : "",
                      won ? "cell-won" : "",
                    ]
                      .filter(Boolean)
                      .join(" ");
                    return (
                      <button
                        key={index}
                        type="button"
                        role="gridcell"
                        aria-selected={isSelected}
                        aria-label={`Row ${row + 1}, column ${col + 1}${value ? `, ${value}` : ", empty"}`}
                        className={classes}
                        data-testid={`cell-${row}-${col}`}
                        onClick={() => onSelect([row, col])}
                      >
                        {value !== 0 ? (
                          <span className="digit">{value}</span>
                        ) : (
                          <span className="notes">
                            {noteDigits(notes[row][col]).map((digit) => (
                              <span key={digit}>{digit}</span>
                            ))}
                          </span>
                        )}
                      </button>
                    );
                  }),
                )}
              </div>
            )),
          )}
        </div>
      </div>

      <div className="pad" data-testid="pad" role="group" aria-label="Number pad">
        {DIGITS.map((digit) => (
          <button
            key={digit}
            type="button"
            className={`pad-btn${selectedValue === digit ? " pad-on" : ""}`}
            data-testid={`pad-${digit}`}
            onClick={() => onDigit(digit)}
            disabled={won || selectedGiven}
          >
            {digit}
          </button>
        ))}
      </div>

      <div className="toolbar" data-testid="toolbar">
        <button type="button" className="tool" onClick={onUndo} disabled={!canUndo}>
          <Undo2 size={16} />
          Undo
        </button>
        <button type="button" className="tool" onClick={onClear} disabled={won || selectedGiven}>
          <Eraser size={16} />
          Clear
        </button>
        <button
          type="button"
          className={`tool${pencil ? " tool-on" : ""}`}
          aria-pressed={pencil}
          onClick={onPencil}
          disabled={won}
        >
          <Pencil size={16} />
          Notes
        </button>
      </div>

      {won && (
        <div className="win-screen" role="dialog" aria-labelledby="win-title" aria-modal="true">
          <div className="win-card" data-testid="win-card">
            <p className="kicker">{beatBest ? "New BEST time" : "Puzzle complete"}</p>
            <h2 id="win-title">{beatBest ? "You beat your best" : "Nicely solved"}</h2>
            <p className="win-time">{formatTime(elapsed)}</p>
            <p className="win-sub" data-testid="win-version">
              BEST {formatTime(best)} · {difficulty} · v{GAME_VERSION}
            </p>
            <button type="button" className="cta" data-testid="new-puzzle" onClick={onNew} disabled={busy}>
              <Sparkles size={16} />
              New puzzle
            </button>
            <button type="button" className="cta ghost" onClick={onHelp}>
              How to play
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function LeaveDialog({
  onSave,
  onDiscard,
  onStay,
}: {
  onSave: () => void;
  onDiscard: () => void;
  onStay: () => void;
}) {
  return (
    <div className="leave-screen" data-testid="leave-dialog" role="dialog" aria-labelledby="leave-title" aria-modal="true">
      <div className="leave-card">
        <p className="kicker">Leave puzzle</p>
        <h2 id="leave-title">Save this game?</h2>
        <p className="leave-copy">
          Save keeps this board, notes, and timer for next time. Discard throws the puzzle away.
        </p>
        <button type="button" className="cta" data-testid="leave-save" onClick={onSave}>
          Save
        </button>
        <button type="button" className="cta ghost danger" data-testid="leave-discard" onClick={onDiscard}>
          Discard
        </button>
        <button type="button" className="cta ghost" data-testid="leave-stay" onClick={onStay}>
          Stay
        </button>
      </div>
    </div>
  );
}

function GamesBack({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="games-back" data-testid="games-back" onClick={onClick} aria-label="Back to Games">
      ← Games
    </button>
  );
}

function BestChip({ label, value, testId }: { label: string; value: string; testId?: string }) {
  return (
    <div className="best-chip" data-testid={testId}>
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
    </div>
  );
}

function sameBoxAs(selected: [number, number], row: number, col: number): boolean {
  return Math.floor(selected[0] / 2) === Math.floor(row / 2) && Math.floor(selected[1] / 3) === Math.floor(col / 3);
}
