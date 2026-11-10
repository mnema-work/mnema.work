// @reads-the-tree
/**
 * THE HOME PAGE SAYS ITS OWN WORDS AND NOBODY ELSE'S FACTS. The words of mnema.work/ are the page's (ADR-245, ADR-246);
 * what is a fact of the release it was built from is read from the checkout of its tag, and this holds the built page to
 * the file each one comes from, read here again by code of its own and not by the build's:
 *
 *   - THE COUNTS of the measured block (10 of 10, 11 of 11, 0 of 12) and the number of sessions: from the results the
 *     measurements folder holds as JSON (`results/stage1/table.json`, `results/stage2/counts.json`);
 *   - THE HOSTS AND THEIR RUNGS: from the table of hosts the README holds (written from the product's host table);
 *   - THE COMMANDS that install: from the README's Quick start and the page of the hosts;
 *   - THE VERDICT shown: clauses of what the binary prints on the record committed at this commit, the two lines of the
 *     same command after one character of it was changed, and the sentence of the refusal the session demo shows;
 *   - THE LINKS: each one to a page the site has, a section the page has, or a path git holds at the tag.
 *
 * AND HOLDS THE PAGE TO WHAT IT PROMISES: no colour of its own (the palette is the one owner), no host but its own asked
 * for anything, motion only inside a scene, in every scene, and none of it under `prefers-reduced-motion`, text at 4.5:1 on
 * every ground it is set on, real buttons and links, each scene described in text, no horizontal scroll at phone width, the
 * em dash nowhere.
 * Docs: both themes carry the palette, dark is the default, and the mark in the head links back to `/`.
 *
 * WHAT IT DOES NOT CHECK: how the page looks at any width (a reviewer opens it), or that a screen reader reads it well.
 */

