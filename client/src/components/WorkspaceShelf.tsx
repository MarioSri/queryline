/**
 * Ledger Light — workspace shelf.
 * A compact filing strip for browser-local named SQL drafts. It preserves the
 * console's paper-and-ink density while keeping workspace actions explicit.
 */

import type { QueryWorkspace } from "@/lib/preferences";
import { Bookmark, Plus, Save, Trash2 } from "lucide-react";

interface Props {
  workspaces: QueryWorkspace[];
  activeWorkspaceId: string | null;
  workspaceName: string;
  onWorkspaceNameChange: (name: string) => void;
  onLoadWorkspace: (id: string) => void;
  onSaveWorkspace: () => void;
  onNewWorkspace: () => void;
  onDeleteWorkspace: () => void;
}

export default function WorkspaceShelf({
  workspaces,
  activeWorkspaceId,
  workspaceName,
  onWorkspaceNameChange,
  onLoadWorkspace,
  onSaveWorkspace,
  onNewWorkspace,
  onDeleteWorkspace,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 px-4 py-1.5 border-t border-border/40 bg-secondary/25">
      <Bookmark className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden="true" />
      <label htmlFor="workspace-select" className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        Workspace
      </label>
      <select
        id="workspace-select"
        value={activeWorkspaceId ?? ""}
        onChange={(event) => {
          if (event.target.value) onLoadWorkspace(event.target.value);
        }}
        className="min-w-[8.5rem] max-w-[12rem] bg-transparent border-0 border-b border-border px-1 py-1 text-[11px] font-mono text-foreground focus:outline-none focus:border-primary"
        aria-label="Saved query workspace"
      >
        <option value="">Unsaved query</option>
        {workspaces.map((workspace) => (
          <option key={workspace.id} value={workspace.id}>
            {workspace.name}
          </option>
        ))}
      </select>
      <label htmlFor="workspace-name" className="sr-only">Workspace name</label>
      <input
        id="workspace-name"
        value={workspaceName}
        onChange={(event) => onWorkspaceNameChange(event.target.value)}
        placeholder="Workspace name"
        className="min-w-[7rem] flex-1 bg-transparent border-b border-border px-1 py-1 text-[11px] font-mono text-foreground placeholder:text-muted-foreground/65 focus:outline-none focus:border-primary"
        aria-describedby="workspace-help"
      />
      <span id="workspace-help" className="sr-only">Save stores this SQL locally. Editing the name then saving renames the active workspace.</span>
      <button
        type="button"
        onClick={onSaveWorkspace}
        title={activeWorkspaceId ? "Save query changes and workspace name" : "Save this query as a workspace"}
        className="inline-flex items-center gap-1 border-l border-border/60 px-2 py-1 text-[11px] font-mono text-muted-foreground hover:text-primary focus:outline-none focus:ring-1 focus:ring-primary/60 transition-colors duration-150 active:scale-[0.97]"
      >
        <Save className="h-3 w-3" aria-hidden="true" />
        Save
      </button>
      <button
        type="button"
        onClick={onNewWorkspace}
        title="Prepare a new named workspace from the current query"
        className="inline-flex items-center gap-1 border-l border-border/60 px-2 py-1 text-[11px] font-mono text-muted-foreground hover:text-primary focus:outline-none focus:ring-1 focus:ring-primary/60 transition-colors duration-150 active:scale-[0.97]"
      >
        <Plus className="h-3 w-3" aria-hidden="true" />
        New
      </button>
      <button
        type="button"
        onClick={onDeleteWorkspace}
        disabled={!activeWorkspaceId}
        className="inline-flex items-center justify-center border-l border-border/60 p-1 text-muted-foreground hover:text-destructive focus:outline-none focus:ring-1 focus:ring-primary/60 disabled:opacity-35 disabled:pointer-events-none transition-colors duration-150 active:scale-[0.97]"
        title="Delete the active workspace"
        aria-label="Delete the active workspace"
      >
        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}
