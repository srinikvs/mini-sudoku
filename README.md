# Mini Sudoku v1.0.1

A 6×6 Playadda puzzle. Boxes are **2×3**. Digits are **1–6**. Mobile-first Vite + React + TypeScript SPA.

Play at `https://playadda.duckdns.org/mini-sudoku/` after Jenkins deploy.
Vite `base` is **`/mini-sudoku/`**.

## Playadda UX

1. Version ID (`v1.0.1`) on the how-to-play screen, the play HUD, and the win card.
2. How to play **before** play, with **Start on the same screen**. Difficulty (Easy / Medium) is chosen only here.
3. **BEST** is the fastest completion time for each difficulty (Easy / Medium). It updates when you beat it.
4. **← Games** (top-left) returns to the Playadda portal. During an unfinished puzzle it asks **Save**, **Discard**, or **Stay**.
5. A saved game offers **Continue** on the next visit (same board, notes, timer, selected cell). **Start fresh** deals a new puzzle.

`localStorage` key: `mini-sudoku-v1`  
Shape:

```json
{
  "version": 2,
  "easy": 87,
  "medium": 142,
  "progress": {
    "difficulty": "medium",
    "givens": [[6, 0, ...]],
    "grid": [[6, 2, ...]],
    "notes": [[0, 8, ...]],
    "selected": [2, 3],
    "pencil": false,
    "history": [],
    "elapsed": 94,
    "solution": [[6, 2, ...]]
  }
}
```

Best times are seconds. `progress` is `null` when nothing is saved. v1 `{ "easy", "medium" }` blobs still load.

## Play

- Tap a cell, then tap 1–6. Tap the same number again to clear it.
- **Clear** empties the selected cell. **Undo** steps backward. **Notes** writes pencil marks.
- Conflicts in the same row, column, or 2×3 box highlight in coral.
- The puzzle wins when every cell is filled and valid.
- Difficulty chips and **New** are hidden during play. After a win, **New puzzle** deals another of the same difficulty.

## Run locally

```bash
npm install
npm run dev      # http://localhost:5173/mini-sudoku/
npm test                 # generator + storage + JSON unit cases
npm run test:e2e         # Playwright Chromium (local preview unless BASE_URL)
npm run test:e2e:pixel   # 412×915 pixel project
npm run build            # writes dist/
npm run preview          # http://localhost:4173/mini-sudoku/
```

Automated cases live in `tests/cases/*.json`. See [TESTING.md](TESTING.md) for runners, `BASE_URL` live smoke (playaddatest + prod), and Jenkins `mini-sudoku-ci` (`DEPLOY=false`).

## Jenkins

```bash
npm ci && npm run build
```

`npm run build` runs `tsc -b && vite build --base /mini-sudoku/`.
Rsync **`dist/`** to the Playadda `/mini-sudoku/` path.

Serve the SPA so client paths do not 404:

```nginx
location /mini-sudoku/ {
    try_files $uri $uri/ /mini-sudoku/index.html;
}
```

## Stack

Vite 6 + React 19 + TypeScript. Procedural unique 6×6 generator (Easy ≈ 22 clues, Medium ≈ 16 clues).

## License

Use and modify freely for personal or commercial projects.
