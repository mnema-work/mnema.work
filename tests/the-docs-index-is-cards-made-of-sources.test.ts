/**
 * THE PAGE AT /docs/ IS A CARD FOR THE FIRST RECORD AND A CARD FOR EACH GROUP OF THE README, AND NO SENTENCE ON IT IS THE
 * SITE'S OWN. Every word on the cards is one of three things: a label the README or a heading of the first-record page
 * holds, a line of `copy.md` (taken through the one `copy` function, so an orphan entry is found), or the address and the
 * words of a link the sidebar already carries. A card whose sentence was typed in the build is red.
 *
 *   - THE FIRST CARD: the five steps are the `## 1.` to `## 5.` headings of the first-record page, in order.
 *   - ONE CARD PER GROUP: its icon, its sentence from `copy.md`, and its links; a group of a folder is one link, to its index page.
 *   - A GROUP THE CARDS DO NOT KNOW STILL HAS A CARD (the README of an older release names other groups), plain.
 *   - THE HEADER'S TWO LINKS (Docs, Reference) are the address of /docs/ and the first page of the README's Reference group.
 */

import { describe, expect, it } from 'vitest';
import { docsIndexOf, headerLinksOf, stepsOf } from '../build/the-pages.mjs';

const sidebar = [
  { label: 'Get started', items: [{ label: 'Install', link: '/docs/install/' }, { label: 'Your first record', link: '/docs/first-record/' }] },
  { label: 'Learn', items: [{ label: 'How it works', link: '/docs/how-it-works/' }, { label: 'The page that verifies itself', link: '/docs/site/' }, { label: 'Record', link: '/record/' }] },
  {
    label: 'Reference',
    items: [
      { label: 'Commands', items: [{ label: 'Commands', link: '/docs/reference/commands/' }, { label: 'mnema init', link: '/docs/reference/cli/init/' }] },
      { label: 'Switches', link: '/docs/switches/' },
    ],
  },
  { label: 'Project', items: [{ label: 'Tom & Jerry <3', link: 'https://example.com/x' }] },
];

const steps = ['Found the record', 'Record a call, and accept it'];
const copy = (key: string): string => `«${key}»`;
const page = (over: Record<string, unknown> = {}): string =>
  docsIndexOf({ sidebar, title: 'T', description: 'D', copy, steps, ...over }) as string;

/** The words of the page as a reader reads them: every text between tags, tags and entities out. */
const wordsOf = (html: string): string[] =>
  html
    .replace(/^---[\s\S]*?\n---\n/, '')
    .replace(/<svg[\s\S]*?<\/svg>/g, '')
    .split(/<[^>]+>/)
    .map((t) => t.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim())
    .filter((t) => t !== '');

describe('the first card', () => {
  it('links the first-record page and lists its steps, the sentence and the words of the button from copy.md', () => {
    const html = page();
    expect(html).toContain('<a class="docs-first" href="/docs/first-record/">');
    for (const step of steps) expect(html).toContain(`<li>${step}</li>`);
    expect(wordsOf(html)).toEqual(expect.arrayContaining(['Your first record', '«docs-start-here»', '«docs-first-record»', '«docs-go»']));
  });

  it('stops when the sidebar has no first-record page to link', () => {
    const without = sidebar.map((g) => ({ ...g, items: g.items.filter((i) => (i as { link?: string }).link !== '/docs/first-record/') }));
    expect(() => page({ sidebar: without })).toThrow(/first-record/);
  });
});

describe('the cards of the groups', () => {
  it('make one card of each group, in the README order, each with an icon, its sentence and its links', () => {
    const html = page();
    const cards = html.split('<div class="docs-card">').slice(1);
    expect(cards).toHaveLength(4);
    expect(cards.map((c) => /<h2>([^<]*)<\/h2>/.exec(c)?.[1])).toEqual(['Get started', 'Learn', 'Reference', 'Project']);
    for (const card of cards) expect(card).toMatch(/<svg viewBox=/);
    expect(cards[1]).toContain('«docs-learn»');
    expect(cards[1]).toContain('<a href="/docs/how-it-works/">How it works</a>');
    expect(cards[1]).toContain('<a href="/record/">Record</a>');
  });

  it('make a group of a folder one link, to its index page, and not a list of its pages', () => {
    const reference = page().split('<div class="docs-card">')[3] ?? '';
    expect(reference).toContain('<a href="/docs/reference/commands/">Commands</a>');
    expect(reference).not.toContain('mnema init');
    expect(reference).toContain('<a href="/docs/switches/">Switches</a>');
  });

  it('escape a label as HTML, and keep a link to another site as it is', () => {
    expect(page()).toContain('<a href="https://example.com/x">Tom &amp; Jerry &lt;3</a>');
  });

  it('say nothing a source does not say: every word is a label, a step or an entry of copy.md', () => {
    const labels = new Set<string>(steps);
    const walk = (items: { label: string; items?: unknown[] }[]): void => {
      for (const i of items) {
        labels.add(i.label);
        if (i.items !== undefined) walk(i.items as { label: string; items?: unknown[] }[]);
      }
    };
    walk(sidebar);
    const allowed = (w: string): boolean => labels.has(w) || /^«docs-[a-z-]+»$/.test(w);
    expect(wordsOf(page()).filter((w) => !allowed(w))).toEqual([]);
  });

  it('give a group the cards do not know the generic icon and no sentence, and take the sentence of a group the README lacks', () => {
    const taken: string[] = [];
    const old = [sidebar[0], { label: 'Elsewhere', items: [{ label: 'X', link: '/docs/x/' }] }];
    const html = page({ sidebar: old, copy: (k: string) => (taken.push(k), `«${k}»`) });
    const card = html.split('<div class="docs-card">')[2] ?? '';
    expect(card).toContain('<h2>Elsewhere</h2>');
    expect(card).toMatch(/<svg viewBox=/);
    expect(card).not.toContain('<p>');
    expect(taken, 'the sentence of Learn is taken though this README has no such group').toContain('docs-learn');
  });

  it('write the page as a standard page of the docs, with its sidebar and the menu of a phone, and no table of contents', () => {
    expect(page()).toMatch(/^---\ntitle: "T"\ndescription: "D"\ntableOfContents: false\n---\n/);
    expect(page()).not.toContain('splash');
  });
});

describe('the steps of the first-record page', () => {
  it('are the headings numbered 1. to 5., without their numbers', () => {
    const md = '# First\n\nIntro.\n\n## 1. Found the record\n\nText\n\n## 2. Record a call, and accept it\n\n```sh\n## 3. not a heading\n```\n\n## What it leaves\n';
    expect(stepsOf(md)).toEqual(['Found the record', 'Record a call, and accept it']);
  });

  it('stop the build when the page has none', () => {
    expect(() => stepsOf('# First\n\n## Nothing numbered\n')).toThrow(/no numbered steps/);
  });
});

describe('the two links of the header', () => {
  it('are /docs/ and the first page of the README group called Reference', () => {
    expect(headerLinksOf({ sidebar, docs: 'Docs' })).toEqual([
      { label: 'Docs', link: '/docs/' },
      { label: 'Reference', link: '/docs/reference/commands/' },
    ]);
  });

  it('are only /docs/ when the README has no Reference group, as a README of an older release', () => {
    expect(headerLinksOf({ sidebar: sidebar.filter((g) => g.label !== 'Reference'), docs: 'Docs' })).toEqual([{ label: 'Docs', link: '/docs/' }]);
  });
});
