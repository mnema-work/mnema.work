// @reads-the-tree
/**
 * THE BUILT SITE LANDS, AND SAYS WHAT IT WAS BUILT FROM. This reads the HTML `site/` wrote (`site/dist/`),
 * not the sources the build read: a source can be right and the page wrong, and a stranger reads the page.
 *
 *   - EVERY PAGE OF `docs/` IS A PAGE, AND EVERY PAGE IS A FILE: `dist/docs/<name>/` for each tracked
 *     `docs/<name>.md`, and no page of `docs/` that is not one (no second source).
 *   - NO LINK IS BROKEN: every address on every page that points inside the site is a file of `dist/`, and
 *     every `#fragment` is an id of the page it names; every link to GitHub names a file or a directory git
 *     holds at the commit the site was built from.
 *   - NO SENTENCE IS THE SITE'S OWN: every block of prose on a page of `docs/` is found, letters and numbers
 *     only, in the file it was rendered from; every block of the landing is found in the README, the pages of
 *     `docs/` or the description of `@mnema/code`.
 *   - NO COLOUR AND NO PICTURE IS THE SITE'S OWN: the accent in the built style is the one `accent.mjs`
 *     holds, the ground is `PAGE`, the theme's own rule sits in no layer (Starlight's defaults are in one
 *     and would win), the pictures are the bytes of `docs/assets/`, and the icon is the one `icon.mjs` draws.
 *   - THE FOOTER SAYS WHAT WAS BUILT: the version of `@mnema/code` and the commit, on every page, the ones
 *     of this checkout.
 *   - NO STYLESHEET DRAWS TEXT: no `content` with a sentence in it and no `attr()`, in the site's own CSS or in the built one
 *     (less what the packages it stands on carry), since a sentence drawn there is read by no other guard.
 *   - THE SITE DOES NOT SAY THE DOCS DESCRIBE THE NEXT VERSION: the sentence is true on GitHub and npm and
 *     false here, so no built page holds it.
 *   - /RECORD/ IS THE PAGE `mnema site --back-link --head` WRITES for this commit's record, byte for byte, with no
 *     step between (the head, what a search engine reads of it, is handed to the command by the build:
 *     `theHeadOfTheRecord`), and it opens with the one link back to the site's root. Run in a vm, it says its
 *     lists match the events it verified.
 *
 * It needs the site built (`cd site && npm ci --ignore-scripts && npm run build`, after `pnpm build`). In
 * the main suite and in `pnpm test:guards` there is no build, and the cases stand down by name; the site
 * workflow sets `THE_SITE_MUST_BE_BUILT=1`, and then a missing build is the failure.
 *
 * WHAT IT DOES NOT CHECK: external links (no network here: the after-merge link check asks the network), the
 * colours Starlight paints its own chrome and code with, or how the pages look.
 */

import { execFileSync, spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, posix } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import { theHeadOfTheRecord } from '../build/the-build.mjs';
import { copyOf, recordBackLink, themeOf } from '../build/the-pages.mjs';
import { faviconSvg, markSvg, theSources } from '../build/the-favicon.mjs';
import { SITE_URL } from '../build/the-site.mjs';
import { runInAVm } from './support/a-page-in-a-vm.js';
import {
  addressesOf,
  blocksOfMain,
  DIST,
  fromTheProduct,
  head,
  htmlFiles,
  idsOf,
  isDirectory,
  isFile,
  norm,
  proseBlocks,
  ROOT,
  readText,
  SITE,
  textOf,
  tracked,
} from './support/reading-the-site.js';

const BUILT = existsSync(join(DIST, 'index.html'));
const MUST = process.env.THE_SITE_MUST_BE_BUILT === '1';
const when = BUILT ? describe : describe.skip;

const BASE = '';
const GITHUB = 'https://github.com/mnema-work/mnema';

/**
 * What the landing's test holds a block to: a short block (a heading, a label) is a few words that any
 * long source holds somewhere, so being found inside the text proves nothing for it, and it must be a
 * whole line of a source; a longer block need only be found in the text.
 */
