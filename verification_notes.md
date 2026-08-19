# Queryline Runtime Verification Notes

## Initial browser observations

The live preview loads successfully at the managed Queryline preview URL. Its initial monthly-revenue query displays 61 rows, three columns, and paginated results. The schema sidebar reports the seeded tables and volumes: customers (2,000), products (400), orders (50,000), order_items (120,000), and reviews (18,000).

The "All orders (pagination demo)" sample correctly populated the controlled SQL editor. The original Run-button event path was broken: browser logs recorded an unhandled rejection, `(queryText ?? sql).trim is not a function`, because React passed its mouse event to the optional query-text parameter. The initial automatic query execution was also occurring in render rather than in an effect.

Both issues were repaired. On a fresh browser reload, the initial monthly-revenue query executes and renders again, now from a mount-time effect. The repaired explicit Run action then executed `SELECT id, name, city FROM customers ORDER BY id LIMIT 3;` in 22 ms, replaced the previous 61-row result grid with three rows, and added the execution to the history rail.

The repaired Run action also executed the 50,000-row orders sample in 676 ms. The result grid showed 50 rows on page 1 of 1,000 and surfaced a matching completion notification, confirming that high-volume result retrieval and pagination initialization operate in the live browser.

The managed preview initially retained a stale client bundle after the engine change. Restarting the managed development server resolved this cache mismatch; the fresh preview mounted the repaired application and completed its initial query successfully. The subsequent high-volume browser verification is being performed against this restarted runtime.

After the restart, the 50,000-row sample ran successfully in 1,590 ms. `SELECT * FROM orders` now renders six independent headers (`id`, `customer_id`, `order_date`, `status`, `channel`, `total`) and six corresponding values per row, with page 1 of 1,000 showing 50 rows. This confirms the wildcard projection repair is live rather than merely test-covered.

The `Ctrl/Cmd + Enter` shortcut was revalidated with the editor explicitly focused. It executed `SELECT id, name FROM customers ORDER BY id LIMIT 2;` in 25 ms, replaced the high-volume grid with the expected two-row, two-column result, and recorded the statement in query history. The earlier non-execution was caused by browser focus, not an application defect.

The invalid query `SELECT * FROM missing_table;` produced the clear, non-crashing error `Unknown table: missing_table` in both the result area and transient notification. The application stayed responsive, the editor retained the attempted statement for correction, and prior successful history remained available.

After the error-path check, the all-orders sample was loaded and re-executed successfully. It returned 50,000 rows in 2,117 ms and restored a six-column result grid at page 1 of 1,000, ready for pagination verification.

Final verification: the all-orders result grid rendered its six wildcard-expanded columns correctly and retained the 50,000-row, 1,000-page pagination state. `Ctrl/Cmd+Enter` executed a focused editor query correctly. Automated checks completed successfully with 21/21 SQL engine tests passing, TypeScript type checking clean, and a production build produced. Desktop, mobile (375 px), and tablet (768 px) previews were reviewed. The initial mobile view revealed clipped fixed side rails, so the layout was repaired with compact, expandable Schema & Samples and History controls below the large-screen breakpoint. The repaired mobile and tablet views expose the query editor, Run control, result grid, and pagination without horizontal clipping. Recent runtime logs after the final restart contain only normal Vite connection messages and the non-blocking baseline-browser-mapping currency warning.

## Automated checks completed

`pnpm test` completed with 20/20 passing tests. `pnpm check` and `pnpm build` also passed. The build emitted only a non-blocking bundle-size advisory.
