// @reads-the-tree
/**
 * THE LETTERING IS CENTRED ON THE EYE. In the lockup (the eye and the word of the brand) the word's visual middle, the band of
 * its lowercase letters, sits on the eye's centre: in the home page's bar, in its foot, and in the docs' header, which an
 * `align-items: normal` once left with the word 7 px above the eye.
 *
 * It is measured on the built page, without a browser: the eye and the word are the two children of one flex row that centres
 * them (the rule is read from the built style, and nothing moves either child off it), so their boxes share a centre; what is
 * measured is where the ink of the word lies inside its own box, by rasterizing the word the page carries and finding its
 * first and last rows. The distance from the box's centre to the ink's centre, at the size the page draws it, is held to half a pixel.
 *
 * WHAT IT DOES NOT CHECK: how a browser rounds a box to a pixel (a reviewer opens the page).
 */

import { createRequire } from 'node:module';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DIST, readText, SITE } from './support/reading-the-site.js';

const BUILT = existsSync(join(DIST, 'index.html'));
const when = BUILT ? describe : describe.skip;
const require = createRequire(join(SITE, 'package.json'));
const sharp = require('sharp') as (input: Buffer) => any;

/** The offset, in pixels at the size the page draws the word, from the middle of its box to the middle of its ink. */
async function offsetOf(svg: string): Promise<number> {
  const [, width, height] = /width="(\d+)" height="(\d+)"/.exec(svg) ?? [];
  const scale = 8;
  const big = svg.replace(/width="\d+" height="\d+"/, `width="${Number(width) * scale}" height="${Number(height) * scale}"`).replaceAll('currentColor', '#000000');
  const { data, info } = await sharp(Buffer.from(big)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const rows: number[] = [];
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      if ((data[(y * info.width + x) * 4 + 3] ?? 0) > 16) {
        rows.push(y);
        break;
      }
    }
  }
  expect(rows.length, 'the word has ink').toBeGreaterThan(10);
  const middle = ((rows[0] ?? 0) + (rows[rows.length - 1] ?? 0) + 1) / 2;
  return (middle - info.height / 2) / scale;
}

when('the lockup of the eye and the word', () => {
  const builtCss = (): string =>
    readdirSync(join(DIST, '_astro'))
      .filter((f) => f.endsWith('.css'))
      .map((f) => readText(join(DIST, '_astro', f)))
      .join('\n')
      .replace(/\s+/g, '');
  const docs = (): string => readText(join(DIST, 'docs/install/index.html'));
  const home = (): string => readText(join(DIST, 'index.html'));

  it('has the word’s ink within half a pixel of the middle of its box, in the bar, the foot and the docs’ header', async () => {
    const words = [
      ['the bar', /<a class="brand" href="#top" aria-label="mnema, top of the page"><svg[\s\S]*?<\/svg>\s*(<svg[\s\S]*?<\/svg>)\s*<\/a>/.exec(home())?.[1]],
      ['the docs header', /<span class="word">(<svg[\s\S]*?<\/svg>)\s*<\/span>/.exec(docs())?.[1]],
    ] as const;
    for (const [where, svg] of words) {
      expect(svg, `${where}: the word is drawn`).toBeDefined();
      const offset = await offsetOf(svg as string);
      expect(Math.abs(offset), `${where}: the word's ink is ${offset.toFixed(2)} px from the middle of its box`).toBeLessThanOrEqual(0.5);
    }
    const foot = /<footer\b[\s\S]*?<a class="brand"[^>]*>(?:<svg[\s\S]*?<\/svg>)\s*(<svg[\s\S]*?<\/svg>)\s*<\/a>/.exec(home())?.[1];
    expect(Math.abs(await offsetOf(foot as string)), 'the foot').toBeLessThanOrEqual(0.5);
  });

  it('puts the eye and the word on one row that centres them, and moves neither off it', () => {
    const css = builtCss();
    expect(css, 'the docs header row centres its children').toMatch(/\.site-title\{[^}]*align-items:center/);
    const row = /\.home\.brand\{([^}]*)\}/.exec(css)?.[1] ?? '';
    expect(row, 'the home page’s row is a flex row that centres its children').toMatch(/display:flex/);
    expect(row).toMatch(/align-items:center/);
    // The eye is drawn on a box that is centred on its own middle, so the box's middle is the eye's.
    for (const eye of [/<span class="mark only-dark">(<svg[^>]*>)/.exec(docs())?.[1], /<a class="brand"[^>]*>(<svg[^>]*>)/.exec(home())?.[1]]) expect(eye, 'the eye is on a centred box').toContain('viewBox="-48 -48 96 96"');
    const source = readText(join(SITE, 'src/styles/site.css')) + readText(join(SITE, 'src/styles/home.css'));
    for (const rule of source.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}@]+)\{([^{}]*)\}/g)) {
      if (/\.word|\.brand\s+svg|\.mark\s+svg/.test(rule[1] ?? '')) expect(rule[2], `${(rule[1] ?? '').trim()} moves the picture off the row`).not.toMatch(/margin|transform|position|(?<![-\w])top\s*:|vertical-align/);
    }
  });
});
