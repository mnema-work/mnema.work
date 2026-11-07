/**
 * What the site tests read: the tree git tracks, the pages of `docs/`, and the HTML the build wrote.
 * Plain readings over text, with no HTML parser: the pages are the output of one generator, and what is
 * read from them (a link, an id, a block of prose) has one shape in it.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { productRoot } from '../../build/the-product.mjs';
import { SITE } from '../../build/the-site.mjs';

/**
 * THE CHECKOUT OF THE PRODUCT the pages are read from: a release tag, given as `PRODUCT_DIR`. There is no default and
 * no folder is looked for, so a run that was not given one stops here and says so, instead of reading what is nearby.
 */
export const ROOT: string = productRoot();
export { SITE };
export const DIST = join(SITE, 'dist');

/** A module of the product's checkout, by its path from the checkout's root. */
export const fromTheProduct = (path: string) => import(pathToFileURL(join(ROOT, path)).href);

/** The files git tracks in THIS repository (the site), as paths from its root. */
export function trackedHere(...patterns: string[]): string[] {
  return execFileSync('git', ['ls-files', '-z', '--', ...patterns], { cwd: SITE, encoding: 'utf8' })
    .split('\0')
    .filter(Boolean)
    .sort();
}

/** The files git tracks in the product's checkout (the README and the pages of `docs/` are in it), read from git's own list. */
export function tracked(...patterns: string[]): string[] {
  return execFileSync('git', ['ls-files', '-z', '--', ...patterns], { cwd: ROOT, encoding: 'utf8' })
    .split('\0')
    .filter(Boolean)
    .sort();
}

export const head = (): string =>
  execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();

/** Whether a built file is only the page that sends a reader to the address a page moved to (Astro's redirect page). */
export const isARedirectPage = (path: string): boolean => readFileSync(path, 'utf8').startsWith('<!doctype html><title>Redirecting to:');

/**
 * Every page `.html` under a directory, as a path relative to it. The redirect pages of the addresses that moved
 * (`build/the-moved.mjs`) are not pages of the site, so they are left out; `htmlFiles(dir, dir, true)` lists only them.
 */
export function htmlFiles(dir: string, base = dir, redirects = false): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...htmlFiles(path, base, redirects));
    else if (entry.name.endsWith('.html') && isARedirectPage(path) === redirects) out.push(path.slice(base.length + 1));
  }
  return out.sort();
}

/**
 * What is left of a text when only its letters and numbers remain, so a rendering cannot differ from its
 * source. The address of a Markdown link is dropped first: the page shows the words of a link and not where it goes.
 */
export const norm = (text: string): string =>
  text
    .replace(/\]\([^)\s]*(?:\s+"[^"]*")?\)/g, ']')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '');

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

/** The text of a piece of HTML: no tags, the entities undone. */
export function textOf(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<svg[\s\S]*?<\/svg>/g, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&#x([0-9a-f]+);/gi, (_m, h: string) => String.fromCodePoint(Number.parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_m, d: string) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/g, (m, n: string) => ENTITIES[n] ?? m)
    .replace(/\s+/g, ' ')
    .trim();
}

/** The prose blocks of the page's content: each paragraph, list item, heading and table cell, outside code. */
export function proseBlocks(html: string): string[] {
  const content = /<div class="sl-markdown-content">([\s\S]*?)<footer/.exec(html)?.[1] ?? '';
  const cleaned = content
    .replace(/<p class="the-build">[\s\S]*?<\/p>/g, '')
    .replace(/<a class="sl-anchor-link"[\s\S]*?<\/a>/g, '')
    .replace(/<div class="expressive-code">[\s\S]*?<\/figure><\/div>/g, '')
    .replace(/<pre[\s\S]*?<\/pre>/g, '');
  return [...cleaned.matchAll(/<(p|li|h[1-6]|td|th|dt|dd)\b[^>]*>([\s\S]*?)<\/\1>/g)]
    .map((m) => textOf(m[2] ?? ''))
    .filter((t) => t !== '');
}

const VOID = new Set([
  'img',
  'br',
  'hr',
  'input',
  'meta',
  'link',
  'source',
  'wbr',
  'area',
  'col',
  'base',
  'embed',
  'track',
]);
/** Elements that run inside a line of text: their words belong to the block around them. */
const INLINE = new Set([
  'a',
  'abbr',
  'b',
  'bdi',
  'bdo',
  'cite',
  'code',
  'data',
  'del',
  'dfn',
  'em',
  'i',
  'ins',
  'kbd',
  'mark',
  'q',
  's',
  'samp',
  'small',
  'span',
  'strong',
  'sub',
  'sup',
  'time',
  'u',
  'var',
]);
/** The attributes whose value a reader is shown or told. */
const SPOKEN = ['alt', 'title', 'aria-label'];

