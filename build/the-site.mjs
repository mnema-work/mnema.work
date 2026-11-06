// The two addresses this repository is built around, written here and nowhere else. A workflow reads them from this
// file too (`node build/the-site.mjs product-url`), so moving the product repository is a change to one line.

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Where the site is read. The page is served from the root of this address: there is no path prefix. */
export const SITE_URL = 'https://mnema.work';

/** The product repository: the pages come from its latest release tag, and every link to its code points here. */
export const PRODUCT_URL = 'https://github.com/felipesauer/mnema';

/** This repository's root (the site), as opposed to the checkout of the product the pages are read from. */
export const SITE = resolve(dirname(fileURLToPath(import.meta.url)), '..');

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const asked = process.argv[2];
  const answers = { 'product-url': PRODUCT_URL, 'site-url': SITE_URL };
  if (!(asked in answers)) {
    console.error(`usage: node build/the-site.mjs ${Object.keys(answers).join('|')}`);
    process.exit(2);
  }
  console.log(answers[asked]);
}
