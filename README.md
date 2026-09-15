# Mini Sudoku v1.0.0

A 6×6 Playadda puzzle. Boxes are **2×3**. Digits are **1–6**. Mobile-first Vite + React + TypeScript SPA.

Play at `https://playadda.duckdns.org/mini-sudoku/` after Jenkins deploy.
Vite `base` is **`/mini-sudoku/`**.

## Playadda UX

1. Version ID (`v1.0.0`) on the how-to-play screen, the play HUD, and the win card.
2. How to play **before** play, with **Start on the same screen**.
3. **BEST** is the fastest completion time for each difficulty (Easy / Medium). It updates when you beat it.

`localStorage` key: `mini-sudoku-v1`  
Shape: `{ "easy": 87, "medium": 142 }` — values are seconds. Missing keys mean no best yet.

## Play

- Tap a cell, then tap 1–6. Tap the same number again to clear it.
- **Clear** empties the selected cell. **Undo** steps backward. **Notes** writes pencil marks.
- Conflicts in the same row, column, or 2×3 box highlight in coral.
- The puzzle wins when every cell is filled and valid.
- **New** (or a difficulty chip) deals another unique puzzle.

## Run locally

```bash
npm install
npm run dev      # http://localhost:5173/mini-sudoku/
npm test         # generator uniqueness checks
npm run build    # writes dist/
npm run preview  # http://localhost:4173/mini-sudoku/
```

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
