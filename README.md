# mnema.work

The source of [mnema.work](https://mnema.work): the presentation of [mnema](https://github.com/felipesauer/mnema), its
documentation at `/docs/<page>` and the page that verifies its own record at `/record/`.

This repository holds the build and the presentation. It holds no copy of the documentation, the README or the record:
every page is read, at build time, from a checkout of **one release tag** of the product, and the site says which one in
its footer (the version and the commit it was built from).

## Build it

Build the product at a release tag, then the site against it:

```sh
git clone --depth 1 --branch v0.1.5 https://github.com/felipesauer/mnema.git product
(cd product && pnpm install --frozen-lockfile && pnpm build)

npm ci --ignore-scripts
node build/build.mjs --from product        # the site, in dist/
PRODUCT_DIR=product npm test               # the built pages held to their sources
```

Node `^24.15.0 || >=26.0.0`. The checkout is given, never looked for: `--from <dir>` or `PRODUCT_DIR`. The build refuses a
directory that is not exactly at a release tag, that has a tracked file changed or that was not built.

## What the build does

1. Writes the pages of `docs/`, the table of contents at `/docs/` and the 404 from the checkout (`build/the-build.mjs`,
   `build/the-pages.mjs`), with the links rewritten to where they land, and the facts the home page shows (the measured
   counts, the hosts and their rungs, the install commands, the verdict of the record), read from the same checkout
   (`build/the-home.mjs`). The home page itself, `/`, is `src/pages/index.astro`: its words are the page's, and a test
   holds every number, host and command in it to the file it is read from.
2. Lets Astro build the home page and Starlight the docs, both in the palette of `build/the-palette.mjs` and set in two
   typefaces served from this site (`@fontsource`, Open Font Licence: no page asks another host for anything), with its
   anonymous usage data off.
3. Writes `/record/` with the binary built from the same checkout, and stops when the record does not verify. The binary
   is the one of that tag, built from its sources, and not a version taken from npm: the site is made of one tag, and a
   tag does not depend on when a package reaches a registry.
4. Adds `og.png`, `llms.txt`, `robots.txt`, the favicon (the bare M, drawn from the same sources as the extension's icon)
   and the `CNAME`.

The two addresses the build is made around are in `build/the-site.mjs` and nowhere else.

## Publishing

`.github/workflows/site.yml` builds on every pull request, builds and deploys on a push to `main`, and every day asks the
product for its latest release tag (`git ls-remote`, no token): it deploys only when the version the live site says it was
built from is not that tag. The deploy job holds `pages: write` and `id-token: write` and nothing else.

## Licence

Apache-2.0, as the product: see `LICENSE` and `NOTICE`.
