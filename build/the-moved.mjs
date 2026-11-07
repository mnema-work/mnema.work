// The docs addresses that moved, kept in one place: a page that is renamed in the product keeps answering at its old
// address, because a reader (and the maintainer's old site, which forwards page by page) still goes there. The next
// move is one line here.

/**
 * @typedef {{ from: string, to: string, reason: string }} Moved
 * `from` and `to` are names of pages of `docs/` (a file name without `.md`).
 */

/** @type {readonly Moved[]} */
export const MOVED = Object.freeze([
  {
    from: 'what-0-1-6-is-expected-to-bring',
    to: 'what-comes-next',
    reason: 'the page of plans lost the version from its name, so its address stays the same from one release to the next',
  },
]);

/**
 * The redirects Astro writes, from the old address to the new one, for the pages of the checkout.
 * A checkout older than the move still has the old page: it answers there itself and nothing is redirected. A checkout
 * that has neither page has a redirect to a page that does not exist, and the build refuses it.
 * @param {ReadonlySet<string>} docs the names of the pages of `docs/` in the checkout
 * @param {readonly Moved[]} [moved]
 * @returns {Record<string, string>}
 */
export function redirectsFor(docs, moved = MOVED) {
  const redirects = {};
  for (const { from, to, reason } of moved) {
    if (docs.has(from)) {
      if (docs.has(to)) throw new Error(`docs/${from}.md and docs/${to}.md both exist: the address /docs/${from}/ moved (${reason}) and cannot be both`);
      continue;
    }
    if (!docs.has(to)) {
      throw new Error(`/docs/${from}/ is kept as a redirect to /docs/${to}/ (${reason}), but the checkout has no docs/${to}.md: drop the entry or restore the page`);
    }
    redirects[`/docs/${from}`] = `/docs/${to}/`;
  }
  return redirects;
}
