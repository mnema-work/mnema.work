// @reads-the-tree
/**
 * EVERY PAGE OF THE SITE SAYS WHAT IT IS, TO A SEARCH ENGINE TOO. A study of 29 October found that every page of
 * the site carried the same meta description (a global `head` tag of the site's configuration beat the one in each
 * page's frontmatter), that `/record/` had a title shared by every record in the world and no description or
 * canonical, and that the sitemap, written before `/record/` existed, did not list it. A page that is found by a
 * generic sentence is found for nothing, so what a page says of itself is held here:
 *
 *   - EACH BUILT PAGE HAS ONE TITLE, ONE DESCRIPTION AND ONE CANONICAL, AND NO TWO PAGES SHARE ONE of them. The
 *     canonical is the page's own address under the site's home (`homeUrl`, from the facts the site is built from).
 *   - THE SITEMAP IS THE PAGES: the canonical of every built page but the 404, `/record/` among them, once each.
 *   - THE STRUCTURED DATA IS BUILT FROM FACTS (`structuredDataOf`), is on the landing and on `/record/` and on no
 *     other page, names GitHub, npm and the two extension stores as where the software is, and carries no rating
 *     and no review on any page.
 *   - THE HOME'S STRUCTURED DATA ALSO NAMES ITS PUBLISHER (an Organization with a logo), its image, its
 *     install address, its operating systems and a price of 0, each from a fact the site holds.
 *   - EVERY LINE OF THE SITEMAP CARRIES `lastmod`: the date of the release the site is built from, the same for every
 *     page and never the build's clock.
 *   - EVERY PAGE OF `docs/` SHARES UNDER THE NAME OF THE PRODUCT: its `og:title` and `twitter:title` are
 *     `<title> · mnema`, and its `twitter:description` is its description.
 *   - A PAGE OF `docs/` IS DESCRIBED BY THE FIRST SENTENCE OF ITS PROSE, or by its own `<!-- description: ... -->`
 *     line (`descriptionOf`), read and never typed in the build; each is unique and at most 160 characters.
 *
 * The cases over the built pages need the site built (`cd site && npm ci --ignore-scripts && npm run build`, after
 * `pnpm build`); with no build they stand down by name, as the guard of the built site does, and the site workflow's
 * `THE_SITE_MUST_BE_BUILT=1` makes a missing build the failure. The cases over the functions and over the sources run
 * everywhere.
 *
 * WHAT IT DOES NOT CHECK: that a search engine shows these words, indexes the site or ranks it (nothing here asks
 * one), nor that a description is a good one: it is the page's first sentence or its own line, and a reader judges that.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { theFacts } from '../build/the-build.mjs';
import { releaseDateOf } from '../build/the-product.mjs';
import {
  copyOf,
  DESCRIPTION_CHARS,
  descriptionOf,
  headOfTheRecord,
  jsonLdOf,
  pageOf,
  sitemapWith,
  docJsonLdOf,
  socialHeadOf,
  structuredDataOf,
} from '../build/the-pages.mjs';
import { DIST, htmlFiles, ROOT, readText, SITE, tracked } from './support/reading-the-site.js';

const THE_FACTS = await theFacts(ROOT);
const BUILT = existsSync(join(DIST, 'index.html'));
const MUST = process.env.THE_SITE_MUST_BE_BUILT === '1';
const when = BUILT ? describe : describe.skip;

const FACTS = {
  name: 'r',
  owner: 'o',
  description: 'The description of the package.',
  version: '1.2.3',
  license: 'Apache-2.0',
  repoUrl: 'https://github.com/o/r',
  homeUrl: 'https://o.github.io/r/',
  npmUrl: 'https://www.npmjs.com/package/@r/code',
  extensionId: 'pub.ext',
};

describe('what a page of docs/ says of itself is the first sentence of its prose, unless it says its own', () => {
  it('skips the heading, a fence, a table, a list and a line of HTML, and reads a link, bold and code as words', () => {
    const page = [
      '# Title',
      '',
      '```sh',
      'mnema x',
      '```',
      '',
      '| a | b |',
      '',
      '- an item',
      '',
      '<p>html</p>',
      '',
      'The **first** [real](x.md) paragraph, with `code`.',
      '',
      'The second.',
    ].join('\n');
    expect(descriptionOf(page, 'p.md')).toBe('The first real paragraph, with code.');
    expect(descriptionOf('# t\n\n**A subtitle**\n\nThe sentence after it. And more.\n', 'p.md')).toBe('The sentence after it.');
  });

  it('is the FIRST SENTENCE of the paragraph, not the paragraph', () => {
    expect(descriptionOf('# T\n\nOne sentence. And a second one.\n', 'p.md')).toBe('One sentence.');
  });

  it("is the page's own `<!-- description: ... -->` line when it has one, whatever its prose says", () => {
    const page = '# T\n\n<!-- description: Its own words. -->\n\nProse that says less. More.\n';
    expect(descriptionOf(page, 'p.md')).toBe('Its own words.');
  });

  it('cuts a first sentence that is longer than a result shows at a whole word, with an ellipsis', () => {
    const noSentence = descriptionOf(`# T\n\n${'longword '.repeat(60)}\n`, 'p.md');
    expect(noSentence.endsWith('longword…')).toBe(true);
    expect(noSentence.length).toBeLessThanOrEqual(DESCRIPTION_CHARS + 1);
  });

  it('stops when a page has no paragraph of prose to describe it', () => {
    expect(() => descriptionOf('# T\n\n- only a list\n', 'p.md')).toThrow('p.md has no paragraph');
  });

  it('is written into the frontmatter of the page as a JSON string', () => {
    const out = pageOf({
      name: 'a',
      markdown: '# A\n\nSays "this" and more.\n',
      facts: { ...FACTS, base: '/r' },
      docs: new Set(['a']),
    }) as string;
    expect(out).toContain('description: "Says \\"this\\" and more."\n');
  });
});

describe('the structured data is the facts, with where the software is found and no rating', () => {
  const data = structuredDataOf(FACTS) as { '@graph': Record<string, unknown>[] };

  it('is an Organization, a WebSite and a SoftwareApplication of the home, with the version and the places it is found', () => {
    expect(data['@graph'].map((n) => n['@type'])).toEqual(['Organization', 'WebSite', 'SoftwareApplication']);
    expect(data['@graph'][1]).toMatchObject({ url: 'https://o.github.io/r/', name: 'r' });
    expect(data['@graph'][2]).toMatchObject({
      softwareVersion: '1.2.3',
      description: 'The description of the package.',
      license: 'https://spdx.org/licenses/Apache-2.0.html',
      sameAs: [
        'https://github.com/o/r',
        'https://www.npmjs.com/package/@r/code',
        'https://marketplace.visualstudio.com/items?itemName=pub.ext',
        'https://open-vsx.org/extension/pub/ext',
      ],
    });
  });

  it('names its publisher with a logo, and gives the application an image, an install address, systems and a price of 0', () => {
    expect(data['@graph'][0]).toEqual({
      '@type': 'Organization',
      '@id': 'https://o.github.io/r/#organization',
      name: 'o',
      url: 'https://o.github.io/r/',
      logo: { '@type': 'ImageObject', url: 'https://o.github.io/r/logo.png', width: 512, height: 512 },
      sameAs: ['https://github.com/o'],
    });
    expect(data['@graph'][2]).toMatchObject({
      image: 'https://o.github.io/r/og.png',
      publisher: { '@id': 'https://o.github.io/r/#organization' },
      installUrl: 'https://www.npmjs.com/package/@r/code',
      operatingSystem: 'Linux, macOS, Windows',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    });
  });

  it('keeps the repository in sameAs and does not put codeRepository on the application', () => {
    expect(JSON.stringify(data)).not.toContain('codeRepository');
  });

  it('offers no search box: the site has no address that takes a query', () => {
    expect(JSON.stringify(data)).not.toContain('SearchAction');
  });

  it('carries no rating and no review, whatever the facts say', () => {
    expect(JSON.stringify(data)).not.toMatch(/aggregateRating|ratingValue|"@type":"Review"|"review"/);
  });

  it('escapes every < of the text, so no value closes the script it sits in', () => {
    const text = jsonLdOf({ a: '</script><b>' });
    expect(text).not.toContain('<');
    expect(JSON.parse(text)).toEqual({ a: '</script><b>' });
  });
});

describe('the head of /record/ and the sitemap line the build adds after Astro', () => {
  it('hands mnema site --head the title and description, the canonical under the home and the structured data', () => {
    expect(headOfTheRecord({ title: 'T', description: 'D', facts: FACTS })).toEqual({
      title: 'T',
      description: 'D',
      canonical: 'https://o.github.io/r/record/',
      structuredData: structuredDataOf(FACTS),
    });
  });

  it('adds one address to the sitemap, and stops at one already there or at a file that is not a sitemap', () => {
    const xml = '<urlset><url><loc>https://o.github.io/r/</loc></url></urlset>';
    const out = sitemapWith(xml, 'https://o.github.io/r/record/', '2026-11-19') as string;
    expect(out).toBe(
      '<urlset><url><loc>https://o.github.io/r/</loc><lastmod>2026-11-19</lastmod></url><url><loc>https://o.github.io/r/record/</loc><lastmod>2026-11-19</lastmod></url></urlset>',
    );
    expect(() => sitemapWith(xml.replace('</urlset>', '<url><loc>x</loc></url></urlset>'), 'x', '2026-11-19')).toThrow(
      'already lists',
    );
    expect(() => sitemapWith('<html></html>', 'x', '2026-11-19')).toThrow('not the shape');
  });

  it('dates every line with the date it is given, the same bytes every time, and refuses a lastmod that is not a date', () => {
    const xml = '<urlset><url><loc>https://o.github.io/r/</loc></url><url><loc>https://o.github.io/r/a/</loc></url></urlset>';
    const once = sitemapWith(xml, 'https://o.github.io/r/record/', '2026-11-19') as string;
    expect(once.match(/<lastmod>2026-11-19<\/lastmod>/g)).toHaveLength(3);
    expect(sitemapWith(xml, 'https://o.github.io/r/record/', '2026-11-19')).toBe(once);
    for (const bad of [undefined, '', 'today', '2026-11-19T10:00:00Z']) {
      expect(() => sitemapWith(xml, 'x', bad as string)).toThrow('lastmod');
    }
  });
});

describe('the social tags of a page of docs/ name the product', () => {
  it('are og:title and twitter:title as "<title> · mnema" and twitter:description as the description', () => {
    expect(JSON.parse(socialHeadOf({ title: 'Install', description: 'How.' }))).toEqual([
      { tag: 'meta', attrs: { property: 'og:title', content: 'Install · mnema' } },
      { tag: 'meta', attrs: { name: 'twitter:title', content: 'Install · mnema' } },
      { tag: 'meta', attrs: { name: 'twitter:description', content: 'How.' } },
    ]);
  });

  it('are in the frontmatter of the page the build writes', () => {
    const out = pageOf({ name: 'a', markdown: '# A\n\nSays more.\n', facts: { ...FACTS, base: '/r' }, docs: new Set(['a']) }) as string;
    const head = JSON.parse(/^head: (.*)$/m.exec(out)?.[1] ?? 'null') as { tag: string; attrs: Record<string, string>; content?: string }[];
    expect(head.slice(0, 3), 'the social tags come first, as socialHeadOf writes them').toEqual(JSON.parse(socialHeadOf({ title: 'A', description: 'Says more.' })));
    expect(head, 'and one block of structured data after them').toHaveLength(4);
    expect(head[3]?.tag).toBe('script');
    expect(head[3]?.attrs).toEqual({ type: 'application/ld+json' });
    expect(JSON.parse(head[3]?.content ?? '{}')['@graph'][0]).toMatchObject({ '@type': 'TechArticle', headline: 'A', url: 'https://o.github.io/r/docs/a/' });
  });

  it('say what a page is as a TechArticle and its trail from the site through /docs/, and claim no rating, no question and no steps', () => {
    const data = docJsonLdOf({ title: 'Install', description: 'How.', name: 'reference/cli/init', facts: FACTS }) as { '@graph': { '@type': string; itemListElement: { item: string }[] }[] };
    expect(data['@graph'].map((n: { '@type': string }) => n['@type'])).toEqual(['TechArticle', 'BreadcrumbList']);
    expect(data['@graph'][0]).toMatchObject({ headline: 'Install', url: 'https://o.github.io/r/docs/reference/cli/init/' });
    expect(data['@graph'][1]?.itemListElement.map((i: { item: string }) => i.item)).toEqual([
      'https://o.github.io/r/',
      'https://o.github.io/r/docs/',
      'https://o.github.io/r/docs/reference/cli/init/',
    ]);
    expect(JSON.stringify(data)).not.toMatch(/FAQPage|HowTo|aggregateRating|reviewRating|"Review"|"Question"/);
  });
});

describe('the pages of this tree say different things of themselves', () => {
  const facts = THE_FACTS;
  const names = tracked('docs/*.md').map((f) => f.slice(5, -3));
  const docs = new Set(names);
  const described = names.map((name) => {
    const out = pageOf({
      name,
      markdown: readText(join(ROOT, `docs/${name}.md`)),
      facts,
      docs,
    }) as string;
    const description = /^description: (.*)$/m.exec(out)?.[1];
    return {
      name,
      description: description === undefined ? '' : (JSON.parse(description) as string),
    };
  });

  it('gives each page of docs/ a description of its own, none longer than a result shows', () => {
    expect(described.length).toBeGreaterThan(10);
    for (const { name, description } of described) {
      expect(description.length, `${name} has no description`).toBeGreaterThan(20);
      expect(description.length, `${name}: its description is too long`).toBeLessThanOrEqual(
        DESCRIPTION_CHARS,
      );
    }
  });

  it('names the extension as the pages of the extension do: its id is the one its README publishes it under', () => {
    expect(facts.extensionId).toBe('mnema.mnema');
    expect(readText(join(ROOT, 'packages/vscode/README.md'))).toContain(`\`${facts.extensionId}\``);
  });

  it('shares no description between a page of docs/, the landing and /record/', () => {
    const copy = copyOf(readFileSync(join(SITE, 'copy.md'), 'utf8')) as Map<string, string>;
    expect(copy.get('record-title'), 'site/copy.md has no record-title').toBeTruthy();
    const all = [
      ...described.map((d) => d.description),
      facts.description,
      copy.get('record-description'),
      copy.get('not-found'),
    ];
    expect(new Set(all).size, 'two pages say the same of themselves').toBe(all.length);
  });
});

/** The address a built file is served at, under the home of the site. */
const addressOf = (file: string, home: string): string =>
  `${home}${file.replace(/(^|\/)index\.html$/, '$1').replace(/\.html$/, '/')}`;

