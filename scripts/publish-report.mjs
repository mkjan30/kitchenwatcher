#!/usr/bin/env node
// Publish report: per-article word count + SEO metrics for pages live in dist/.
// npm run report                → every live page
// npm run report -- <git-ref>   → only content added/changed since <git-ref> (e.g. HEAD~1, a commit sha)
// Reads the MDX source for content metrics and the built HTML for JSON-LD and noindex. Run after `npm run build`.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, DIST, entries } from './lib.mjs';

const since = process.argv[2];
let pages = entries().filter((e) => e.data.draft === false);
if (since) {
  const changed = new Set(
    execFileSync('git', ['diff', '--name-only', since, 'HEAD', '--', 'src/content'], { cwd: ROOT, encoding: 'utf8' })
      .split('\n').filter(Boolean).map((f) => join(ROOT, f)),
  );
  pages = pages.filter((e) => changed.has(e.file));
}

const syl = (w) => {
  w = w.toLowerCase().replace(/[^a-z]/g, '');
  if (w.length <= 3) return 1;
  w = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '');
  return (w.match(/[aeiouy]{1,2}/g) || [1]).length;
};

const rows = pages.map((e) => {
  const raw = readFileSync(e.file, 'utf8');
  const fm = raw.match(/^---\n([\s\S]*?)\n---\n/)[1];
  const get = (k) => (fm.match(new RegExp(`^${k}: *"?(.*?)"?$`, 'm')) || [])[1] || '';
  const listLen = (k) => { const m = fm.match(new RegExp(`^${k}:\\n((?:  - .*\\n?)+)`, 'm')); return m ? m[1].split('\n').filter((l) => l.startsWith('  - ')).length : 0; };
  const body = e.body.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/^import .*$/gm, '');
  const prose = body.split('\n').filter((l) => !l.trim().startsWith('|')).join('\n')
    .replace(/<[^>]+>/g, ' ').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[#*_>`]/g, ' ');
  const words = prose.split(/\s+/).filter((w) => /[a-z0-9]/i.test(w));
  const sentences = prose.split(/[.!?]+\s/).filter((s) => s.trim().split(/\s+/).length > 2).length || 1;
  const flesch = Math.round(206.835 - 1.015 * (words.length / sentences) - 84.6 * (words.reduce((a, w) => a + syl(w), 0) / words.length));
  const faq = (fm.match(/^  - q: /gm) || []).length;
  const title = get('title');
  const pk = get('primary_keyword').toLowerCase();
  const core = pk.replace(/\b(review|best|how to|vs\.?|can you|do you need to|what|why is my|where to put a)\b/g, ' ').split(/\s+/).filter((t) => t.length > 2);
  const first100 = words.slice(0, 100).join(' ').toLowerCase();
  const html = join(DIST, e.url, 'index.html');
  const built = existsSync(html) ? readFileSync(html, 'utf8') : '';
  const types = new Set();
  for (const m of built.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try { JSON.stringify(JSON.parse(m[1]), (k, v) => (k === '@type' && types.add(v), v)); } catch {}
  }
  const pageTypes = [...types].filter((t) => !['Organization', 'WebSite', 'SearchAction', 'EntryPoint', 'BreadcrumbList', 'ListItem', 'Brand', 'Person', 'Question', 'Answer'].includes(t));
  return {
    url: e.url,
    words: words.length,
    title: `${title.length}`,
    desc: `${get('description').length}`,
    kwTitle: core.every((t) => title.toLowerCase().includes(t)) ? 'yes' : 'partial',
    kw100: core.every((t) => first100.includes(t)) ? 'yes' : 'partial',
    h2: (body.match(/^## /gm) || []).length,
    faq,
    links: new Set([...body.matchAll(/\]\((\/[^)\s#]*)/g)].map((m) => m[1])).size,
    sources: listLen('sources'),
    images: (raw.match(/^hero: /m) ? 1 : 0) + (body.match(/<Figure\b/g) || []).length,
    flesch,
    asl: Math.round(words.length / sentences),
    schema: pageTypes.join('+') || '-',
    live: built ? (built.includes('content="noindex"') ? 'built, noindex' : 'built, indexable') : 'NOT BUILT',
  };
});

const cols = ['url', 'words', 'title', 'desc', 'kwTitle', 'kw100', 'h2', 'faq', 'links', 'sources', 'images', 'flesch', 'asl', 'schema', 'live'];
const head = ['Page', 'Words', 'Title chars', 'Desc chars', 'KW in title', 'KW in first 100', 'H2s', 'FAQs', 'Internal links', 'Sources', 'Images', 'Flesch', 'Avg sentence', 'Schema', 'Status'];
console.log(`| ${head.join(' | ')} |\n|${head.map(() => '---').join('|')}|`);
for (const r of rows) console.log(`| ${cols.map((c) => r[c]).join(' | ')} |`);
const n = rows.length || 1;
const avg = (k) => Math.round(rows.reduce((a, r) => a + r[k], 0) / n);
console.log(`\n${rows.length} page(s). Avg words ${avg('words')}, avg Flesch ${avg('flesch')}, avg sources ${avg('sources')}, avg internal links ${avg('links')}.` +
  ` Word range ${Math.min(...rows.map((r) => r.words))}–${Math.max(...rows.map((r) => r.words))}.` +
  ` Not built: ${rows.filter((r) => r.live === 'NOT BUILT').map((r) => r.url).join(', ') || 'none'}.`);
