import { describe, expect, it } from "vitest";
import { filterResultRows } from "./tableFilter";

describe("result-table filtering", () => {
  it("matches rendered cell text without changing the source rows", () => {
    const rows = [[1, "India", null], [2, "Germany", 42.5], [3, "INDIA", 18]];
    expect(filterResultRows(rows, "india")).toEqual([[1, "India", null], [3, "INDIA", 18]]);
    expect(filterResultRows(rows, "NULL")).toEqual([[1, "India", null]]);
    expect(filterResultRows(rows, "")).toBe(rows);
  });
});
