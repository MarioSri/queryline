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
  pinned: boolean;
}

export const PAGE_SIZES = [25, 50, 100, 500] as const;
export const DEFAULT_PAGE_SIZE = 50;
export type PageSize = (typeof PAGE_SIZES)[number];

export interface QueryWorkspace {
  id: string;
  name: string;
  sql: string;
  createdAt: number;
  updatedAt: number;
}

const HISTORY_KEY = "queryline.history.v1";
const PAGE_SIZE_KEY = "queryline.page-size.v1";
const WORKSPACES_KEY = "queryline.workspaces.v1";
const MAX_HISTORY = 50;
const MAX_WORKSPACES = 25;

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
    typeof entry.ts === "string" &&
    (entry.pinned === undefined || typeof entry.pinned === "boolean")
  );
}

function normalizeHistoryEntry(entry: QueryHistoryEntry): QueryHistoryEntry {
  return { ...entry, pinned: entry.pinned === true };
}

function sortPinnedFirst(entries: QueryHistoryEntry[]): QueryHistoryEntry[] {
  return [...entries].sort((a, b) => Number(b.pinned) - Number(a.pinned));
}

export function parseHistory(value: string | null): QueryHistoryEntry[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return sortPinnedFirst(parsed.filter(isHistoryEntry).map(normalizeHistoryEntry)).slice(0, MAX_HISTORY);
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
    storage()?.setItem(HISTORY_KEY, JSON.stringify(sortPinnedFirst(entries.filter(isHistoryEntry).map(normalizeHistoryEntry)).slice(0, MAX_HISTORY)));
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

export function toggleHistoryPin(entries: QueryHistoryEntry[], id: number): QueryHistoryEntry[] {
  return sortPinnedFirst(entries.map((entry) => (entry.id === id ? { ...entry, pinned: !entry.pinned } : entry)));
}

export function deleteHistoryEntry(entries: QueryHistoryEntry[], id: number): QueryHistoryEntry[] {
  return entries.filter((entry) => entry.id !== id);
}

function isWorkspace(value: unknown): value is QueryWorkspace {
  if (!value || typeof value !== "object") return false;
  const workspace = value as Record<string, unknown>;
  return (
    typeof workspace.id === "string" && workspace.id.length > 0 &&
    typeof workspace.name === "string" && workspace.name.trim().length > 0 && workspace.name.length <= 80 &&
    typeof workspace.sql === "string" && workspace.sql.trim().length > 0 &&
    typeof workspace.createdAt === "number" && Number.isFinite(workspace.createdAt) &&
    typeof workspace.updatedAt === "number" && Number.isFinite(workspace.updatedAt)
  );
}

function normalizeWorkspace(workspace: QueryWorkspace): QueryWorkspace {
  return { ...workspace, name: workspace.name.trim().slice(0, 80), sql: workspace.sql.trim() };
}

function sortWorkspaces(entries: QueryWorkspace[]): QueryWorkspace[] {
  return [...entries].sort((a, b) => b.updatedAt - a.updatedAt);
}

export function parseWorkspaces(value: string | null): QueryWorkspace[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return sortWorkspaces(parsed.filter(isWorkspace).map(normalizeWorkspace)).slice(0, MAX_WORKSPACES);
  } catch {
    return [];
  }
}

export function loadWorkspaces(): QueryWorkspace[] {
  try {
    return parseWorkspaces(storage()?.getItem(WORKSPACES_KEY) ?? null);
  } catch {
    return [];
  }
}

export function saveWorkspaces(entries: QueryWorkspace[]): void {
  try {
    storage()?.setItem(WORKSPACES_KEY, JSON.stringify(sortWorkspaces(entries.filter(isWorkspace).map(normalizeWorkspace)).slice(0, MAX_WORKSPACES)));
  } catch {
    // Workspace persistence is optional; editing continues if storage is unavailable.
  }
}

export function upsertWorkspace(entries: QueryWorkspace[], workspace: QueryWorkspace): QueryWorkspace[] {
  if (!isWorkspace(workspace)) return entries;
  return sortWorkspaces([normalizeWorkspace(workspace), ...entries.filter((entry) => entry.id !== workspace.id)]).slice(0, MAX_WORKSPACES);
}

export function deleteWorkspace(entries: QueryWorkspace[], id: string): QueryWorkspace[] {
  return entries.filter((workspace) => workspace.id !== id);
}
