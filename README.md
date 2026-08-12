# Queryline

Queryline is a browser-based SQL console. Type queries in the editor, hit Run,
and see results in a paginated table. Everything runs in the browser: the
dataset is seeded at load time, and queries are executed by a small
hand-rolled SQL engine written in TypeScript. There is no server, no
WebAssembly, and no SQL library.

## Features

- **A real SQL engine.** `client/src/lib/engine.ts` is a tokenizer,
  recursive-descent parser, and executor in roughly 1,200 lines of
  TypeScript, with no runtime dependencies.
- **A seeded relational dataset.** Five tables with realistic volumes:
  2,000 customers, 400 products, 50,000 orders, ~150,000 order line items,
  and ~18,000 reviews.
- **Paginated results.** Only the active page is ever rendered, with a
  sticky header and column sorting, so a 50,000-row result set pages like
  a small one.
- **A schema sidebar** with per-table row counts and clickable sample
  queries, plus a **query history** rail that records every run with its
  execution time and row count.
- **Read-only by construction.** The parser has no INSERT/UPDATE/DELETE
  production, so arbitrary SQL cannot mutate anything.

Modeled on the kind of data-tooling product that companies like Atlan build:
a query surface, a schema browser, instant feedback, and results that stay
fast even when a query returns tens of thousands of rows.

## What it does

- **SQL editor** with Ctrl/Cmd+Enter to run and Tab to indent. Syntax is a
  useful subset of PostgreSQL-flavored SQL (see "Supported SQL" below).
- **Seeded dataset** loaded once into memory: 5 relational tables with
  realistic volumes:

| Table | Rows | Purpose |
|---|---|---|
| customers | 2,000 | customer demographics and segments |
| products | 400 | product catalog across categories |
| orders | 50,000 | five years of orders, the big table |
| order_items | ~150,000 | line items that join into orders |
| reviews | ~18,000 | ratings and review text |

- **Results table** with pagination (10/25/50 rows per page), a sticky
  header, and numeric alignment. Only the current page is ever rendered, so
  a 50,000-row result set never touches the DOM in bulk.
- **Schema sidebar** listing every table and column with row counts, and six
  sample queries you can load into the editor in one click.
- **Query history** rail: your recent runs are kept so you can restore any
  of them back into the editor.
- **Errors surface inline**: invalid SQL shows a plain-language message
  (the engine validates column names, table names, and clause order).

## Supported SQL

The engine is read-only by construction; the parser only understands
SELECT statements.

```
SELECT [DISTINCT] col-exprs FROM t [alias]
[LEFT] JOIN t [alias] ON cond
WHERE cond
GROUP BY col-expr [HAVING cond]
ORDER BY col-expr [ASC | DESC]
LIMIT n [OFFSET m]
```

Expressions cover column references (`orders.total`, `o.total`, `total`),
string/number literals, the usual comparison and boolean operators
(`=`, `!=`, `<`, `>`, `<=`, `>=`, `AND`, `OR`, `NOT`, `LIKE`, `IN`,
`IS [NOT] NULL`), and these functions:

```
COUNT(*)  COUNT(col)  COUNT(DISTINCT col)  SUM  AVG  MIN  MAX
ROUND(x, d)  SUBSTR(s, start, len)  LOWER  UPPER  LENGTH  COALESCE  ABS
```

Aliased expressions work in `GROUP BY` and `ORDER BY`, which is the part
people usually get wrong when they hand-roll this:

```sql
SELECT substr(order_date, 1, 7) AS month, ROUND(SUM(total), 2) AS revenue
FROM orders
GROUP BY month
ORDER BY revenue DESC;
```

## How the engine works

`client/src/lib/engine.ts` is the entire SQL engine, roughly 1,200 lines.
Execution follows the classic pipeline:

1. **Tokenize.** The input is split into identifiers, operators, keywords,
   strings, and numbers. Dot-separated identifiers like `o.customer_id` are
   kept as qualified names.
