// @reads-the-tree
/**
 * THE HOME PAGE SAYS ITS OWN WORDS AND NOBODY ELSE'S FACTS. The words of mnema.work/ are the page's; what is a fact of the
 * release it was built from is read from the checkout of its tag, and this holds the built page to the file each one
 * comes from, read here again by code of its own and not by the build's:
 *
 *   - THE HOSTS: from the table the README holds (the logos have their own case, `the-hosts-show-a-logo-only-where-...`);
 *   - THE CONTRIBUTORS: from the block of the README between its markers, each figure the product's file, byte for byte;
 *   - THE COMMANDS that install: from the README's Quick start and the page of the hosts;
 *   - THE VERDICT shown: clauses of what the binary prints on the record committed at this commit, the two lines of the
 *     same command after one character of it was changed, and the sentence of the refusal the session demo shows;
 *   - THE LINKS: each one to a page the site has, a section the page has, or a path git holds at the tag.
 *
 * AND HOLDS THE PAGE TO WHAT IT PROMISES, IN THE BRAND: every colour the page paints with is the brand's (the palette is
 * the one owner, and the brand's own file the owner of its colours); where only the colour says a state, what waits is
 * stone, what is in force the accent, and only a failure is red; the eye moves only where it is allowed (the bar, the
 * ring of hosts and the quick start), in a copy that a media query inside the picture swaps for the one at rest under
 * `prefers-reduced-motion`, and the script that moves the hero computes no frame and listens to no pointer where the
 * reader asked for less; no yellow on a contributor; no measurement, no level of a host; one h1 and one h2 for each section;
 * text at 4.5:1 on every ground it is set on, real buttons and links, no horizontal scroll at phone width, the em dash nowhere.
 * Docs: both themes carry the palette, dark is the default, the typefaces are the home page's, and every page says what it is
 * to a search engine, once.
 *
 * WHAT IT DOES NOT CHECK: how the page looks at any width (a reviewer opens it), or that a screen reader reads it well.
 */

import { execFileSync, spawnSync } from 'node:child_process';
import { runInNewContext } from 'node:vm';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { contributorsOf, hostsOf, installOf, verdictLinesOf } from '../build/the-home.mjs';
import { contrastOf } from '../build/the-pages.mjs';
import { FONTS, paletteCss, sitePalette, themeColours } from '../build/the-palette.mjs';
import { PRODUCT_URL } from '../build/the-site.mjs';
import { DIST, fromTheProduct, head, isARedirectPage, ROOT, readText, SITE, textOf } from './support/reading-the-site.js';

const BUILT = existsSync(join(DIST, 'index.html'));
const when = BUILT ? describe : describe.skip;

const BRAND: Record<string, string> = (await fromTheProduct('.github/the-brand/palette.mjs')).PALETTE;
const PALETTE = sitePalette(BRAND) as Record<string, string>;
const { PAGE, INK } = themeColours(PALETTE);

const readme = (): string => readText(join(ROOT, 'README.md'));

describe('the readings of the home page, over fixtures', () => {
  it('stops on a README with no host table', () => {
    expect(() => hostsOf('## Hosts\n\nnothing\n')).toThrow(/host table/);
    const row = '| <img> | **Alpha**<br><sub>x</sub> | **(d)** | y | [Plugin](z) |';
    expect(hostsOf(`## Hosts\n\n${row}\n`).hosts).toEqual([{ name: 'Alpha' }]);
  });

  it('stops when the contributors are not where the page reads them, and reads each cell as its link, its figure and its login', () => {
    expect(() => contributorsOf('## Contributors\n\nnothing\n')).toThrow(/Contributors section/);
    const section = [
      '## Contributors',
      '',
      '<p align="center">Thank you.</p>',
      '',
      '<!-- contributors:start -->',
      '<td align="center"><a href="https://github.com/ada"><img src="docs/assets/contributor-ada.svg" width="168" height="84" alt="@ada"><br><sub>ada</sub></a></td>',
      '<!-- contributors:end -->',
      '',
    ].join('\n');
    expect(contributorsOf(section)).toEqual({ title: 'Contributors', thanks: 'Thank you.', people: [{ login: 'ada', profile: 'https://github.com/ada', image: 'docs/assets/contributor-ada.svg' }] });
    expect(() => contributorsOf(section, tmpdir())).toThrow(/does not hold it/);
  });

  it('stops when the install commands are not where the page reads them, and when the verdict lost the clauses it quotes', () => {
    expect(() => installOf({ readme: '## Quick start\n\n```sh\nls\n```\n', hostsPage: '' })).toThrow(/install commands/);
    expect(() => verdictLinesOf('private: ok')).toThrow(/clauses/);
    expect(verdictLinesOf('public: local integrity verified (T1/T2/T4); x; all events are signature-covered\n')).toEqual([
      'public: local integrity verified (T1/T2/T4)',
      'all events are signature-covered',
    ]);
  });

  it('still finds the two clauses it quotes when an indented census line follows the verdict', () => {
    const census = '  census [unnamed-tail] public 9a9b7666: the tail names no record\n';
    expect(
      verdictLinesOf(`public: local integrity verified (T1/T2/T4); x; all events are signature-covered\n${census}`),
    ).toEqual(['public: local integrity verified (T1/T2/T4)', 'all events are signature-covered']);
  });
});

/** The rules of a stylesheet, flat: the selector (a comma list kept whole) and the block's declarations, without comments. */
const rulesOf = (css: string): { selector: string; body: string }[] =>
  [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}@]+)\{([^{}]*)\}/g)].map((m) => ({ selector: (m[1] ?? '').trim(), body: m[2] ?? '' }));

/** The page's own script, as the build bundled it: the one file of `_astro/` made from `src/pages/index.astro`. */
const scriptOfTheHome = (): string => {
  const file = readdirSync(join(DIST, '_astro')).find((f) => /^index\.astro_astro_type_script_index_0_lang\..*\.js$/.test(f));
  expect(file, 'the script of the home page is a file of the build').toBeDefined();
  return readText(join(DIST, '_astro', file as string));
};

