// The mark of the brand, read from the checkout of the product's release and never typed here: the eye beside the name in
// the docs' header and on the home page, and the favicon. Their geometry is `eye.mjs` and their colours `palette.mjs` of
// `.github/the-brand/`; the favicon is the very file the product's own page, `/record/`, wears, so a domain has one.
// A checkout of a tag from before the brand has neither file, and the site is not built from it (`theBrand`).
//
// This is the one file that assembles a picture: it may hold the markup of an SVG and no colour and no shape. Of the
// brand's files it loads only the two that need no installed package (`eye.mjs`, `palette.mjs`), so a check of the docs,
// which runs on a product that is neither installed nor built, draws the same eye a release does.

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

/** The files of the brand's module the site reads, from the root of the checkout. */
const EYE = '.github/the-brand/eye.mjs';
const PALETTE_FILE = '.github/the-brand/palette.mjs';

/** The product's built file that holds the favicon of its record page, as a `data:` URL. */
const THE_MARK_OF_THE_RECORD = 'packages/code/dist/site/the-mark.js';

/**
 * What the checkout gives the drawing: `eye` and `PALETTE`. Stops, before anything is written, on a checkout without the
 * brand: the site is built from a release that carries it, and a tag from before has no other way of being drawn here.
 * @param {string} root the checkout of the product
 */
export async function theBrand(root) {
  for (const file of [EYE, PALETTE_FILE]) {
    if (!existsSync(join(root, file))) {
      throw new Error(`${root} has no ${file}: the site is built from a release that carries the brand, and this checkout is from before it`);
    }
  }
  const load = (path) => import(pathToFileURL(join(root, path)).href);
  const { eye } = await load(EYE);
  const { PALETTE } = await load(PALETTE_FILE);
  return { eye, PALETTE };
}

/** What each theme draws the eye with: dark, the lines in bone and no ring; light, the lines in charcoal and a ring round the iris. */
const inkOf = ({ PALETTE }, theme) =>
  theme === 'dark'
    ? { ink: PALETTE.bone, iris: PALETTE.sulphur, ringInk: PALETTE.charcoal, ring: false }
    : { ink: PALETTE.charcoal, iris: PALETTE.sulphur, ringInk: PALETTE.charcoal, ring: true };

/**
 * The eye at rest, still, in the paints of ONE theme, for a page that knows its theme (the docs' header, the home page).
 * `id` names the clip of the eye: a page that draws it twice gives each its own.
 * @param {{ eye: Function, PALETTE: Record<string, string> }} brand
 * @param {'dark' | 'light'} theme
 */
export function markSvg(brand, theme, size = 28, id = 'mark-eye') {
  const inside = brand.eye({ id, look: 0, ...inkOf(brand, theme) });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-48 -48 96 96" width="${size}" height="${size}" aria-hidden="true" focusable="false">${inside}</svg>\n`;
}

/** The favicon: the bytes of the SVG the product's record page carries, decoded from its `FAVICON`. @param {string} root */
export async function faviconSvg(root) {
  const { FAVICON } = await import(pathToFileURL(join(root, THE_MARK_OF_THE_RECORD)).href);
  const [kind, body] = typeof FAVICON === 'string' ? FAVICON.split(',') : [];
  if (!kind?.includes('svg+xml') || !kind.endsWith(';base64') || body === undefined) {
    throw new Error(`${THE_MARK_OF_THE_RECORD} does not export the favicon as a base64 SVG`);
  }
  return Buffer.from(body, 'base64').toString('utf8');
}

/** The fallback for the browsers that draw no SVG in a tab: the same drawing, 64 pixels, rasterized by `sharp`. */
export async function faviconPng(svg, size = 64) {
  const { default: sharp } = await import('sharp');
  return sharp(Buffer.from(svg), { density: 384 }).resize(size, size).png().toBuffer();
}
