/**
 * Ledger Light — browser-local Queryline preferences.
 *
 * Only non-sensitive UI data is retained locally: execution history and the
 * selected result-page size. Every stored value is validated before use so a
 * stale or edited browser value cannot disrupt the query console.
 */

export interface QueryHistoryEntry {
  id: number;
  label: string;
  sql: string;
  elapsedMs: number;
  rowCount: number;
  ts: string;
}

export const PAGE_SIZES = [25, 50, 100, 500] as const;
export const DEFAULT_PAGE_SIZE = 50;
export type PageSize = (typeof PAGE_SIZES)[number];

const HISTORY_KEY = "queryline.history.v1";
const PAGE_SIZE_KEY = "queryline.page-size.v1";
const MAX_HISTORY = 50;

function storage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function isHistoryEntry(value: unknown): value is QueryHistoryEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.id === "number" && Number.isSafeInteger(entry.id) && entry.id > 0 &&
    typeof entry.label === "string" &&
    typeof entry.sql === "string" && entry.sql.length > 0 &&
    typeof entry.elapsedMs === "number" && Number.isFinite(entry.elapsedMs) && entry.elapsedMs >= 0 &&
    typeof entry.rowCount === "number" && Number.isSafeInteger(entry.rowCount) && entry.rowCount >= 0 &&
    typeof entry.ts === "string"
  );
}

export function parseHistory(value: string | null): QueryHistoryEntry[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isHistoryEntry).slice(0, MAX_HISTORY);
  } catch {
    return [];
  }
}

export function loadHistory(): QueryHistoryEntry[] {
  try {
    return parseHistory(storage()?.getItem(HISTORY_KEY) ?? null);
  } catch {
    return [];
  }
}

export function saveHistory(entries: QueryHistoryEntry[]): void {
  try {
    storage()?.setItem(HISTORY_KEY, JSON.stringify(entries.filter(isHistoryEntry).slice(0, MAX_HISTORY)));
  } catch {
    // Storage can be disabled or full; history remains available in memory.
  }
}

export function parsePageSize(value: string | null): PageSize {
  const candidate = Number(value);
  return PAGE_SIZES.includes(candidate as PageSize) ? (candidate as PageSize) : DEFAULT_PAGE_SIZE;
}

export function loadPageSize(): PageSize {
  try {
    return parsePageSize(storage()?.getItem(PAGE_SIZE_KEY) ?? null);
  } catch {
    return DEFAULT_PAGE_SIZE;
  }
}

export function savePageSize(pageSize: PageSize): void {
  if (!PAGE_SIZES.includes(pageSize)) return;
  try {
    storage()?.setItem(PAGE_SIZE_KEY, String(pageSize));
  } catch {
    // Preferences are optional; a browser storage failure must not block results.
  }
}
