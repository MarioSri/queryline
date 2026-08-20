/**
 * Ledger Light — SQL Query Runner
 * Right rail: execution history. Each entry shows the query (truncated),
 * its elapsed time, and row count. Clicking restores the query into the
 * editor so past runs are reversible, not lost.
 */

import { Pin, PinOff, Trash2 } from "lucide-react";

interface HistoryEntry {
  id: number;
  label: string;
  sql: string;
  elapsedMs: number;
  rowCount: number;
  ts: string;
  pinned: boolean;
}

interface Props {
  entries: HistoryEntry[];
  onRestore: (sql: string) => void;
  onTogglePin: (id: number) => void;
  onDelete: (id: number) => void;
  className?: string;
}

function truncate(sql: string, max = 44): string {
  const single = sql.replace(/\s+/g, " ").trim();
  return single.length > max ? single.slice(0, max) + "…" : single;
}

export default function HistoryRail({ entries, onRestore, onTogglePin, onDelete, className = "" }: Props) {
  const pinned = entries.filter((entry) => entry.pinned);
  const recent = entries.filter((entry) => !entry.pinned);

  const renderEntry = (entry: HistoryEntry) => (
    <div key={entry.id} className={`group border-b border-border/40 border-l-2 last:border-b-0 ${entry.pinned ? "border-l-primary bg-primary/[0.025]" : "border-l-transparent"}`}>
      <div className="flex items-start gap-1 px-2 py-2.5">
        <button
          type="button"
          onClick={() => onRestore(entry.sql)}
          className="min-w-0 flex-1 text-left px-2 hover:text-primary focus:outline-none focus:ring-1 focus:ring-primary/50 rounded transition-colors duration-150"
          title="Restore this query into the editor"
        >
          <div className="font-mono text-[12px] leading-snug text-foreground/90">{truncate(entry.sql, 60)}</div>
          <div className="flex items-center gap-2 mt-1.5 text-[11px] text-muted-foreground font-mono">
            <span className="text-primary">{entry.elapsedMs} ms</span>
            <span className="text-border">|</span>
            <span>{entry.rowCount.toLocaleString("en-US")} rows</span>
            <span className="ml-auto">{entry.ts}</span>
          </div>
        </button>
        <div className="flex shrink-0 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={() => onTogglePin(entry.id)}
            className="p-1.5 text-muted-foreground hover:text-primary focus:outline-none focus:ring-1 focus:ring-primary/50 rounded"
            aria-label={entry.pinned ? "Unpin saved query" : "Pin saved query"}
            aria-pressed={entry.pinned}
            title={entry.pinned ? "Unpin query" : "Pin query"}
          >
            {entry.pinned ? <PinOff className="h-3 w-3" aria-hidden="true" /> : <Pin className="h-3 w-3" aria-hidden="true" />}
          </button>
          <button
            type="button"
            onClick={() => onDelete(entry.id)}
            className="p-1.5 text-muted-foreground hover:text-destructive focus:outline-none focus:ring-1 focus:ring-primary/50 rounded"
            aria-label="Delete saved query"
            title="Delete query"
          >
            <Trash2 className="h-3 w-3" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <aside className={`w-72 shrink-0 border-l border-border/70 flex flex-col overflow-hidden bg-sidebar/80 ${className}`}>
      <div className="flex items-baseline justify-between px-4 py-3 border-b border-border/60">
        <h2 className="flex items-center gap-2 font-serif italic text-[15px] font-medium tracking-tight text-foreground"><span className="h-1.5 w-1.5 bg-primary not-italic" aria-hidden="true" />Execution ledger</h2>
        <span className="font-mono text-[10px] text-primary">{entries.length} runs</span>
      </div>
      <div className="overflow-y-auto flex-1 py-2">
        {entries.length === 0 && (
          <p className="px-4 py-6 text-[12px] text-muted-foreground leading-relaxed">
            Your runs appear here. Click any entry to restore it into the editor.
          </p>
        )}
        {pinned.length > 0 && <p className="px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Pinned</p>}
        {pinned.map(renderEntry)}
        {pinned.length > 0 && recent.length > 0 && <p className="px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Recent</p>}
        {recent.map(renderEntry)}
      </div>
    </aside>
  );
}
