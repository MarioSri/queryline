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

import { useEffect, useMemo, useRef, useState } from "react";
import { ClipboardCopy, Download, FileJson, Search, X } from "lucide-react";
import { copyResultPageAsJson, downloadCsv, downloadJson } from "@/lib/csv";
import { DEFAULT_PAGE_SIZE, loadPageSize, PAGE_SIZES, savePageSize, type PageSize } from "@/lib/preferences";
import { filterResultRows, formatResultValue } from "@/lib/tableFilter";
import { toast } from "sonner";

interface Props {
  columns: string[];
  rows: unknown[][];
  onRowRendered?: () => void;
}

export default function ResultsTable({ columns, rows }: Props) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(() => loadPageSize());
  const [sortCol, setSortCol] = useState<number | null>(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [filter, setFilter] = useState("");
  const filterRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    savePageSize(pageSize);
  }, [pageSize]);

  useEffect(() => {
    setPage(1);
  }, [rows, filter]);

  const filteredRows = useMemo(() => filterResultRows(rows, filter), [rows, filter]);
  const rowCount = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(rowCount / pageSize));
  const safePage = Math.min(page, totalPages);

  const sorted = useMemo(() => {
    if (sortCol === null) return filteredRows;
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
  }, [filteredRows, sortCol, sortAsc]);

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
      <div className="flex flex-wrap items-center gap-2 px-4 py-2 border-b border-border/60 bg-card/45">
        <div className="text-xs text-muted-foreground font-mono whitespace-nowrap">
          <span className="font-serif text-[15px] italic font-medium text-primary">{rowCount.toLocaleString("en-US")}</span> row{rowCount === 1 ? "" : "s"}
          {rowCount > pageSize ? ` · page ${safePage.toLocaleString("en-US")} of ${totalPages.toLocaleString("en-US")}` : ""}
        </div>
        <div className="relative flex min-w-[11rem] flex-1 items-center">
          <Search className="absolute left-2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" aria-hidden="true" />
          <label htmlFor="result-filter" className="sr-only">Filter result rows</label>
          <input
            ref={filterRef}
            id="result-filter"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setFilter("");
                filterRef.current?.blur();
              }
            }}
            placeholder="Filter the ledger"
            className="w-full bg-transparent border-0 border-b border-border py-1 pl-7 pr-7 text-[11px] font-mono text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-primary"
            aria-describedby="result-filter-help"
          />
          {filter && (
            <button
              type="button"
              onClick={() => {
                setFilter("");
                filterRef.current?.focus();
              }}
              className="absolute right-1 inline-flex items-center justify-center p-1 text-muted-foreground hover:text-foreground focus:outline-none focus:ring-1 focus:ring-primary/60 rounded"
              aria-label="Clear result filter"
              title="Clear filter"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
          <span id="result-filter-help" className="sr-only">Filters every visible result cell. Press Escape to clear the filter.</span>
        </div>
        <div className="flex items-center border border-border/70 shrink-0 divide-x divide-border/70">
          <button
            type="button"
            onClick={() => {
              downloadCsv(`${exportBaseName}.csv`, columns, pageRows);
              toast.success("Current result page exported as CSV");
            }}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-mono text-muted-foreground hover:text-primary hover:bg-accent/35 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-colors duration-150 active:scale-[0.97]"
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
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-mono text-muted-foreground hover:text-primary hover:bg-accent/35 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-colors duration-150 active:scale-[0.97]"
            title="Download the current result page as JSON"
            aria-label="Download the current result page as JSON"
          >
            <FileJson className="h-3 w-3" aria-hidden="true" />
            <span className="hidden sm:inline">JSON</span>
          </button>
          <button
            type="button"
            onClick={() => void copyJson()}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-mono text-muted-foreground hover:text-primary hover:bg-accent/35 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-colors duration-150 active:scale-[0.97]"
            title="Copy the current result page as JSON"
            aria-label="Copy the current result page as JSON"
          >
            <ClipboardCopy className="h-3 w-3" aria-hidden="true" />
            <span className="hidden sm:inline">Copy</span>
          </button>
          {rowCount > DEFAULT_PAGE_SIZE && (
            <div className="flex items-center gap-1.5 px-2">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Rows</span>
            <select
              className="text-xs font-mono bg-transparent border-0 border-b border-border px-1 py-0.5 focus:outline-none focus:border-primary"
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
                  scope="col"
                  aria-sort={sortCol === i ? (sortAsc ? "ascending" : "descending") : "none"}
                  className="text-left text-[10px] font-bold uppercase tracking-widest text-foreground/80 px-3 py-2.5 border-b border-border/70 whitespace-nowrap"
                >
                  <button
                    type="button"
                    onClick={() => handleSort(i)}
                    className="inline-flex items-center gap-1 hover:text-primary focus:outline-none focus:ring-1 focus:ring-primary/60 rounded"
                    aria-label={`Sort by ${col}${sortCol === i ? (sortAsc ? ", descending next" : ", ascending next") : ""}`}
                  >
                    {col}
                    {sortCol === i && <span className="text-primary" aria-hidden="true">{sortAsc ? "▲" : "▼"}</span>}
                  </button>
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
                    className={`px-3 py-1.5 font-mono text-[12px] border-b border-border/40 align-top whitespace-nowrap max-w-[280px] overflow-hidden text-ellipsis ${c === 0 ? "text-foreground/70" : "text-foreground font-medium"}`}
                    style={{ fontVariantNumeric: "tabular-nums" }}
                    title={formatResultValue(cell)}
                  >
                    {formatResultValue(cell)}
                  </td>
                ))}
              </tr>
            ))}
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={columns.length + 1} className="px-3 py-8 text-center text-sm text-muted-foreground">
                  {filter.trim() ? `No rows match “${filter.trim()}”. Clear the filter to restore all ${rows.length.toLocaleString("en-US")} rows.` : "No rows returned."}
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