/** The page's script run in a vm that has the little of a browser it asks for, and records what it listened to and how many frames it asked for. */
function runTheScript(reduced: boolean): { listened: string[]; frames: number } {
  const listened: string[] = [];
  let frames = 0;
  const element = (name: string): any => ({
    name,
    dataset: {},
    addEventListener: (type: string) => listened.push(`${name}:${type}`),
    setAttribute: () => undefined,
    toggleAttribute: () => undefined,
    querySelector: () => element('child'),
    querySelectorAll: () => [element('child')],
    getBoundingClientRect: () => ({ width: 1440, height: 900, left: 0, top: 0 }),
  });
  const field = element('field');
  const document = {
    hidden: false,
    getElementById: (id: string) => (id === 'field' ? field : null),
    querySelector: () => element('button'),
    querySelectorAll: () => [],
    addEventListener: (type: string) => listened.push(`document:${type}`),
  };
  runInNewContext(scriptOfTheHome(), {
    document,
    matchMedia: () => ({ matches: reduced, addEventListener: (type: string) => listened.push(`media:${type}`) }),
    addEventListener: (type: string) => listened.push(`window:${type}`),
    IntersectionObserver: class {
      observe(): void {}
    },
    requestAnimationFrame: () => {
      frames += 1;
      return frames;
    },
    performance: { now: () => 0 },
    navigator: {},
    Math,
    Object,
    String,
  });
  return { listened, frames };
}

