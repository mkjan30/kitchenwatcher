#!/usr/bin/env node
// Pre-publish check for drafted MDX pages: node scripts/check-draft.mjs file.mdx [...]  (exit 1 on any FAIL)
// Complements lint-content (which reads dist/): this runs on source drafts, before they're live.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { ROOT, CONTENT } from './lib.mjs';
const require = createRequire(ROOT + '/package.json');
const yaml = require('js-yaml');
const { compile } = await import(ROOT + '/node_modules/@mdx-js/mdx/index.js');

const HANDS_ON = /\b(I|we) (tested|measured|timed|cooked|baked|fried|brewed|pulled a shot|used it|tried it|unboxed|owned)\b|\bin (my|our) (kitchen|testing|tests|lab)\b|\bafter (\d+|a few|two|three|several) (days|weeks|months) of (use|using|testing)\b|\bour (test results|testing showed|tests showed)\b/i;
const ALLOWED = ['title', 'description', 'author', 'published', 'updated', 'primary_keyword', 'secondary_keywords', 'draft',
  'hero', 'hero_alt', 'hero_credit', 'hero_credit_url', 'hero_license', 'hero_license_url', 'hero_caption',
  'sources', 'brief', 'faq', 'product_id', 'hub', 'pros', 'cons', 'verdict', 'category', 'products'];
const GENERIC_H2 = /^## (What owners report|Who should buy it.*|Related|Recalls|Alternatives|Price|Specs and price|Price and availability|What independent tests found|Specs, measurements and price|Specs and measurements)\s*$/gm;

// Linkable = static pages + every content page + URLs queued as batch-N in content/queue.md.
const LINKABLE = new Set(['/', '/how-we-research/', '/about/', '/affiliate-disclosure/', '/contact/', '/privacy/', '/authors/maksud/']);
for (const d of ['reviews', 'best', 'vs', 'guides', 'smart-kitchen']) {
  if (!existsSync(`${CONTENT}/${d}`)) continue;
  for (const f of readdirSync(`${CONTENT}/${d}`).filter((x) => x.endsWith('.mdx'))) {
    const slug = f.replace(/\.mdx$/, '');
    if (d === 'best') LINKABLE.add(`/best/${(readFileSync(`${CONTENT}/best/${f}`, 'utf8').match(/^category: *"?([a-z0-9-]+)/m) || [])[1] || slug}/`);
    else LINKABLE.add(`/${d}/${slug}/`);
  }
}
for (const m of readFileSync(`${ROOT}/content/queue.md`, 'utf8').matchAll(/\| (\/[a-z0-9/-]+\/) \|.*\| batch-\d+ \|/g)) LINKABLE.add(m[1]);

let bad = 0;
for (const f of process.argv.slice(2)) {
  const src = readFileSync(f, 'utf8');
  const m = src.match(/^---\n([\s\S]*?)\n---\n/);
  const out = [];
  const fail = (x) => out.push('FAIL ' + x);
  const warn = (x) => out.push('warn ' + x);
  let fm = {};
  try { fm = yaml.load(m[1]); } catch (e) { fail('YAML: ' + e.message); }
  const body = src.slice(m ? m[0].length : 0);
  for (const k of Object.keys(fm)) if (!ALLOWED.includes(k)) fail(`unknown frontmatter key: ${k}`);
  if (fm.brief) for (const k of Object.keys(fm.brief)) if (!['table_columns', 'notes', 'verify'].includes(k)) fail(`unknown brief key: ${k}`);
  if (typeof fm.draft !== 'boolean') fail('draft must be true or false');
  if (!fm.title || fm.title.length > 60) fail(`title length ${fm.title?.length}`);
  if (!fm.description || fm.description.length > 155) fail(`description length ${fm.description?.length}`);
  if (/\btest(s|ed|ing)?\b/i.test(fm.title || '')) warn(`title mentions testing: ${fm.title}`);
  if (!Array.isArray(fm.sources) || fm.sources.length < 2) fail(`sources[] needs >=2 URLs (has ${fm.sources?.length ?? 0})`);
  else for (const u of fm.sources) { try { new URL(u); } catch { fail(`bad source URL: ${u}`); } }
  if (f.includes('/reviews/')) for (const k of ['verdict', 'pros', 'cons']) if (!fm[k] || (Array.isArray(fm[k]) && !fm[k].length)) fail(`review needs ${k}`);
  if (fm.faq) {
    if (!Array.isArray(fm.faq) || fm.faq.length < 3 || fm.faq.length > 6) fail('faq needs 3-6 entries');
    else for (const x of fm.faq) {
      if (!x.q || !x.a || Object.keys(x).some((k) => !['q', 'a'].includes(k))) fail('faq entries need only q and a');
      const w = String(x.a).split(/\s+/).length;
      if (w < 25 || w > 90) warn(`faq answer ${w} words: ${String(x.q).slice(0, 50)}`);
      const hh = String(x.a).match(HANDS_ON);
      if (hh) fail(`hands-on phrasing in faq: ${hh[0]}`);
    }
  }
  if (/MEASURE/.test(src)) fail('MEASURE marker still present');
  const h = src.match(HANDS_ON);
  if (h) fail(`hands-on phrasing: "${h[0]}"`);
  if (/\/recipes\//.test(body)) fail('links to /recipes/ (paused)');
  if (/how-we-test/.test(src)) fail('links /how-we-test/ (now /how-we-research/)');
  const links = [...new Set([...body.matchAll(/\]\((\/[^)\s#]*)/g)].map((x) => x[1]))];
  for (const l of links) if (!LINKABLE.has(l)) fail(`internal link to non-existent page: ${l}`);
  if (links.length < 3) fail(`only ${links.length} internal links`);
  if (!/^\|[\s:|-]+\|\s*$/m.test(body)) warn('no markdown table');
  const generic = body.match(GENERIC_H2) || [];
  if (generic.length) warn(`generic H2s: ${generic.join(' | ')}`);
  const longP = body.split(/\n\s*\n/).filter((p) => !/^[#|\-\d<{]/.test(p.trim()) && p.split(/[.!?]+\s/).length > 5);
  if (longP.length) warn(`${longP.length} paragraph(s) over 4 sentences`);
  const verify = (src.match(/VERIFY:/g) || []).length;
  try { await compile(body); } catch (e) { fail('MDX: ' + e.message); }
  console.log(`${out.some((x) => x.startsWith('FAIL')) ? 'FAIL' : 'ok  '} ${f.replace(/.*src\/content\//, '')}  links=${links.length} sources=${fm.sources?.length ?? 0} verify=${verify}`);
  for (const x of out) console.log('     ' + x);
  if (out.some((x) => x.startsWith('FAIL'))) bad++;
}
process.exit(bad ? 1 : 0);
