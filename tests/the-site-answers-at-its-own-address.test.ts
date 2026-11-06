/**
 * THE SITE ANSWERS AT https://mnema.work, FROM ITS ROOT, AND THE BUILD WRITES NO OTHER ADDRESS FOR IT.
 *
 * The site was read at a path of the maintainer's user site (`/<name>/`, under `<owner>.github.io`). It is now served
 * from the root of its own domain, and a prefix left in one place is a link that leaves the site. HELD, over the built
 * pages of the checkout the build was given:
 *  - every address of the sitemap is under `SITE_URL`, and the pages are the pages of `docs/` of that checkout, the
 *    landing and /record/, each at its path (`/docs/<page>/`, one for one with the address it had before);
 *  - every page says its own address as its canonical, the sitemap index and robots.txt name this domain, and the
 *    published output carries the `CNAME` GitHub Pages reads;
 *  - the build ADDS no address of the old site: no root-relative link or source begins with the old prefix, and every
 *    absolute address of the old site that a page holds is a sentence of the product's own files (the prose of a page
 *    of `docs/`, a decision of the record), which the build copies and does not write;
 *  - every page declares the SVG favicon and its PNG fallback.
 *
 * NOT HELD: that the old address redirects here (that is the maintainer's user site), or that DNS points at Pages.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PRODUCT_URL, SITE_URL } from '../build/the-site.mjs';
import { DIST, htmlFiles, ROOT, readText, tracked } from './support/reading-the-site.js';

const BUILT = existsSync(join(DIST, 'index.html'));
const MUST = process.env.THE_SITE_MUST_BE_BUILT === '1';
const when = BUILT ? describe : describe.skip;

// The address the site had, as the pattern a page would carry it in: absolute under the user site, or root-relative.
const OLD_ABSOLUTE = /https?:\/\/[a-z0-9-]+\.github\.io\/mnema[^\s"'<>)\]]*/gi;
const OLD_ROOT_RELATIVE = /(?:href|src|content|action|srcset)="\/mnema(?:[/"])/g;

describe('the build', () => {
  it('is built before these cases run, when the run says it must be', () => {
    if (MUST) expect(BUILT, 'dist is not built, and this run says it must be').toBe(true);
  });
});

when('the built site', () => {
  const pages = htmlFiles(DIST);
  const urlsOfSitemap = (): string[] =>
    [...readText(join(DIST, 'sitemap-0.xml')).matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1] ?? '').sort();

  it('lists in its sitemap the landing, /record/ and one page for each page of docs/, all under its own address', () => {
    const docs = tracked('docs/*.md').map((f) => f.slice(5, -3));
    expect(docs.length, 'the product holds pages of docs/').toBeGreaterThan(10);
    const expected = [`${SITE_URL}/`, `${SITE_URL}/record/`, ...docs.map((name) => `${SITE_URL}/docs/${name}/`)].sort();
    expect(urlsOfSitemap()).toEqual(expected);
    for (const url of urlsOfSitemap()) {
      const path = url.slice(SITE_URL.length + 1);
      expect(existsSync(join(DIST, path, 'index.html')), `${url} has no page in the build`).toBe(true);
    }
  });

  it('says its own address in the canonical of every page, and in the sitemap index and robots.txt', () => {
    for (const page of pages.filter((p) => p !== '404.html')) {
      const here = `${SITE_URL}/${page.replace(/index\.html$/, '')}`;
      const canonical = /<link rel="canonical" href="([^"]*)"/.exec(readText(join(DIST, page)))?.[1];
      expect(canonical, page).toBe(here);
    }
    expect(readText(join(DIST, 'sitemap-index.xml'))).toContain(`<loc>${SITE_URL}/sitemap-0.xml</loc>`);
    expect(readText(join(DIST, 'robots.txt'))).toContain(`Sitemap: ${SITE_URL}/sitemap-index.xml`);
  });

  it('carries the CNAME that names its domain, and nothing else in it', () => {
    expect(readText(join(DIST, 'CNAME'))).toBe(`${new URL(SITE_URL).host}\n`);
  });

  it('writes no address of the old site: no link begins with the old prefix, and each old address on a page is a sentence of the product', () => {
    const inTheProduct = (needle: string): boolean => {
      try {
        execFileSync('git', ['grep', '-qF', '--', needle], { cwd: ROOT, stdio: 'ignore' });
        return true;
      } catch {
        return false;
      }
    };
    const files = [...pages, 'llms.txt', 'robots.txt', 'sitemap-0.xml', 'sitemap-index.xml'];
    for (const file of files) {
      const text = readText(join(DIST, file));
      expect(text.match(OLD_ROOT_RELATIVE) ?? [], `${file}: a link with the old prefix`).toEqual([]);
      for (const address of text.match(OLD_ABSOLUTE) ?? []) {
        // Trailing punctuation of a sentence is not part of an address.
        const bare = address.replace(/[.,;:]+$/, '');
        expect(inTheProduct(bare), `${file}: the build wrote ${bare}, and the product holds no such text`).toBe(true);
      }
    }
  });

  it('reads the ruler: the patterns find an old prefix where there is one', () => {
    expect('<a href="/mnema/docs/x/">'.match(OLD_ROOT_RELATIVE)).toHaveLength(1);
    expect('<link href="/mnema">'.match(OLD_ROOT_RELATIVE)).toHaveLength(1);
    expect('<a href="/docs/x/">'.match(OLD_ROOT_RELATIVE)).toBeNull();
    expect('see https://felipesauer.github.io/mnema/record/#ADR-1.'.match(OLD_ABSOLUTE)).toEqual([
      'https://felipesauer.github.io/mnema/record/#ADR-1.',
    ]);
    expect(`${PRODUCT_URL}/blob/x`.match(OLD_ABSOLUTE)).toBeNull();
  });

  it('declares on every page the favicon as an SVG and its PNG fallback, and both are in the output', () => {
    // /record/ is the page the binary writes, byte for byte, and it declares no icon (it did not before either).
    for (const page of pages.filter((p) => p !== 'record/index.html')) {
      const html = readText(join(DIST, page));
      const icons = [...html.matchAll(/<link rel="icon"[^>]*>/g)].map((m) => m[0]);
      expect(icons[0], `${page}: the SVG is the first icon`).toMatch(/href="\/favicon\.svg"[^>]*type="image\/svg\+xml"|type="image\/svg\+xml"[^>]*href="\/favicon\.svg"/);
      expect(html, page).toContain('<link rel="icon" href="/favicon.png" type="image/png" sizes="64x64"/>');
    }
    for (const file of ['favicon.svg', 'favicon.png']) expect(readdirSync(DIST), file).toContain(file);
    expect(readFileSync(join(DIST, 'favicon.svg'), 'utf8')).toContain('prefers-color-scheme:dark');
  });
});
