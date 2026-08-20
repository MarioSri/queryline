/**
 * Ledger Light — CSV serialization for the visible query result page.
 *
 * CSV cells are quoted according to RFC 4180 conventions and formula-like
 * values are prefixed with an apostrophe so spreadsheet clients do not
 * execute returned data as formulas when a file is opened.
 */

function cellText(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

export function escapeCsvCell(value: unknown): string {
  let text = cellText(value);

  // Excel and compatible apps can evaluate values beginning with these
  // characters as formulas. A leading apostrophe renders the value as text.
  if (/^[\t\r ]*[=+\-@]/.test(text)) text = `'${text}`;

  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function resultPageToCsv(columns: string[], rows: unknown[][]): string {
  const lines = [columns, ...rows].map((row) => row.map(escapeCsvCell).join(","));
  return lines.join("\r\n");
}

export function downloadCsv(filename: string, columns: string[], rows: unknown[][]): void {
  const content = `\uFEFF${resultPageToCsv(columns, rows)}`;
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