/**
 * Every piece of text a reader gets from the `<main>` of a page, as blocks: the words of the nearest element that is
 * not a phrase inside a line (a paragraph, a heading, a `div`, a figure caption, a button), and the `alt`, `title` and
 * `aria-label` of any element. Out of it, and only these: scripts, styles and pictures drawn in `<svg>`, the blocks of
 * code the Expressive Code draws, the heading anchors, the footer's line of build (`the-build`), the commit link (`data-commit`) and the verdict (`<pre
 * data-verdict>`), which a case of its own holds byte for byte. A button link (`sl-link-button`) is a block of its own.
 * `stripped` is the same `<main>` with the same exclusions cut out by patterns, so that a case can ask whether the
 * blocks hold ALL the text that is left.
 */
export function blocksOfMain(html: string): { text: string[]; spoken: string[]; stripped: string } {
  const main = /<main\b[^>]*>([\s\S]*)<\/main>/.exec(html)?.[1] ?? '';
  const text: string[] = [];
  const spoken: string[] = [];
  type Open = { tag: string; skip: boolean; block: boolean; words: string[] };
  const stack: Open[] = [{ tag: '#main', skip: false, block: true, words: [] }];
  const skipped = (): boolean => stack.some((o) => o.skip);
  const flush = (o: Open): void => {
    const said = textOf(o.words.join(''));
    if (said !== '') text.push(said);
  };
  const owner = (): Open => [...stack].reverse().find((o) => o.block) as Open;
  for (const m of main.matchAll(/<!--[\s\S]*?-->|<(\/?)([a-zA-Z][\w-]*)([^>]*)>|[^<]+/g)) {
    const [raw, closing, name, attrs = ''] = m;
    if (name === undefined) {
      if (!raw.startsWith('<!--') && !skipped()) owner().words.push(raw);
      continue;
    }
    const tag = name.toLowerCase();
    if (closing === '/') {
      const at = stack.map((o) => o.tag).lastIndexOf(tag);
      if (at > 0) {
        for (const o of stack.splice(at).reverse()) if (o.block && !o.skip) flush(o);
      }
      continue;
    }
    const cls = /\sclass="([^"]*)"/.exec(attrs)?.[1] ?? '';
    const skip =
      ['script', 'style', 'svg'].includes(tag) ||
      /\bexpressive-code\b|\bsl-anchor-link\b|\bthe-build\b/.test(cls) ||
      /\sdata-commit\b/.test(attrs) ||
      (tag === 'pre' && /\sdata-verdict\b/.test(attrs));
    if (!skipped() && !['script', 'style', 'svg'].includes(tag)) {
      for (const a of SPOKEN) {
        const v = new RegExp(`\\s${a}="([^"]*)"`).exec(attrs)?.[1];
        if (v !== undefined && textOf(v) !== '') spoken.push(textOf(v));
      }
    }
    if (VOID.has(tag) || attrs.trimEnd().endsWith('/')) continue;
    const block = !INLINE.has(tag) || /\bsl-link-button\b/.test(cls);
    stack.push({ tag, skip, block, words: [] });
  }
  for (const o of stack) if (o.block && !o.skip) flush(o);
  const stripped = main
    .replace(/<div class="expressive-code">[\s\S]*?<\/figure><\/div>/g, '')
    .replace(/<a class="sl-anchor-link"[\s\S]*?<\/a>/g, '')
    .replace(/<p class="the-build[^"]*">[\s\S]*?<\/p>/g, '')
    .replace(/<a\b[^>]*\sdata-commit\b[^>]*>[\s\S]*?<\/a>/g, '')
    .replace(/<pre\b[^>]*\sdata-verdict\b[^>]*>[\s\S]*?<\/pre>/g, '');
  return { text, spoken, stripped };
}

/** Every address a page points at: links, images, stylesheets and scripts. */
export function addressesOf(html: string): string[] {
  return [...html.matchAll(/<(?:a|img|link|script)\b[^>]*?\s(?:href|src)="([^"]*)"/g)].map((m) =>
    (m[1] ?? '').replace(/&amp;/g, '&'),
  );
}

/** The ids a page carries, which is what `#fragment` can name. */
export function idsOf(html: string): Set<string> {
  return new Set([...html.matchAll(/\sid="([^"]*)"/g)].map((m) => m[1] ?? ''));
}

export const isFile = (path: string): boolean => existsSync(path) && statSync(path).isFile();
export const isDirectory = (path: string): boolean =>
  existsSync(path) && statSync(path).isDirectory();
export const readText = (path: string): string => readFileSync(path, 'utf8');
