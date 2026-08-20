# SQL Query Runner — design brainstorm

Context: portfolio project modeled on Atlan's SQL Query Runner take-home (browser SQL runner on a seeded dataset, results in a table, fast rendering on large result sets, clean code, intuitive UX). It is a data-tooling product, so the design should feel like a professional query console, not a marketing page.

## Three approaches

### 1. "Terminal Noir"
Dark IDE-like console with neon-green accents, monospace everything. Emotional intent: hacker tool.
Probability: 0.07

### 2. "Ledger Light"
Paper-inspired light theme: warm off-white background, ink-dark text, hairline rules, serif display headings paired with a monospace editor. Feels like a modern data notebook (think Retool-meets-print-journal). Emotional intent: calm precision, trustworthy tooling.
Probability: 0.04

### 3. "Slate Console"
Cool gray-blue surfaces with one strong teal accent, dense utilitarian layout, JetBrains Mono for data, Inter-free typography. Feels like a mature internal data product.
Probability: 0.05

## CHOSEN: Ledger Light

- **Design Movement**: Swiss editorial design applied to developer tooling — strong grid, hairline rules, restrained color, typographic hierarchy. Closest to modern "notebook" data tools (Notion-style calm) rather than dark IDE clichés.
- **Core Principles**:
  1. The data table is the hero — everything else stays out of its way.
  2. Hairline rules and whitespace organize; borders and shadows rarely needed.
  3. Ink-dark text on warm paper; one accent color used sparingly.
  4. Deterministic, fast interactions — no decorative motion.
- **Color Philosophy**: Warm paper (#faf8f4-ish, oklch ~0.975) background evokes printed ledgers and builds trust; ink (~oklch 0.25 warm) for text; a single deep teal (oklch 0.45 0.08 200) accent reserved for the run button, active states, and key metrics. No gradients, no purple.
- **Layout Paradigm**: Asymmetric console layout — slim left schema sidebar (tables/columns), wide center split (SQL editor top, results bottom with drag-style resizable divider), right-side narrow rail for query history and execution stats. Header strip with title + metrics.
- **Signature Elements**: (1) Hairline horizontal rules with a teal tick mark; (2) monospace numerals in results with tabular-nums; (3) a small "execution ledger" chip showing ms time and row count after each run.
- **Interaction Philosophy**: Keyboard-first (Ctrl/Cmd+Enter to run, arrow-page navigation), instant cursor feedback, no animations longer than 200ms. Hover states are subtle underline/ink shifts, not color floods.
- **Animation**: None beyond 150ms opacity fades on panel results appearing and the run button press scale(0.97). Respect prefers-reduced-motion.
- **Typography System**: "Fraunces" (serif display) for the product name and section labels in the header; "JetBrains Mono" for editor, table data, and metrics; "Public Sans" for UI labels/buttons. Hierarchy: mono data > sans UI > serif display (display used once).
- **Brand Essence**: Queryline — a calm browser SQL lab for exploring a seeded analytics dataset; built to show pagination-at-scale discipline. Personality: precise, calm, honest.
- **Brand Voice**: Understated engineering copy. Examples: "Run a query. Read the ledger." / "50,000 rows, one page at a time."
- **Wordmark & Logo**: "queryline" set in Fraunces italic lowercase with a teal square cursor glyph (▮) replacing the dot feel — actually use a simple teal block glyph before the wordmark.
- **Signature Brand Color**: Deep teal oklch(0.45 0.08 200).

## Style Decisions

- Keep the user-approved clean sans-serif “Queryline” wordmark and uploaded favicon in persistent chrome; the editorial serif treatment appears in the supporting “the execution ledger” line and the execution-rail heading instead.
- Maintain the Ledger Light palette of warm paper, ink, hairline neutrals, and deep teal. The retained uploaded mark is hue-adjusted in the application header so it supports the teal-only accent system.
- Treat result values and execution history as the visual hero: JetBrains Mono data, teal timing and count signals, hairline grouping, and a reserved teal rule for pinned runs.