describe('the built site has a build to read', () => {
  it('has one, or stands down by name', () => {
    if (MUST) expect(BUILT, 'site/dist is not built, and this run says it must be').toBe(true);
    else expect(true).toBe(true);
  });
});

when('the built pages', () => {
  const facts = THE_FACTS;
  const files = (BUILT ? htmlFiles(DIST) : []).filter((f) => !f.startsWith('pagefind/'));
  const html = (file: string): string => readText(join(DIST, file));
  /** What `<head>` of a page holds under a pattern with one capture group, every time. */
  const all = (file: string, pattern: RegExp): string[] =>
    [...html(file).matchAll(pattern)].map((m) => m[1] as string);

  it('has a title, a description and a canonical on every page, one each', () => {
    expect(files.length).toBeGreaterThan(15);
    for (const file of files) {
      expect(all(file, /<title>([^<]+)<\/title>/g), `${file}: titles`).toHaveLength(1);
      expect(
        all(file, /<meta name="description" content="([^"]*)"/g),
        `${file}: descriptions`,
      ).toHaveLength(1);
      expect(
        all(file, /<link rel="canonical" href="([^"]*)"/g),
        `${file}: canonicals`,
      ).toHaveLength(1);
    }
  });

  it('shares no title, no description and no canonical between two pages, and a canonical is the address of its page', () => {
    const seen = {
      title: new Map<string, string>(),
      description: new Map<string, string>(),
      canonical: new Map<string, string>(),
    };
    for (const file of files) {
      const found = {
        title: all(file, /<title>([^<]+)<\/title>/g)[0] ?? '',
        description: all(file, /<meta name="description" content="([^"]*)"/g)[0] ?? '',
        canonical: all(file, /<link rel="canonical" href="([^"]*)"/g)[0] ?? '',
      };
      for (const kind of ['title', 'description', 'canonical'] as const) {
        expect(found[kind], `${file}: ${kind} is empty`).not.toBe('');
        expect(
          seen[kind].get(found[kind]),
          `${file} says the same ${kind} as ${seen[kind].get(found[kind])}`,
        ).toBeUndefined();
        seen[kind].set(found[kind], file);
      }
      expect(found.canonical, `${file}: its canonical is not its address`).toBe(
        addressOf(file, facts.homeUrl),
      );
    }
  });

  it('lists in the sitemap every built page but the 404, /record/ among them, and nothing else', () => {
    const sitemap = readText(join(DIST, 'sitemap-0.xml'));
    const listed = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1] as string);
    const pages = files.filter((f) => f !== '404.html').map((f) => addressOf(f, facts.homeUrl));
    expect(listed).toContain(`${facts.homeUrl}record/`);
    expect([...listed].sort()).toEqual([...pages].sort());
    expect(new Set(listed).size, 'an address is listed twice').toBe(listed.length);
  });

  it('dates every address of the sitemap with the date of the release it is built from, /record/ included', () => {
    const sitemap = readText(join(DIST, 'sitemap-0.xml'));
    const urls = [...sitemap.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((m) => m[1] as string);
    const date = releaseDateOf(ROOT);
    expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(urls.length).toBeGreaterThan(15);
    for (const url of urls) expect(url, 'an address is not dated by the release').toMatch(new RegExp(`<lastmod>${date}</lastmod>$`));
    expect(urls.some((u) => u.includes(`${facts.homeUrl}record/`))).toBe(true);
  });

  it('names the product in the og:title and twitter:title of every page of docs/, and gives it a twitter:description', () => {
    const docs = files.filter((f) => f.startsWith('docs/'));
    expect(docs.length).toBeGreaterThan(10);
    for (const file of docs) {
      const title = (all(file, /<title>([^<]+)<\/title>/g)[0] ?? '').replace(/ \| mnema$/, '');
      const description = all(file, /<meta name="description" content="([^"]*)"/g)[0];
      expect(all(file, /<meta property="og:title" content="([^"]*)"/g), `${file}: og:title`).toEqual([`${title} · mnema`]);
      expect(all(file, /<meta name="twitter:title" content="([^"]*)"/g), `${file}: twitter:title`).toEqual([`${title} · mnema`]);
      expect(all(file, /<meta name="twitter:description" content="([^"]*)"/g), `${file}: twitter:description`).toEqual([description]);
      expect(all(file, /<meta property="og:type" content="([^"]*)"/g), `${file}: og:type`).toEqual(['article']);
    }
  });

  it('carries the structured data of structuredDataOf on the landing and on /record/, a TechArticle with its trail on each page of docs/, and none on any other page', () => {
    const expected = structuredDataOf(facts);
    for (const file of files) {
      const blocks = all(file, /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g);
      if (file === 'index.html' || file === 'record/index.html') {
        expect(blocks, `${file}: one block of structured data`).toHaveLength(1);
        expect(JSON.parse(blocks[0] ?? ''), `${file}: not built from the facts`).toEqual(expected);
      } else if (file.startsWith('docs/') && file !== 'docs/index.html') {
        expect(blocks, `${file}: one block of structured data`).toHaveLength(1);
        const [article, trail] = JSON.parse(blocks[0] ?? '')['@graph'];
        expect(article['@type'], file).toBe('TechArticle');
        expect(trail['@type'], file).toBe('BreadcrumbList');
        expect(article.url, `${file}: the page's own address`).toBe(`${facts.homeUrl}${file.replace(/index\.html$/, '')}`.replace(/\/$/, '/'));
      } else {
        expect(blocks, `${file} carries structured data`).toEqual([]);
      }
    }
  });

  it('carries no rating and no review on any page', () => {
    for (const file of files) {
      expect(html(file), `${file} carries a rating`).not.toMatch(
        /aggregateRating|ratingValue|"@type":"Review"/,
      );
    }
  });
});
