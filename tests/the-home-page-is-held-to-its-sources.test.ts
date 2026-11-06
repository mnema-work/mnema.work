// @reads-the-tree
/**
 * THE HOME PAGE SAYS ITS OWN WORDS AND NOBODY ELSE'S FACTS. The words of mnema.work/ are the page's (ADR-199, ADR-200);
 * what is a fact of the release it was built from is read from the checkout of its tag, and this holds the built page to
 * the file each one comes from, read here again by code of its own and not by the build's:
 *
 *   - THE COUNTS of the measured block (10 of 10, 11 of 11, 0 of 12) and the number of sessions: from the results the
 *     measurements folder holds as JSON (`results/stage1/table.json`, `results/stage2/counts.json`);
 *   - THE HOSTS AND THEIR RUNGS: from the table of hosts the README holds (written from the product's host table);
 *   - THE COMMANDS that install: from the README's Quick start and the page of the hosts;
 *   - THE VERDICT shown: clauses of what the binary prints on the record committed at this commit;
 *   - THE LINKS: each one to a page the site has, a section the page has, or a path git holds at the tag.
 *
 * AND HOLDS THE PAGE TO WHAT IT PROMISES: no colour of its own (the palette is the one owner), no host but its own asked
 * for anything, motion only in the hero's chain and none under `prefers-reduced-motion`, text at 4.5:1 on every ground it
 * is set on, real buttons and links, the chain hidden from assistive technology with a text alternative, the em dash nowhere.
 * Docs: both themes carry the palette, dark is the default, and the mark in the head links back to `/`.
 *
 * WHAT IT DOES NOT CHECK: how the page looks at any width (a reviewer opens it), or that a screen reader reads it well.
 */

import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { hostsOf, installOf, measuredOf, verdictLinesOf } from '../build/the-home.mjs';
import { contrastOf } from '../build/the-pages.mjs';
import { INK, PAGE, PALETTE, paletteCss } from '../build/the-palette.mjs';
import { PRODUCT_URL } from '../build/the-site.mjs';
import { DIST, head, ROOT, readText, SITE, textOf } from './support/reading-the-site.js';

const BUILT = existsSync(join(DIST, 'index.html'));
const when = BUILT ? describe : describe.skip;
const MEASURED = 'measurements/paid-block-2026-11';

const readme = (): string => readText(join(ROOT, 'README.md'));
const json = (path: string): any => JSON.parse(readText(join(ROOT, path)));

