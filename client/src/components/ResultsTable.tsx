/**
 * Ledger Light — SQL Query Runner
 * Results renderer. The performance centerpiece of the app.
 *
 * Why pagination instead of virtualization:
 * - For a 50k-row result set, virtualization (react-window style) renders only
 *   the visible slice, which is fast, but users lose the ability to search by
 *   eye and Ctrl+F, and it adds scroll-jank risk on wide tables.
 * - Pagination renders at most PAGE_SIZE rows per render, keeps DOM tiny,
 *   and stays keyboard/Ctrl+F friendly. The trade-off is deliberate.
 * - useMemo guards the page slice against recomputation on unrelated state.
 * - Tabular numerals (font-variant-numeric: tabular-nums) keep columns aligned
 *   without per-cell width measurement.
 */

import { useEffect, useMemo, useState } from "react";
import { ClipboardCopy, Download, FileJson } from "lucide-react";
import { copyResultPageAsJson, downloadCsv, downloadJson } from "@/lib/csv";
import { DEFAULT_PAGE_SIZE, loadPageSize, PAGE_SIZES, savePageSize, type PageSize } from "@/lib/preferences";
import { toast } from "sonner";

interface Props {
  columns: string[];
  rows: unknown[][];
  onRowRendered?: () => void;
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") {
    if (Number.isInteger(value)) return value.toLocaleString("en-US");
    return value.toLocaleString("en-US", { maximumFractionDigits: 4 });
  }
  return String(value);
}

