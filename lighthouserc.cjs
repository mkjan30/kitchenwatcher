// Lighthouse CI, mobile preset (Lighthouse default). Budgets from CLAUDE.md; any miss fails the build.
// Lab runs can't measure INP, so Total Blocking Time ≤ 200 ms stands in for INP < 200 ms.
const { readdirSync, existsSync } = require('node:fs');

// Home + the first built page of every section = one URL per template.
const dist = 'dist';
const urls = ['http://localhost/'];
for (const dir of existsSync(dist) ? readdirSync(dist, { withFileTypes: true }) : []) {
  if (!dir.isDirectory() || /^(_|pagefind)/.test(dir.name)) continue;
  const walk = (p) => {
    if (existsSync(`${p}/index.html`)) return p;
    for (const d of readdirSync(p, { withFileTypes: true })) if (d.isDirectory()) { const hit = walk(`${p}/${d.name}`); if (hit) return hit; }
  };
  const hit = walk(`${dist}/${dir.name}`);
  if (hit) urls.push(`http://localhost${hit.slice(dist.length)}/`);
}

module.exports = {
  ci: {
    collect: { staticDistDir: dist, url: urls, numberOfRuns: 3 },
    assert: {
      aggregationMethod: 'median-run',
      assertions: {
        'largest-contentful-paint': ['error', { maxNumericValue: 2000 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.05 }],
        'total-blocking-time': ['error', { maxNumericValue: 200 }],
      },
    },
  },
};
