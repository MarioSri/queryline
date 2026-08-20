/**
 * Ledger Light — SQL Query Runner
 * Main console page. Layout: header strip → [ schema | editor over results | history ].
 * Editor and results share the center column with a resizable divider.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import QueryEditor from "@/components/QueryEditor";
import ResultsTable from "@/components/ResultsTable";
import SchemaSidebar from "@/components/SchemaSidebar";
import HistoryRail from "@/components/HistoryRail";
import { executeQuery, type QueryResult } from "@/lib/engine";
import { SAMPLE_QUERIES } from "@/lib/seed";
import { toast } from "sonner";
import { AlertTriangle, Timer, Rows3, Loader2 } from "lucide-react";

interface HistoryEntry {
  id: number;
  label: string;
  sql: string;
  elapsedMs: number;
  rowCount: number;
  ts: string;
}

function clock(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function Home() {
  const [sql, setSql] = useState(SAMPLE_QUERIES[1].sql);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [dividerY, setDividerY] = useState(42); // editor share %
  const [compactPanel, setCompactPanel] = useState<"schema" | "history" | null>(null);
  const dragRef = useRef<{ startY: number; startShare: number } | null>(null);
  const idRef = useRef(0);
  const loadedRef = useRef(false);
  const autoRunRef = useRef(false);

  const run = useCallback(async (queryText?: string) => {
    const text = (queryText ?? sql).trim();
    if (!text) {
      setError("Empty query. Write a SELECT and press Run.");
      return;
    }
    setRunning(true);
    setError(null);
    try {
      const r = await executeQuery(text);
      setResult(r);
      if (!loadedRef.current) {
        setCounts({ customers: 2000, products: 400, orders: 50000, order_items: 120000, reviews: 18000 });
        // NOTE: counts above mirror the seed volumes; kept in sync with seed.ts
        loadedRef.current = true;
      }
      idRef.current += 1;
      setHistory((h) =>
        [
          {
            id: idRef.current,
            label: "Run",
            sql: text,
            elapsedMs: r.elapsedMs,
            rowCount: r.rows.length,
            ts: clock(),
          },
          ...h,
        ].slice(0, 50)
      );
      if (r.rows.length > 5000) {
        toast.success(`${r.rows.length.toLocaleString("en-US")} rows returned in ${r.elapsedMs} ms`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setResult(null);
      toast.error(msg);
    } finally {
      setRunning(false);
    }
  }, [sql]);

  // Open the console as a populated ledger once, after the component mounts.
  // Effects keep this state change out of the render phase and the ref avoids
  // rerunning when the query callback changes after an editor update.
  useEffect(() => {
    if (autoRunRef.current) return;
    autoRunRef.current = true;
    void run(SAMPLE_QUERIES[1].sql);
  }, [run]);

  const restore = useCallback((s: string) => setSql(s), []);
  const insertToken = useCallback((token: string) => setSql((s) => s + token), []);

  const metrics = useMemo(() => {
    if (!result) return null;
    return { rows: result.rows.length, ms: result.elapsedMs, cols: result.columns.length };
  }, [result]);

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      {/* Header */}
      <header className="shrink-0 border-b border-border/70 bg-card/80 backdrop-blur-sm">
        <div className="flex items-center gap-2.5 px-3 sm:px-4 py-2.5">
          <div className="flex items-center gap-2.5">
            <img
              src="/manus-storage/queryline-logo_e1a45a25.png"
              alt="Queryline logo"
              className="h-6 w-6 rounded-[3px] object-contain"
            />
            <h1 className="font-semibold text-lg tracking-tight text-foreground">
              Queryline
            </h1>
          </div>
          <span className="text-[11px] font-mono text-muted-foreground hidden xl:inline">
            browser SQL lab · hand-rolled engine, zero dependencies
          </span>
          {metrics && (
            <div className="ml-auto flex items-center gap-2 sm:gap-4 text-[10px] sm:text-[11px] font-mono text-muted-foreground whitespace-nowrap">
              <span className="inline-flex items-center gap-1">
                <Rows3 className="h-3 w-3" /> {metrics.rows.toLocaleString("en-US")} rows
              </span>
              <span className="inline-flex items-center gap-1">
                <Timer className="h-3 w-3" /> {metrics.ms} ms
              </span>
              <span className="inline-flex items-center gap-1">
                {metrics.cols} cols
              </span>
            </div>
          )}
        </div>
      </header>

      {/* Compact navigation keeps schema, samples, and history reachable below desktop widths. */}
      <div className="lg:hidden shrink-0 flex items-center border-b border-border/70 bg-card/60">
        <button
          type="button"
          onClick={() => setCompactPanel((panel) => (panel === "schema" ? null : "schema"))}
          className="flex-1 px-3 py-2 text-left text-[11px] uppercase tracking-widest font-semibold text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-colors"
          aria-expanded={compactPanel === "schema"}
          aria-controls="compact-schema-panel"
        >
          Schema & samples
        </button>
        <button
          type="button"
          onClick={() => setCompactPanel((panel) => (panel === "history" ? null : "history"))}
          className="flex-1 border-l border-border/70 px-3 py-2 text-left text-[11px] uppercase tracking-widest font-semibold text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-colors"
          aria-expanded={compactPanel === "history"}
          aria-controls="compact-history-panel"
        >
          History{history.length > 0 ? ` (${history.length})` : ""}
        </button>
      </div>
      {compactPanel === "schema" && (
        <div id="compact-schema-panel" className="lg:hidden shrink-0 border-b border-border/70">
          <SchemaSidebar
            className="w-full h-[38vh] border-r-0"
            counts={counts}
            onInsertTable={(token) => {
              insertToken(token);
              setCompactPanel(null);
            }}
            onLoadSample={(label, query) => {
              setSql(query);
              setCompactPanel(null);
              toast(`Loaded: ${label}`);
            }}
            samples={SAMPLE_QUERIES}
          />
        </div>
      )}
      {compactPanel === "history" && (
        <div id="compact-history-panel" className="lg:hidden shrink-0 border-b border-border/70">
          <HistoryRail
            className="w-full h-[38vh] border-l-0"
            entries={history}
            onRestore={(query) => {
              restore(query);
              setCompactPanel(null);
            }}
          />
        </div>
      )}

      {/* Body */}
      <div className="flex flex-1 min-h-0 min-w-0">
        <SchemaSidebar
          className="hidden lg:flex"
          counts={counts}
          onInsertTable={insertToken}
          onLoadSample={(label, s) => {
            setSql(s);
            toast(`Loaded: ${label}`);
          }}
          samples={SAMPLE_QUERIES}
        />

        {/* Center column */}
        <div
          className="flex-1 flex flex-col min-h-0 min-w-0"
          onMouseMove={(e) => {
            const drag = dragRef.current;
            if (!drag) return;
            const headerH = 48;
            const total = e.currentTarget.offsetHeight - headerH;
            const share = Math.min(85, Math.max(20, ((drag.startY - e.clientY) / total) * 100)) + drag.startShare;
            setDividerY(100 - share);
          }}
          onMouseUp={() => {
            dragRef.current = null;
          }}
          onMouseLeave={() => {
            dragRef.current = null;
          }}
        >
          {/* Editor pane */}
          <div className="flex flex-col border-b border-border/70" style={{ height: `${dividerY}%` }}>
            <div className="px-4 py-1.5 border-b border-border/40 flex items-center gap-2 bg-secondary/50 shrink-0">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Query</span>
              {running && (
                <span className="ml-auto inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" /> executing
                </span>
              )}
            </div>
            <QueryEditor value={sql} onChange={setSql} onRun={run} running={running} />
          </div>

          {/* Divider */}
          <div
            role="separator"
            aria-orientation="horizontal"
            className="h-1.5 bg-transparent hover:bg-primary/15 cursor-row-resize flex items-center justify-center shrink-0 transition-colors duration-150"
            onMouseDown={(e) => {
              dragRef.current = { startY: e.clientY, startShare: 100 - dividerY };
            }}
          >
            <span className="h-[3px] w-10 rounded-full bg-border" />
          </div>

          {/* Results pane */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="px-4 py-1.5 border-b border-border/40 bg-secondary/50 shrink-0 flex items-center gap-2">
              <span className="inline-block h-1.5 w-1.5 bg-primary translate-y-[-1px]" aria-hidden="true" />
              <span className="text-[11px] font-semibold uppercase tracking-widest text-foreground">Results</span>
              {error && (
                <span className="ml-auto inline-flex items-center gap-1.5 text-[11px] text-destructive font-mono">
                  <AlertTriangle className="h-3 w-3" /> {error}
                </span>
              )}
            </div>
            {result ? (
              <ResultsTable columns={result.columns} rows={result.rows} />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-2 px-8 text-center text-muted-foreground">
                <Rows3 className="h-8 w-8 opacity-30" />
                <p className="text-sm">
                  50,000 rows, one page at a time.
                </p>
                <p className="text-xs font-mono">50,000 orders · 120,000 line items · all in your browser</p>
              </div>
            )}
          </div>
        </div>

        <HistoryRail className="hidden lg:flex" entries={history} onRestore={restore} />
      </div>
    </div>
  );
}
