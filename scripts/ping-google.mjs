#!/usr/bin/env node
// npm run ping:google [-- --limit 50] [-- --dry] [-- /reviews/x/ ...]
// Sends URL_UPDATED to Google's Indexing API for the next unsubmitted rows of content/indexing-tracker.csv
// (or the URLs given), then stamps their "Submitted" date. Trial started 2026-11-24, owner's call.
// Google documents this API for JobPosting/BroadcastEvent pages only: it may be ignored for articles,
// and abuse can get API access revoked. It never touches rankings; Search Console stays the source of truth.
// Key: a service-account JSON key, path in GOOGLE_INDEXING_KEY. Keep it OUTSIDE the repo.
import { createSign } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, SITE } from './lib.mjs';

const keyPath = process.env.GOOGLE_INDEXING_KEY;
if (!keyPath) { console.error('ping-google: set GOOGLE_INDEXING_KEY to the service-account JSON key path'); process.exit(1); }
const key = JSON.parse(readFileSync(keyPath, 'utf8'));

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const li = args.indexOf('--limit');
const limit = li >= 0 ? Number(args[li + 1]) : 190; // default quota is 200 publish requests/day
const explicit = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--limit').map((u) => new URL(u, SITE).href);

const csvPath = join(ROOT, 'content/indexing-tracker.csv');
const csv = readFileSync(csvPath, 'utf8');
const eol = csv.includes('\r\n') ? '\r\n' : '\n'; // file is CRLF for Excel; keep it that way
const [header, ...lines] = csv.trimEnd().split(eol);
// Columns: #,Day,Type,URL,Submitted,Indexed?,Notes — Notes may hold commas, so keep everything after col 6 joined.
const rows = lines.map((l) => { const c = l.split(','); return [...c.slice(0, 6), c.slice(6).join(',')]; });
const urls = explicit.length ? explicit : rows.filter((r) => !r[4]).slice(0, limit).map((r) => r[3]);
if (!urls.length) { console.log('ping-google: every tracker URL already has a Submitted date'); process.exit(0); }
if (dry) { console.log(urls.join('\n')); process.exit(0); }

// Service-account OAuth: sign a JWT with the key, swap it for an access token.
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const now = Math.floor(Date.now() / 1000);
const unsigned = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({ iss: key.client_email, scope: 'https://www.googleapis.com/auth/indexing', aud: key.token_uri, iat: now, exp: now + 3600 })}`;
const jwt = `${unsigned}.${createSign('RSA-SHA256').update(unsigned).sign(key.private_key, 'base64url')}`;
const tok = await fetch(key.token_uri, {
  method: 'POST',
  headers: { 'content-type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
}).then((r) => r.json());
if (!tok.access_token) { console.error('ping-google: token error', tok); process.exit(1); }

const today = new Date().toISOString().slice(0, 10);
let ok = 0;
for (const url of urls) {
  const res = await fetch('https://indexing.googleapis.com/v3/urlNotifications:publish', {
    method: 'POST',
    headers: { authorization: `Bearer ${tok.access_token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ url, type: 'URL_UPDATED' }),
  });
  const body = await res.json().catch(() => ({}));
  console.log(`${res.status} ${url}${res.ok ? '' : ` ${body.error?.message ?? ''}`}`);
  if (res.status === 429) { console.error('ping-google: daily quota reached, stopping'); break; }
  if (res.status === 403) { console.error('ping-google: 403, is the service account an Owner of the Search Console property?'); break; }
  if (!res.ok) continue;
  ok++;
  const row = rows.find((r) => r[3] === url);
  if (row && !row[4]) { row[4] = today; row[6] = row[6] ? `${row[6]}; Indexing API` : 'Indexing API'; }
}
writeFileSync(csvPath, [header, ...rows.map((r) => r.join(','))].join(eol) + eol);
console.log(`ping-google: ${ok}/${urls.length} accepted, tracker updated`);
if (!ok) process.exit(1);
