#!/usr/bin/env node
// Validates every JSON-LD block in dist/ against the rules in CLAUDE.md "Schema" + Google's required fields.
import { existsSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { ROOT, DIST, SITE, builtPages } from './lib.mjs';

const errors = [];
const DURATION = /^P(T(\d+H)?(\d+M)?)$/;
const DATE = /^\d{4}-\d{2}-\d{2}/;

// type → (node, fail) checks. Unknown types pass.
const rules = {
  Organization: (n, f) => {
    need(n, f, 'name');
    if (n['@id']?.endsWith('/#org')) { need(n, f, 'url', 'logo'); localFile(n.logo, f, 'logo'); } // site org; sellers only need a name
  },
  WebSite: (n, f) => {
    need(n, f, 'name', 'url');
    const t = n.potentialAction?.target?.urlTemplate ?? n.potentialAction?.target;
    if (!String(t).includes('{search_term_string}')) f('SearchAction target lacks {search_term_string}');
  },
  BreadcrumbList: (n, f) => listItems(n, f, (li) => need(li, f, 'name', 'item')),
  ItemList: (n, f) => listItems(n, f),
  Product: (n, f, parent) => {
    need(n, f, 'name');
    if ('aggregateRating' in n) f('aggregateRating not allowed (no fake ratings)');
    if (!n.review && !n.offers) f('Product needs offers or review (Google validates every Product node; use Thing for "about")');
    if (n.image) localFile(n.image, f, 'image');
  },
  Review: (n, f) => {
    need(n, f, 'author', 'reviewRating', 'datePublished');
    if (n.author && n.author['@type'] !== 'Person') f('Review author must be a Person');
  },
  Rating: (n, f) => {
    need(n, f, 'ratingValue', 'bestRating', 'worstRating');
    if (!(n.ratingValue >= n.worstRating && n.ratingValue <= n.bestRating)) f(`ratingValue ${n.ratingValue} out of range`);
  },
  Person: (n, f) => { need(n, f, 'name', 'url'); if (!n.sameAs?.length) f(`Person "${n.name}" needs sameAs`); },
  Article: (n, f) => {
    need(n, f, 'headline', 'author', 'datePublished', 'dateModified');
    if (n.headline?.length > 110) f('headline > 110 chars');
  },
  FAQPage: (n, f) => {
    if (!n.mainEntity?.length) f('FAQPage without questions');
    for (const q of n.mainEntity ?? []) if (!q.name || !q.acceptedAnswer?.text) f('Question needs name + acceptedAnswer.text');
  },
  Recipe: (n, f) => {
    need(n, f, 'name', 'image', 'author', 'datePublished', 'recipeIngredient', 'recipeInstructions');
    for (const k of ['prepTime', 'cookTime', 'totalTime']) if (k in n && !DURATION.test(n[k])) f(`${k} "${n[k]}" not ISO 8601`);
    for (const img of [].concat(n.image ?? [])) localFile(img, f, 'image');
  },
  Offer: (n, f) => {
    need(n, f, 'price', 'priceCurrency', 'priceValidUntil');
    if (n.priceValidUntil && !DATE.test(n.priceValidUntil)) f('priceValidUntil not a date');
  },
  VideoObject: (n, f) => need(n, f, 'name', 'thumbnailUrl', 'uploadDate'),
};

function need(n, f, ...keys) {
  for (const k of keys) {
    const v = n[k];
    if (v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length)) f(`missing ${k}`);
  }
}
function listItems(n, f, each = () => {}) {
  const items = n.itemListElement ?? [];
  if (!items.length) f(`${n['@type']} is empty`);
  items.forEach((li, i) => { if (li.position !== i + 1) f(`${n['@type']} position ${li.position} should be ${i + 1}`); each(li); });
}
// Our own absolute URLs in schema must resolve to a built file.
function localFile(url, f, key) {
  if (typeof url !== 'string' || !url.startsWith(SITE)) return;
  const path = decodeURI(new URL(url).pathname);
  if (!existsSync(join(DIST, path))) f(`${key} ${path} not found in dist`);
}

function walk(node, f, parent) {
  if (Array.isArray(node)) return node.forEach((x) => walk(x, f, parent));
  if (!node || typeof node !== 'object') return;
  const type = node['@type'];
  if (type && rules[type]) rules[type](node, (m) => f(`${type}: ${m}`), parent);
  for (const [k, v] of Object.entries(node)) if (k !== '@type') walk(v, f, type ?? parent);
}

const pages = builtPages();
if (!pages.length) { console.error('check-schema: no dist/ — run `npm run build` first'); process.exit(1); }

let blocks = 0;
for (const p of pages) {
  const html = readFileSync(p.file, 'utf8');
  const where = relative(ROOT, p.file);
  const found = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  if (!found.length && !p.url.startsWith('/404')) errors.push(`${where}: no JSON-LD`);
  const types = new Set();
  for (const [, raw] of found) {
    blocks++;
    let data;
    try { data = JSON.parse(raw); } catch (e) { errors.push(`${where}: invalid JSON-LD (${e.message})`); continue; }
    if (data['@context'] !== 'https://schema.org') errors.push(`${where}: @context must be https://schema.org`);
    walk(data, (m) => errors.push(`${where}: ${m}`));
    JSON.stringify(data, (k, v) => (k === '@type' && types.add(v), v));
  }
  // Page-level required types (CLAUDE.md "Schema").
  const want = ['Organization', 'WebSite', 'BreadcrumbList'];
  const isIndex = ['/reviews/', '/vs/', '/guides/'].includes(p.url); // section index pages: no Article
  if (p.url.startsWith('/reviews/') && !isIndex) want.push('Article', 'Person');
  // Research site: we never mark up a first-hand Review or our own Rating (CLAUDE.md).
  if (types.has('Review') || types.has('Rating')) errors.push(`${where}: Review/Rating markup not allowed (no hands-on testing)`);
  if (p.url.startsWith('/best/')) want.push('ItemList');
  if (p.url.startsWith('/recipes/')) want.push('Recipe');
  if (/^\/(guides|vs|smart-kitchen)\//.test(p.url) && !isIndex) want.push('Article');
  if (/^\/(deals|watch)\//.test(p.url)) want.push('ItemList', 'Offer');
  if (!p.url.startsWith('/404')) for (const t of want) if (!types.has(t)) errors.push(`${where}: missing ${t}`);
}

if (errors.length) {
  console.error(`check-schema: ${errors.length} problem(s)\n` + errors.map((e) => '  ✗ ' + e).join('\n'));
  process.exit(1);
}
console.log(`check-schema: ok (${blocks} JSON-LD blocks across ${pages.length} pages)`);
