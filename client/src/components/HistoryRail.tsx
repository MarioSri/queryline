/**
 * Ledger Light — SQL Query Runner
 * Right rail: execution history. Each entry shows the query (truncated),
 * its elapsed time, and row count. Clicking restores the query into the
 * editor so past runs are reversible, not lost.
 */

interface HistoryEntry {
  id: number;
  label: string;
  sql: string;
  elapsedMs: number;
  rowCount: number;
  ts: string;
}

interface Props {
  entries: HistoryEntry[];
  onRestore: (sql: string) => void;
}

function truncate(sql: string, max = 44): string {
  const single = sql.replace(/\s+/g, " ").trim();
  return single.length > max ? single.slice(0, max) + "…" : single;
}

export default function HistoryRail({ entries, onRestore }: Props) {
  return (
    <aside className="w-72 shrink-0 border-l border-border/70 flex flex-col overflow-hidden bg-sidebar">
      <div className="px-4 py-3 border-b border-border/60">
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">History</h2>
      </div>
      <div className="overflow-y-auto flex-1 py-2">
        {entries.length === 0 && (
          <p className="px-4 py-6 text-[12px] text-muted-foreground leading-relaxed">
            Your runs appear here. Click any entry to restore it into the editor.
          </p>
        )}
        {entries.map((e) => (
          <button
            key={e.id}
            onClick={() => onRestore(e.sql)}
            className="block w-full text-left px-4 py-2.5 hover:bg-accent/50 transition-colors duration-150 border-b border-border/40 last:border-0"
          >
            <div className="font-mono text-[12px] leading-snug text-foreground/90">{truncate(e.sql, 60)}</div>
            <div className="flex items-center gap-2 mt-1.5 text-[11px] text-muted-foreground font-mono">
              <span>{e.elapsedMs} ms</span>
              <span className="text-border">|</span>
              <span>{e.rowCount.toLocaleString("en-US")} rows</span>
              <span className="ml-auto">{e.ts}</span>
            </div>
          </button>
        ))}
      </div>
    </aside>
  );
}
