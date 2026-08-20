/**
 * Ledger Light — result-table text filtering.
 * Filtering deliberately follows the table's rendered cell text so the term a
 * person sees and types maps directly to the rows they receive.
 */

export function formatResultValue(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") {
    if (Number.isInteger(value)) return value.toLocaleString("en-US");
    return value.toLocaleString("en-US", { maximumFractionDigits: 4 });
  }
  return String(value);
}

export function filterResultRows(rows: unknown[][], term: string): unknown[][] {
  const normalized = term.trim().toLocaleLowerCase();
  if (!normalized) return rows;
  return rows.filter((row) => row.some((cell) => formatResultValue(cell).toLocaleLowerCase().includes(normalized)));
}