import { execFileSync, spawnSync } from 'node:child_process';
import { runInNewContext } from 'node:vm';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { hostsOf, installOf, measuredOf, verdictLinesOf } from '../build/the-home.mjs';
import { contrastOf } from '../build/the-pages.mjs';
import { INK, PAGE, PALETTE, paletteCss } from '../build/the-palette.mjs';
import { PRODUCT_URL } from '../build/the-site.mjs';
import { DIST, fromTheProduct, head, ROOT, readText, SITE, textOf } from './support/reading-the-site.js';

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

  it('still finds the two clauses it quotes when an indented census line follows the verdict', () => {
    const census = '  census [unnamed-tail] public 9a9b7666: the tail names no record\n';
    expect(
      verdictLinesOf(`public: local integrity verified (T1/T2/T4); x; all events are signature-covered\n${census}`),
    ).toEqual(['public: local integrity verified (T1/T2/T4)', 'all events are signature-covered']);
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
    // The lines are the checkout's own (the page shows exactly `claude`, above); here only their shape is held, so the
    // case is green at any release of the product, whoever owns the repository the marketplace is added from.
    expect(claude).toHaveLength(2);
    expect(claude[0]).toMatch(/^claude plugin marketplace add [\w.-]+\/[\w.-]+$/);
    expect(claude[1]).toBe('claude plugin install mnema@mnema');
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

  // The scenes of the page. `root` is the class of the element that holds the scene, which the reduced-motion rule names
  // with `*`; `context` are the classes a selector may name to be inside that scene, and no class is in two scenes, so a
  // moving rule is tied to one scene and the scene's own rule under prefers-reduced-motion is the one that stops it.
  const SCENES: [name: string, root: string, context: string][] = [
    ['the glow behind the hero', 'hero-glow', 'hero-glow'],
    ['the four steps of the hero', 'scene', 'scene'],
    ['the record', 'ill-record', 'ill-record|form'],
    ['the sessions', 'ill-session', 'ill-session|stack'],
    ['the rule', 'ill-rule', 'ill-rule|tree'],
    ['the check', 'ill-check', 'ill-check|vfy'],
    ['the session demo', 'chat', 'chat'],
  ];
  const rulesOf = (css: string): { selector: string; body: string }[] =>
    [...css.matchAll(/([^{}@]+)\{([^{}]*)\}/g)].map((m) => ({ selector: (m[1] ?? '').trim(), body: m[2] ?? '' }));
  // A declaration that moves: the shorthands and every longhand (`animation-delay`, `transition-property`…) that is not `none`.
  const moves = (body: string): boolean => /(?<![-\w])(?:animation|transition)(?:-[a-z-]+)?\s*:\s*(?!none\b)[^;}]+/.test(body);
  /** The opacity a rule gives, when it dims (less than 1), as a number or as a percentage. */
  const dims = (body: string): boolean =>
    [...body.matchAll(/(?<![-\w])opacity\s*:\s*([\d.]+)(%?)/g)].some((m) => Number(m[1]) / (m[2] === '%' ? 100 : 1) < 1);
  /** The scenes a selector part is inside, by the classes it names. */
  const scenesOf = (part: string): string[] =>
    SCENES.filter(([, , context]) => new RegExp(`\\.(?:${context})(?![\\w-])`).test(part)).map(([, root]) => root);
  /** The text of a CSS file without its reduced-motion block (which is the only one, and is read apart). */
  const split = (css: string): { outside: string; reduced: string } => {
    const at = css.indexOf('@media (prefers-reduced-motion: reduce)');
    expect(at, 'the reduced-motion block is there, once').toBeGreaterThan(0);
    expect(css.indexOf('@media (prefers-reduced-motion: reduce)', at + 1)).toBe(-1);
    let depth = 0;
    let end = css.length;
    for (let i = css.indexOf('{', at); i < css.length; i++) {
      depth += css[i] === '{' ? 1 : css[i] === '}' ? -1 : 0;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
    return { outside: css.slice(0, at) + css.slice(end), reduced: css.slice(at, end) };
  };

  it('moves only inside a scene, moves in every scene, dims only inside a scene, and none of it under prefers-reduced-motion', () => {
    const css = sourceOf('src/styles/home.css').replace(/\/\*[\s\S]*?\*\//g, '');
    const { outside, reduced } = split(css);
    const rules = rulesOf(outside.replace(/@keyframes\s+[\w-]+\s*\{([\s\S]*?\})\s*\}/g, ''));
    const motion = rules.filter((r) => moves(r.body));
    expect(motion.length, 'the page moves').toBeGreaterThan(20);
    // Every rule that moves, and every rule that dims, in the whole file bar the reduced-motion block: each selector part is
    // inside exactly one scene.
    for (const rule of rules.filter((r) => moves(r.body) || dims(r.body))) {
      for (const part of rule.selector.split(',').map((s) => s.trim())) {
        expect(scenesOf(part), `${part} moves or dims and is not inside exactly one scene`).toHaveLength(1);
      }
    }
    expect(css, 'no smooth scrolling').not.toMatch(/scroll-behavior\s*:\s*smooth/);
    const stillRules = rulesOf(reduced);
    // Inside the reduced-motion block only what stops motion: none, and a transform put back, and full opacity.
    expect(stillRules.length, 'the reduced-motion block has rules').toBeGreaterThan(5);
    for (const rule of stillRules) {
      for (const declaration of rule.body.split(';').map((d) => d.trim()).filter(Boolean)) {
        expect(
          /^(?:animation|transition|transform)\s*:\s*none(?:\s*!important)?$|^opacity\s*:\s*1(?:\s*!important)?$/.test(declaration),
          `${rule.selector} under prefers-reduced-motion says "${declaration}", which is not a stop`,
        ).toBe(true);
      }
    }
    // A keyframe that changes opacity is named only by rules inside a scene that is described by a role and an aria-label.
    const fading = [...outside.matchAll(/@keyframes\s+([\w-]+)\s*\{([\s\S]*?\})\s*\}/g)].filter((m) => /opacity\s*:/.test(m[2] ?? '')).map((m) => m[1] as string);
    expect(fading.length, 'the page has keyframes that change opacity').toBeGreaterThan(3);
    const described = (root: string): boolean =>
      new RegExp(`<div class="[^"]*\\b${root}\\b[^"]*" role="(?:img|group)" aria-label="[^"]{20,}"`).test(page());
    for (const keyframes of fading) {
      const users = rules.filter((r) => new RegExp(`(?<![-\\w])animation(?:-name)?\\s*:[^;}]*(?<![-\\w])${keyframes}(?![-\\w])`).test(r.body));
      expect(users.length, `${keyframes} is used`).toBeGreaterThan(0);
      for (const user of users) {
        for (const part of user.selector.split(',').map((s) => s.trim())) {
          for (const root of scenesOf(part)) expect(described(root), `${keyframes} changes opacity inside ${root}, which has no role and aria-label`).toBe(true);
        }
      }
    }
    for (const [name, root] of SCENES) {
      const own = motion.filter((r) => r.selector.split(',').some((s) => scenesOf(s.trim()).includes(root)));
      expect(own.length, `${name} moves`).toBeGreaterThan(0);
      // The scene's rule under prefers-reduced-motion names the scene's own element and everything inside it.
      const kills = stillRules.filter(
        (r) =>
          r.selector.split(',').some((s) => new RegExp(`^\\.home \\.${root}$`).test(s.trim())) &&
          (root === 'hero-glow' || r.selector.split(',').some((s) => new RegExp(`^\\.home \\.${root} \\*$`).test(s.trim()))) &&
          /animation:\s*none/.test(r.body) &&
          /transition:\s*none/.test(r.body),
      );
      expect(kills.length, `${name} has its own rule under prefers-reduced-motion`).toBeGreaterThan(0);
    }
    // Each rule survives into the built style.
    const built = builtCss().replace(/\s+/g, '');
    for (const [name, root] of SCENES) {
      expect(built, `${name} under prefers-reduced-motion, built`).toMatch(
        new RegExp(`@media\\(prefers-reduced-motion:reduce\\)\\{[^@]*\\.home\\.${root}[^{]*\\{[^}]*animation:none`),
      );
    }
  });

  it('turns the motion guard red for a rule that moves outside a scene or after the reduced-motion block', () => {
    const base = sourceOf('src/styles/home.css').replace(/\/\*[\s\S]*?\*\//g, '');
    const lights = (css: string): boolean => {
      const { outside } = split(css);
      return rulesOf(outside.replace(/@keyframes\s+[\w-]+\s*\{([\s\S]*?\})\s*\}/g, ''))
        .filter((r) => moves(r.body) || dims(r.body))
        .some((r) => r.selector.split(',').some((s) => scenesOf(s.trim()).length !== 1));
    };
    expect(lights(base), 'the page as it is').toBe(false);
    expect(lights(`${base}\n.home .foot { transition: color 1s; }\n`), 'a transition at the end of the file').toBe(true);
    expect(lights(`${base}\n@media (min-width: 1px) { .home .hero h1 { animation: drift 3s infinite; } }\n`), 'an animation in a media query at the end').toBe(true);
    expect(lights(`${base}\n.home .foot { opacity: 0.4; }\n`), 'a rule that dims').toBe(true);
  });

  it('starts no motion of its own where the reader asked for less', () => {
    const script = /<script type="module">([\s\S]*?)<\/script>/.exec(page())?.[1] ?? '';
    expect(script).toMatch(/matchMedia\(["'`]\(prefers-reduced-motion: reduce\)["'`]\)/);
    expect(script.indexOf('prefers-reduced-motion'), 'asked before the first tick').toBeLessThan(script.indexOf('setInterval'));
    expect(script.indexOf('prefers-reduced-motion'), 'asked before the observer').toBeLessThan(script.indexOf('IntersectionObserver'));
    // The page as served is at the last frame of every scene: the four steps are all lit, and no step is waiting to be.
    expect([...page().matchAll(/class="st st\d card on"/g)]).toHaveLength(4);
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

  it('sets every text colour at 4.5:1 on every ground it is set on', () => {
    const css = sourceOf('src/styles/home.css');
    const kebab = (name: string): string => name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
    const hexOf = new Map(Object.entries(PALETTE).map(([k, v]) => [kebab(k), v as string]));
    // The text colours of the stylesheet, by its `color:` declarations, and the grounds it paints, by its `background`
    // declarations that hold a palette variable: every pair of the two that can meet is held, by family.
    const text = new Set([...css.matchAll(/(?<![-\w])color:\s*var\(--([a-z-]+)\)/g)].map((m) => m[1] as string));
    const grounds = new Set([...css.matchAll(/background(?:-color)?:\s*var\(--([a-z-]+)\)/g)].map((m) => m[1] as string));
    for (const g of ['ground', 'plate', 'surface', 'card', 'button', 'accent-soft', 'amber-ground', 'red-ground', 'mint-ground', 'accent-ground']) {
      grounds.add(g);
    }
    expect(text.size).toBeGreaterThan(8);
    const neutral = ['ground', 'plate', 'surface', 'card', 'button', 'accent-soft', 'accent-ground'];
    const meets: Record<string, string[]> = {
      ink: [...neutral, 'red-ground', 'mint-ground'],
      text: neutral,
      soft: neutral,
      muted: [...neutral, 'red-ground'],
      faint: ['ground', 'plate', 'surface', 'accent-ground'],
      accent: neutral,
      mint: ['ground', 'plate', 'surface', 'card', 'mint-ground'],
      red: ['ground', 'plate', 'surface', 'card', 'red-ground'],
      amber: ['ground', 'plate', 'card', 'amber-ground'],
      'on-accent': ['accent'],
    };
    for (const colour of text) {
      expect(meets[colour], `${colour} is a text colour the page sets, and this case holds it on its grounds`).toBeDefined();
      for (const ground of meets[colour] ?? []) {
        expect(contrastOf(hexOf.get(colour) as string, hexOf.get(ground) as string), `${colour} on ${ground}`).toBeGreaterThanOrEqual(4.5);
      }
    }
    // Every ground the page paints with a variable is one the table above knows, or a fill that holds text held above on it
    // (the accent and the ink under the text over the accent) or none (the hairline, the mint and the red of a bar).
    for (const ground of grounds) {
      expect([...neutral, 'amber-ground', 'red-ground', 'mint-ground', 'accent', 'ink', 'line', 'mint', 'red'].includes(ground), `${ground} is a ground the page paints`).toBe(true);
    }
    expect(contrastOf(PALETTE.onAccent, PALETTE.accent), 'the text over the accent').toBeGreaterThanOrEqual(4.5);
    expect(contrastOf(PALETTE.onAccent, PALETTE.ink), 'the text over the accent on hover').toBeGreaterThanOrEqual(4.5);
  });

  it('is made of real buttons and links, shows focus, and describes each scene in text', () => {
    const html = page();
    expect(html).not.toMatch(/\sonclick=|role="button"/);
    expect([...html.matchAll(/<button\b[^>]*>/g)].every((m) => /type="button"/.test(m[0]) && /aria-label=/.test(m[0]))).toBe(true);
    expect([...html.matchAll(/<button\b/g)].length, 'the copy button, Replay and Change one word').toBeGreaterThanOrEqual(3);
    expect(sourceOf('src/styles/home.css')).toMatch(/:focus-visible\s*\{[^}]*outline:/);
    expect(html, 'no theme button: the page is dark').not.toMatch(/class="tgl"|data-theme/);
    // Each scene says in words what it draws, in an aria-label, and its drawing is hidden from assistive technology.
    const described = (root: string): { role: string; label: string } => {
      const m = new RegExp(`<div class="[^"]*\\b${root}\\b[^"]*" role="(img|group)" aria-label="([^"]*)"`).exec(html);
      return { role: m?.[1] ?? '', label: m?.[2] ?? '' };
    };
    const says: [string, string[]][] = [
      ['scene', ['four steps', 'settles a call', 'recorded and signed', 'repository', 'next session']],
      ['ill-record', ['Keep money as integer cents', 'proposed', 'accepted']],
      ['ill-session', ['Claude Code', 'Codex', 'VS Code', 'In force']],
      ['ill-rule', ['src/billing', 'refused', 'shell']],
      ['ill-check', ['illustration', 'mnema verify', 'changed']],
      ['chat', ['illustration', 'refuses the write', 'floats']],
    ];
    for (const [root, words] of says) {
      const { role, label } = described(root);
      expect(role, `${root} is described`).toMatch(/img|group/);
      for (const word of words) expect(label.toLowerCase(), `the label of ${root} says "${word}"`).toContain(word.toLowerCase());
    }
    for (const root of ['ill-record', 'ill-session', 'ill-rule']) {
      expect(html, `${root} hides its drawing`).toMatch(new RegExp(`\\b${root}\\b[\\s\\S]*?aria-hidden="true"`));
    }
    expect(html).toMatch(/<html lang="en">/);
    expect((html.match(/<h1\b/g) ?? []).length, 'one h1').toBe(1);
  });

  it('works at phone width: wide things scroll in their own box, the columns fold, and nothing sets a width the page cannot hold', () => {
    const css = sourceOf('src/styles/home.css');
    for (const selector of ['.home .console', '.home .code']) {
      const rule = css.slice(css.indexOf(`${selector} {`));
      expect(rule.slice(0, rule.indexOf('}')), `${selector} scrolls on its own`).toMatch(/overflow-x:\s*auto/);
    }
    const phone = /@media \(max-width:\s*640px\)\s*\{([\s\S]*?)\n\}/.exec(css)?.[1] ?? '';
    for (const folded of [/\.home \.steps\s*\{[^}]*grid-template-columns:\s*1fr\s*[;}]/, /\.home \.msg\s*\{[^}]*max-width:\s*100%/, /\.home \.chat \.refuse\s*\{[^}]*margin-left:\s*0/]) {
      expect(phone, `${folded} at phone width`).toMatch(folded);
    }
    const tablet = /@media \(max-width:\s*960px\)\s*\{([\s\S]*?)\n\}/.exec(css)?.[1] ?? '';
    expect(tablet, 'a section is one column below 960px').toMatch(/\.home \.sec \.g\s*\{[^}]*grid-template-columns:\s*1fr\s*[;}]/);
    expect(tablet, 'the footer is two columns below 960px').toMatch(/\.home \.foot \.cols\s*\{[^}]*grid-template-columns:\s*1fr 1fr/);
    // No fixed width wider than a phone, and a grid column that holds text can shrink (`min-width: 0`).
    for (const m of css.matchAll(/([^{}]+)\{[^{}]*\b(?<![-])(?:width|min-width):\s*(\d+)px/g)) {
      expect(Number(m[2]), `${(m[1] ?? '').trim()} is wider than a phone`).toBeLessThanOrEqual(360);
    }
    expect(css).toMatch(/\.home \.ill\s*\{[^}]*min-width:\s*0/);
  });

  it('has no em dash, anywhere on the page or in its sources', () => {
    const dash = String.fromCharCode(0x2014);
    for (const [name, text] of [
      ['the built page', page()],
      ['index.astro', sourceOf('src/pages/index.astro')],
      ...readdirSync(join(SITE, 'src/components/home')).map((f) => [`components/home/${f}`, sourceOf(`src/components/home/${f}`)] as const),
      ['icons.mjs', sourceOf('src/icons.mjs')],
      ['hosts/SOURCES.md', sourceOf('hosts/SOURCES.md')],
      ['home.css', sourceOf('src/styles/home.css')],
      ['site.css', sourceOf('src/styles/site.css')],
      ['copy.md', sourceOf('copy.md')],
    ] as const) {
      expect(text.includes(dash), `${name} has an em dash`).toBe(false);
    }
  });

  it('is dark and says its own words: the headline and the sentence under it, of ADR-246', () => {
    const text = textOf(main());
    expect(text).toContain('The decision record for AI coding agents. mnema keeps the why behind your agents’ work, signed, in your repository, and hands it to every next session.');
    expect(page()).toContain('<meta name="color-scheme" content="dark">');
    expect(page()).toContain('<title>mnema: the decision record for AI coding agents</title>');
    for (const heading of ['Record the why', 'Every session starts with it', 'Rules meet the edit', 'Anyone can check it', 'See it in a session', 'Works where your agents work', 'Start a record in a minute.']) {
      expect(text, heading).toContain(heading);
    }
  });

  it('shows the refusal sentence the binary of the tag writes, taken from it and not typed', async () => {
    const { ourWordsInRefusing } = await fromTheProduct('packages/code/dist/edit-refuses-a-write.js');
    const rule = { id: 'x', name: 'x', address: 'src/billing', travels: true };
    const sentence: string = ourWordsInRefusing({ path: 'src/billing/invoice.ts', relative: 'src/billing/invoice.ts', rules: [rule] })[0];
    expect(sentence).toMatch(/^A rule of this project’s record refuses a write at src\/billing\/invoice\.ts while it stands\.$/);
    const refusal = /<div class="refuse"><svg[^>]*>[\s\S]*?<\/svg><div><b>Refused by mnema<\/b>([^<]*)<span class="rname">/.exec(page())?.[1];
    expect(refusal, 'the demo refuses with the binary’s sentence').toBe(sentence);
    for (const file of readdirSync(join(SITE, 'src/components/home'))) {
      expect(sourceOf(`src/components/home/${file}`), `${file} types the refusal`).not.toMatch(/refuses a write/);
    }
  });

  it('labels Change one word an illustration of two real outputs, and holds both to what the verifier prints', () => {
    const html = main();
    const outputs = /<div class="a0"><div class="console mono">[\s\S]*?<div class="verified">([^<]*)<\/div><div class="muted">([^<]*)<\/div><\/div><\/div><div class="a1"><div class="console mono broken"><div class="cmd">[\s\S]*?<\/div><div class="failed">([^<]*)<\/div><div class="muted">([^<]*)<\/div>/.exec(html);
    expect(outputs, 'the two outputs are in the illustration').not.toBeNull();
    expect(textOf(html)).toContain('An illustration of two real outputs, captured from the verifier');
    expect(html).toMatch(/<a href="\/record\/">Run it on this site's own record<\/a>/);
    const dir = mkdtempSync(join(tmpdir(), 'the-home-failure-'));
    try {
      execFileSync('git', ['archive', '--format=tar', '-o', join(dir, 'record.tar'), 'HEAD', '.mnema'], { cwd: ROOT });
      const tree = join(dir, 'tree');
      mkdirSync(tree);
      execFileSync('tar', ['-xf', join(dir, 'record.tar'), '-C', tree]);
      execFileSync('git', ['init', '-q', tree]);
      const tails = join(tree, '.mnema', 'tails');
      const tail = readdirSync(tails).map((d) => join(tails, d, '000001.jsonl')).find(existsSync) as string;
      const text = readFileSync(tail, 'utf8');
      const at = text.indexOf('"title":"') + '"title":"'.length;
      const title = /^[^"\\]*(?:\\.[^"\\]*)*/.exec(text.slice(at))?.[0] ?? '';
      const changed = text[at] === 'Z' ? 'Y' : 'Z';
      writeFileSync(tail, text.slice(0, at) + changed + text.slice(at + 1));
      // The words beside the outputs are the title that was changed and the character it was changed to, not invented ones.
      const spoken = textOf(html).replace(/\s/g, '');
      expect(spoken, 'the title before').toContain(`“${title.slice(0, 48)}…”`.replace(/\s/g, ''));
      expect(spoken, 'the title after').toContain(`“${changed}${title.slice(1, 48)}…”`.replace(/\s/g, ''));
      const home = mkdtempSync(join(tmpdir(), 'the-home-failure-home-'));
      const ran = spawnSync(process.execPath, [join(ROOT, 'packages/code/dist/cli.js'), 'verify'], {
        cwd: tree,
        env: { HOME: home, PATH: process.env.PATH ?? '' },
        encoding: 'utf8',
      });
      rmSync(home, { recursive: true, force: true });
      expect(ran.status, 'a changed record does not verify').not.toBe(0);
      const said = `${ran.stdout}\n${ran.stderr}`;
      expect(said, 'the first failed line is a stretch of what the binary printed').toContain(outputs?.[3]);
      expect(said, 'the second failed line is a stretch of what the binary printed').toContain(outputs?.[4]);
      expect(outputs?.[3]).toMatch(/^public: local integrity FAILED/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 60_000);
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

  it('open dark on a first visit whatever the system says, and keep a choice the reader made', () => {
    const html = docs();
    const provider = /<script>\s*(window\.StarlightThemeProvider[\s\S]*?)<\/script>/.exec(html)?.[1] ?? '';
    expect(provider, 'the theme provider is on the page').not.toBe('');
    // The script that runs before the page paints, with a system that says light and a reader who has chosen nothing.
    const themeAfter = (stored: string | null): string => {
      const doc = { documentElement: { dataset: {} as Record<string, string> }, querySelectorAll: () => [], querySelector: () => null };
      runInNewContext(provider, {
        window: { matchMedia: () => ({ matches: true }) },
        localStorage: { getItem: () => stored },
        document: doc,
      });
      return doc.documentElement.dataset.theme ?? '';
    };
    expect(themeAfter(null), 'nothing stored, system light').toBe('dark');
    expect(themeAfter(''), 'auto, system light').toBe('dark');
    expect(themeAfter('light'), 'the reader chose light').toBe('light');
    expect(themeAfter('dark'), 'the reader chose dark').toBe('dark');
    // And no script of the docs asks the system afterwards (the selector's own script did, and put light back).
    const scripts = [
      html,
      ...readdirSync(join(DIST, '_astro'))
        .filter((f) => f.endsWith('.js'))
        .map((f) => readText(join(DIST, '_astro', f))),
    ].join('\n');
    expect(scripts, 'a script reads the system colour scheme').not.toMatch(/matchMedia\(\s*[`'"]\(prefers-color-scheme/);
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
