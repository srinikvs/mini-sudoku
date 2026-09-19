import { expect, type Page } from "@playwright/test";
import {
  STORAGE_KEY,
  makeStore,
  progressForPreset,
  type SeedPreset,
} from "../cases/fixtures.ts";
import type { Store } from "../../src/game/storage.ts";

export { STORAGE_KEY };

export async function openFresh(page: Page): Promise<void> {
  await page.addInitScript(() => {
    if (sessionStorage.getItem("mini-sudoku-e2e-cleared")) return;
    localStorage.clear();
    sessionStorage.setItem("mini-sudoku-e2e-cleared", "1");
  });
  await page.goto("./");
  await expect(page.getByTestId("start-screen")).toBeVisible();
}

export async function seedAndOpen(
  page: Page,
  store: Store,
  screen: "start" | "play" = "start",
): Promise<void> {
  await page.addInitScript(
    ({ store, STORAGE_KEY }) => {
      if (sessionStorage.getItem("mini-sudoku-e2e-seeded")) return;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
      sessionStorage.setItem("mini-sudoku-e2e-seeded", "1");
    },
    { store, STORAGE_KEY },
  );
  await page.goto("./");
  await expect(page.getByTestId("start-screen")).toBeVisible();
  if (screen === "play") {
    await page.getByTestId("continue").click();
    await expect(page.getByTestId("play-screen")).toBeVisible();
  }
}

export async function seedPlay(
  page: Page,
  options: {
    preset?: SeedPreset;
    easy?: number | null;
    medium?: number | null;
    screen?: "start" | "play";
  } = {},
): Promise<void> {
  const store = makeStore({
    easy: options.easy ?? null,
    medium: options.medium ?? null,
    progress: progressForPreset(options.preset ?? "playable"),
  });
  await seedAndOpen(page, store, options.screen ?? "start");
}

export async function readStore(page: Page): Promise<Store | null> {
  return page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Store) : null;
  }, STORAGE_KEY);
}

export async function cellText(page: Page, row: number, col: number): Promise<string> {
  return (await page.getByTestId(`cell-${row}-${col}`).innerText()).trim();
}
