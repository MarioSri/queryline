/**
 * Ledger Light — browser-local Queryline preferences.
 *
 * Only non-sensitive UI data is retained locally: execution history and the
 * selected result-page size. Every stored value is validated before use so a
 * stale or edited browser value cannot disrupt the query console.
 */

import type { ColumnFilters } from "./tableFilter";

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
const FILTER_PRESETS_KEY = "queryline.filter-presets.v1";
const MAX_HISTORY = 50;
const MAX_WORKSPACES = 25;
const MAX_FILTER_PRESETS = 20;

export function workspaceNameKey(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

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

function uniqueWorkspaceNames(entries: QueryWorkspace[]): QueryWorkspace[] {
  const seen = new Set<string>();
  return sortWorkspaces(entries).filter((workspace) => {
    const key = workspaceNameKey(workspace.name);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function parseWorkspaces(value: string | null): QueryWorkspace[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return uniqueWorkspaceNames(parsed.filter(isWorkspace).map(normalizeWorkspace)).slice(0, MAX_WORKSPACES);
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
    storage()?.setItem(WORKSPACES_KEY, JSON.stringify(uniqueWorkspaceNames(entries.filter(isWorkspace).map(normalizeWorkspace)).slice(0, MAX_WORKSPACES)));
  } catch {
    // Workspace persistence is optional; editing continues if storage is unavailable.
  }
}

export function upsertWorkspace(entries: QueryWorkspace[], workspace: QueryWorkspace): QueryWorkspace[] {
  if (!isWorkspace(workspace)) return entries;
  if (findDuplicateWorkspace(entries, workspace.name, workspace.id)) return entries;
  return uniqueWorkspaceNames([normalizeWorkspace(workspace), ...entries.filter((entry) => entry.id !== workspace.id)]).slice(0, MAX_WORKSPACES);
}

export function findDuplicateWorkspace(entries: QueryWorkspace[], name: string, exceptId: string | null = null): QueryWorkspace | undefined {
  const key = workspaceNameKey(name);
  if (!key) return undefined;
  return entries.find((workspace) => workspace.id !== exceptId && workspaceNameKey(workspace.name) === key);
}

export function deleteWorkspace(entries: QueryWorkspace[], id: string): QueryWorkspace[] {
  return entries.filter((workspace) => workspace.id !== id);
}

export interface WorkspaceArchive {
  format: "queryline-workspaces";
  version: 1;
  exportedAt: string;
  workspaces: QueryWorkspace[];
}

export interface WorkspaceImportResult {
  workspaces: QueryWorkspace[];
  imported: number;
  skipped: number;
}

function createImportedWorkspaceId(existingIds: Set<string>, sourceId: string): string {
  let suffix = 1;
  let id = `${sourceId}-imported`;
  while (existingIds.has(id)) {
    suffix += 1;
    id = `${sourceId}-imported-${suffix}`;
  }
  return id;
}

export function serializeWorkspaceArchive(entries: QueryWorkspace[], exportedAt = new Date().toISOString()): string {
  const archive: WorkspaceArchive = {
    format: "queryline-workspaces",
    version: 1,
    exportedAt,
    workspaces: parseWorkspaces(JSON.stringify(entries)),
  };
  return JSON.stringify(archive, null, 2);
}

export function parseWorkspaceArchive(value: string | null): QueryWorkspace[] | null {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object") return null;
    const archive = parsed as Record<string, unknown>;
    if (archive.format !== "queryline-workspaces" || archive.version !== 1 || !Array.isArray(archive.workspaces)) return null;
    return parseWorkspaces(JSON.stringify(archive.workspaces));
  } catch {
    return null;
  }
}

export function mergeImportedWorkspaces(existing: QueryWorkspace[], incoming: QueryWorkspace[]): WorkspaceImportResult {
  const next = uniqueWorkspaceNames(existing.filter(isWorkspace).map(normalizeWorkspace));
  const names = new Set(next.map((workspace) => workspaceNameKey(workspace.name)));
  const ids = new Set(next.map((workspace) => workspace.id));
  let imported = 0;
  let skipped = 0;

  for (const candidate of incoming.filter(isWorkspace).map(normalizeWorkspace)) {
    if (next.length >= MAX_WORKSPACES || names.has(workspaceNameKey(candidate.name))) {
      skipped += 1;
      continue;
    }
    const id = ids.has(candidate.id) ? createImportedWorkspaceId(ids, candidate.id) : candidate.id;
    next.push({ ...candidate, id });
    names.add(workspaceNameKey(candidate.name));
    ids.add(id);
    imported += 1;
  }

  return { workspaces: sortWorkspaces(next).slice(0, MAX_WORKSPACES), imported, skipped };
}

export interface ResultFilterPreset {
  id: string;
  name: string;
  filter: string;
  columnFilters: ColumnFilters;
  createdAt: number;
  updatedAt: number;
}

function normalizeColumnFilters(value: unknown): ColumnFilters {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([index, term]) => Number.isSafeInteger(Number(index)) && Number(index) >= 0 && typeof term === "string" && term.trim().length > 0 && term.length <= 120)
      .map(([index, term]) => [Number(index), (term as string).trim()])
  ) as ColumnFilters;
}