describe('the readings of the home page, over fixtures', () => {
  it('stops when a source of the measured block is not what the page reads', () => {
    const dir = mkdtempSync(join(tmpdir(), 'the-home-'));
    try {
      mkdirSync(join(dir, MEASURED, 'results/stage1'), { recursive: true });
      mkdirSync(join(dir, MEASURED, 'results/stage2'), { recursive: true });
      const write = (path: string, value: unknown): void => writeFileSync(join(dir, path), JSON.stringify(value));
      write(`${MEASURED}/results/stage1/table.json`, { cells: {}, checks: { sessions: 1 } });
      write(`${MEASURED}/results/stage2/counts.json`, { cells: {} });
      expect(() => measuredOf(dir)).toThrow(/has no cell "A-agentsmd parity-neutral"/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('stops on a README with no host table, and on one that does not say its four rungs', () => {
    expect(() => hostsOf('## Hosts\n\nnothing\n')).toThrow(/host table/);
    const row = '| <img> | **Alpha**<br><sub>x</sub> | **(d)** | y | [Plugin](z) |';
    expect(() => hostsOf(`## Hosts\n\nno rungs here\n\n${row}\n`)).toThrow(/four rungs/);
    const ok = hostsOf(`## Hosts\n\n(a) one, (b) two, (c) three, (d) four.\n\n${row}\n`);
    expect(ok.hosts).toEqual([{ name: 'Alpha', rung: 'd' }]);
    expect(ok.rungs.map((r: { letter: string }) => r.letter)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('stops when the install commands are not where the page reads them, and when the verdict lost the clauses it quotes', () => {
    expect(() => installOf({ readme: '## Quick start\n\n```sh\nls\n```\n', hostsPage: '' })).toThrow(/install commands/);
    expect(() => verdictLinesOf('private: ok')).toThrow(/clauses/);
    expect(verdictLinesOf('public: local integrity verified (T1/T2/T4); x; all events are signature-covered\n')).toEqual([
      'public: local integrity verified (T1/T2/T4)',
      'all events are signature-covered',
    ]);
  });
});

when('the built home page', () => {
  const page = (): string => readText(join(DIST, 'index.html'));
  const main = (): string => /<main\b[^>]*>([\s\S]*)<\/main>/.exec(page())?.[1] ?? '';
  const sourceOf = (path: string): string => readText(join(SITE, path));
  const builtCss = (): string =>
    readdirSync(join(DIST, '_astro'))
      .filter((f) => f.endsWith('.css'))
      .map((f) => readText(join(DIST, '_astro', f)))
      .join('\n');

  it('shows the three counts and the sessions the results hold, each in the card that says what it counts', () => {
    const one = json(`${MEASURED}/results/stage1/table.json`);
    const two = json(`${MEASURED}/results/stage2/counts.json`);
    const cells = Object.entries(two.cells as Record<string, { n: number; q2?: { recorded: number; governs_links: number } }>);
    const arm = (letter: string): [number, number] => {
      const mine = cells.filter(([name, c]) => name.startsWith(`${letter} `) && c.q2);
      return [
        mine.reduce((a, [, c]) => a + (c.q2?.governs_links ?? 0), 0),
        mine.reduce((a, [, c]) => a + (c.q2?.recorded ?? 0), 0),
      ];
    };
    const agents = one.cells['A-agentsmd parity-neutral'];
    const expected = [
      [agents.code.obeyed, agents.n, 'A rule written only in AGENTS.md was followed, as in CLAUDE.md.'],
      [...arm('B'), 'Decisions the agent recorded through the plugin, linked to the code they govern.'],
      [...arm('C'), 'The same, through the command line alone.'],
    ];
    const cards = [...main().matchAll(/<p class="mono big[^"]*">(\d+)<span class="of">\/(\d+)<\/span><\/p><p>([^<]*)<\/p>/g)].map((m) => [
      Number(m[1]),
      Number(m[2]),
      m[3],
    ]);
    expect(cards).toEqual(expected);
    // The values themselves, as the measurement's own page words them, so a source that moved is noticed here.
    expect(expected.map((e) => `${e[0]}/${e[1]}`)).toEqual(['10/10', '11/11', '0/12']);
    const sessions = one.checks.sessions + cells.reduce((a, [, c]) => a + c.n, 0);
    expect(textOf(main())).toContain(`${sessions} Claude Code sessions, under a published pre-registration.`);
    expect(sessions).toBe(49);
  });

  it('cites the measurements folder at the tag, a path git holds there', () => {
    const tag = execFileSync('git', ['describe', '--tags', '--exact-match'], { cwd: ROOT, encoding: 'utf8' }).trim();
    const href = new RegExp(`href="([^"]*)">The pre-registration, the kit and the result`).exec(main())?.[1];
    expect(href).toBe(`${PRODUCT_URL}/tree/${tag}/${MEASURED}`);
    const held = execFileSync('git', ['ls-tree', '-d', '--name-only', tag, MEASURED], { cwd: ROOT, encoding: 'utf8' }).trim();
    expect(held).toBe(MEASURED);
  });

  it('lists the hosts of the README table with their rungs, no more and no fewer, and the four rungs in the README words', () => {
    const rows = readme()
      .split('\n')
      .filter((l) => l.startsWith('| ') && /\*\*\([a-d]\)\*\*/.test(l))
      .map((l) => l.split('|').map((c) => c.trim()))
      .map((cells) => ({ name: /\*\*([^*]+)\*\*/.exec(cells[2] ?? '')?.[1] ?? '?', rung: /\(([a-d])\)/.exec(cells[3] ?? '')?.[1] ?? '?' }));
    expect(rows.length).toBeGreaterThanOrEqual(12);
    const shown = [...main().matchAll(/<li class="host [a-z]+">([^<]*?) <b>([a-d])<\/b><\/li>/g)].map((m) => ({ name: m[1], rung: m[2] }));
    const key = (h: { name?: string; rung?: string }): string => `${h.rung} ${h.name}`;
    expect(shown.map(key).sort()).toEqual(rows.map(key).sort());
    // Highest rung first.
    expect(shown.map((h) => h.rung)).toEqual([...shown.map((h) => h.rung)].sort().reverse());
    const sentence = /\(a\) ([^,]+), \(b\) ([^,]+), \(c\) ([^,]+), \(d\) ([^.]+)\./.exec(readme().replace(/\s+/g, ' '));
    const legend = /<p class="mono legend">([^<]*)<\/p>/.exec(main())?.[1] ?? '';
    expect(legend.split(/\s{3}/)).toEqual(['a', 'b', 'c', 'd'].map((letter, i) => `${letter} · ${sentence?.[i + 1]}`));
  });

  it('offers the install line the README opens its Quick start with, copies exactly it, and shows the commands of the README and of the page of hosts', () => {
    const quick = /## Quick start\n[\s\S]*?```sh\n([\s\S]*?)\n```[\s\S]*?```sh\n([\s\S]*?)\n```/.exec(readme());
    const lines = (block: string | undefined): string[] =>
      (block ?? '').split('\n').map((l) => l.replace(/\s+#.*$/, '').trim()).filter((l) => l !== '' && !l.startsWith('#'));
    const first = lines(quick?.[1]);
    const claude = lines(quick?.[2]);
    expect(first[0]).toBe('npm i -g @mnema/code');
    const extension = /`(code --install-extension [^`\s]+)`/.exec(readText(join(ROOT, 'docs/hosts.md')))?.[1];
    expect(extension).toBeTruthy();

    const button = /<button type="button" data-copy="([^"]*)"[^>]*>copy<\/button>/.exec(page());
    expect(button?.[1], 'what the button copies').toBe(first[0]);
    expect(textOf(/<span id="install-line">([^<]*)<\/span>/.exec(page())?.[1] ?? ''), 'what it shows').toBe(first[0]);

    const code = /<div class="code mono"[^>]*>((?:<div[^>]*>[\s\S]*?<\/div>)+)<\/div>/.exec(main())?.[1] ?? '';
    const shown = [...code.matchAll(/<div[^>]*>([\s\S]*?)<\/div>/g)].map((m) => textOf(m[1] ?? ''));
    const init = first.find((l) => l === 'mnema init');
    const change = first.find((l) => l.startsWith('cd '));
    expect(shown).toEqual([
      `$ ${first[0]}`,
      `$ ${change} && ${init}`,
      '# hand the record to your agent, in Claude Code:',
      ...claude.map((c) => `$ ${c}`),
      `# in VS Code: ${extension}`,
    ]);
    expect(claude).toEqual(['claude plugin marketplace add felipesauer/mnema', 'claude plugin install mnema@mnema']);
  });

  it('copies in the click, with the clipboard API and a fallback that selects the text', () => {
    const script = /<script type="module">([\s\S]*?)<\/script>/.exec(page())?.[1] ?? '';
    expect(script).toContain('navigator.clipboard');
    expect(script).toContain('writeText');
    expect(script, 'the fallback selects the text').toMatch(/selectNodeContents/);
    expect(script).toMatch(/addEventListener\(`?["']?click/);
  });

  it('shows clauses of the verdict the binary prints on the record of this commit, and the command beside them', () => {
    const shown = /<div class="console mono"><div class="cmd"><span class="prompt">\$<\/span> ([^<]*)<\/div><div class="verified">([^<]*)<\/div><div class="muted">([^<]*)<\/div>/.exec(main());
    expect(shown?.[1]).toBe('mnema verify');
    const dir = mkdtempSync(join(tmpdir(), 'the-home-verdict-'));
    try {
      execFileSync('git', ['archive', '--format=tar', '-o', join(dir, 'record.tar'), 'HEAD', '.mnema'], { cwd: ROOT });
      const tree = join(dir, 'tree');
      mkdirSync(tree);
      execFileSync('tar', ['-xf', join(dir, 'record.tar'), '-C', tree]);
      execFileSync('git', ['init', '-q', tree]);
      const home = mkdtempSync(join(tmpdir(), 'the-home-verdict-home-'));
      const ran = spawnSync(process.execPath, [join(ROOT, 'packages/code/dist/cli.js'), 'verify'], {
        cwd: tree,
        env: { HOME: home, PATH: process.env.PATH ?? '' },
        encoding: 'utf8',
      });
      rmSync(home, { recursive: true, force: true });
      expect(ran.status, ran.stderr).toBe(0);
      const clauses = ran.stdout.trim().split('; ');
      expect(clauses, 'the first line is a clause of the real verdict').toContain(shown?.[2]);
      expect(clauses, 'the second line is a clause of the real verdict').toContain(shown?.[3]);
      expect(shown?.[2]).toMatch(/^public: local integrity verified/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
    expect(page()).toContain(`/commit/${head()}`);
  }, 60_000);

  it('has the links the brief names, each to a page, a section or a path that exists', () => {
    const html = page();
    const hrefs = [...html.matchAll(/<a\b[^>]*\shref="([^"]+)"/g)].map((m) => m[1] as string);
    for (const own of ['/docs/', '/docs/first-record/', '/record/', '/docs/what-it-proves/']) {
      expect(hrefs, own).toContain(own);
      expect(existsSync(join(DIST, own, 'index.html')), `${own} is a page of the site`).toBe(true);
    }
    expect(hrefs).toContain(PRODUCT_URL);
    expect(hrefs).toContain('https://www.npmjs.com/package/@mnema/code');
    const extension = /code --install-extension ([^\s`]+)/.exec(readText(join(ROOT, 'docs/hosts.md')))?.[1];
    expect(hrefs).toContain(`https://marketplace.visualstudio.com/items?itemName=${extension}`);
    const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
    for (const anchor of ['#how', '#measured', '#start', '#top']) {
      expect(hrefs, anchor).toContain(anchor);
      expect(ids.has(anchor.slice(1)), `${anchor} is an id of the page`).toBe(true);
    }
    for (const href of hrefs.filter((h) => h.startsWith('#'))) expect(ids.has(href.slice(1)), href).toBe(true);
  });

  it('keeps the motion in the hero chain, and none of it under prefers-reduced-motion', () => {
    const css = sourceOf('src/styles/home.css');
    // Every animation of the page is on the two classes of the chain, and nowhere else.
    const animated = [...css.matchAll(/([^{}]+)\{[^{}]*\banimation\s*:[ \t]*(?![ \t]|none)[^;}]+[;}]/g)].map((m) => (m[1] ?? '').trim());
    expect(animated.sort(), 'the rules that animate').toEqual(['.home .link', '.home .lit']);
    expect(css, 'no transition anywhere').not.toMatch(/\btransition\s*:/);
    expect(css, 'no scroll behaviour set').not.toMatch(/scroll-behavior\s*:\s*smooth/);
    const reduced = /@media \(prefers-reduced-motion:\s*reduce\)\s*\{([\s\S]*?\})\s*\}/.exec(css)?.[1] ?? '';
    expect(reduced, 'the reduced-motion rule is there').toMatch(/\.home \.link,\s*\.home \.lit\s*\{\s*animation:\s*none;?\s*\}/);
    // And it survives into the built style.
    expect(builtCss().replace(/\s+/g, '')).toMatch(/@media\(prefers-reduced-motion:reduce\)\{[^@]*\.home\.link,\.home\.lit\{animation:none/);
  });

  it('writes no colour of its own: every colour of the page is a variable of the palette, and each variable is defined', () => {
    const css = sourceOf('src/styles/home.css');
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/);
    const defined = new Set([...paletteCss().matchAll(/--([a-z-]+):/g)].map((m) => m[1]));
    const used = [...css.matchAll(/var\(--([a-z-]+)\)/g)].map((m) => m[1] as string);
    expect(used.length).toBeGreaterThan(40);
    for (const name of new Set(used)) expect(defined.has(name), `--${name} is not in the palette`).toBe(true);
    // The palette the page is built with is the palette's file, byte for byte.
    expect(builtCss().replace(/\s+/g, '')).toContain(`--ground:${PALETTE.ground}`);
  });

  it('sets every text colour at 4.5:1 on every ground it can sit on', () => {
    const css = sourceOf('src/styles/home.css');
    const kebab = (name: string): string => name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
    const hexOf = new Map(Object.entries(PALETTE).map(([k, v]) => [kebab(k), v as string]));
    const grounds = ['ground', 'raised', 'surface', 'card', 'button', 'mint-ground', 'red-ground', 'accent-ground'];
    // The colours that are text, by the `color:` declarations of the stylesheet.
    const text = new Set([...css.matchAll(/(?<![-\w])color:\s*var\(--([a-z-]+)\)/g)].map((m) => m[1] as string));
    expect(text.size).toBeGreaterThan(8);
    text.delete('on-accent');
    for (const colour of text) {
      for (const ground of grounds) {
        // A colour is only held to the grounds it is set on: the greens on the green ground, the red on the red one, the rest on the page's.
        const family = /^mint|^red$/.test(colour) ? (colour === 'red' ? ['ground', 'red-ground'] : ['ground', 'surface', 'mint-ground']) : grounds.filter((g) => !/-ground$/.test(g) || g === 'accent-ground');
        if (!family.includes(ground)) continue;
        const ratio = contrastOf(hexOf.get(colour) as string, hexOf.get(ground) as string);
        expect(ratio, `${colour} on ${ground}`).toBeGreaterThanOrEqual(4.5);
      }
    }
    expect(contrastOf(PALETTE.onAccent, PALETTE.accent), 'the text over the accent').toBeGreaterThanOrEqual(4.5);
    expect(contrastOf(PALETTE.onAccent, PALETTE.ink), 'the text over the accent on hover').toBeGreaterThanOrEqual(4.5);
  });

  it('is made of real buttons and links, shows focus, hides the drawn chain and says it in text', () => {
    const html = page();
    expect(html).not.toMatch(/\sonclick=|role="button"/);
    expect([...html.matchAll(/<button\b[^>]*>/g)].every((m) => /type="button"/.test(m[0]) && /aria-label=/.test(m[0]))).toBe(true);
    expect(sourceOf('src/styles/home.css')).toMatch(/:focus-visible\s*\{[^}]*outline:/);
    const chain = /<div class="chain-box" aria-hidden="true">/.exec(html);
    expect(chain, 'the drawn chain is hidden from assistive technology').not.toBeNull();
    const alternative = /<p class="sr-only">A record as a chain of signed blocks:([^<]*)<\/p>/.exec(html)?.[1] ?? '';
    for (const words of ['ADR-1 recorded', 'ADR-1 accepted', 'rule at a path', 'edit refused', 'checkpoint signed']) {
      expect(alternative, `the text alternative says ${words}`).toContain(words);
    }
    expect(html).toMatch(/<html lang="en">/);
    expect((html.match(/<h1\b/g) ?? []).length, 'one h1').toBe(1);
  });

  it('works at phone width: the chain, the code and the console scroll inside their own box, and nothing sets a width the page cannot hold', () => {
    const css = sourceOf('src/styles/home.css');
    for (const selector of ['.home .chain-box', '.home .console, .home .code']) {
      const rule = css.slice(css.indexOf(`${selector} {`));
      expect(rule.slice(0, rule.indexOf('}')), `${selector} scrolls on its own`).toMatch(/overflow-x:\s*auto/);
    }
    expect(css).toMatch(/\.home \.chain-row\s*\{[^}]*min-width:\s*880px/);
    // No fixed width wider than a phone outside the chain's own row.
    for (const m of css.matchAll(/([^{}]+)\{[^{}]*\b(?<![-])(?:width|min-width):\s*(\d+)px/g)) {
      if (/chain-row/.test(m[1] ?? '')) continue;
      expect(Number(m[2]), `${(m[1] ?? '').trim()} is wider than a phone`).toBeLessThanOrEqual(360);
    }
  });

  it('has no em dash, anywhere on the page or in its sources', () => {
    const dash = String.fromCharCode(0x2014);
    for (const [name, text] of [
      ['the built page', page()],
      ['index.astro', sourceOf('src/pages/index.astro')],
      ['home.css', sourceOf('src/styles/home.css')],
      ['site.css', sourceOf('src/styles/site.css')],
      ['copy.md', sourceOf('copy.md')],
    ] as const) {
      expect(text.includes(dash), `${name} has an em dash`).toBe(false);
    }
  });

  it('is dark and says its own words: the headline and the answer of ADR-199', () => {
    expect(textOf(main())).toContain('Who decided this, and why? mnema keeps the answer.');
    expect(page()).toContain('<meta name="color-scheme" content="dark">');
  });
});

when('the docs take the palette, and the way back to the home page', () => {
  // Starlight writes some of its styles into the page and some into files of `_astro/`: the styles are read together.
  const styles = (): string =>
    readdirSync(join(DIST, '_astro'))
      .filter((f) => f.endsWith('.css'))
      .map((f) => readText(join(DIST, '_astro', f)))
      .join('\n');
  const docs = (): string => readText(join(DIST, 'docs/install/index.html'));

  it('are set in both themes in the palette, and dark is the theme of a reader who has not chosen', () => {
    const html = docs();
    const css = (html + styles()).replace(/\s+/g, '');
    expect(css).toContain(`--sl-color-black:${PAGE.dark}`);
    expect(css).toContain(`--sl-color-white:${INK.dark}`);
    expect(css).toContain(`:root[data-theme=light]{--sl-color-accent`);
    expect(css).toContain(`--sl-color-accent:${PALETTE.accent}`);
    // The inline script that sets the theme before the page paints: the stored choice, or dark, and never the system's.
    expect(html).toMatch(/storedTheme\s*\|\|\s*'dark'/);
    const provider = /<script>\s*window\.StarlightThemeProvider[\s\S]*?<\/script>/.exec(html)?.[0] ?? '';
    expect(provider, 'the theme provider is on the page').not.toBe('');
    expect(provider, 'it does not ask the system').not.toMatch(/matchMedia|prefers-color-scheme/);
  });

  it('set the headings in the mono and the text in the sans, as the home page does', () => {
    const css = (docs() + styles()).replace(/\s+/g, '');
    const plain = css.replace(/"/g, "'");
    expect(plain).toContain(`--sl-font:'InstrumentSans'`);
    expect(plain).toContain(`--sl-font-mono:'JetBrainsMono'`);
  });

  it('list at /docs/ every page of the sidebar, in its groups, and no other', () => {
    const index = readText(join(DIST, 'docs/index.html'));
    const inside = (html: string): string => /<main\b[\s\S]*<\/main>/.exec(html)?.[0] ?? '';
    const listed = new Set([...inside(index).matchAll(/<li><a href="(\/[^"]+)"/g)].map((m) => m[1]));
    const sidebar = /<ul class="top-level[\s\S]*?<\/ul>\s*<\/starlight-menu-button|<nav class="sidebar[\s\S]*?<\/nav>/.exec(docs())?.[0] ?? '';
    const links = new Set([...sidebar.matchAll(/<a href="(\/(?:docs|record)\/[^"]*)"/g)].map((m) => m[1]));
    expect(links.size, 'the sidebar was read').toBeGreaterThan(20);
    expect([...listed].filter((l) => l?.startsWith('/docs/') || l?.startsWith('/record/')).sort()).toEqual([...links].sort());
    for (const link of listed) expect(existsSync(join(DIST, link ?? '', 'index.html')), `${link} is a page`).toBe(true);
  });
});
