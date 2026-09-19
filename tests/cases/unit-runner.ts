import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  STORAGE_KEY,
  loadBestTimes,
  loadProgress,
  recordBestTime,
  saveProgress,
} from "../../src/game/storage.ts";
import { GAME_VERSION } from "../../src/game/version.ts";
import type { Difficulty } from "../../src/game/types.ts";
import { makeProgress, makeStore, progressForPreset, type SeedPreset } from "./fixtures.ts";
import type { CaseFile, Expectation, Step } from "./types.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");

const mem = new Map<string, string>();

function ensureLocalStorage(): void {
  if (typeof (globalThis as { localStorage?: Storage }).localStorage?.getItem === "function") return;
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => {
        mem.set(k, String(v));
      },
      removeItem: (k: string) => {
        mem.delete(k);
      },
      clear: () => mem.clear(),
      key: (i: number) => [...mem.keys()][i] ?? null,
      get length() {
        return mem.size;
      },
    },
  });
}

function writeRawStore(easy: number | null, medium: number | null): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(makeStore({ easy, medium })));
}

function asDifficulty(value: unknown): Difficulty {
  if (value === "easy" || value === "medium") return value;
  throw new Error(`difficulty must be easy | medium, got ${String(value)}`);
}

function applyExpect(exp: Expectation, caseId: string): void {
  const tag = `${caseId}/${exp.assert}`;
  switch (exp.assert) {
    case "bestTime": {
      const times = loadBestTimes();
      const expected = exp.value == null ? null : Number(exp.value);
      assert.equal(times[asDifficulty(exp.difficulty)], expected, tag);
      return;
    }
    case "progressPresent": {
      assert.equal(loadProgress() !== null, Boolean(exp.value), tag);
      return;
    }
    case "progressGrid": {
      const loaded = loadProgress();
      assert.ok(loaded, `${tag}: expected saved progress`);
      assert.deepEqual(loaded.grid, exp.grid, tag);
      if (exp.difficulty) assert.equal(loaded.difficulty, exp.difficulty, `${tag} difficulty`);
      if (exp.elapsed != null) assert.equal(loaded.elapsed, Number(exp.elapsed), `${tag} elapsed`);
      return;
    }
    case "versionMatchesPackage": {
      const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as { version: string };
      assert.equal(GAME_VERSION, pkg.version, tag);
      return;
    }
    case "htmlHasVersionTag": {
      const html = readFileSync(join(ROOT, String(exp.file ?? "index.html")), "utf8");
      assert.match(html, new RegExp(`Mini Sudoku v${GAME_VERSION.replaceAll(".", "\\.")}`), tag);
      return;
    }
    case "uiUsesVersionLabel": {
      const src = readFileSync(join(ROOT, String(exp.file ?? "src/App.tsx")), "utf8");
      assert.match(src, /GAME_VERSION/, tag);
      assert.doesNotMatch(src, /v1\.\d+\.\d+/, tag);
      return;
    }
    default:
      throw new Error(`${tag}: unknown unit assert "${exp.assert}"`);
  }
}

function runStep(step: Step, c: CaseFile): void {
  const tag = `${c.id}/${step.op}`;
  switch (step.op) {
    case "readVersionSources":
    case "nop":
      return;
    case "expect":
      applyExpect(step as unknown as Expectation, c.id);
      return;
    case "recordBest": {
      ensureLocalStorage();
      if (step.reset !== false) localStorage.clear();
      const difficulty = asDifficulty(step.difficulty);
      if (step.prior != null) {
        writeRawStore(difficulty === "easy" ? Number(step.prior) : null, difficulty === "medium" ? Number(step.prior) : null);
      }
      recordBestTime(difficulty, Number(step.seconds));
      return;
    }
    case "saveProgress": {
      ensureLocalStorage();
      if (step.reset !== false) localStorage.clear();
      if (step.easy != null || step.medium != null) {
        writeRawStore(step.easy == null ? null : Number(step.easy), step.medium == null ? null : Number(step.medium));
      }
      const preset = typeof step.preset === "string" ? (step.preset as SeedPreset) : "playable";
      const base = progressForPreset(preset);
      saveProgress(makeProgress({ ...base, ...(step.progress as object | undefined) }));
      return;
    }
    default:
      throw new Error(`${tag}: unknown unit op "${step.op}"`);
  }
}

export function runUnitCase(c: CaseFile): void {
  ensureLocalStorage();
  localStorage.clear();
  for (const step of c.steps) runStep(step, c);
  for (const exp of c.expect) applyExpect(exp, c.id);
}
