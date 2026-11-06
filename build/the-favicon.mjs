// The favicon: the bare M of the console's wordmark with its solid shadow, no tile, drawn from the same source the
// extension's icon is drawn from (`THE_BLOCKS`, `letterCells`, `CELL`, `inkFoot`, `PAGE`, `ACCENT` of the checkout of
// the product). One SVG answers the browser's colour scheme from inside itself, and a PNG is the fallback for the
// browsers that draw no SVG in a tab. Nothing is kept in this repository as a file with no source.

import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

/** The side of the drawing, and the share of it the letter's width takes: wide, because there is no tile around it. */
const SIDE = 512;
const SHARE = 0.86;
/** How far the shadow sits down and to the right, as a share of the side (4 pixels of the extension's 128). */
const OFFSET = 4 / 128;
/** The share of the accent in the shadow: the accent mixed into the page. */
const SHADOW_SHARE = 0.45;

const mix = (ground, paint, share) => {
  const channel = (hex, i) => Number.parseInt(hex.slice(i, i + 2), 16);
  return `#${[1, 3, 5].map((i) => Math.round(channel(ground, i) * (1 - share) + channel(paint, i) * share).toString(16).padStart(2, '0')).join('')}`;
};

/** What the checkout of the product gives the drawing: the rows of the wordmark, the colours, the letter's cells. */
export async function theSources(root) {
  const load = (path) => import(pathToFileURL(join(root, path)).href);
  const { THE_BLOCKS } = await load('packages/code/dist/presentation/banner.js');
  const { ACCENT } = await load('.github/the-front-page/accent.mjs');
  const { CELL, inkFoot, PAGE } = await load('.github/the-front-page/draw.mjs');
  const { firstLetter, letterCells } = await load('packages/vscode/build/mark.mjs');
  return { blocks: THE_BLOCKS, ACCENT, CELL, PAGE, inkFoot, firstLetter, letterCells };
}

/** The two paints of a theme: the letter in the accent, its shadow the accent mixed into the page. */
export const paintsOf = ({ ACCENT, PAGE }, theme) => ({ letter: ACCENT[theme], shadow: mix(PAGE[theme], ACCENT[theme], SHADOW_SHARE) });

/** The two paths of the drawing, each the letter's full blocks as one path: the letter, and the same letter shifted. */
function pathsOf(sources) {
  const { blocks, CELL, inkFoot, firstLetter, letterCells } = sources;
  const width = (firstLetter(blocks)[0]?.length ?? 0) * CELL.w;
  const scale = (SIDE * SHARE) / width;
  const x0 = (SIDE - width * scale) / 2;
  const y0 = (SIDE - inkFoot(blocks) * scale) / 2;
  const off = OFFSET * SIDE;
  const letter = (dx, dy) =>
    letterCells(blocks)
      .map(([c, r]) => `M${(x0 + dx + c * CELL.w * scale).toFixed(2)} ${(y0 + dy + r * CELL.h * scale).toFixed(2)}h${(CELL.w * scale).toFixed(2)}v${(CELL.h * scale).toFixed(2)}h${(-CELL.w * scale).toFixed(2)}z`)
      .join('');
  return { letter: letter(0, 0), shadow: letter(off, off) };
}

const OPEN = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIDE}" height="${SIDE}" viewBox="0 0 ${SIDE} ${SIDE}">`;

/**
 * The favicon as an SVG. The light paints are the ones it has; the dark ones replace them under
 * `prefers-color-scheme: dark`, which a browser applies to an SVG used as an icon.
 * @returns {string}
 */
export function faviconSvg(sources) {
  const { letter, shadow } = pathsOf(sources);
  const light = paintsOf(sources, 'light');
  const dark = paintsOf(sources, 'dark');
  return `${OPEN}<style>.shadow{fill:${light.shadow}}.letter{fill:${light.letter}}@media (prefers-color-scheme:dark){.shadow{fill:${dark.shadow}}.letter{fill:${dark.letter}}}</style><path class="shadow" d="${shadow}"/><path class="letter" d="${letter}"/></svg>\n`;
}

/** The fallback: the same drawing in the light paints, 64 pixels, rasterized by `sharp`. */
export async function faviconPng(sources, size = 64) {
  const { letter, shadow } = pathsOf(sources);
  const paints = paintsOf(sources, 'light');
  const { default: sharp } = await import('sharp');
  const svg = `${OPEN}<path fill="${paints.shadow}" d="${shadow}"/><path fill="${paints.letter}" d="${letter}"/></svg>`;
  return sharp(Buffer.from(svg)).resize(size, size).png().toBuffer();
}