function isFilterPreset(value: unknown): value is ResultFilterPreset {
  if (!value || typeof value !== "object") return false;
  const preset = value as Record<string, unknown>;
  return (
    typeof preset.id === "string" && preset.id.length > 0 &&
    typeof preset.name === "string" && preset.name.trim().length > 0 && preset.name.length <= 60 &&
    typeof preset.filter === "string" && preset.filter.length <= 250 &&
    typeof preset.createdAt === "number" && Number.isFinite(preset.createdAt) &&
    typeof preset.updatedAt === "number" && Number.isFinite(preset.updatedAt) &&
    typeof preset.columnFilters === "object" && !Array.isArray(preset.columnFilters)
  );
}

function normalizeFilterPreset(preset: ResultFilterPreset): ResultFilterPreset {
  return {
    ...preset,
    name: preset.name.trim().slice(0, 60),
    filter: preset.filter.trim().slice(0, 250),
    columnFilters: normalizeColumnFilters(preset.columnFilters),
  };
}

function sortFilterPresets(entries: ResultFilterPreset[]): ResultFilterPreset[] {
  return [...entries].sort((a, b) => b.updatedAt - a.updatedAt);
}

function uniqueFilterPresetNames(entries: ResultFilterPreset[]): ResultFilterPreset[] {
  const seen = new Set<string>();
  return sortFilterPresets(entries).filter((preset) => {
    const key = workspaceNameKey(preset.name);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function parseFilterPresets(value: string | null): ResultFilterPreset[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return uniqueFilterPresetNames(parsed.filter(isFilterPreset).map(normalizeFilterPreset)).slice(0, MAX_FILTER_PRESETS);
  } catch {
    return [];
  }
}

export function loadFilterPresets(): ResultFilterPreset[] {
  try {
    return parseFilterPresets(storage()?.getItem(FILTER_PRESETS_KEY) ?? null);
  } catch {
    return [];
  }
}

export function saveFilterPresets(entries: ResultFilterPreset[]): void {
  try {
    storage()?.setItem(FILTER_PRESETS_KEY, JSON.stringify(uniqueFilterPresetNames(entries.filter(isFilterPreset).map(normalizeFilterPreset)).slice(0, MAX_FILTER_PRESETS)));
  } catch {
    // Filter presets are optional convenience state; filtering remains available in memory.
  }
}

export function upsertFilterPreset(entries: ResultFilterPreset[], preset: ResultFilterPreset): ResultFilterPreset[] {
  if (!isFilterPreset(preset)) return entries;
  const duplicate = entries.find((entry) => entry.id !== preset.id && workspaceNameKey(entry.name) === workspaceNameKey(preset.name));
  if (duplicate) return entries;
  return uniqueFilterPresetNames([normalizeFilterPreset(preset), ...entries.filter((entry) => entry.id !== preset.id)]).slice(0, MAX_FILTER_PRESETS);
}

export function deleteFilterPreset(entries: ResultFilterPreset[], id: string): ResultFilterPreset[] {
  return entries.filter((preset) => preset.id !== id);
}
