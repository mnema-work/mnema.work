// `node build/build.mjs --from <checkout of a release tag>`: the whole build, in the order it must run.
//   1. the pages, the pictures, the colour and the favicon are written from the checkout (`prepare`);
//   2. Astro builds the pages, with its anonymous usage data off: a build of this site sends none;
//   3. what Astro does not make is added: /record/, written by the binary built from the same checkout (the build stops
//      when the record does not verify), its line in the sitemap, og.png, llms.txt and robots.txt.
// The checkout is given once, here, and handed on to Astro's configuration as PRODUCT_DIR.
//
// `--check` is the build the product's pull requests run: the checkout may be at any commit and unbuilt, only the pages
// of the docs (and the home page's sources) are read and built, and the site that comes out is thrown away. Step 3 is
// skipped: /record/, the sitemap line, og.png, llms.txt, robots.txt and the font licences are what a release adds.

import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { completeTheSitemap, prepare, theHeadOfTheRecord, writeTheCard, writeTheFontLicences, writeTheRest } from './the-build.mjs';
import { recordBackLink } from './the-pages.mjs';
import { isCheck, productRoot } from './the-product.mjs';
import { writeTheRecord } from './the-record.mjs';
import { SITE } from './the-site.mjs';

const check = isCheck();
const root = productRoot();
const facts = await prepare({ root, check });
console.log(`prepared the site pages for ${check ? 'the commit' : facts.tag} ${check ? facts.sha : `at ${facts.sha.slice(0, 12)}`}`);

const astro = spawnSync(process.execPath, [join(SITE, 'node_modules/astro/bin/astro.mjs'), 'build'], {
  cwd: SITE,
  stdio: 'inherit',
  env: { ...process.env, PRODUCT_DIR: root, ASTRO_TELEMETRY_DISABLED: '1', ...(check ? { SITE_CHECK: '1' } : {}) },
});
if (astro.status !== 0) process.exit(astro.status ?? 1);

if (check) {
  console.log('the docs of this checkout build: nothing was written for publishing');
  process.exit(0);
}

const out = join(SITE, 'dist');
console.log(
  writeTheRecord({
    root,
    out: join(out, 'record'),
    backLink: recordBackLink(facts),
    head: await theHeadOfTheRecord({ root }),
  }).trimEnd(),
);
await completeTheSitemap({ root, out });
const card = await writeTheCard({ root, out });
console.log(`wrote og.png, ${card.length} bytes`);
await writeTheRest({ root, out });
writeTheFontLicences({ out });