when('the built home page', () => {
  const page = (): string => readText(join(DIST, 'index.html'));
  const main = (): string => /<main\b[^>]*>([\s\S]*)<\/main>/.exec(page())?.[1] ?? '';
  const sourceOf = (path: string): string => readText(join(SITE, path));
  const homeCss = (): string => sourceOf('src/styles/home.css').replace(/\/\*[\s\S]*?\*\//g, '');
  const builtCss = (): string =>
    readdirSync(join(DIST, '_astro'))
      .filter((f) => f.endsWith('.css'))
      .map((f) => readText(join(DIST, '_astro', f)))
      .join('\n');

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
    expect(/<a class="pill hide-s" href="#start"><b>\$<\/b> ([^<]*)<\/a>/.exec(page())?.[1], 'the line of the bar').toBe(first[0]);

    const code = /<div class="code mono"[^>]*>((?:<div[^>]*>[\s\S]*?<\/div>)+)<\/div>/.exec(main())?.[1] ?? '';
    const shown = [...code.matchAll(/<div[^>]*>([\s\S]*?)<\/div>/g)].map((m) => textOf((m[1] ?? '').replace(/<button[\s\S]*?<\/button>/, '')));
    const init = first.find((l) => l === 'mnema init');
    const change = first.find((l) => l.startsWith('cd '));
    expect(shown).toEqual([
      `$ ${first[0]}`,
      `$ ${change} && ${init}`,
      '# hand the record to your agent, in Claude Code:',
      ...claude.map((c) => `$ ${c}`),
      `# in VS Code: ${extension}`,
    ]);
    expect(claude).toHaveLength(2);
    expect(claude[0]).toMatch(/^claude plugin marketplace add [\w.-]+\/[\w.-]+$/);
    expect(claude[1]).toBe('claude plugin install mnema@mnema');
  });

  it('copies in the click, with the clipboard API and a fallback that selects the text', () => {
    const script = scriptOfTheHome();
    expect(script).toContain('navigator.clipboard');
    expect(script).toContain('writeText');
    expect(script, 'the fallback selects the text').toMatch(/selectNodeContents/);
    expect(script).toMatch(/addEventListener\(`?["']?click/);
  });

  /** The tree of the record committed at this commit, in a directory of its own, and the binary run over it. */
  const verifyOver = (change?: (tail: string) => void): { status: number | null; said: string; clauses: string[] } => {
    const dir = mkdtempSync(join(tmpdir(), 'the-home-verify-'));
    try {
      execFileSync('git', ['archive', '--format=tar', '-o', join(dir, 'record.tar'), 'HEAD', '.mnema'], { cwd: ROOT });
      const tree = join(dir, 'tree');
      mkdirSync(tree);
      execFileSync('tar', ['-xf', join(dir, 'record.tar'), '-C', tree]);
      execFileSync('git', ['init', '-q', tree]);
      if (change) {
        const tails = join(tree, '.mnema', 'tails');
        change(readdirSync(tails).map((d) => join(tails, d, '000001.jsonl')).find(existsSync) as string);
      }
      const home = mkdtempSync(join(tmpdir(), 'the-home-verify-home-'));
      const ran = spawnSync(process.execPath, [join(ROOT, 'packages/code/dist/cli.js'), 'verify'], { cwd: tree, env: { HOME: home, PATH: process.env.PATH ?? '' }, encoding: 'utf8' });
      rmSync(home, { recursive: true, force: true });
      return { status: ran.status, said: `${ran.stdout}\n${ran.stderr}`, clauses: ran.stdout.trim().split('; ') };
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  };

  it('shows clauses of the verdict the binary prints on the record of this commit, and the command beside them', () => {
    const shown = /<pre class="vr"[^>]*><span class="p">\$<\/span> ([^<\n]*)\n<span class="verified">([^<]*)<\/span>\n([^<]*)<\/pre>/.exec(main());
    expect(shown?.[1]).toBe('mnema verify');
    const ran = verifyOver();
    expect(ran.status, ran.said).toBe(0);
    expect(ran.clauses, 'the first line is a clause of the real verdict').toContain(shown?.[2]);
    expect(ran.clauses, 'the second line is a clause of the real verdict').toContain(shown?.[3]);
    expect(shown?.[2]).toMatch(/^public: local integrity verified/);
    expect(page()).toContain(`/commit/${head()}`);
  }, 60_000);

  it('labels the two outputs an illustration, and holds the failing one to what the verifier prints when one character of a title is changed', () => {
    const outputs = /<pre class="vr bad"[^>]*><span class="p">\$<\/span> [^<\n]*\n<span class="failed">([^<]*)<\/span>\n([^<]*)<\/pre>/.exec(main());
    expect(outputs, 'the failing output is in the page').not.toBeNull();
    expect(textOf(main())).toContain('An illustration of two real outputs, captured from the verifier');
    expect(main()).toMatch(/<a href="\/record\/">Run it on this site's own record<\/a>/);
    const ran = verifyOver((tail) => {
      const text = readFileSync(tail, 'utf8');
      const at = text.indexOf('"title":"') + '"title":"'.length;
      writeFileSync(tail, text.slice(0, at) + (text[at] === 'Z' ? 'Y' : 'Z') + text.slice(at + 1));
    });
    expect(ran.status, 'a changed record does not verify').not.toBe(0);
    expect(ran.said, 'the first failed line is a stretch of what the binary printed').toContain(outputs?.[1]);
    expect(ran.said, 'the second failed line is a stretch of what the binary printed').toContain(outputs?.[2]);
    expect(outputs?.[1]).toMatch(/^public: local integrity FAILED/);
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
    for (const anchor of ['#how', '#hosts', '#start', '#top']) {
      expect(hrefs, anchor).toContain(anchor);
      expect(ids.has(anchor.slice(1)), `${anchor} is an id of the page`).toBe(true);
    }
    for (const href of hrefs.filter((h) => h.startsWith('#'))) expect(ids.has(href.slice(1)), href).toBe(true);
  });

  it('shows the refusal sentence the binary of the tag writes, taken from it and not typed', async () => {
    const { ourWordsInRefusing } = await fromTheProduct('packages/code/dist/edit-refuses-a-write.js');
    const rule = { id: 'x', name: 'x', address: 'src/billing', travels: true };
    const sentence: string = ourWordsInRefusing({ path: 'src/billing/invoice.ts', relative: 'src/billing/invoice.ts', rules: [rule] })[0];
    expect(sentence).toMatch(/^A rule of this project’s record refuses a write at src\/billing\/invoice\.ts while it stands\.$/);
    const refusal = /<div class="cr"><b>Refused by mnema<\/b><span>([^<]*)<\/span>/.exec(page())?.[1];
    expect(refusal, 'the demo refuses with the binary’s sentence').toBe(sentence);
    for (const file of readdirSync(join(SITE, 'src/components/home'))) {
      expect(sourceOf(`src/components/home/${file}`), `${file} types the refusal`).not.toMatch(/refuses a write/);
    }
  });

  it('says its own words in the brand: the headline and the sentence under it, the four steps, the four sections, and no measurement', () => {
    const text = textOf(main());
    expect(text).toContain('The decision record for AI coding agents. mnema keeps the why behind your agents’ work, signed, in your repository, and hands it to every next session.');
    expect(page()).toContain('<meta name="color-scheme" content="dark">');
    expect(page()).toContain('<title>mnema: the decision record for AI coding agents</title>');
    for (const words of ['A call is settled', 'Recorded, signed', 'Kept in the repo', 'Handed over', 'Tamper-evident, not tamper-proof.', 'One record, every host.', 'Any host with an MCP client, and more where its hooks allow.']) {
      expect(text, words).toContain(words);
    }
    expect(page(), 'no block of measurements').not.toMatch(/id="measured"|Measured, not promised/);
    expect(page().match(/href="#measured"/), 'no link to it').toBeNull();
  });

  it('has one h1 and one h2 for each section, in the order of the page, and no heading that skips a level', () => {
    const html = page();
    expect((html.match(/<h1\b/g) ?? []).length, 'one h1').toBe(1);
    expect(textOf(/<h1\b[^>]*>([\s\S]*?)<\/h1>/.exec(html)?.[1] ?? '')).toBe('The decision record for AI coding agents.');
    const h2 = [...main().matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/g)].map((m) => textOf(m[1] ?? ''));
    expect(h2.length, 'a heading for each section').toBe(10);
    const expected = ['How it goes', 'Record the why', 'Every session starts with it', 'Rules meet the edit', 'Anyone can check it', 'A rule, held at the edit', 'One record, every host.', 'Tamper-evident, not tamper-proof.', 'Start a record in a minute.', 'Contributors'];
    expected.forEach((words, i) => expect(h2[i], `section ${i + 1}`).toContain(words));
    const levels = [...html.matchAll(/<h([1-6])\b/g)].map((m) => Number(m[1]));
    levels.forEach((level, i) => expect(level - (levels[i - 1] ?? 0), `heading ${i + 1}`).toBeLessThanOrEqual(1));
  });

  it('paints with the brand: each colour of the brand is the product’s value in the built palette, and no colour of an older direction is anywhere', () => {
    const built = builtCss().replace(/\s+/g, '');
    for (const [name, value] of Object.entries(PALETTE)) {
      const kebab = name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
      expect(built, `--${kebab}`).toContain(`--${kebab}:${value}`);
    }
    for (const name of ['charcoal', 'bone', 'paper', 'stone', 'darkStone', 'sulphur', 'lineDark', 'lineLight', 'dimDark', 'dimLight']) {
      expect(PALETTE[name], `${name} is the brand's`).toBe(BRAND[name]);
    }
    // Every grey of the site's own is warm like the brand's: its channels within 17 units of each other.
    for (const name of ['surface', 'rule', 'bubble', 'refusalGround']) {
      const channels = [1, 3, 5].map((i) => Number.parseInt((PALETTE[name] as string).slice(i, i + 2), 16));
      expect(Math.max(...channels) - Math.min(...channels), `${name} is a warm grey`).toBeLessThanOrEqual(17);
    }
    const older = ['#c4a0f5', '#997dbf', '#5f517b', '#7fe0c4', '#f2c46b'];
    const swept = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? swept(join(dir, e.name)) : /\.(?:css|html|svg)$/.test(e.name) ? [join(dir, e.name)] : []));
    // The page of the record is written by the binary, and a decision it shows says in words the colour the product once had.
    for (const file of swept(DIST).filter((f) => !f.endsWith(join('record', 'index.html')))) {
      const text = readText(file).toLowerCase();
      for (const hex of older) expect(text.includes(hex), `${file.slice(DIST.length + 1)} paints ${hex}`).toBe(false);
    }
  });

  it('writes no colour of its own: every colour of the page is a variable of the palette, and each variable is defined', () => {
    const css = sourceOf('src/styles/home.css');
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/);
    const defined = new Set([...paletteCss(PALETTE).matchAll(/--([a-z-]+):/g)].map((m) => m[1]));
    // `--w` and `--h` are the layout's own (the proportions of the ring of hosts), not colours.
    const used = [...css.matchAll(/var\(--([a-z-]+)\)/g)].map((m) => m[1] as string).filter((name) => name !== 'w' && name !== 'h');
    expect(used.length).toBeGreaterThan(40);
    for (const name of new Set(used)) expect(defined.has(name), `--${name} is not in the palette`).toBe(true);
  });

  it('sets every text colour at 4.5:1 on every ground it is set on', () => {
    const css = homeCss();
    const hex = (name: string): string => PALETTE[name.replace(/-([a-z])/g, (_m, c: string) => c.toUpperCase())] as string;
    const text = new Set([...css.matchAll(/(?<![-\w])color:\s*var\(--([a-z-]+)\)/g)].map((m) => m[1] as string));
    const meets: Record<string, string[]> = {
      ink: ['ground', 'surface', 'bubble', 'refusal-ground'],
      dim: ['ground', 'surface'],
      accent: ['ground', 'surface', 'refusal-ground'],
      pending: ['ground', 'surface'],
      red: ['ground', 'surface'],
      'on-accent': ['ink'],
    };
    expect(text.size).toBeGreaterThan(4);
    for (const colour of text) {
      expect(meets[colour], `${colour} is a text colour the page sets, and this case holds it on its grounds`).toBeDefined();
      for (const ground of meets[colour] ?? []) expect(contrastOf(hex(colour), hex(ground)), `${colour} on ${ground}`).toBeGreaterThanOrEqual(4.5);
    }
    // Every ground the page paints with a variable is one of those, or the accent under the text over it.
    const grounds = new Set([...css.matchAll(/background(?:-color)?:\s*var\(--([a-z-]+)\)/g)].map((m) => m[1] as string));
    for (const ground of grounds) expect(['ground', 'surface', 'bubble', 'refusal-ground', 'ink', 'accent'].includes(ground), `${ground} is a ground the page paints`).toBe(true);
    expect(contrastOf(PALETTE.onAccent as string, PALETTE.accent as string), 'the text over the accent').toBeGreaterThanOrEqual(4.5);
  });

  it('colours a state as the brand does: what waits is stone and what is in force is the accent where only the colour says it, and only a failure is red', () => {
    const rules = rulesOf(homeCss());
    const paintedWith = (variable: string) => rules.filter((r) => new RegExp(`var\\(--${variable}\\)`).test(r.body));
    // The chip of what waits: stone. The one in force: the accent.
    const chip = rules.find((r) => r.selector === '.home .st');
    expect(chip?.body, 'the chip of what waits is stone').toMatch(/border:[^;]*var\(--pending\)/);
    expect(chip?.body, 'the chip of what waits is stone').toMatch(/(?<![-\w])color:\s*var\(--pending\)/);
    expect(chip?.body).not.toMatch(/var\(--accent\)/);
    expect(rules.find((r) => r.selector === '.home .st.on')?.body, 'the chip in force is the accent').toMatch(/var\(--accent\)/);
    expect(PALETTE.pending, 'what waits is the brand’s stone').toBe(BRAND.stone);
    // Red is only a failure's: the rules that paint with it name the failure.
    for (const rule of [...paintedWith('red'), ...paintedWith('red-line')]) expect(rule.selector, 'red paints a failure').toMatch(/failed|\.bad/);
    expect(paintedWith('red').length, 'the failure is red').toBeGreaterThan(0);
    // The ring of the step still to come is the accent, because the form (a ring, a point, a ticked point) says the state there.
    expect(rules.find((r) => r.selector === '.home .sign.hollow circle')?.body).toMatch(/fill:\s*var\(--ground\)/);
  });

  it('is made of real buttons and links, shows focus, and describes each picture in text', () => {
    const html = page();
    expect(html).not.toMatch(/\sonclick=|role="button"/);
    // A button's name is its visible text, or an aria-label that holds that text (WCAG 2.5.3, label in name).
    for (const m of html.matchAll(/<button\b([^>]*)>([^<]*)<\/button>/g)) {
      expect(m[1], 'a real button').toMatch(/type="button"/);
      const label = /aria-label="([^"]*)"/.exec(m[1] ?? '')?.[1];
      if (label !== undefined) expect(label.toLowerCase(), `the name of "${m[2]}" holds its text`).toContain((m[2] ?? '').toLowerCase());
    }
    expect(/<button[^>]*class="motion"[^>]*>([^<]*)<\/button>/.exec(html)?.[0], 'the pause button is named by its text alone').toMatch(/^<button type="button" class="motion">Pause motion<\/button>$/);
    const toggled = scriptOfTheHome();
    expect(toggled, 'the text of the pause button changes in both states').toContain('Play motion');
    expect(toggled, 'and the script gives it no other name').not.toMatch(/aria-label/);
    expect(html, 'a button whose name changes is not also announced as pressed').not.toMatch(/aria-pressed/);
    expect(toggled).not.toMatch(/aria-pressed/);
    expect([...html.matchAll(/<button\b/g)].length, 'the copy button and the one that pauses the motion').toBeGreaterThanOrEqual(2);
    expect(sourceOf('src/styles/home.css')).toMatch(/:focus-visible\s*\{[^}]*outline:/);
    expect(html, 'no theme button: the page is dark').not.toMatch(/class="tgl"|data-theme/);
    const described = (id: string): string => new RegExp(`<div class="[^"]*\\b${id}\\b[^"]*" role="(?:img|group)" aria-label="([^"]*)"`).exec(html)?.[1] ?? '';
    for (const [root, words] of [
      ['plate', ['Keep money as integer cents', 'proposed', 'accepted']],
      ['sessions', ['Claude Code', 'Codex', 'VS Code', 'In force']],
      ['tree', ['src/billing', 'refused', 'shell']],
      ['chat', ['illustration', 'refuses the write', 'floats']],
    ] as const) {
      const label = described(root);
      expect(label, `${root} is described`).not.toBe('');
      for (const word of words) expect(label.toLowerCase(), `the label of ${root} says "${word}"`).toContain(word.toLowerCase());
    }
    // The pictures of the brand are hidden from assistive technology: the words around them say what they show.
    for (const svg of html.matchAll(/<svg\b[^>]*>/g)) expect(svg[0], 'a picture of the page is hidden from assistive technology').toMatch(/aria-hidden="true"/);
    expect(html).toMatch(/<html lang="en">/);
  });

  it('works at phone width: wide things scroll in their own box, the columns fold, and nothing sets a width the page cannot hold', () => {
    const css = sourceOf('src/styles/home.css');
    for (const selector of ['.home .vr', '.home .code', '.home .tree']) {
      const own = rulesOf(css).filter((r) => r.selector.split(',').map((s) => s.trim()).includes(selector));
      expect(own.some((r) => /overflow-x:\s*auto/.test(r.body)), `${selector} scrolls on its own`).toBe(true);
    }
    const phone = /@media \(max-width:\s*860px\)\s*\{([\s\S]*?)\n\}/.exec(css)?.[1] ?? '';
    expect(phone, 'the steps fold to one column').toMatch(/\.home \.steps\s*\{[^}]*grid-template-columns:\s*1fr\s*[;}]/);
    expect(phone, 'the ring of hosts becomes a list').toMatch(/\.home \.host\s*\{[^}]*position:\s*static/);
    const tablet = /@media \(max-width:\s*960px\)\s*\{([\s\S]*?)\n\}/.exec(css)?.[1] ?? '';
    expect(tablet, 'a section is one column below 960px').toMatch(/\.home \.two \.g,[\s\S]*?grid-template-columns:\s*1fr\s*[;}]/);
    expect(tablet, 'the footer is two columns below 960px').toMatch(/\.home \.foot \.cols\s*\{[^}]*grid-template-columns:\s*1fr 1fr/);
    for (const m of css.matchAll(/([^{}]+)\{[^{}]*\b(?<![-])(?:width|min-width):\s*(\d+)px/g)) {
      expect(Number(m[2]), `${(m[1] ?? '').trim()} is wider than a phone`).toBeLessThanOrEqual(360);
    }
    expect(css).toMatch(/\.home \.two \.g > \*\s*\{[^}]*min-width:\s*0/);
  });

  it('has no em dash, anywhere on the page or in its sources', () => {
    const dash = String.fromCharCode(0x2014);
    for (const [name, text] of [
      ['the built page', page()],
      ['index.astro', sourceOf('src/pages/index.astro')],
      ...readdirSync(join(SITE, 'src/components/home')).map((f) => [`components/home/${f}`, sourceOf(`src/components/home/${f}`)] as const),
      ['SiteTitle.astro', sourceOf('src/components/SiteTitle.astro')],
      ['icons.mjs', sourceOf('src/icons.mjs')],
      ['hosts/SOURCES.md', sourceOf('hosts/SOURCES.md')],
      ['home.css', sourceOf('src/styles/home.css')],
      ['site.css', sourceOf('src/styles/site.css')],
      ['copy.md', sourceOf('copy.md')],
      ['the-mark.mjs', sourceOf('build/the-mark.mjs')],
      ['the-hero-field.mjs', sourceOf('build/the-hero-field.mjs')],
    ] as const) {
      expect(text.includes(dash), `${name} has an em dash`).toBe(false);
    }
  });
});

