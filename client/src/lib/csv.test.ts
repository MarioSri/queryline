import { describe, expect, it } from "vitest";
import { resultPageToCsv } from "./csv";

describe("resultPageToCsv", () => {
  it("preserves column order and escapes delimiters, quotes, and new lines", () => {
    expect(
      resultPageToCsv(
        ["customer", "note", "total"],
        [["Mira, Rao", 'Said "yes"', 125.5], ["Alex", "line one\nline two", null]],
      ),
    ).toBe('customer,note,total\r\n"Mira, Rao","Said ""yes""",125.5\r\nAlex,"line one\nline two",');
  });

  it("neutralizes formula-like returned values before spreadsheet export", () => {
    expect(resultPageToCsv(["value"], [["=SUM(A1:A2)"], [" -2"], ["plain text"]])).toBe(
      "value\r\n'=SUM(A1:A2)\r\n' -2\r\nplain text",
    );
  });
});
