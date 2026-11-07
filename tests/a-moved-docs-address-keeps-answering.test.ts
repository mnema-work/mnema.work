// @reads-the-tree
/**
 * A DOCS ADDRESS THAT MOVED KEEPS ANSWERING (`build/the-moved.mjs`). A page renamed in the product is still asked for at
 * its old address, by readers and by the maintainer's old site that forwards page by page.
 *
 *   - THE LIST NAMES EACH MOVE AND ITS REASON: a page of `docs/` (file name without `.md`) to another, with the why.
 *   - A MOVE IS A REDIRECT WHEN THE NEW PAGE EXISTS AND THE OLD ONE IS GONE; WHEN THE OLD PAGE STILL EXISTS (a checkout
 *     older than the move) NOTHING IS REDIRECTED, so the page answers itself.
 *   - A STALE MOVE IS REFUSED: no new page in the checkout, or both pages at once, stops the build.
 *   - THE BUILT SITE ANSWERS AT THE OLD ADDRESS with a page that carries a meta refresh and a canonical link to the new
 *     one, when the checkout it was built from has the new page. It needs the site built (cases stand down otherwise).
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MOVED, redirectsFor } from '../build/the-moved.mjs';
import { DIST, htmlFiles, isFile, readText, ROOT } from './support/reading-the-site.js';

const entry = { from: 'old-page', to: 'new-page', reason: 'a test move' };

describe('the list of moved addresses', () => {
  it('gives every move a page to go to, a page it left and a reason', () => {
    expect(MOVED.length).toBeGreaterThan(0);
    for (const { from, to, reason } of MOVED) {
      expect(from).toMatch(/^[a-z0-9-]+$/);
      expect(to).toMatch(/^[a-z0-9-]+$/);
      expect(from).not.toBe(to);
      expect(reason.length).toBeGreaterThan(10);
    }
    expect(MOVED[0]).toMatchObject({ from: 'what-0-1-6-is-expected-to-bring', to: 'what-comes-next' });
  });
});

describe('redirectsFor', () => {
  it('redirects the old address to the new page when only the new page exists', () => {
    expect(redirectsFor(new Set(['new-page', 'other']), [entry])).toEqual({ '/docs/old-page': '/docs/new-page/' });
  });

  it('redirects nothing for a checkout older than the move, where the old page still answers', () => {
    expect(redirectsFor(new Set(['old-page', 'other']), [entry])).toEqual({});
  });

  it('refuses a move whose new page is not in the checkout', () => {
    expect(() => redirectsFor(new Set(['other']), [entry])).toThrow(/no docs\/new-page\.md/);
  });

  it('refuses a move whose old page is still there beside the new one', () => {
    expect(() => redirectsFor(new Set(['old-page', 'new-page']), [entry])).toThrow(/both exist/);
  });
});

const BUILT = existsSync(join(DIST, 'index.html'));
const MUST = process.env.THE_SITE_MUST_BE_BUILT === '1';
const hasNew = (move: { to: string }): boolean => isFile(join(ROOT, 'docs', `${move.to}.md`));
const hasOld = (move: { from: string }): boolean => isFile(join(ROOT, 'docs', `${move.from}.md`));

describe('the built site', () => {
  (BUILT ? it : it.skip)('has no redirect page but the ones of the moved list', () => {
    const wanted = MOVED.filter((m) => !hasOld(m) && hasNew(m)).map((m) => `docs/${m.from}/index.html`);
    expect(htmlFiles(DIST, DIST, true)).toEqual(wanted.sort());
  });

  it('has a build to read when the run says it must', () => {
    if (MUST) expect(BUILT).toBe(true);
    else expect(true).toBe(true);
  });

  for (const move of MOVED) {
    const built = BUILT && hasNew(move) && !hasOld(move);
    (built ? it : it.skip)(`sends /docs/${move.from}/ to /docs/${move.to}/`, () => {
      const page = join(DIST, 'docs', move.from, 'index.html');
      expect(isFile(page), `${page} is missing`).toBe(true);
      const html = readText(page);
      expect(html).toMatch(new RegExp(`<meta http-equiv="refresh" content="0;\\s*url=/docs/${move.to}/"`));
      expect(html).toMatch(new RegExp(`<link rel="canonical" href="[^"]*/docs/${move.to}/"`));
      expect(isFile(join(DIST, 'docs', move.to, 'index.html')), 'the page it sends to is built').toBe(true);
    });

    (BUILT && hasOld(move) ? it : it.skip)(`leaves /docs/${move.from}/ to its own page in a checkout older than the move`, () => {
      expect(readText(join(DIST, 'docs', move.from, 'index.html'))).not.toMatch(/http-equiv="refresh"/);
    });
  }
});
