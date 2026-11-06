/**
 * A BUILD OF THE SITE SENDS NO TELEMETRY.
 *
 * Astro sends anonymous usage data from `astro build` unless `ASTRO_TELEMETRY_DISABLED` is set (the variable
 * `@astrojs/telemetry` reads; it is also in that package's README). Nothing in Astro's configuration sets it, so a build
 * of this repository, on a machine or in CI, could have sent what the product itself refuses to send anywhere.
 *
 * HELD, from the files that start the build:
 *  - the driver (`build/build.mjs`) is the only thing that runs `astro`, and it runs it with `ASTRO_TELEMETRY_DISABLED`
 *    set to `1` in the environment it hands the child;
 *  - no script of `package.json` runs `astro` on its own: a script that did would skip the driver, and would have to
 *    set the variable in front of that very command (a variable before a command of a chain reaches that command only);
 *  - every step of a workflow that builds the site carries `ASTRO_TELEMETRY_DISABLED: '1'` in its own `env`;
 *  - where the site's dependencies are installed, the name is the one Astro's telemetry reads.
 *
 * NOT HELD: that a version of Astro keeps reading that name; the check of the installed package is what notices one
 * that does not, wherever the dependencies are installed.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SITE } from '../build/the-site.mjs';

const VARIABLE = 'ASTRO_TELEMETRY_DISABLED';
const read = (path: string): string => readFileSync(join(SITE, path), 'utf-8');

/** The commands of a script, split at the chain operators. */
function commandsOf(script: string): string[] {
  return script.split(/&&|\|\||;/).map((command) => command.trim());
}

/** What the scripts of a `package.json` run `astro` with: the commands that name it, and whether each sets the variable. */
function theAstroCommandsOf(scripts: Record<string, string>): { command: string; sets: boolean }[] {
  return Object.values(scripts)
    .flatMap(commandsOf)
    .filter((command) => /(?:^|\s)astro(?:\s|$)/.test(command))
    .map((command) => ({
      command,
      sets: new RegExp(`^(?:\\w+=\\S+\\s+)*${VARIABLE}=1\\s`).test(command),
    }));
}

/** The steps of a workflow file, as text each, with the step's own `env`. */
function stepsOf(workflow: string): string[] {
  return workflow.split(/\n {6}- /).slice(1);
}

