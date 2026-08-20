import { describe, expect, it } from "vitest";
import { DEFAULT_PAGE_SIZE, parseHistory, parsePageSize } from "./preferences";

describe("Queryline preferences", () => {
  it("accepts only supported page sizes", () => {
    expect(parsePageSize("500")).toBe(500);
    expect(parsePageSize("51")).toBe(DEFAULT_PAGE_SIZE);
    expect(parsePageSize(null)).toBe(DEFAULT_PAGE_SIZE);
  });

  it("retains only valid persisted history entries", () => {
    const valid = { id: 1, label: "Run", sql: "SELECT 1", elapsedMs: 2, rowCount: 1, ts: "09:30" };
    expect(parseHistory(JSON.stringify([valid, { ...valid, id: "bad" }, { label: "missing fields" }]))).toEqual([valid]);
    expect(parseHistory("not json")).toEqual([]);
  });
});
