/**
 * Ledger Light — SQL Query Runner
 * SQL input area. A plain textarea styled as an editor keeps the build free
 * of heavy dependencies; it supports tab indentation, Ctrl/Cmd+Enter to run,
 * and instant cursor feedback.
 */

import { useEffect, useRef } from "react";
import { Play, Loader2 } from "lucide-react";
import WorkspaceShelf from "@/components/WorkspaceShelf";
import type { QueryWorkspace } from "@/lib/preferences";

interface Props {
  value: string;
  onChange: (v: string) => void;
  onRun: () => void;
  running: boolean;
  workspaces: QueryWorkspace[];
  activeWorkspaceId: string | null;
  workspaceName: string;
  onWorkspaceNameChange: (name: string) => void;
  onLoadWorkspace: (id: string) => void;
  onSaveWorkspace: () => void;
  onNewWorkspace: () => void;
  onDeleteWorkspace: () => void;
  isDuplicateWorkspaceName: boolean;
  readOnly: boolean;
  onShareQuery: () => void;
  onMakeEditableCopy: () => void;
}

export default function QueryEditor({
  value,
  onChange,
  onRun,
  running,
  workspaces,
  activeWorkspaceId,
  workspaceName,
  onWorkspaceNameChange,
  onLoadWorkspace,
  onSaveWorkspace,
  onNewWorkspace,
  onDeleteWorkspace,
  isDuplicateWorkspaceName,
  readOnly,
  onShareQuery,
  onMakeEditableCopy,
}: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handleKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        onRun();
      }
      if (readOnly) return;
      if (e.key === "Tab") {
        e.preventDefault();
        const start = el.selectionStart;
        const end = el.selectionEnd;
        const next = value.slice(0, start) + "  " + value.slice(end);
        onChange(next);
        requestAnimationFrame(() => {
          el.selectionStart = el.selectionEnd = start + 2;
        });
      }
    };
    el.addEventListener("keydown", handleKey);
    return () => el.removeEventListener("keydown", handleKey);
  }, [value, onChange, onRun, readOnly]);

  return (
    <div className="relative flex flex-col h-full">
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        readOnly={readOnly}
        spellCheck={false}
        placeholder="-- Write a query, then press Ctrl/Cmd+Enter&#10;SELECT * FROM orders LIMIT 50;"
        className="flex-1 w-full resize-none bg-transparent text-[13.5px] font-mono leading-relaxed text-foreground placeholder:text-muted-foreground/60 p-4 focus:outline-none"
        aria-label="SQL query input"
      />
      <WorkspaceShelf
        workspaces={workspaces}
        activeWorkspaceId={activeWorkspaceId}
        workspaceName={workspaceName}
        onWorkspaceNameChange={onWorkspaceNameChange}
        onLoadWorkspace={onLoadWorkspace}
        onSaveWorkspace={onSaveWorkspace}
        onNewWorkspace={onNewWorkspace}
        onDeleteWorkspace={onDeleteWorkspace}
        isDuplicateName={isDuplicateWorkspaceName}
        readOnly={readOnly}
        onShareQuery={onShareQuery}
        onMakeEditableCopy={onMakeEditableCopy}
      />
      <div className="flex items-center justify-between px-4 py-2 border-t border-border/60 bg-card/60">
        <span className="text-[11px] text-muted-foreground font-mono">
          Ctrl/Cmd + Enter to run · TAB indents
        </span>
        <button
          onClick={() => onRun()}
          disabled={running}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-60 transition-all duration-150 active:scale-[0.97]"
        >
          {running ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Play className="h-3.5 w-3.5" />
          )}
          {running ? "Running" : "Run query"}
        </button>
      </div>
    </div>
  );
}
