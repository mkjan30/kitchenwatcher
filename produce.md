---
description: Take the next N queued items from content/queue.md and produce draft pages
argument-hint: [count]
---

Read CLAUDE.md and PLAN.md. Open content/queue.md and take the top ${1:-5} rows with status "queued", in priority order.

For each row:
1. `npm run new -- --type {page type} --keyword "{primary keyword}"` to scaffold.
2. Research the page with WebSearch + WebFetch: fetch the top 5 ranking pages for the primary keyword, note what they cover, what they measure, what they miss. Fetch the product's Amazon page and 2 other retailer pages for specs and price. Fetch the top Reddit thread on it for real complaints.
3. Write the full body per CLAUDE.md rules. Spec-derived numbers go in the comparison table labeled "manufacturer spec"; leave a `<!-- MEASURE: ... -->` comment for every number that needs hands-on testing. Fill `brief` frontmatter with those measurements and the table columns.
4. Internal links: link to the hub, to every vs/guide/recipe in the queue that names this product (use the target URLs from the queue even if not yet built), and back from the hub page.
5. Keep `draft: true`. Set status in queue.md to "drafted" with today's date.
6. `npm run lint:content`. Fix anything it flags before moving on.

Commit once at the end: `content: draft {n} pages from queue`. Report: pages drafted, MEASURE comments left per page, lint warnings you could not fix.