function sourcesSay(text: string, steps = ''): (block: string) => boolean {
  const corpus = norm(text);
  // A line that is one element of HTML (a table's `<th>`) is a line of its text: the words are the source's.
  const words = (l: string): string =>
    (/^\s*<(\w+)\b[^>]*>([^<]*)<\/\1>\s*$/.exec(l)?.[2] ?? l).replace(/^\s*(?:#+|[-*|])\s*/, '');
  const lines = new Set(text.split('\n').map((l) => norm(words(l))));
  // The bold lead-in of a numbered step (`1. **Record.** ...`) of the section the landing's steps come from is a label
  // the README sets apart: a line of its own. Anywhere else a numbered bold word is not a block the landing may type.
  for (const m of steps.matchAll(/^\d+\. \*\*([^*]+?)\.\*\*/gm)) lines.add(norm(m[1] ?? ''));
  return (block) =>
    block.split(' ').length < 4 ? lines.has(norm(block)) : corpus.includes(norm(block));
}

describe('a short block of the landing is held to a whole line of a source', () => {
  const text =
    '# Why mnema\n\nHello there, and welcome to the long paragraph.\n- A label\n<th align="center">A cell</th>\n1. **A step.** Its words.\n2. **Other.** More words.\n';
  const say = sourcesSay(text, '1. **A step.** Its words.\n');

  it('passes a heading or a label that is a line of a source, and a long block found inside it', () => {
    expect(say('Why mnema')).toBe(true);
    expect(say('A label')).toBe(true);
    expect(say('A cell')).toBe(true);
    expect(say('A step')).toBe(true);
    expect(say('Hello there, and welcome to the long paragraph.')).toBe(true);
  });

  it('refuses a short block that is only words inside a longer line', () => {
    expect(say('Hello.')).toBe(false);
    expect(say('Hello there')).toBe(false);
    expect(say('align center')).toBe(false);
    expect(say('Other')).toBe(false);
    expect(say('long paragraph')).toBe(false);
  });
});

describe('the text a reader gets from the <main> of a page is read in blocks, and nothing escapes them', () => {
  const read = (inner: string): ReturnType<typeof blocksOfMain> =>
    blocksOfMain(`<body><header>Not main</header><main>${inner}</main></body>`);

  it('reads a paragraph, a heading, a div and a button as a block each, a span as part of the block around it', () => {
    const got = read(
      '<h2>A title</h2><p>One <a href="/x">link</a> and <code>code</code>.</p><div>Loose words <span>and a span</span></div><div class="actions"><a class="sl-link-button" href="/y">Go<svg><path/></svg></a><a class="sl-link-button" href="/z">Stay</a></div>',
    );
    expect([...got.text].sort()).toEqual(
      ['A title', 'One link and code.', 'Loose words and a span', 'Go', 'Stay'].sort(),
    );
  });

  it('finds a span of its own words and a div of typed words: the kind of element does not hide them', () => {
    expect(read('<div><span>Trusted by thousands</span></div>').text).toEqual([
      'Trusted by thousands',
    ]);
    expect(read('<section><div>Typed here</div></section>').text).toEqual(['Typed here']);
  });

  it('reads the alt, the title and the aria-label as words a reader is told', () => {
    const got = read(
      '<p><img src="a.gif" alt="An alt"><a href="/" title="A title" aria-label="A label">go</a></p>',
    );
    expect(got.spoken).toEqual(['An alt', 'A title', 'A label']);
    expect(read('<img src="a.svg" alt="">').spoken).toEqual([]);
  });

  it('leaves out only: scripts, styles, svg, code blocks, heading anchors, the commit link and the verdict', () => {
    const got = read(
      '<script>var a = "x"</script><style>.a{}</style><svg><title>T</title></svg>' +
        '<div class="expressive-code"><figure><pre>code</pre></figure></div>' +
        '<h2>Why<a class="sl-anchor-link" href="#why"><span class="sr-only">Section titled</span></a></h2>' +
        '<figure><pre data-verdict>public: ok</pre><figcaption>Said at <a data-commit href="/c">abc</a></figcaption></figure>' +
        '<pre>other pre</pre>',
    );
    expect([...got.text].sort()).toEqual(['Said at', 'Why', 'other pre'].sort());
  });
});

describe('the site is built when the run says it must be', () => {
  it('has a build to read', () => {
    if (MUST) expect(BUILT, 'site/dist is not built, and this run says it must be').toBe(true);
    else expect(true).toBe(true);
  });
});

when('the built site', () => {
  const pages = (BUILT ? htmlFiles(DIST) : []).filter(
    (f) => !f.startsWith('record/') && !f.startsWith('pagefind/'),
  );
  const html = (page: string): string => readText(join(DIST, page));
  const names = tracked('docs/*.md').map((f) => f.slice(5, -3));

  it('has a page for each page of docs/, and none that is not one', () => {
    // /docs/ itself (`docs/index.html`) is the table of contents the build writes beside them.
    const built = pages
      .filter((p) => p.startsWith('docs/') && p !== 'docs/index.html')
      .map((p) => p.slice('docs/'.length, -'/index.html'.length));
    expect([...built].sort()).toEqual([...names].sort());
    expect(pages, '/docs/ is a page').toContain('docs/index.html');
    expect(names.length).toBeGreaterThan(10);
    for (const name of [
      'index.html',
      '404.html',
      'record/index.html',
      'llms.txt',
      'robots.txt',
      'sitemap-index.xml',
    ]) {
      expect(isFile(join(DIST, name)), `${name} is missing`).toBe(true);
    }
  });

  it('has no id twice on a page of docs/', () => {
    for (const name of names) {
      const ids = [...html(`docs/${name}/index.html`).matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
      const twice = ids.filter((id, i) => ids.indexOf(id) !== i);
      expect(twice, `docs/${name} has an id twice`).toEqual([]);
    }
  });

  it('has no link that goes nowhere: every address inside the site is a file, every fragment an id', () => {
    const seen = { site: 0, fragment: 0, github: 0 };
    const held = tracked();
    const sha = head();
    // The ids of each file, read once: `record/index.html` names hundreds of its own fragments,
    // and reading the whole page again for each one took the case past its timeout.
    const ids = new Map<string, Set<string>>();
    const idsIn = (file: string): Set<string> => {
      let found = ids.get(file);
      if (found === undefined) {
        found = idsOf(readText(file));
        ids.set(file, found);
      }
      return found;
    };
    for (const page of [...pages, 'record/index.html']) {
      const text = html(page);
      const here = `${BASE}/${page.replace(/index\.html$/, '')}`;
      for (const raw of addressesOf(text)) {
        if (/^(mailto:|data:|javascript:)/.test(raw)) continue;
        if (raw.startsWith(`${GITHUB}/blob/`)) {
          seen.github++;
          const [path = ''] = raw.slice(`${GITHUB}/blob/${sha}/`.length).split('#');
          expect(
            raw.startsWith(`${GITHUB}/blob/${sha}/`),
            `${page}: ${raw} is not at the commit of the build`,
          ).toBe(true);
          expect(
            held.includes(path) || (path.endsWith('/') && held.some((f) => f.startsWith(path))),
            `${page}: ${raw}`,
          ).toBe(true);
          continue;
        }
        if (/^https?:/.test(raw)) continue;
        const [pathPart = '', fragment] = raw.split('#');
        const url =
          pathPart === '' ? here : pathPart.startsWith('/') ? pathPart : posix.join(here, pathPart);
        const clean = (url.split('?')[0] ?? '').replace(/\/\.\//g, '/');
        expect(clean.startsWith(`${BASE}/`), `${page}: ${raw} leaves the site's base`).toBe(true);
        const target = join(DIST, clean.slice(BASE.length));
        const file = isDirectory(target) ? join(target, 'index.html') : target;
        expect(isFile(file), `${page}: ${raw} is not a file of the site`).toBe(true);
        seen.site++;
        if (fragment !== undefined && fragment !== '' && file.endsWith('.html')) {
          seen.fragment++;
          expect(idsIn(file).has(decodeURIComponent(fragment)), `${page}: ${raw} names no id`).toBe(
            true,
          );
        }
      }
    }
    expect(seen.site, 'the sweep followed the links').toBeGreaterThan(500);
    expect(seen.fragment, 'the sweep followed the fragments').toBeGreaterThan(50);
    expect(seen.github, 'the sweep found the links to GitHub').toBeGreaterThan(150);
  });

  it('has no sentence of its own on a page of docs/: each block is in the file it came from', () => {
    let blocks = 0;
    for (const name of names) {
      const source = norm(readText(join(ROOT, 'docs', `${name}.md`)));
      for (const block of proseBlocks(html(`docs/${name}/index.html`))) {
        blocks++;
        expect(
          source.includes(norm(block)),
          `docs/${name}.md does not hold: ${block.slice(0, 120)}`,
        ).toBe(true);
      }
    }
    expect(blocks, 'the sweep read the prose').toBeGreaterThan(1000);
  });

  it('keeps every flag of a page as the source writes it: a `--stdin` is never turned into a dash and a word', () => {
    // The Markdown typographer turns `--` into a dash, and the block guard above reads letters and numbers only, so it cannot see it.
    let flags = 0;
    for (const name of names) {
      const source = readText(join(ROOT, 'docs', `${name}.md`));
      const page = textOf(html(`docs/${name}/index.html`));
      for (const flag of new Set(source.match(/(?<![-\w])--[a-z][a-z0-9-]*/g) ?? [])) {
        flags++;
        expect(page.includes(flag), `docs/${name}.md writes ${flag} and the built page does not`).toBe(true);
      }
    }
    expect(flags, 'the sweep found flags').toBeGreaterThan(100);
  });

  /** The README's Quick start: the command on its one line that starts with `mnema verify`, up to the `#`. */
  const verifyCommandInReadme = (): string => {
    const quick = /## Quick start\n[\s\S]*?```sh\n([\s\S]*?)\n```/.exec(
      readText(join(ROOT, 'README.md')),
    )?.[1];
    const lines = (quick ?? '').split('\n').filter((l) => /^mnema verify\b/.test(l));
    expect(lines, 'the Quick start has one line that starts with mnema verify').toHaveLength(1);
    return (lines[0] ?? '').split('#')[0]?.trim() ?? '';
  };

  /** The README's "How it works" section: where the landing's steps, and their bold lead-ins, come from. */
  const howItWorks = (): string =>
    /\n## How it works\n([\s\S]*?)(?=\n## )/.exec(readText(join(ROOT, 'README.md')))?.[1] ?? '';

  const landingCorpus = (): string =>
    [
      readText(join(ROOT, 'README.md')),
      // The README's own HTML (the captions of its recordings) as a reader sees it, tags out.
      textOf(readText(join(ROOT, 'README.md'))),
      ...names.map((n) => readText(join(ROOT, 'docs', `${n}.md`))),
      (JSON.parse(readText(join(ROOT, 'packages/code/package.json'))) as { description: string })
        .description,
      // From site/copy.md, only its entries: the title and the sentence that opens the file are not a source.
      ...[...(copyOf(readText(join(SITE, 'copy.md'))) as Map<string, string>).values()],
    ].join('\n');

  it.each([
    ['404.html', 3, 0],
    ['docs/index.html', 20, 0],
  ])(
    'has no sentence of its own anywhere in the <main> of %s: every block, every alt, title and aria-label, and nothing left over',
    (page, least, pictures) => {
      const say = sourcesSay(landingCorpus(), howItWorks());
      // The command shown beside the verdict is a line of the Quick start read up to its `#`: a source, as the case below holds.
      const command = verifyCommandInReadme();
      // The steps on the card of /docs/ are the headings `## 1. Label` of the first-record page, with their numbers off.
      const labels = new Set<string>(
        [...readText(join(ROOT, 'docs/first-record.md')).matchAll(/^## \d+\. (.+)$/gm)].map((m) => norm(m[1] ?? '')),
      );
      // Its group titles and its links are the README's: `- **Group.**` and `[Label](target)` in the Docs section.
      const docsSection = /\n## Docs\n([\s\S]*?)(?=\n## )/.exec(readText(join(ROOT, 'README.md')))?.[1] ?? '';
      for (const m of docsSection.matchAll(/^- \*\*([^*]+?)\.\*\*|\[([^\]]+)\]\(/gm)) labels.add(norm(m[1] ?? m[2] ?? ''));
      const { text, spoken, stripped } = blocksOfMain(html(page));
      expect(text.length, 'the <main> has text').toBeGreaterThan(least);
      expect(spoken.length, 'the <main> has pictures with words').toBeGreaterThanOrEqual(pictures);
      for (const block of [...text, ...spoken]) {
        expect(
          block === command || labels.has(norm(block)) || say(block),
          `the <main> of ${page} says what no source says: ${block.slice(0, 120)}`,
        ).toBe(true);
      }
      // Totality: the letters and numbers of the <main>, less the exclusions, are the letters and numbers of the blocks.
      const letters = (s: string): string => [...norm(s)].sort().join('');
      expect(letters(textOf(stripped)), 'text of the <main> that no block holds').toBe(
        letters(text.join(' ')),
      );
    },
  );

  it('paints in the one accent and shows the bytes of the pictures: nothing drawn for the site', async () => {
    const { ACCENT } = (await import(pathToFileURL(join(SITE, 'build/the-palette.mjs')).href)) as {
      ACCENT: { dark: string; light: string };
    };
    const astro = join(DIST, '_astro');
    const css = readdirSync(astro)
      .filter((f) => f.endsWith('.css'))
      .map((f) => readText(join(astro, f)))
      .join('\n');
    const inlined = pages.map((p) => html(p)).join('\n');
    for (const hex of [ACCENT.dark, ACCENT.light]) {
      expect(
        css.includes(hex) || inlined.includes(hex),
        `the accent ${hex} is not in the built style`,
      ).toBe(true);
    }
    // Starlight's own chrome keeps its defaults in a layer; what the palette paints is the unlayered rule of each theme.
    expect(css.includes(`:root{--sl-color-accent:${ACCENT.dark};`), "the dark accent is not the palette's").toBe(true);
    expect(
      /:root\[data-theme="?light"?\]\{--sl-color-accent:/.exec(css + inlined) &&
        css.includes(`{--sl-color-accent:${ACCENT.light};`),
      "the light accent is not the palette's",
    ).toBe(true);

    for (const file of [
      'banner-dark.svg',
      'banner-light.svg',
      'how-it-works-dark.svg',
      'the-family-light.svg',
    ]) {
      expect(
        readFileSync(join(DIST, 'assets', file)).equals(
          readFileSync(join(ROOT, 'docs/assets', file)),
        ),
        `${file} is not the picture of docs/assets`,
      ).toBe(true);
    }
    const sources = await theSources(ROOT);
    const { ACCENT: DRAWN } = sources as { ACCENT: { dark: string; light: string } };
    const svg = readText(join(DIST, 'favicon.svg'));
    expect(svg, 'the favicon is not what the build draws from the product').toBe(faviconSvg(sources));
    // Read off the product's own files, not off the generator: the letter's cells, and the accent of each theme.
    const cells = sources.letterCells(sources.blocks).length;
    expect(
      [...svg.matchAll(/z/g)].length / 2,
      'the favicon holds the cells of the letter, twice (the letter and its shadow)',
    ).toBe(cells);
    expect(svg.match(/\.letter\{fill:(#[0-9a-f]{6})/)?.[1], 'the light accent').toBe(DRAWN.light);
    expect(svg.match(/@media \(prefers-color-scheme:dark\)\{\.shadow\{fill:#[0-9a-f]{6}\}\.letter\{fill:(#[0-9a-f]{6})/)?.[1], 'the dark accent').toBe(DRAWN.dark);
    expect(svg, 'a bare letter: no tile around it').not.toContain('<rect');
    const png = readFileSync(join(DIST, 'favicon.png'));
    expect(png.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))).toBe(true);
    expect(png.readUInt32BE(16), 'width').toBe(64);
  });

  it('links the adaptive SVG as the icon of every page, ahead of the PNG fallback, and that SVG is the generated file', async () => {
    const generated = faviconSvg(await theSources(ROOT));
    // /record/ is the page the binary writes, and it declares no icon.
    const own = pages.filter((p) => p !== 'record/index.html');
    expect(own.length, 'the pages swept').toBeGreaterThan(10);
    for (const page of own) {
      const icons = [...html(page).matchAll(/<link rel="icon"[^>]*>/g)].map((m) => m[0]);
      const svg = icons.findIndex((l) => /href="\/favicon\.svg"/.test(l) && /type="image\/svg\+xml"/.test(l));
      const png = icons.findIndex((l) => /href="\/favicon\.png"/.test(l));
      expect(svg, `${page}: the SVG is not linked as an icon`).toBeGreaterThanOrEqual(0);
      expect(png, `${page}: the PNG fallback is not linked`).toBeGreaterThan(svg);
    }
    expect(readText(join(DIST, 'favicon.svg')), 'the linked SVG is the generated one').toBe(generated);
  });

  it('carries the calculated theme in a rule of no layer, so Starlight does not take it back', async () => {
    const { ACCENT, PAGE, INK } = (await import(pathToFileURL(join(SITE, 'build/the-palette.mjs')).href)) as Record<
      'ACCENT' | 'PAGE' | 'INK',
      { dark: string; light: string }
    >;
    const theme = themeOf({ ACCENT, PAGE, INK }) as Record<'dark' | 'light', Record<string, string>>;
    const astro = join(DIST, '_astro');
    const css = readdirSync(astro)
      .filter((f) => f.endsWith('.css'))
      .map((f) => readText(join(astro, f)))
      .join('\n');
    // The minifier writes `#ffffff` as `#fff`.
    const short = (hex: string): string =>
      /^#(.)\1(.)\2(.)\3$/.test(hex) ? hex.replace(/^#(.).(.).(.)./, '#$1$2$3') : hex;
    const starts = {
      dark: ':root{--sl-color-accent:',
      light: ':root[data-theme=light]{--sl-color-accent:',
    } as const;
    for (const which of ['dark', 'light'] as const) {
      const at = css.indexOf(`${starts[which]}${short(ACCENT[which])};`);
      expect(at, `${which}: the rule of the theme is in the built style`).toBeGreaterThanOrEqual(0);
      const before = css.slice(0, at);
      const depth = (before.match(/\{/g) ?? []).length - (before.match(/\}/g) ?? []).length;
      expect(
        depth,
        `${which}: the rule sits inside a block (a layer?) and loses to Starlight's`,
      ).toBe(0);
      const rule = `${css.slice(at, css.indexOf('}', at))};`;
      expect(rule, `${which}: the ground is the page's`).toContain(
        `--sl-color-black:${short(PAGE[which])};`,
      );
      for (const name of ['text-accent', 'accent-high', 'bg-inline-code', 'gray-3']) {
        expect(rule, `${which}: ${name}`).toContain(
          `--sl-color-${name}:${short(theme[which][name] as string)};`,
        );
      }
    }
  });

  it('shows on the page of what it proves the recording of a changed word, from the GIF the site carries', () => {
    const page = html('docs/what-it-proves/index.html');
    const src = /<img\b[^>]*src="([^"]*recordings\/a-tamper-caught\.gif)"/.exec(page)?.[1] ?? '';
    expect(src, 'the page shows the recording').not.toBe('');
    expect(src, "a path of the site, not GitHub's page for the file").not.toMatch(/^https?:/);
    expect(
      readFileSync(join(DIST, 'recordings/a-tamper-caught.gif')).equals(
        readFileSync(join(ROOT, 'recordings/a-tamper-caught.gif')),
      ),
      "the site's GIF is the repository's",
    ).toBe(true);
  });

  it('puts in the head of every page of docs/ the mark, linked to the home page, and the name once', async () => {
    const sources = await theSources(ROOT);
    for (const page of ['404.html', 'docs/install/index.html']) {
      const title = /<a href="([^"]*)" class="site-title[^>]*>([\s\S]*?)<\/a>/.exec(html(page));
      expect(title?.[1], `${page}: the head links back to the home page`).toBe('/');
      const images = [...(title?.[2] ?? '').matchAll(/<img\b[^>]*>/g)].map((m) => m[0]);
      expect(images, `${page}: one mark per theme`).toHaveLength(2);
      for (const [i, theme] of (['dark', 'light'] as const).entries()) {
        const img = images[i] ?? '';
        const alt = /\salt(?:="([^"]*)")?(?=[\s>])/.exec(img);
        expect(alt?.[1] ?? (alt ? '' : '?'), `${page}: the name is not said twice`).toBe('');
        const src = /\ssrc="([^"]*)"/.exec(img)?.[1] ?? '';
        expect(src, `${page}: the ${theme} mark`).toContain(`mark-${theme}.`);
        expect(readText(join(DIST, src.slice(BASE.length))), `${page}: the ${theme} mark is the favicon's letter`).toBe(
          markSvg(sources, theme, 28),
        );
      }
      expect(textOf(title?.[2] ?? ''), `${page}: the name`).toBe('mnema');
    }
  });

  /** The `content` of every `<meta>` of a page whose `property` or `name` is `key`. */
  const metas = (page: string, key: string): string[] =>
    [
      ...html(page).matchAll(
        new RegExp(`<meta\\s+(?:property|name)="${key}"\\s+content="([^"]*)"\\s*/?>`, 'g'),
      ),
    ].map((m) => (m[1] ?? '').replace(/&#39;/g, "'").replace(/&amp;/g, '&'));

  it('declares on every page the one social card, at its address on the published site, and the card is a 1200 by 630 PNG', () => {
    const card = `${SITE_URL}${BASE}/og.png`;
    const title = textOf(/<h3>([\s\S]*?)<\/h3>/.exec(readText(join(ROOT, 'README.md')))?.[1] ?? '');
    for (const page of pages) {
      for (const key of ['og:image', 'twitter:image']) {
        expect(metas(page, key), `${page}: ${key}`).toEqual([card]);
      }
      expect(metas(page, 'og:image:width'), `${page}: width`).toEqual(['1200']);
      expect(metas(page, 'og:image:height'), `${page}: height`).toEqual(['630']);
      for (const key of ['og:image:alt', 'twitter:image:alt']) {
        expect(metas(page, key), `${page}: ${key}`).toEqual([title]);
      }
      // The type is said once, and the landing is the one page that is not an article.
      expect(metas(page, 'og:type'), `${page}: the type`).toEqual([
        page === 'index.html' ? 'website' : 'article',
      ]);
    }
    const png = readFileSync(join(DIST, 'og.png'));
    expect(png.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))).toBe(true);
    expect(png.subarray(12, 16).toString('latin1')).toBe('IHDR');
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1200, 630]);
  });

  it('draws the card as the SVG of the front page rasterized with its letters, and not as the same SVG without its words or with them backwards', async () => {
    const require = createRequire(join(SITE, 'package.json'));
    const sharp = require('sharp') as (input: Buffer) => {
      png: () => { toBuffer: () => Promise<Buffer> };
    };
    const { socialCard } = await import(
      pathToFileURL(join(ROOT, '.github/the-front-page/draw.mjs')).href
    );
    const { THE_BLOCKS } = await fromTheProduct('packages/code/dist/presentation/banner.js');
    const { pitchOf } = await import('../build/the-pages.mjs');
    const svg = socialCard({
      blocks: THE_BLOCKS,
      pitch: pitchOf(readText(join(ROOT, 'README.md'))),
    }) as string;
    const built = readFileSync(join(DIST, 'og.png'));
    expect(
      built.equals(await sharp(Buffer.from(svg)).png().toBuffer()),
      'og.png is not the card of the front page',
    ).toBe(true);
    // Without its <text> the card is another picture; and with each line written backwards it is another one still, but
    // only if the machine has a face to draw letters with: a machine with none draws the same boxes for any string.
    const bare = svg.replace(/<text\b[^>]*>[^<]*<\/text>/g, '');
    const backwards = svg.replace(
      /(<text\b[^>]*>)([^<]*)(<\/text>)/g,
      (_all, open: string, words: string, close: string) =>
        `${open}${[...words].reverse().join('')}${close}`,
    );
    expect(bare).not.toBe(svg);
    expect(backwards).not.toBe(svg);
    for (const other of [bare, backwards]) {
      expect(
        built.equals(await sharp(Buffer.from(other)).png().toBuffer()),
        'og.png has no letters: the machine that built it drew the card without a face for its text',
      ).toBe(false);
    }
  }, 60_000);

  it('serves a 404 that leads into the site: three links at least, to pages the site holds', () => {
    const page = html('404.html');
    const main = /<main\b[^>]*>([\s\S]*)<\/main>/.exec(page)?.[1] ?? '';
    const into = [...main.matchAll(/<a\b[^>]*\shref="([^"]*)"/g)]
      .map((m) => m[1] ?? '')
      .filter((a) => a.startsWith(`${BASE}/`));
    expect(into.length).toBeGreaterThanOrEqual(3);
    expect(into).toContain(`${BASE}/record/`);
    expect(main).not.toContain('try using the search bar');
    expect(page).not.toMatch(/the-proof|data-verdict/);
  });

  /** The top-level entries of the sidebar of a page, each as its HTML. */
  const topOfSidebar = (page: string): string[] => {
    const pane = /<sl-sidebar-state-persist\b[^>]*>([\s\S]*?)<\/sl-sidebar-state-persist>/.exec(
      html(page),
    )?.[1];
    const clean = (pane ?? '')
      .replace(/<script[\s\S]*?<\/script>/g, '')
      .replace(/<svg[\s\S]*?<\/svg>/g, '');
    const out: string[] = [];
    let ul = 0;
    let li = 0;
    let from = 0;
    for (const m of clean.matchAll(/<(\/?)(ul|li)\b[^>]*>/g)) {
      const [raw, closing, tag] = m;
      if (tag === 'ul') ul += closing === '/' ? -1 : 1;
      else if (closing === '/') {
        li--;
        if (ul === 1 && li === 0) out.push(clean.slice(from, (m.index ?? 0) + raw.length));
      } else {
        if (ul === 1 && li === 0) from = m.index ?? 0;
        li++;
      }
    }
    return out;
  };

  it('lists the record page once, inside the group that holds the page that verifies itself, in the sidebar, and no entry of the sidebar is outside a group', () => {
    const readme = readText(join(ROOT, 'README.md'));
    const docs = /\n## Docs\n([\s\S]*?)\n## /.exec(readme)?.[1] ?? '';
    const groups = [...docs.matchAll(/^- \*\*([^*]+?)\.\*\*/gm)].map((m) => m[1]);
    for (const page of ['docs/install/index.html', 'docs/site/index.html']) {
      const top = topOfSidebar(page);
      expect(top.length, `${page}: the sidebar has entries`).toBeGreaterThan(3);
      for (const entry of top) {
        expect(entry.startsWith('<li'), page).toBe(true);
        expect(/^<li[^>]*>\s*<details\b/.test(entry), `${page}: an entry outside a group`).toBe(
          true,
        );
      }
      expect(
        top.map((e) => textOf(/<summary\b[\s\S]*?<\/summary>/.exec(e)?.[0] ?? '')),
        `${page}: the groups of the README`,
      ).toEqual(groups);
      const holders = top.filter((e) => e.includes(`href="${BASE}/record/"`));
      expect(holders, `${page}: the record page is in one group`).toHaveLength(1);
      expect(textOf(/<summary\b[\s\S]*?<\/summary>/.exec(holders[0] ?? '')?.[0] ?? '')).toBe(
        'Project',
      );
      expect(holders[0], `${page}: the group of the record page holds the page that verifies itself`).toContain(
        `href="${BASE}/docs/site/"`,
      );
      expect(
        (top.join('').match(new RegExp(`<a\\b[^>]*href="${BASE}/record/"`, 'g')) ?? []).length,
        `${page}: the record page is listed once in the sidebar`,
      ).toBe(1);
    }
  });

  it('puts no sentence in a stylesheet: a `content` that is not empty, or an `attr()`, is text the guards do not read', () => {
    // CSS can draw text no HTML holds (`content: "..."`, or the value of an attribute by `attr()`), and the guards
    // that read the page read the page. Own stylesheets: nothing but `content: ''`, `""` or `none`. Built ones: the
    // same, less what a package the site stands on carries in its own files.
    const walk = (dir: string, keep: (f: string) => boolean): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? walk(join(dir, e.name), keep) : keep(e.name) ? [join(dir, e.name)] : [],
      );
    const drawn = (css: string): string[] => [
      ...[...css.matchAll(/content\s*:\s*([^;}]*)/g)].flatMap((m) =>
        [...(m[1] ?? '').matchAll(/(["'])((?:\\.|(?!\1).)*)\1/g)]
          .map((q) => q[2] ?? '')
          .filter((q) => q !== ''),
      ),
      ...[...css.matchAll(/attr\s*\([^)]*\)/g)].map((m) => m[0]),
    ];
    const own = walk(join(SITE, 'src'), (f) => f.endsWith('.css')).flatMap((f) =>
      drawn(readText(f)).map((d) => `${f}: ${d}`),
    );
    expect(own, 'text drawn by the stylesheets of the site').toEqual([]);

    const astro = join(DIST, '_astro');
    const built = [
      ...readdirSync(astro)
        .filter((f) => f.endsWith('.css'))
        .map((f) => readText(join(astro, f))),
      ...pages.map((p) => (html(p).match(/<style\b[^>]*>[\s\S]*?<\/style>/g) ?? []).join('\n')),
    ].flatMap(drawn);
    const theirs = [
      '@astrojs/starlight',
      '@expressive-code',
      'astro-expressive-code',
      '@pagefind/default-ui',
    ]
      .map((d) => join(SITE, 'node_modules', d))
      .filter((d) => existsSync(d))
      .flatMap((d) => walk(d, (f) => /\.(m?js|css|astro|svelte)$/.test(f)))
      .map((f) => readText(f))
      .join('\n');
    expect(
      [...new Set(built)].filter(
        (d) => !theirs.includes(d) && !theirs.includes(d.replace(/\\/g, '\\\\')),
      ),
      'text drawn by the built stylesheets that no package of the site carries',
    ).toEqual([]);
  });

  it('does not say that the pages describe the next version: that is the repository, not the published version', () => {
    for (const page of pages) {
      expect(textOf(html(page)), `${page} says it`).not.toMatch(/describe the next version/i);
    }
  });

  it('says in its footer the version and the commit it was built from, on every page', () => {
    const version = (
      JSON.parse(readText(join(ROOT, 'packages/code/package.json'))) as { version: string }
    ).version;
    const sha = head();
    for (const page of pages) {
      const text = html(page);
      expect(/data-version>([^<]*)</.exec(text)?.[1], `${page}: version`).toBe(version);
      expect(
        /data-commit href="[^"]*\/commit\/([0-9a-f]{40})"/.exec(text)?.[1],
        `${page}: commit (is site/dist older than this checkout? build the site again)`,
      ).toBe(sha);
      const footer = /<p class="the-build[^"]*">([\s\S]*?)<\/p>/.exec(text)?.[1] ?? '';
      // `textOf` puts a space where a tag was, which would hide the missing one: what a reader sees is the tags
      // taken out and nothing put in their place.
      expect(
        footer.replace(/<[^>]*>/g, ''),
        `${page}: the footer reads "commit <sha>", with the space`,
      ).toMatch(/· commit [0-9a-f]{12}$/);
    }
  });

  it('serves as /record/ the page `mnema site` writes for this commit, with the head the build hands it, and the page it serves says its lists match', async () => {
    const out = mkdtempSync(join(tmpdir(), 'the-record-built-'));
    try {
      const home = mkdtempSync(join(tmpdir(), 'the-record-home-'));
      // What the build hands the command: the head of /record/ from the same readings, as a file.
      const headFile = join(out, 'head.json');
      writeFileSync(headFile, JSON.stringify(await theHeadOfTheRecord({ root: ROOT })));
      execFileSync(
        process.execPath,
        [
          join(ROOT, 'packages/code/dist/cli.js'),
          'site',
          '--out',
          out,
          '--back-link',
          recordBackLink({ base: BASE }),
          '--head',
          headFile,
        ],
        { cwd: ROOT, env: { HOME: home, PATH: process.env.PATH ?? '' }, stdio: 'pipe' },
      );
      rmSync(home, { recursive: true, force: true });
      expect(
        readFileSync(join(DIST, 'record/index.html')).equals(readFileSync(join(out, 'index.html'))),
      ).toBe(true);
      expect(html('record/index.html')).toContain(`<p><a href="${BASE}/">Back</a></p>`);
      // Opened, the page checks its own lists against the events it verified, and they match.
      const record = readText(join(DIST, 'record/index.html'));
      const script = /<script>(.*)<\/script>/s.exec(record)?.[1] ?? '';
      const run = runInAVm(record, script);
      run.timers.drain();
      const status = run.page.getElementById('lists-status');
      const issues = run.page.getElementById('lists-issues')?.children.map((li) => li.textContent);
      expect({ state: status?.getAttribute('data-state'), issues }).toEqual({
        state: 'match',
        issues: [],
      });
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });

  it('lists in llms.txt the pages the README lists, and nothing else', () => {
    const text = readText(join(DIST, 'llms.txt'));
    const readme = readText(join(ROOT, 'README.md'));
    const docs = /## Docs\n([\s\S]*?)\n## /.exec(readme)?.[1] ?? '';
    const listed = [...docs.matchAll(/\]\(([^)#]+\.md)(?:#[^)]*)?\)/g)].map((m) => m[1] as string);
    const raw = [
      ...text.matchAll(
        /\]\(https:\/\/raw\.githubusercontent\.com\/[^/]+\/[^/]+\/[0-9a-f]{40}\/([^)]+)\)/g,
      ),
    ].map((m) => m[1] as string);
    expect(listed.length).toBeGreaterThan(15);
    expect([...new Set(raw)].sort()).toEqual([...new Set(listed)].sort());
  });
});