2. **Parse.** A recursive-descent parser builds an AST: select list, FROM,
   joins, WHERE, GROUP BY, HAVING, ORDER BY, LIMIT/OFFSET. Clause order is
   validated here, which is where most "invalid SQL" errors come from.
3. **Execute.** Rows are plain TypeScript objects held in memory per table.
   The executor filters in FROM/JOIN order, groups, aggregates, sorts, and
   slices.

A few decisions worth calling out:

- **Hash join on equality predicates.** `ON a.col = b.col` is detected by
  the parser and the engine builds a hash index on one side before probing
  the other. Without this, the customers-orders join (2,000 x 50,000 rows)
  would be a 100-million-iteration nested loop; with it, the join is
  essentially linear.
- **Merged scopes with qualified keys.** After a join, each combined row
  carries plain keys plus table-qualified and alias-qualified copies
  (`id`, `customers.id`, `c.id`), so name collisions like `customers.id`
  versus `orders.id` resolve correctly in any clause.
- **Alias-aware grouping.** `GROUP BY month` resolves through the select
  list aliases before falling back to raw expressions, matching real
  database behavior.
- **Read-only by construction.** The parser has no INSERT/UPDATE/DELETE
  production, so there is nothing to abuse.

## Performance notes

The first query in a session pays the seed-parsing cost (the SQL statements
are parsed into row arrays once and cached). After that, the cost per query
is dominated by the join and group work, which stays linear thanks to the
hash join. On the reference dataset, the six sample queries run between
roughly 1.4s and 5s in the browser on first run, including the seed cost
(about 1.2 to 1.8s of that is seed parsing, paid once).

Rendering is the part that most SQL UIs get wrong. A naive table renders
every row; on 50,000 rows that means tens of thousands of DOM nodes and
seconds of layout work. This app renders only the active page (10 to 50
rows) and keeps column cells memoized by row identity, so paging through a
large result set feels like paging through a small one. The measured
execution time (shown in the header and history rail) excludes rendering,
so you can see the engine's cost separately from the table's.

## Running it locally

```bash
pnpm install
pnpm dev        # starts Vite on http://localhost:3000
pnpm build      # production build
pnpm preview    # preview the production build
pnpm check      # TypeScript typecheck
pnpm test       # engine test suite (vitest)
```

There are no environment variables, no API keys, and no backend to configure.

## Project structure

```
client/src/
├── lib/engine.ts   # tokenizer, parser, executor (the SQL engine)
├── lib/seed.ts     # CREATE TABLE + INSERT statements for the dataset
├── pages/Home.tsx  # console layout: sidebar, editor, results
└── components/
    ├── QueryEditor.tsx    # editor with Ctrl+Enter and Tab indent
    ├── ResultsTable.tsx   # paginated, memoized result grid
    ├── SchemaSidebar.tsx  # tables, columns, row counts, sample queries
    └── HistoryRail.tsx    # recent runs, click to restore
```

## Scope and limitations

It is not SQLite, not PostgreSQL, and not a replacement for either. There
is no index maintenance, no query planner, no transactions, and no support
for subqueries, CTEs, or window functions. Inline arithmetic inside
aggregate arguments (such as `SUM(a*b)`) is also out of scope; sum a
pre-computed column or a plain column instead. The surface is deliberately
small and correct within itself: enough to explore a real relational
dataset in the browser, and a concrete demonstration that the expensive
part of a query console is never the SQL.

## Security

There are no secrets in this repository: no environment variables, no API
keys, and no third-party credentials. The engine runs read-only SELECT
statements against an in-memory dataset, so even an adversarial query
cannot mutate data or reach a server. Static content is served from the
built `dist/` output; nothing is posted to any external service.

## Contributing

Bug reports and improvements are welcome through issues and pull requests.
For engine work, the test suite in `client/src/lib/engine.test.ts` is the
regression contract; keep it green.

## License

MIT. See [LICENSE](LICENSE).
