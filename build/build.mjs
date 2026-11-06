// `node build/build.mjs --from <checkout of a release tag>`: the whole build, in the order it must run.
//   1. the pages, the pictures, the colour and the favicon are written from the checkout (`prepare`);
//   2. Astro builds the pages, with its anonymous usage data off: a build of this site sends none;
//   3. what Astro does not make is added: /record/, written by the binary built from the same checkout (the build stops
//      when the record does not verify), its line in the sitemap, og.png, llms.txt and robots.txt.
// The checkout is given once, here, and handed on to Astro's configuration as PRODUCT_DIR.

import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { completeTheSitemap, prepare, theHeadOfTheRecord, writeTheCard, writeTheFontLicences, writeTheRest } from './the-build.mjs';
import { recordBackLink } from './the-pages.mjs';
import { productRoot } from './the-product.mjs';
import { writeTheRecord } from './the-record.mjs';
import { SITE } from './the-site.mjs';

const root = productRoot();
const facts = await prepare({ root });
console.log(`prepared the site pages for ${facts.tag} at ${facts.sha.slice(0, 12)}`);

const astro = spawnSync(process.execPath, [join(SITE, 'node_modules/astro/bin/astro.mjs'), 'build'], {
  cwd: SITE,
  stdio: 'inherit',
  env: { ...process.env, PRODUCT_DIR: root, ASTRO_TELEMETRY_DISABLED: '1' },
});
if (astro.status !== 0) process.exit(astro.status ?? 1);

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