export default function ResultsTable({ columns, rows }: Props) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(() => loadPageSize());
  const [sortCol, setSortCol] = useState<number | null>(null);
  const [sortAsc, setSortAsc] = useState(true);

  useEffect(() => {
    savePageSize(pageSize);
  }, [pageSize]);

  useEffect(() => {
    setPage(1);
  }, [rows]);

  const rowCount = rows.length;
  const totalPages = Math.max(1, Math.ceil(rowCount / pageSize));
  const safePage = Math.min(page, totalPages);

  const sorted = useMemo(() => {
    if (sortCol === null) return rows;
    const dir = sortAsc ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = a[sortCol];
      const bv = b[sortCol];
      if (av === bv) return 0;
      if (av === null || av === undefined) return dir;
      if (bv === null || bv === undefined) return -dir;
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, sortCol, sortAsc]);

  const pageRows = useMemo(
    () => sorted.slice((safePage - 1) * pageSize, safePage * pageSize),
    [sorted, safePage, pageSize]
  );

  const handleSort = (colIndex: number) => {
    if (sortCol === colIndex) {
      setSortAsc(!sortAsc);
    } else {
      setSortCol(colIndex);
      setSortAsc(true);
      setPage(1);
    }
  };

  const exportBaseName = `queryline-page-${safePage}-of-${totalPages}`;

  const copyJson = async () => {
    try {
      await copyResultPageAsJson(columns, pageRows);
      toast.success("Current result page copied as JSON");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not copy this result page.";
      toast.error(message);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between gap-3 px-4 py-2 border-b border-border/60 bg-card/60">
        <div className="text-xs text-muted-foreground font-mono">
          <span className="text-primary">{rowCount.toLocaleString("en-US")}</span> row{rowCount === 1 ? "" : "s"}
          {rowCount > pageSize ? ` · page ${safePage.toLocaleString("en-US")} of ${totalPages.toLocaleString("en-US")}` : ""}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              downloadCsv(`${exportBaseName}.csv`, columns, pageRows);
              toast.success("Current result page exported as CSV");
            }}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-mono border border-border rounded hover:bg-accent focus:outline-none focus:ring-1 focus:ring-primary/50 transition-colors duration-150 active:scale-[0.97]"
            title="Download the current result page as CSV"
            aria-label="Download the current result page as CSV"
          >
            <Download className="h-3 w-3" aria-hidden="true" />
            <span className="hidden sm:inline">CSV</span>
          </button>
          <button
            type="button"
            onClick={() => {
              downloadJson(`${exportBaseName}.json`, columns, pageRows);
              toast.success("Current result page exported as JSON");
            }}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-mono border border-border rounded hover:bg-accent focus:outline-none focus:ring-1 focus:ring-primary/50 transition-colors duration-150 active:scale-[0.97]"
            title="Download the current result page as JSON"
            aria-label="Download the current result page as JSON"
          >
            <FileJson className="h-3 w-3" aria-hidden="true" />
            <span className="hidden sm:inline">JSON</span>
          </button>
          <button
            type="button"
            onClick={() => void copyJson()}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-mono border border-border rounded hover:bg-accent focus:outline-none focus:ring-1 focus:ring-primary/50 transition-colors duration-150 active:scale-[0.97]"
            title="Copy the current result page as JSON"
            aria-label="Copy the current result page as JSON"
          >
            <ClipboardCopy className="h-3 w-3" aria-hidden="true" />
            <span className="hidden sm:inline">Copy</span>
          </button>
          {rowCount > DEFAULT_PAGE_SIZE && (
            <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Rows/page</span>
            <select
              className="text-xs font-mono bg-transparent border border-border rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary/50"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value) as PageSize);
                setPage(1);
              }}
            >
              {PAGE_SIZES.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            </div>
          )}
        </div>
      </div>

      <div className="overflow-auto flex-1">
        <table className="w-full text-[13px] border-collapse">
          <thead className="sticky top-0 bg-secondary z-10">
            <tr>
              <th className="text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-3 py-2.5 border-b border-border/70 w-10">#</th>
              {columns.map((col, i) => (
                <th
                  key={`${col}-${i}`}
                  onClick={() => handleSort(i)}
                  className="text-left text-[10px] font-bold uppercase tracking-widest text-foreground/80 px-3 py-2.5 border-b border-border/70 cursor-pointer select-none hover:text-primary transition-colors duration-150 whitespace-nowrap"
                >
                  {col}
                  {sortCol === i && (
                    <span className="ml-1 text-primary">{sortAsc ? "▲" : "▼"}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, r) => (
              <tr key={r} className="odd:bg-transparent even:bg-secondary/40 hover:bg-accent/60 transition-colors duration-100">
                <td className="px-3 py-1.5 text-[11px] text-muted-foreground font-mono border-b border-border/40 align-top">
                  {(safePage - 1) * pageSize + r + 1}
                </td>
                {row.map((cell, c) => (
                  <td
                    key={c}
                    className="px-3 py-1.5 font-mono text-[12px] border-b border-border/40 align-top whitespace-nowrap max-w-[280px] overflow-hidden text-ellipsis"
                    style={{ fontVariantNumeric: "tabular-nums" }}
                    title={formatCell(cell)}
                  >
                    {formatCell(cell)}
                  </td>
                ))}
              </tr>
            ))}
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={columns.length + 1} className="px-3 py-8 text-center text-sm text-muted-foreground">
                  No rows returned.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-2 border-t border-border/60 bg-card/60">
          <div className="text-xs text-muted-foreground">
            Showing {(safePage - 1) * pageSize + 1}–
            {Math.min(safePage * pageSize, rowCount)} of {rowCount.toLocaleString("en-US")}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(1)}
              disabled={safePage === 1}
              className="px-2 py-1 text-xs border border-border rounded hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150 active:scale-[0.97]"
            >
              First
            </button>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="px-2 py-1 text-xs border border-border rounded hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150 active:scale-[0.97]"
            >
              Prev
            </button>
            <PageJump current={safePage} total={totalPages} onJump={(p) => setPage(Math.min(totalPages, Math.max(1, p)))} />
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className="px-2 py-1 text-xs border border-border rounded hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150 active:scale-[0.97]"
            >
              Next
            </button>
            <button
              onClick={() => setPage(totalPages)}
              disabled={safePage === totalPages}
              className="px-2 py-1 text-xs border border-border rounded hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150 active:scale-[0.97]"
            >
              Last
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function PageJump({ current, total, onJump }: { current: number; total: number; onJump: (p: number) => void }) {
  const [input, setInput] = useState("");
  return (
    <form
      className="flex items-center gap-1"
      onSubmit={(e) => {
        e.preventDefault();
        const n = parseInt(input, 10);
        if (!Number.isNaN(n)) onJump(n);
        setInput("");
      }}
    >
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={String(current)}
        inputMode="numeric"
        className="w-12 px-1.5 py-1 text-xs font-mono text-center border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary/50"
        aria-label="Jump to page"
      />
      <span className="text-xs text-muted-foreground">/ {total.toLocaleString("en-US")}</span>
    </form>
  );
}
