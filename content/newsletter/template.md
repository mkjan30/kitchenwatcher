# Newsletter template (monthly, Buttondown)

Copy to `content/newsletter/YYYY-MM.md`, fill in, owner pastes into Buttondown and sends. Under 400 words. Same rules as the site: every claim sourced, no hands-on wording, plain links (no affiliate links until the program is approved).

Fill-in sources:
- New pages: `git log --since=<first of last month> --diff-filter=A --name-only -- src/content` (or `npm run report -- <ref>`), live pages only.
- Recalls: CPSC recalls search for each covered category/brand since the last issue (https://www.cpsc.gov/Recalls). Only list recalls whose CPSC page you opened.
- Tip: one sourced fact from a page published this month, with the link.

---

**Subject:** {Month}: {one concrete hook, e.g. "a stand mixer recall check and 19 new guides"}

Hi,

{One or two sentences: what changed on Kitchen Watcher this month and why it matters to the reader.}

## New this month
- [{Page title}]({https://kitchenwatcher.com/...}) — {one line: the question it answers}
- ...  (5–8 picks; link the section index for the rest: https://kitchenwatcher.com/guides/)

## Recalls to know about
- **{Product, model numbers}** — {hazard in CPSC's words}. Remedy: {per CPSC}. [CPSC notice]({url})
- {If none: "No new CPSC recalls for the products we cover this month."}

## One useful thing
{2–3 sentences: a sourced, practical tip, credited ("per KitchenAid's manual…"), linking the page it came from.}

That's it until next month. Reply to this email if there's a product you want us to look into.

{Owner name}
Kitchen Watcher — research-based kitchen gear guides. We don't test products hands-on; every claim links its source. [How we research](https://kitchenwatcher.com/how-we-research/)
