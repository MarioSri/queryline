import { describe, expect, it } from "vitest";
import { createSharedQueryUrl, MAX_SHARED_QUERY_LENGTH, readSharedQueryFromUrl, removeSharedQueryFromUrl } from "./shareLink";

describe("read-only query links", () => {
  it("encodes and restores only a trimmed SQL draft", () => {
    const url = createSharedQueryUrl("  SELECT * FROM orders LIMIT 5;  ", "https://queryline.example/?view=ledger");
    expect(readSharedQueryFromUrl(url)).toBe("SELECT * FROM orders LIMIT 5;");
    expect(new URL(url).searchParams.get("view")).toBe("ledger");
  });

  it("rejects blank, malformed, and oversized shared query values", () => {
    expect(() => createSharedQueryUrl("   ", "https://queryline.example/")).toThrow("Write a query");
    expect(readSharedQueryFromUrl("not a url")).toBeNull();
    expect(readSharedQueryFromUrl(`https://queryline.example/?q=${"x".repeat(MAX_SHARED_QUERY_LENGTH + 1)}`)).toBeNull();
  });

  it("removes only the shared query parameter when an editable copy is created", () => {
    expect(removeSharedQueryFromUrl("https://queryline.example/?view=ledger&q=SELECT%201#results"))
      .toBe("https://queryline.example/?view=ledger#results");
  });
});