/** Whether a step builds the site. */
const buildsTheSite = (step: string): boolean =>
  /node build\/build\.mjs|npm run build|\bastro build\b/.test(step.replace(/^\s*#.*$/gm, ''));

/** The workflow files of this repository. */
const workflows = (): string[] =>
  readdirSync(join(SITE, '.github/workflows')).filter((file) => /\.ya?ml$/.test(file));

describe('a build of the site', () => {
  it('runs astro from the driver, with the variable in the environment it hands it', () => {
    const driver = read('build/build.mjs');
    const spawn = /spawnSync\([^;]*?astro[^;]*?\{[\s\S]*?\}\);/.exec(driver)?.[0] ?? '';
    // NON-VACUITY: the driver does run astro.
    expect(spawn, 'the driver does not run astro').not.toBe('');
    expect(spawn, `the driver runs astro without ${VARIABLE}`).toMatch(
      new RegExp(`env:\\s*\\{[^}]*${VARIABLE}:\\s*'1'`),
    );
  });

  it('is started by no script of package.json that runs astro without the variable in front of it', () => {
    const { scripts } = JSON.parse(read('package.json')) as { scripts: Record<string, string> };
    for (const run of theAstroCommandsOf(scripts))
      expect(run.sets, `no ${VARIABLE}=1 in front of: ${run.command}`).toBe(true);
  });

  it('is told so in the env of every step of a workflow that builds it', () => {
    const steps = workflows().flatMap((name) => stepsOf(read(`.github/workflows/${name}`)).filter(buildsTheSite));
    expect(steps.length, 'no workflow has a step that builds the site').toBeGreaterThan(0);
    for (const step of steps) {
      expect(step, `a step builds the site without ${VARIABLE}`).toMatch(
        new RegExp(`\\n\\s+env:[\\s\\S]*?\\n\\s+${VARIABLE}: '1'`),
      );
    }
  });

  it('uses the name the installed telemetry reads, where the site is installed', () => {
    const telemetry = join(SITE, 'node_modules/@astrojs/telemetry/dist/index.js');
    // NON-VACUITY: the dependencies are installed wherever the tests run, which is where they build.
    expect(existsSync(telemetry), 'the site is not installed').toBe(true);
    expect(readFileSync(telemetry, 'utf-8')).toContain(`this.env.${VARIABLE}`);
  });

  it('reads the ruler: it finds a chain that runs astro without the variable', () => {
    expect(theAstroCommandsOf({ build: 'node a.mjs && astro build && node b.mjs' })).toEqual([
      { command: 'astro build', sets: false },
    ]);
    expect(
      theAstroCommandsOf({ build: `node a.mjs && ${VARIABLE}=1 astro build && node b.mjs` }),
    ).toEqual([{ command: `${VARIABLE}=1 astro build`, sets: true }]);
    // A variable set only on the FIRST command of a chain does not reach the astro one.
    expect(
      theAstroCommandsOf({ build: `${VARIABLE}=1 node a.mjs && astro build` }).every((run) => run.sets),
    ).toBe(false);
  });
});

/**
 * NO PAGE ASKS ANOTHER HOST FOR A FONT, A SCRIPT OR A STYLE. The typefaces come from `@fontsource` packages and are
 * served from the site's own `/_astro/`; a `<script src>`, a stylesheet, a preload, a preconnect or a `url()` of a style
 * that names another host is a request a reader's browser would make on every visit, which is what the product refuses
 * to do to a person. Held over every built page and every built style, and over the sources that write them.
 */
const DIST_DIR = join(SITE, 'dist');
const BUILT = existsSync(join(DIST_DIR, 'index.html'));
const whenBuilt = BUILT ? describe : describe.skip;

const ABSOLUTE = /^(?:https?:)?\/\//;

/** The addresses a page or a style loads something from, that name another host: element, rule and the line itself. */
function theOtherHostsOf(text: string): string[] {
  const found: string[] = [];
  for (const tag of text.matchAll(/<(script|link|iframe|img|source|video|audio|object|embed)\b[^>]*>/gi)) {
    const el = tag[0];
    const kind = (tag[1] ?? '').toLowerCase();
    const attr = (name: string): string | undefined => new RegExp(`\\s${name}\\s*=\\s*["']?([^"'\\s>]+)`, 'i').exec(el)?.[1];
    const loads = kind === 'link' ? attr('href') : attr('src');
    // A link that only names a document (a canonical, an alternate) loads nothing; a stylesheet, an icon, a preload,
    // a preconnect or a dns-prefetch does.
    const rel = (attr('rel') ?? '').toLowerCase();
    const loading = kind !== 'link' || /stylesheet|preload|modulepreload|prefetch|preconnect|dns-prefetch|icon|manifest/.test(rel);
    if (loading && loads !== undefined && ABSOLUTE.test(loads)) found.push(el);
  }
  for (const rule of text.matchAll(/@import\s+(?:url\()?["']?(?:https?:)?\/\/[^"')\s;]+|\burl\(\s*["']?(?:https?:)?\/\/[^"')\s]+/g)) found.push(rule[0]);
  return found;
}

describe('the ruler of the other hosts a page loads from', () => {
  it('finds a script, a stylesheet, a preconnect and a url() that name another host, and nothing else', () => {
    expect(theOtherHostsOf('<script src="https://x.example/a.js"></script>')).toHaveLength(1);
    expect(theOtherHostsOf('<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=A">')).toHaveLength(1);
    expect(theOtherHostsOf('<link rel="preconnect" href="https://fonts.gstatic.com">')).toHaveLength(1);
    expect(theOtherHostsOf('a{src:url(https://x.example/f.woff2)}')).toHaveLength(1);
    expect(theOtherHostsOf('@import "//x.example/a.css";')).toHaveLength(1);
    expect(theOtherHostsOf('<link rel="canonical" href="https://mnema.work/"><a href="https://github.com/x">')).toEqual([]);
    expect(theOtherHostsOf('<script src="/_astro/page.js"></script><link rel="stylesheet" href="/_astro/a.css">')).toEqual([]);
  });
});

whenBuilt('the built site', () => {
  const files = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? files(join(dir, e.name)).map((f) => join(e.name, f)) : [e.name]));
  const built = (BUILT ? files(DIST_DIR) : []).filter((f) => !f.startsWith('pagefind/'));

  it('loads no font, script or style from another host, on any page or in any style', () => {
    const pages = built.filter((f) => /\.(?:html|css)$/.test(f));
    expect(pages.length, 'the sweep read pages').toBeGreaterThan(20);
    for (const file of pages) {
      expect(theOtherHostsOf(readFileSync(join(DIST_DIR, file), 'utf-8')), `${file} loads from another host`).toEqual([]);
    }
  });

  it('serves the two typefaces itself: every @font-face names a file of the build', () => {
    // Starlight writes its styles into each page, and the home page's go to a file of `_astro/`: both are read.
    const css = built
      .filter((f) => /\.(?:css|html)$/.test(f))
      .map((f) => readFileSync(join(DIST_DIR, f), 'utf-8'))
      .join('\n');
    const faces = [...css.matchAll(/@font-face\{[^}]*\}/g)].map((m) => m[0]);
    expect(faces.length, 'the typefaces are declared').toBeGreaterThanOrEqual(7);
    for (const face of faces) {
      for (const m of face.matchAll(/url\(([^)]+)\)/g)) {
        const path = (m[1] ?? '').replace(/["']/g, '');
        expect(path.startsWith('/_astro/'), `${path} is not a file of the build`).toBe(true);
        expect(existsSync(join(DIST_DIR, path)), `${path} is missing`).toBe(true);
      }
    }
  });

  it('writes nothing that loads from another host in the sources of the pages', () => {
    for (const path of ['src/pages/index.astro', 'src/styles/home.css', 'src/styles/site.css', 'astro.config.mjs']) {
      expect(theOtherHostsOf(read(path)), `${path} loads from another host`).toEqual([]);
    }
  });
});
