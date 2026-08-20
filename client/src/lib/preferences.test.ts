import { describe, expect, it } from "vitest";
import { DEFAULT_PAGE_SIZE, deleteHistoryEntry, deleteWorkspace, parseHistory, parsePageSize, parseWorkspaces, toggleHistoryPin, upsertWorkspace } from "./preferences";

describe("Queryline preferences", () => {
  it("accepts only supported page sizes", () => {
    expect(parsePageSize("500")).toBe(500);
    expect(parsePageSize("51")).toBe(DEFAULT_PAGE_SIZE);
    expect(parsePageSize(null)).toBe(DEFAULT_PAGE_SIZE);
  });

  it("retains only valid persisted history entries", () => {
    const valid = { id: 1, label: "Run", sql: "SELECT 1", elapsedMs: 2, rowCount: 1, ts: "09:30" };
    expect(parseHistory(JSON.stringify([valid, { ...valid, id: "bad" }, { label: "missing fields" }]))).toEqual([{ ...valid, pinned: false }]);
    expect(parseHistory("not json")).toEqual([]);
  });

  it("pins entries first and deletes only the chosen saved query", () => {
    const entries = parseHistory(JSON.stringify([
      { id: 1, label: "Run", sql: "SELECT 1", elapsedMs: 2, rowCount: 1, ts: "09:30" },
      { id: 2, label: "Run", sql: "SELECT 2", elapsedMs: 3, rowCount: 1, ts: "09:31" },
    ]));
    const pinned = toggleHistoryPin(entries, 2);
    expect(pinned.map((entry) => entry.id)).toEqual([2, 1]);
    expect(deleteHistoryEntry(pinned, 2).map((entry) => entry.id)).toEqual([1]);
  });

  it("validates, updates, and removes browser-local named workspaces", () => {
    const saved = parseWorkspaces(JSON.stringify([
      { id: "revenue", name: "Monthly revenue", sql: "SELECT 1", createdAt: 10, updatedAt: 20 },
      { id: "bad", name: "", sql: "SELECT 2", createdAt: 10, updatedAt: 30 },
    ]));
    expect(saved).toEqual([{ id: "revenue", name: "Monthly revenue", sql: "SELECT 1", createdAt: 10, updatedAt: 20 }]);
    const updated = upsertWorkspace(saved, { id: "revenue", name: "Revenue 2026", sql: "SELECT 2", createdAt: 10, updatedAt: 40 });
    expect(updated).toEqual([{ id: "revenue", name: "Revenue 2026", sql: "SELECT 2", createdAt: 10, updatedAt: 40 }]);
    expect(deleteWorkspace(updated, "revenue")).toEqual([]);
  });
});