when('the eye moves only where it is allowed, and stops where the reader asks for less', () => {
  const html = (path: string): string => readText(join(DIST, path));
  const svgsOf = (text: string): string[] => [...text.matchAll(/<svg\b[\s\S]*?<\/svg>/g)].map((m) => m[0]);
  const movingSvgs = (text: string): string[] => svgsOf(text).filter((svg) => /<animate\b|<set\b|<animateTransform\b/.test(svg));

  it('blinks on the home page in three places and no other: the bar, the ring of hosts and the quick start', () => {
    const moving = movingSvgs(html('index.html'));
    expect(moving.map((svg) => /<clipPath id="([^"]+)"/.exec(svg)?.[1])).toEqual(['eye-bar', 'eye-ring', 'eye-start']);
  });

  it('holds two copies in one clip, the one that moves and the one at rest, and a media query inside the picture swaps them under reduced motion', () => {
    for (const svg of movingSvgs(html('index.html'))) {
      const id = /<clipPath id="([^"]+)"/.exec(svg)?.[1] ?? '';
      expect(svg, `${id}: the swap is inside the picture`).toContain(`@media (prefers-reduced-motion:reduce){.${id}-moving{display:none}.${id}-still{display:inline}}`);
      const [before, after] = svg.split(`<g class="${id}-still">`);
      expect(after, `${id}: the copy at rest is there`).toBeDefined();
      expect(before, `${id}: the moving copy moves`).toContain('<animate');
      expect(before, `${id}: the moving copy is the one the swap hides`).toContain(`<g class="${id}-moving">`);
      expect(after, `${id}: the copy at rest has no <animate>`).not.toMatch(/<animate|<set\b|<animateTransform/);
    }
  });

  it('moves nowhere else: the foot, the steps, the hero at rest, the ring’s lines and every page of the docs hold their pictures still', () => {
    const home = html('index.html');
    const still = svgsOf(home).filter((svg) => !/<animate\b/.test(svg));
    expect(still.length, 'the other pictures of the page').toBeGreaterThan(5);
    const foot = /<footer\b[\s\S]*<\/footer>/.exec(home)?.[0] ?? '';
    expect(foot).not.toMatch(/<animate/);
    expect(/<svg[^>]*id="field"[\s\S]*?<\/svg>/.exec(home)?.[0], 'the hero is served at rest').not.toMatch(/<animate|<set\b/);
    const pages = readdirSync(join(DIST, 'docs'), { recursive: true, encoding: 'utf8' }).filter((f) => f.endsWith('index.html')).map((f) => `docs/${f}`);
    expect(pages.length).toBeGreaterThan(20);
    for (const page of [...pages, '404.html']) expect(html(page), `${page} moves`).not.toMatch(/<animate\b|<set\b|<animateTransform\b/);
    for (const file of ['favicon.svg']) expect(html(file), `${file} moves`).not.toMatch(/<animate|<set\b/);
    // The page's own style moves nothing: the motion of the home page is the eye's and the script's.
    const css = readText(join(SITE, 'src/styles/home.css'));
    expect(css, 'no CSS animation or transition on the home page').not.toMatch(/(?<![-\w])(?:animation|transition)(?:-[a-z-]+)?\s*:|@keyframes/);
    expect(css, 'no smooth scrolling').not.toMatch(/scroll-behavior\s*:\s*smooth/);
  });

  it('computes no frame and listens to no pointer where the reader asked for less, and does both where they did not', () => {
    const asked = runTheScript(true);
    expect(asked.frames, 'a frame was asked for under reduced motion').toBe(0);
    expect(asked.listened.filter((l) => /pointer/.test(l)), 'the pointer is listened to under reduced motion').toEqual([]);
    const allowed = runTheScript(false);
    expect(allowed.frames, 'the script moves the hero where motion is allowed').toBeGreaterThan(0);
    expect(allowed.listened).toContain('field:pointermove');
  });

  it('asks the preference before it listens: the guard stands in the function that attaches the pointer', () => {
    const source = readText(join(SITE, 'src/pages/index.astro'));
    const listen = /const listen = \(\) => \{([\s\S]*?)\n        \};/.exec(source)?.[1] ?? '';
    expect(listen, 'the function that attaches the pointer is found').toContain("addEventListener('pointermove'");
    expect(listen.indexOf('reduced.matches'), 'the preference is asked first').toBeGreaterThanOrEqual(0);
    expect(listen.indexOf('reduced.matches')).toBeLessThan(listen.indexOf("addEventListener('pointermove'"));
    expect(source.indexOf("matchMedia('(prefers-reduced-motion: reduce)')")).toBeLessThan(source.indexOf("addEventListener('pointermove'"));
  });
});

