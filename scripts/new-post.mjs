#!/usr/bin/env node
// npm run new -- --type review --keyword "ninja af101 review" [--product id] [--appliance air-fryer] [--author slug] [--slug x]
// Scaffolds a draft MDX with frontmatter pulled from data/products.json. Never overwrites.
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { dirname, join, relative } from 'node:path';
import { ROOT, CONTENT, products, slugify, urlFor } from './lib.mjs';

const TYPES = { review: 'reviews', best: 'best', vs: 'vs', 'smart-kitchen': 'smart-kitchen', recipe: 'recipes', guide: 'guides', deals: 'deals' };
const { values: a } = parseArgs({
  options: { type: { type: 'string' }, keyword: { type: 'string' }, product: { type: 'string' }, appliance: { type: 'string' }, author: { type: 'string' }, slug: { type: 'string' } },
});
const die = (m) => { console.error(`new-post: ${m}`); process.exit(1); };
const collection = TYPES[a.type];
if (!collection) die(`--type must be one of ${Object.keys(TYPES).join(', ')}`);
if (!a.keyword) die('--keyword is required');

const kw = a.keyword.trim().toLowerCase();
const catalog = products();
const today = new Date().toISOString().slice(0, 10);

// Match a product by id or by all of its id tokens appearing in the text.
const findProduct = (text) => {
  if (a.product) return catalog.find((p) => p.id === a.product) ?? die(`--product ${a.product} not in products.json`);
  const s = slugify(text);
  return catalog.find((p) => s.includes(p.id)) ?? catalog.find((p) => p.id.split('-').every((t) => s.split('-').includes(t)));
};
const needProduct = (text) => findProduct(text) ?? die(`no product in data/products.json matches "${text}" — add it first or pass --product`);

const authors = existsSync(join(CONTENT, 'authors')) ? readdirSync(join(CONTENT, 'authors')).filter((f) => f.endsWith('.md')).map((f) => f.slice(0, -3)) : [];
const author = a.author ?? authors[0] ?? die('no author in src/content/authors');
if (!authors.includes(author)) die(`author "${author}" not in src/content/authors`);

const fm = {};
let id = a.slug ?? slugify(kw);
let body = '';
const TODO_TABLE = '| Test | Result | Unit |\n|---|---|---|\n| TODO | TODO | s / °F / dB / g / W |\n';

switch (collection) {
  case 'reviews': {
    const p = needProduct(kw);
    id = a.slug ?? p.id;
    fm.product_id = p.id;
    body = `{/* TODO: first 60 words answer "${kw}" directly: verdict, who it's for, the number that matters. */}\n\n## How it did in testing\n\n${TODO_TABLE}\n## What broke\n\nTODO\n`;
    break;
  }
  case 'best': {
    const category = a.slug ?? slugify(kw.replace(/^best\s+/, '').replace(/\b(19|20)\d{2}\b/, ''));
    id = category;
    fm.category = category;
    fm.products = catalog.filter((p) => p.category === category).map((p) => p.id);
    if (!fm.products.length) die(`no products with category "${category}" in products.json`);
    body = `{/* TODO: first 60 words name the top pick and why. Ranking is by score only. */}\n\n## Comparison\n\n${TODO_TABLE}`;
    break;
  }
  case 'vs': {
    const [x, y] = kw.split(/\s+vs\.?\s+/);
    if (!y) die('vs keyword must look like "a vs b"');
    const px = needProduct(x), py = needProduct(y);
    id = a.slug ?? `${px.id}-vs-${py.id}`;
    fm.products = [px.id, py.id];
    body = `{/* TODO: first 60 words say which one to buy and for whom. */}\n\n## Head to head\n\n| Test | ${px.name} | ${py.name} |\n|---|---|---|\n| TODO | TODO | TODO |\n`;
    break;
  }
  case 'recipes': {
    const p = needProduct(a.product ?? kw);
    fm.appliance = a.appliance ?? slugify(p.category.replace(/s$/, ''));
    fm.product_id = p.id;
    body = `{/* TODO: first 60 words give time, temp and the result. Real photos only. */}\n`;
    break;
  }
  case 'deals': {
    // ISO week, yyyy-ww
    const d = new Date(); d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const wk = Math.ceil(((d - Date.UTC(d.getUTCFullYear(), 0, 1)) / 864e5 + 1) / 7);
    fm.week = `${d.getUTCFullYear()}-${String(wk).padStart(2, '0')}`;
    id = a.slug ?? fm.week;
    fm.items = [];
    break;
  }
  default: {
    const p = findProduct(kw);
    if (p) fm.product_id = p.id;
    body = `{/* TODO: first 60 words answer "${kw}" directly. */}\n\n## Measurements\n\n${TODO_TABLE}`;
  }
}

const title = (kw.charAt(0).toUpperCase() + kw.slice(1)).slice(0, 60);
const y = (v) => (Array.isArray(v) ? `[${v.join(', ')}]` : JSON.stringify(v));
const lines = [
  `title: ${y(title)}`,
  `description: "TODO ≤155 chars"`,
  `author: ${author}`,
  `published: ${today}`,
  `updated: ${today}`,
  `primary_keyword: ${y(kw)}`,
  `secondary_keywords: []`,
  `draft: true`,
  ...Object.entries(fm).map(([k, v]) => `${k}: ${y(v)}`),
];

const file = join(CONTENT, collection, `${id}.mdx`);
if (existsSync(file)) die(`${relative(ROOT, file)} already exists`);
mkdirSync(dirname(file), { recursive: true });
writeFileSync(file, `---\n${lines.join('\n')}\n---\n\n${body}`);
console.log(`created ${relative(ROOT, file)} → ${urlFor(collection, id, fm)}`);
