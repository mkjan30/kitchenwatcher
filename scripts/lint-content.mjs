#!/usr/bin/env node
// Content lint. Run after `npm run build` (the link-graph checks read dist/).
// Frontmatter: delegated to `astro sync` (the zod schemas in src/content/config.ts).
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { ROOT, CONTENT, DIST, SITE, entries, builtPages, products } from './lib.mjs';

const errors = [];
const fail = (where, msg) => errors.push(`${where}: ${msg}`);
const rel = (f) => relative(ROOT, f);

// 1. Frontmatter vs zod schemas.
const sync = spawnSync('npx', ['astro', 'sync'], { cwd: ROOT, encoding: 'utf8' });
if (sync.status !== 0) fail('frontmatter', `astro sync failed\n${sync.stdout}${sync.stderr}`);

const all = entries();
const live = all.filter((e) => e.data.draft === false);
const catalog = products();
const productById = new Map(catalog.map((p) => [p.id, p]));

// Merchant hosts from the registry + known affiliate networks/shorteners.
const merchantHosts = catalog.flatMap((p) => p.merchants.map((m) => new URL(m.url).hostname.replace(/^www\./, '')));
const affiliateRe = new RegExp(
  String.raw`https?://[^\s)"'>]*(` +
    ['amazon\\.[a-z.]+', 'amzn\\.to', 'shareasale\\.com', 'awin1\\.com', 'anrdoezrs\\.net', 'jdoqocy\\.com', 'tkqlhce\\.com',
     'dpbolvw\\.net', 'kqzyfj\\.com', 'sjv\\.io', 'pxf\\.io', 'linksynergy\\.com', 'skimresources\\.com', 'redirectingat\\.com',
     'howl\\.me', ...merchantHosts.map((h) => h.replace(/\./g, '\\.'))].join('|') +
    String.raw`)|[?&](tag|affid|aff_id|irclickid)=`,
  'i',
);

const internalLinks = (body) =>
  new Set([...body.matchAll(/\]\((\/[^)\s#]*)|href=["'{`]+(\/[^"'}`\s#]*)/g)].map((m) => m[1] ?? m[2]));

for (const e of all) {
  const where = rel(e.file);
  if (affiliateRe.test(e.body)) fail(where, 'raw affiliate/merchant URL — use <AffiliateLink product_id merchant />');
  if (/!\[\s*\]\(/.test(e.body)) fail(where, 'markdown image without alt text');
  for (const tag of e.body.match(/<(img|Image|Picture)\b[^>]*>/g) ?? []) {
    if (!/\balt=("[^"]+"|\{[^}]+\})/.test(tag)) fail(where, `image without alt: ${tag.slice(0, 60)}`);
  }
  if (/in this article,? we will/i.test(e.body)) fail(where, 'banned opener "In this article we will…"');
  if (e.data.author && !existsSync(join(CONTENT, 'authors', `${e.data.author}.md`))) fail(where, `author "${e.data.author}" not in src/content/authors`);
}

for (const e of live) {
  const where = rel(e.file);
  const links = [...internalLinks(e.body)].filter((l) => l !== e.url);
  if (/MEASURE:/.test(readFileSync(e.file, 'utf8'))) fail(where, 'MEASURE placeholder left in a live page — replace with the measured number');
  if (links.length < 3) fail(where, `${links.length} internal links in body, need ≥3`);
  if (['reviews', 'guides'].includes(e.collection) && !/^\|[\s:|-]+\|\s*$/m.test(e.body) && !/<table/i.test(e.body)) {
    fail(where, 'no measurement table');
  }
  if (e.collection === 'recipes' && !live.some((r) => r.collection === 'reviews' && r.data.product_id === e.data.product_id)) {
    fail(where, `"Made in" needs a published review of ${e.data.product_id}`);
  }
}

// 2. Link graph + alt text on the built site.
const pages = builtPages();
if (!pages.length) {
  fail('dist', 'no build output — run `npm run build` first');
} else {
  const norm = (href) => {
    let h = href.replace(SITE, '').split(/[?#]/)[0];
    if (!h.startsWith('/') || h.startsWith('//') || /\.[a-z0-9]+$/i.test(h)) return null;
    return h.endsWith('/') ? h : h + '/';
  };
  const outbound = new Map();
  for (const p of pages) {
    const html = readFileSync(p.file, 'utf8');
    if (/\bTODO\b/.test(html)) fail(rel(p.file), 'placeholder TODO in built page');
    outbound.set(p.url, new Set([...html.matchAll(/href="([^"]+)"/g)].map((m) => norm(m[1])).filter(Boolean)));
    for (const img of html.match(/<img\b[^>]*>/g) ?? []) {
      if (!/\balt="[^"]+"/.test(img)) fail(rel(p.file), `built <img> without alt: ${img.slice(0, 80)}`);
    }
  }
  const linkedFrom = (url, fromFilter = () => true) =>
    [...outbound].some(([from, to]) => from !== url && fromFilter(from) && to.has(url));

  for (const p of pages) {
    if (['/', '/404/'].includes(p.url)) continue;
    if (!linkedFrom(p.url)) fail(p.url, 'orphan — no page links here');
  }
  for (const e of live.filter((x) => ['reviews', 'vs', 'recipes', 'guides', 'smart-kitchen'].includes(x.collection))) {
    const pid = e.data.product_id ?? e.data.products?.[0];
    const hub = pid && productById.get(pid) ? `/best/${productById.get(pid).category}/` : null;
    const ok = hub ? linkedFrom(e.url, (f) => f === hub) : linkedFrom(e.url, (f) => f.startsWith('/best/'));
    if (!ok) fail(rel(e.file), `not linked from its hub ${hub ?? '/best/*/'}`);
  }
}

if (errors.length) {
  console.error(`lint-content: ${errors.length} problem(s)\n` + errors.map((e) => '  ✗ ' + e).join('\n'));
  process.exit(1);
}
console.log(`lint-content: ok (${all.length} entries, ${live.length} live, ${pages.length} built pages)`);
