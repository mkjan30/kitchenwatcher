#!/usr/bin/env node
// npm run ping:indexnow [-- /reviews/x/ https://kitchenwatcher.com/y/]
// No args → URLs of content files changed in the last commit. Run after the deploy is live.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { ROOT, CONTENT, SITE, parseFrontmatter, urlFor } from './lib.mjs';

// Key file lives at public/{key}.txt (IndexNow's default location, served at /{key}.txt).
const keyFile = readdirSync(join(ROOT, 'public')).find((f) => /^[a-f0-9]{32}\.txt$/.test(f));
if (!keyFile) { console.error('ping-indexnow: no public/{32-hex}.txt key file'); process.exit(1); }
const key = keyFile.slice(0, -4);

let urls = process.argv.slice(2).map((u) => new URL(u, SITE).href);
if (!urls.length) {
  const changed = execFileSync('git', ['diff', '--name-only', 'HEAD~1', 'HEAD', '--', 'src/content'], { cwd: ROOT, encoding: 'utf8' })
    .split('\n')
    .filter((f) => f.endsWith('.mdx') && existsSync(join(ROOT, f)));
  for (const f of changed) {
    const [collection, ...rest] = relative(CONTENT, join(ROOT, f)).split('/');
    const { data } = parseFrontmatter(readFileSync(join(ROOT, f), 'utf8'));
    if (data.draft === false) urls.push(SITE + urlFor(collection, rest.join('/').replace(/\.mdx$/, ''), data));
  }
}
if (!urls.length) { console.log('ping-indexnow: nothing published in the last commit'); process.exit(0); }

const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'content-type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: new URL(SITE).host, key, keyLocation: `${SITE}/${keyFile}`, urlList: urls }),
});
console.log(`ping-indexnow: ${res.status} ${res.statusText}\n  ${urls.join('\n  ')}`);
if (!res.ok) process.exit(1);