when('the contributors of the page', () => {
  const page = (): string => readText(join(DIST, 'index.html'));
  const section = (): string => /<section id="contributors"[\s\S]*?<\/section>/.exec(page())?.[0] ?? '';

  it('are each login of the README’s block, with the figure of the product byte for byte, linking to the profile', () => {
    const wanted = contributorsOf(readText(join(ROOT, 'README.md')), ROOT);
    // Read again here, by this test's own pattern: the cells of the README's block, in its order.
    const block = /<!-- contributors:start -->([\s\S]*?)<!-- contributors:end -->/.exec(readText(join(ROOT, 'README.md')))?.[1] ?? '';
    const logins = [...block.matchAll(/<sub>([^<]+)<\/sub>/g)].map((m) => m[1]);
    expect(wanted.people.map((p) => p.login), 'the build reads every cell of the block').toEqual(logins);
    expect(wanted.people.length, 'the README thanks people').toBeGreaterThan(3);
    const cells = [...section().matchAll(/<li><a href="([^"]+)"><img src="([^"]+)" alt="([^"]*)" width="168" height="84"[^>]*><span class="login">([^<]*)<\/span><\/a><\/li>/g)];
    expect(cells.map((c) => c[4]), 'the logins of the README, in its order').toEqual(wanted.people.map((p) => p.login));
    for (const [i, person] of wanted.people.entries()) {
      expect(cells[i]?.[1], `${person.login} links to the profile`).toBe(`https://github.com/${person.login}`);
      expect(cells[i]?.[3]).toBe(`@${person.login}`);
      const served = join(DIST, (cells[i]?.[2] ?? '').slice(1));
      expect(readFileSync(served).equals(readFileSync(join(ROOT, person.image))), `${person.login}'s figure is the product's`).toBe(true);
    }
    expect(textOf(section())).toContain(wanted.title);
    expect(textOf(section())).toContain(wanted.thanks);
  });

  it('carry no yellow: a person is not a state', () => {
    const rules = rulesOf(readText(join(SITE, 'src/styles/home.css')));
    const mine = rules.filter((r) => /\.people|\.cells|\.login|\.thanks/.test(r.selector));
    expect(mine.length, 'the rules of the strip are found').toBeGreaterThan(4);
    for (const rule of mine) expect(rule.body, `${rule.selector} paints with the accent`).not.toMatch(/var\(--(?:accent|sulphur|on-accent)\)/);
    expect(section(), 'no sign of a decision in the strip').not.toMatch(/class="dot"|class="st on"|class="sign/);
    for (const m of section().matchAll(/<img src="([^"]+)"/g)) expect(readText(join(DIST, (m[1] ?? '').slice(1))).toLowerCase(), `${m[1]} paints the sulphur`).not.toContain(BRAND.sulphur);
  });
});

when('the docs take the palette, the typefaces and the way back to the home page', () => {
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
    expect(css).toContain(`--sl-color-accent:${PALETTE.sulphur}`);
    expect(css).toContain(`:root[data-theme=light]{--sl-color-accent:${PALETTE.charcoal}`);
    expect(html).toMatch(/storedTheme\s*\|\|\s*'dark'/);
    const provider = /<script>\s*window\.StarlightThemeProvider[\s\S]*?<\/script>/.exec(html)?.[0] ?? '';
    expect(provider, 'the theme provider is on the page').not.toBe('');
    expect(provider, 'it does not ask the system').not.toMatch(/matchMedia|prefers-color-scheme/);
  });

  it('open dark on a first visit whatever the system says, and keep a choice the reader made', () => {
    const html = docs();
    const provider = /<script>\s*(window\.StarlightThemeProvider[\s\S]*?)<\/script>/.exec(html)?.[1] ?? '';
    expect(provider, 'the theme provider is on the page').not.toBe('');
    const themeAfter = (stored: string | null): string => {
      const doc = { documentElement: { dataset: {} as Record<string, string> }, querySelectorAll: () => [], querySelector: () => null };
      runInNewContext(provider, { window: { matchMedia: () => ({ matches: true }) }, localStorage: { getItem: () => stored }, document: doc });
      return doc.documentElement.dataset.theme ?? '';
    };
    expect(themeAfter(null), 'nothing stored, system light').toBe('dark');
    expect(themeAfter(''), 'auto, system light').toBe('dark');
    expect(themeAfter('light'), 'the reader chose light').toBe('light');
    expect(themeAfter('dark'), 'the reader chose dark').toBe('dark');
    const scripts = [html, ...readdirSync(join(DIST, '_astro')).filter((f) => f.endsWith('.js')).map((f) => readText(join(DIST, '_astro', f)))].join('\n');
    expect(scripts, 'a script reads the system colour scheme').not.toMatch(/matchMedia\(\s*[`'"]\(prefers-color-scheme/);
  });

  it('serve two typefaces, Archivo and IBM Plex Mono, from the build, and the docs set their text and their code in the home page’s', () => {
    const css = (styles() + readText(join(DIST, 'index.html')) + docs()).replace(/\s+/g, ' ');
    const families = new Set([...css.matchAll(/@font-face\s*\{[^}]*font-family:\s*["']?([^;"'}]+)["']?/g)].map((m) => (m[1] ?? '').trim()));
    expect([...families].sort(), 'every @font-face of the site').toEqual([FONTS.mono, FONTS.sans].sort());
    for (const m of css.matchAll(/@font-face\s*\{[^}]*\}/g)) for (const url of m[0].matchAll(/url\(["']?([^)"']+)/g)) expect(url[1], 'a file of the build').toMatch(/^\/_astro\//);
    const plain = (docs() + styles()).replace(/\s+/g, '').replace(/"/g, "'");
    expect(plain).toContain(`--sl-font:'${FONTS.sans.replace(/\s+/g, '')}'`);
    expect(plain).toContain(`--sl-font-mono:'${FONTS.mono.replace(/\s+/g, '')}'`);
    expect(readText(join(SITE, 'src/styles/home.css'))).toContain(`'${FONTS.sans}'`);
    expect(readText(join(SITE, 'src/styles/home.css'))).toContain(`'${FONTS.mono}'`);
    expect(plain, 'the older faces are gone').not.toMatch(/JetBrains|InstrumentSans/i);
  });

  it('say what each page is to a search engine, once: a TechArticle whose headline is the title, and the trail to /docs/', () => {
    const pages = readdirSync(join(DIST, 'docs'), { recursive: true, encoding: 'utf8' }).filter((f) => f.endsWith('index.html')).map((f) => `docs/${f}`).filter((f) => !isARedirectPage(join(DIST, f)));
    expect(pages.length).toBeGreaterThan(20);
    for (const page of pages.filter((p) => p !== 'docs/index.html')) {
      const html = readText(join(DIST, page));
      const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1] ?? '{}'));
      expect(blocks.length, `${page}: one block of structured data`).toBe(1);
      const [article, trail] = blocks[0]['@graph'];
      const title = textOf(/<h1\b[^>]*>([\s\S]*?)<\/h1>/.exec(html)?.[1] ?? '');
      expect(article['@type']).toBe('TechArticle');
      expect(article.headline, `${page}: the headline is the title`).toBe(title);
      expect(trail['@type']).toBe('BreadcrumbList');
      const items = trail.itemListElement as { position: number; name: string; item: string }[];
      expect(items.map((i) => i.position)).toEqual([1, 2, 3]);
      expect(items[1]?.item, `${page}: the trail passes by /docs/`).toMatch(/\/docs\/$/);
      expect(items[2]?.name).toBe(title);
      expect(items[2]?.item).toBe(article.url);
      expect(html, `${page}: no rating, no question`).not.toMatch(/FAQPage|HowTo|aggregateRating|"Review"/);
    }
  });

  it('list at /docs/ every page of the sidebar, in its groups, and no other', () => {
    const index = readText(join(DIST, 'docs/index.html'));
    const inside = (html: string): string => /<main\b[\s\S]*<\/main>/.exec(html)?.[0] ?? '';
    const listed = new Set([...inside(index).matchAll(/<li><a href="(\/[^"]+)"/g)].map((m) => m[1]));
    const sidebar = /<ul class="top-level[\s\S]*?<\/ul>\s*<\/starlight-menu-button|<nav class="sidebar[\s\S]*?<\/nav>/.exec(docs())?.[0] ?? '';
    const links = new Set([...sidebar.matchAll(/<a href="(\/(?:docs|record)\/[^"]*)"/g)].map((m) => m[1]));
    expect(links.size, 'the sidebar was read').toBeGreaterThan(20);
    links.delete('/docs/');
    const depth = (l: string | undefined): number => (l ?? '').replace(/^\/docs\//, '').split('/').filter(Boolean).length;
    const mine = [...listed].filter((l): l is string => l?.startsWith('/docs/') === true || l?.startsWith('/record/') === true);
    const top = (all: Iterable<string | undefined>): string[] => [...all].filter((l) => l?.startsWith('/record/') === true || depth(l) === 1).sort() as string[];
    expect(top(mine)).toEqual(top(links));
    expect(mine.filter((l) => depth(l) >= 3), 'a page of a folder that its index page should have been the one link to').toEqual([]);
    expect(mine.every((l) => links.has(l)), 'a link of /docs/ that the sidebar does not hold').toBe(true);
    const docsSection = /\n## Docs\n([\s\S]*?)(?=\n## )/.exec(readText(join(ROOT, 'README.md')))?.[1] ?? '';
    const items = [...docsSection.matchAll(/\]\(docs\/([^)#\s]+)\.md[^)]*\)/g)].map((m) => `/docs/${m[1]}/`);
    expect(items.length, 'the sweep found the README items').toBeGreaterThan(15);
    expect(items.filter((l) => !mine.includes(l)), 'an item of a group that /docs/ does not link').toEqual([]);
    for (const link of listed) expect(existsSync(join(DIST, link ?? '', 'index.html')), `${link} is a page`).toBe(true);
  });
});

when('the eye is never inverted, on any ground, and its iris has no ring', () => {
  const ALMOND = 'M-47,0Q0,-86 47,0Q0,86 -47,0Z';
  const SEAL = `<rect x="-48" y="-48" width="96" height="96" rx="22" fill="${BRAND.charcoal}"/>`;
  const pagesOf = (): string[] => ['index.html', '404.html', 'docs/index.html', 'docs/install/index.html', 'docs/what-it-proves/index.html'];
  /** Every picture of a page that draws the eye: the ones whose clip is the brand's almond. */
  const eyesOf = (html: string): string[] => [...html.matchAll(/<svg\b[\s\S]*?<\/svg>/g)].map((m) => m[0]).filter((svg) => svg.includes(`<path d="${ALMOND}"`));

  it('draws no eye with charcoal lines on any built page: the lines are bone, and the ground is the page’s dark or the eye’s own seal', () => {
    let seen = 0;
    for (const page of pagesOf()) {
      for (const eye of eyesOf(readText(join(DIST, page)))) {
        seen += 1;
        expect(eye, `${page}: an eye with charcoal lines`).not.toContain(`stroke="${BRAND.charcoal}"`);
        expect(eye, `${page}: the lines of the eye are bone`).toContain(`stroke="${BRAND.bone}"`);
        expect(eye, `${page}: the iris is sulphur`).toContain(`fill="${BRAND.sulphur}"`);
      }
    }
    expect(seen, 'the eyes of the pages were found').toBeGreaterThan(8);
  });

  it('seals the eye in charcoal on the light theme of the docs, and draws it as it is on the dark one', () => {
    for (const page of ['404.html', 'docs/install/index.html', 'docs/what-it-proves/index.html']) {
      const html = readText(join(DIST, page));
      const light = /<span class="mark only-light">(<svg[\s\S]*?<\/svg>)/.exec(html)?.[1] ?? '';
      const dark = /<span class="mark only-dark">(<svg[\s\S]*?<\/svg>)/.exec(html)?.[1] ?? '';
      expect(light, `${page}: the eye of the light theme is in its seal, a rounded square`).toContain(SEAL);
      expect(dark, `${page}: the eye of the dark theme is drawn as it is`).not.toContain('<rect');
    }
  });

  it('puts no ring on the iris, anywhere: no stroke on an ellipse of any eye, and no ring in the stylesheets of the home page', () => {
    for (const page of pagesOf()) for (const eye of eyesOf(readText(join(DIST, page)))) for (const ellipse of eye.matchAll(/<ellipse\b[^>]*>/g)) expect(ellipse[0], `${page}: a ring on the iris`).not.toMatch(/stroke/);
    expect(readText(join(DIST, 'favicon.svg')), 'the favicon is the product’s eye, in its seal').toContain('rx="22"');
    const field = /<svg[^>]*id="field"[\s\S]*?<\/svg>/.exec(readText(join(DIST, 'index.html')))?.[0] ?? '';
    expect(field).toContain('class="field-iris"');
    const css = readText(join(SITE, 'src/styles/home.css'));
    expect(rulesOf(css).filter((r) => /field-iris/.test(r.selector) && /stroke/.test(r.body)), 'a stroke on the hero’s iris').toEqual([]);
  });
});

when('the hero of the home page', () => {
  const page = (): string => readText(join(DIST, 'index.html'));

  it('blinks on the brand’s cycle: the whole cycle of the hero, sampled finely, is the eye drawn at the bar, which is the brand’s own: its closures, their times and its easing', async () => {
    const { CYCLE_MS, opennessAt } = await import('../build/the-hero-field.mjs');
    const eye = /<svg[^>]*>(?:(?!<\/svg>)[\s\S])*<clipPath id="eye-bar">[\s\S]*?<\/svg>/.exec(page())?.[0] ?? '';
    expect(eye, 'the eye of the bar is found').not.toBe('');
    const animate = /<animate attributeName="ry" dur="([\d.]+)s"[^>]*calcMode="([^"]+)"[^>]*keyTimes="([^"]+)" keySplines="([^"]+)" values="([^"]+)"/.exec(eye);
    expect(animate, 'the brand animates the lids of this eye, eased by splines').not.toBeNull();
    expect(Number(animate?.[1]) * 1000, 'the length of the cycle').toBe(CYCLE_MS);
    expect(animate?.[2], 'the brand eases by splines').toBe('spline');
    const times = (animate?.[3] ?? '').split(';').map(Number);
    const splines = (animate?.[4] ?? '').split(';').map((one) => one.split(' ').map(Number));
    const ry = (animate?.[5] ?? '').split(';').map(Number);
    const full = Number(/<ellipse cx="0" cy="0" rx="([\d.]+)"/.exec(eye)?.[1]);
    expect(times.length).toBe(ry.length);
    expect(splines.length, 'a spline for each segment').toBe(times.length - 1);

    // The brand's lids at a point of the cycle, by SMIL's own rule: the cubic Bezier of the segment's spline, solved for x by bisection.
    const brand = (at: number): number => {
      let i = times.findIndex((t, k) => at >= t && at <= (times[k + 1] ?? 1));
      i = Math.min(i, times.length - 2);
      const [x1, y1, x2, y2] = splines[i] as number[];
      const s = (at - (times[i] as number)) / ((times[i + 1] as number) - (times[i] as number));
      const bez = (u: number, p: number, q: number): number => 3 * (1 - u) ** 2 * u * p + 3 * (1 - u) * u * u * q + u ** 3;
      let [lo, hi] = [0, 1];
      for (let k = 0; k < 40; k++) {
        const mid = (lo + hi) / 2;
        if (bez(mid, x1 as number, x2 as number) < s) lo = mid;
        else hi = mid;
      }
      const eased = bez((lo + hi) / 2, y1 as number, y2 as number);
      const [v0, v1] = [(ry[i] as number) / full, (ry[i + 1] as number) / full];
      return v0 + (v1 - v0) * eased;
    };

    const samples = 1800;
    const closures = (read: (at: number) => number): number[] => {
      const centres: number[] = [];
      let start = -1;
      for (let k = 0; k <= samples; k++) {
        const shut = read(k / samples) < 0.1;
        if (shut && start < 0) start = k;
        if ((!shut || k === samples) && start >= 0) {
          centres.push((start + k - 1) / 2 / samples);
          start = -1;
        }
      }
      return centres;
    };
    const hero = (at: number): number => opennessAt(at * CYCLE_MS);
    const [theirs, ours] = [closures(brand), closures(hero)];
    expect(theirs.length, 'the brand’s eye closes twice in its cycle (once, then twice)').toBe(2);
    expect(ours.length, 'the hero closes as often as the brand’s eye').toBe(theirs.length);
    ours.forEach((centre, i) => expect(Math.abs(centre - (theirs[i] as number)), `closure ${i + 1} is at the brand’s time`).toBeLessThan(0.002));
    // At each stop the same value, and in between the same easing, along the whole cycle.
    for (const [i, time] of times.entries()) expect(Math.abs(hero(time) - Math.min(1, (ry[i] ?? 0) / full)), `the hero at the stop ${time}`).toBeLessThan(0.005);
    let worst = 0;
    for (let k = 0; k <= samples; k++) worst = Math.max(worst, Math.abs(hero(k / samples) - brand(k / samples)));
    expect(worst, 'the hero strays from the brand’s eye somewhere between its stops').toBeLessThan(0.02);
  });

  it('draws its iris at 0.43 of the opening, the approved page’s, and not at the brand’s eye’s 0.74', async () => {
    const { stonesOf } = await import('../build/the-hero-field.mjs');
    const iris = /<ellipse class="field-iris" cx="[\d.]+" cy="[\d.]+" rx="([\d.]+)" ry="([\d.]+)"/.exec(page());
    const opening = (stonesOf(1440) as number[][])[0]?.[2] ?? 0;
    expect(Number(iris?.[1]) / opening, 'the iris of the hero over its opening').toBeCloseTo(0.43, 2);
    expect(iris?.[1]).toBe(iris?.[2]);
  });

  it('ticks the last step with the brand’s tick, read from the diagram the release carries', () => {
    const asset = readText(join(ROOT, 'docs/assets/how-it-works-dark.svg'));
    const drawn = /<circle cx="([\d.]+)" cy="([\d.]+)" r="([\d.]+)" fill="[^"]*"\/><circle class="h[^>]*\/><path d="M([\d.]+),([\d.]+)(l[^"]*)" fill="none" stroke="[^"]*" stroke-width="([\d.]+)"/.exec(asset);
    expect(drawn, 'the brand’s diagram has its ticked point').not.toBeNull();
    const [cx, cy, r, x, y, rest, width] = [drawn?.[1], drawn?.[2], drawn?.[3], drawn?.[4], drawn?.[5], drawn?.[6], drawn?.[7]];
    const start = `M${Math.round((Number(x) - Number(cx)) * 100) / 100},${Math.round((Number(y) - Number(cy)) * 100) / 100}`;
    expect(page(), 'the tick of the steps is the brand’s').toContain(`<path class="tick" d="${start}${rest}" stroke-width="${width}" transform="scale(${Number(r) === 14 ? 1 : 14 / Number(r)})"/>`);
    expect(readText(join(SITE, 'build/the-mark.mjs')), 'no tick is typed in the site').not.toMatch(/class="tick" d="M-?\d/);
  });

  it('keeps the pill that pauses the motion clear of the buttons on a phone: the hero holds room for it below them', () => {
    const css = readText(join(SITE, 'src/styles/home.css'));
    const motion = /\.home \.motion \{([^}]*)\}/.exec(css)?.[1] ?? '';
    const bottom = Number(/bottom:\s*(\d+)px/.exec(motion)?.[1]);
    const phone = /@media \(max-width:\s*860px\)\s*\{([\s\S]*?)\n\}/.exec(css)?.[1] ?? '';
    const room = Number(/\.home \.hero \.txt\s*\{[^}]*padding-bottom:\s*(\d+)px/.exec(phone)?.[1]);
    // The pill is about 30 px high (a 11 px label, 6 px of padding each side and a border), and the page's own gap is 16 px.
    expect(room, 'room under the buttons on a phone').toBeGreaterThanOrEqual(bottom + 30 + 16);
  });
});
