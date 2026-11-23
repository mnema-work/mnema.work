// The pictures of the brand on this site, read from the checkout of the product's release and never typed here: the eye
// beside the name in the docs' header and on the home page, the word, the four steps on a line of the field, the ring of
// hosts, the favicon and the icons, the hero's frame at rest and the social card. Their geometry is `eye.mjs`, `field.mjs`,
// `wordmark.mjs` and, for the card's text, `outline.mjs` of `.github/the-brand/`; their colours are `palette.mjs`; the
// favicon is the very file the product's own page, `/record/`, wears, so a domain has one.
// A checkout of a tag from before the brand lacks these files, and the site is not built from it (`theBrand`).
//
// THE EYE IS NEVER INVERTED. On a dark ground it is drawn as is (bone lines, a sulphur iris with no ring); on a light ground
// it is the same dark eye in a charcoal seal, a rounded square (`sealed: true` of the brand's `eye`). THE EYE BLINKS ONLY
// WHERE IT IS ALLOWED TO: the home page's bar, ring and quick start; the docs' header, the favicon, the icons and the card
// hold it still. A blinking eye holds two copies of itself in one clip, the one that moves and the one at rest, and a media
// query inside the SVG swaps them under `prefers-reduced-motion`, because SMIL is not stopped by a stylesheet of the page.
//
// This is the one file that assembles a picture: it may hold the markup of an SVG and no colour. A colour of a picture is a
// value of the brand's palette, or a CSS class the page's stylesheet paints from the site's palette (`the-palette.mjs`).
// Of the brand's files it loads only those that need no installed package, so a check of the docs, which runs on a product
// that is neither installed nor built, draws the same eye a release does; `outline.mjs` (it needs `opentype.js`) is loaded
// only by the build that writes the card (`theOutline`).

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

/** The files of the brand's module the site reads, from the root of the checkout. */
const BRAND_FILES = Object.freeze({
  eye: '.github/the-brand/eye.mjs',
  palette: '.github/the-brand/palette.mjs',
  wordmark: '.github/the-brand/wordmark.mjs',
  field: '.github/the-brand/field.mjs',
});
/** The brand's file of the text outlines, and the product's built file that holds the favicon of its record page, as a `data:` URL. */
const OUTLINE = '.github/the-brand/outline.mjs';
const THE_MARK_OF_THE_RECORD = 'packages/code/dist/site/the-mark.js';
/** Where the brand's `field.mjs` is copied to for the page's script, which draws the hero's lines as time passes. */
export const FIELD_COPY = 'src/generated/field.mjs';

/**
 * What the checkout gives the drawing: the eye, the word and the field, and the `PALETTE`. Stops, before anything is
 * written, on a checkout without the brand: the site is built from a release that carries it, and a tag from before has no
 * other way of being drawn here.
 * @param {string} root the checkout of the product
 */
export async function theBrand(root) {
  for (const file of Object.values(BRAND_FILES)) {
    if (!existsSync(join(root, file))) {
      throw new Error(`${root} has no ${file}: the site is built from a release that carries the brand, and this checkout is from before it`);
    }
  }
  const load = (path) => import(pathToFileURL(join(root, path)).href);
  const [eye, palette, wordmark, field] = await Promise.all(Object.values(BRAND_FILES).map(load));
  return {
    tick: tickOf(root),
    eye: eye.eye,
    blinkingInside: eye.blinkingInside,
    ALMOND: eye.ALMOND,
    sealRect: eye.sealRect,
    PALETTE: palette.PALETTE,
    wordmark: wordmark.wordmark,
    field: { line: field.line, smooth: field.smooth, relative: field.relative, f: field.f },
  };
}

/** The brand's picture of the diagram of how it works, which carries the one ticked point of the brand's signs. */
const TICKED = 'docs/assets/how-it-works-dark.svg';

/**
 * The tick of the brand's ticked point (a record verified), read from the diagram the release carries rather than typed here:
 * the brand draws it in `diagrams.mjs`, which needs `opentype.js` and is not loaded by a check, and does not export it. The
 * path is read as it is drawn, relative to the centre of its point, and `r` is the radius of that point.
 * @param {string} root
 * @returns {{ d: string, width: number, r: number }}
 */
export function tickOf(root) {
  const file = join(root, TICKED);
  if (!existsSync(file)) throw new Error(`${root} has no ${TICKED}: the tick of the steps is read from it`);
  const svg = readFileSync(file, 'utf8');
  const m = /<circle cx="([\d.]+)" cy="([\d.]+)" r="([\d.]+)" fill="[^"]*"\/><circle class="h[^>]*\/><path d="M([\d.]+),([\d.]+)(l[^"]*)" fill="none" stroke="[^"]*" stroke-width="([\d.]+)" stroke-linecap="round" stroke-linejoin="round"\/>/.exec(svg);
  if (m === null) throw new Error(`${TICKED} no longer draws a ticked point the way the site reads it`);
  const [cx, cy, r, x, y] = [m[1], m[2], m[3], m[4], m[5]].map(Number);
  const round = (n) => Math.round(n * 100) / 100;
  return { d: `M${round(x - cx)},${round(y - cy)}${m[6]}`, width: Number(m[7]), r };
}

/** The text outlines of the brand, which need `opentype.js` of the product's install: for the card, which a release writes. @param {string} root */
export async function theOutline(root) {
  return import(pathToFileURL(join(root, OUTLINE)).href);
}

/** The brand's `field.mjs`, as the bytes the page's script is given. @param {string} root */
export async function fieldSource(root) {
  const { readFileSync } = await import('node:fs');
  return readFileSync(join(root, BRAND_FILES.field), 'utf8');
}

const VIEW = 'viewBox="-48 -48 96 96"';

/** The ink the eye is drawn with on any ground: the lines in bone, the iris in sulphur. The eye is never inverted. */
const eyeInk = ({ PALETTE }) => ({ ink: PALETTE.bone, iris: PALETTE.sulphur });

/**
 * The eye at rest, still, for a page that knows its theme (the docs' header): on the dark page as it is, on the light page
 * in the charcoal seal. `id` names the clip of the eye: a page that draws it twice gives each its own.
 * @param {ReturnType<typeof theBrand> extends Promise<infer B> ? B : never} brand
 * @param {'dark' | 'light'} theme
 */
export function markSvg(brand, theme, size = 28, id = 'mark-eye') {
  const inside = brand.eye({ id, look: 0, ...eyeInk(brand), sealed: theme === 'light' });
  return `<svg xmlns="http://www.w3.org/2000/svg" ${VIEW} width="${size}" height="${size}" aria-hidden="true" focusable="false">${inside}</svg>\n`;
}

/**
 * The eye on the home page's dark ground, blinking on the brand's cycle, and still under `prefers-reduced-motion`: the
 * brand's two copies in one clip. `begin` is where in the cycle this eye starts, a fixed number so that a picture is its bytes.
 * @param {number} [size]
 * @param {{ id: string, begin: number }} where
 */
export function blinkingMarkSvg(brand, { id, begin }, size = 28) {
  const moving = `${id}-moving`;
  const still = `${id}-still`;
  const swap = `.${still}{display:none}@media (prefers-reduced-motion:reduce){.${moving}{display:none}.${still}{display:inline}}`;
  const ink = eyeInk(brand);
  const inside = `<clipPath id="${id}"><path d="${brand.ALMOND}"/></clipPath><g clip-path="url(#${id})"><g class="${moving}">${brand.blinkingInside({ ...ink, begin })}</g><g class="${still}">${brand.blinkingInside(ink)}</g></g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" ${VIEW} width="${size}" height="${size}" aria-hidden="true" focusable="false"><style>${swap}</style>${inside}</svg>\n`;
}

/**
 * The word, drawn as strokes by the brand and painted by the text colour of where it sits (`currentColor`), at `height`.
 * @param {number} height
 */
export function wordmarkSvg(brand, height = 20) {
  const { box, body } = brand.wordmark('currentColor');
  const [x, , w, h] = box;
  // The word is centred on the eye by its visual middle: the band of its lowercase letters, from the top of their arches to the
  // baseline, and not the middle of the brand's box, which holds the room of the tall stem above and the overshoot below. The
  // brand's box is `[.., -X - STEM - 2, .., X + STEM + 6]` (x-height X, weight STEM, the heaviest stroke of the body): from it,
  // the band is `[-X - 0.44 STEM, 0]` (an arch is drawn 0.88 STEM wide), and the view box is the same height, moved to be centred on it.
  const stem = Math.max(...[...body.matchAll(/stroke-width="([\d.]+)"/g)].map((m) => Number(m[1])));
  const xHeight = -box[1] - stem - 2;
  const middle = -(xHeight + 0.44 * stem) / 2;
  const y = Math.round((middle - h / 2) * 100) / 100;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${Math.round((w / h) * height)}" height="${height}" aria-hidden="true" focusable="false">${body}</svg>\n`;
}

/** The four signs of the steps, in the order of the steps: a ring, a point, a point, and a point with a tick. */
const SIGNS = Object.freeze(['hollow', 'solid', 'solid', 'ticked']);
const STEP_BOX = { w: 1200, h: 156, y: 78, r: 14, pitch: 22 };

/**
 * The four steps on a line of the field: lines that part round four fixed points, the first drawn as a ring (a call that
 * is settled and not yet recorded), the second and third as points, the fourth as a point with a tick. The lines and the
 * signs carry classes and no colour: the page's stylesheet paints them.
 */
export function stepsSvg(brand) {
  const { line, smooth, relative, f } = brand.field;
  const centres = [0, 1, 2, 3].map((i) => 150 + 300 * i);
  const stones = centres.map((x) => [x, STEP_BOX.y, STEP_BOX.r, 1]);
  let d = '';
  for (let k = -4; k <= 3; k++) d += relative(smooth(line(STEP_BOX.y + (k + 0.5) * STEP_BOX.pitch, stones, 0, STEP_BOX.w, 60)));
  const signs = centres
    .map((x, i) => {
      const tick = SIGNS[i] === 'ticked' ? `<path class="tick" d="${brand.tick.d}" stroke-width="${brand.tick.width}" transform="scale(${f(STEP_BOX.r / brand.tick.r)})"/>` : '';
      return `<g class="sign ${SIGNS[i]}" transform="translate(${f(x)},${STEP_BOX.y})"><circle r="${STEP_BOX.r}"/>${tick}</g>`;
    })
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" class="steps-field" viewBox="0 0 ${STEP_BOX.w} ${STEP_BOX.h}" aria-hidden="true" focusable="false"><path class="field-lines" d="${d}"/>${signs}</svg>\n`;
}

/** The ring of hosts: the frame it is laid out in, and where the `n`-th of `count` stands round it, as shares of the frame. */
const RING = { w: 1040, h: 640, rx: 420, ry: 245 };

/**
 * The ring of hosts: `count` places on an ellipse round the centre, the first at the top, and the thin lines from the
 * centre to each of them.
 * @param {number} count
 * @returns {{ svg: string, places: { left: string, top: string }[], width: number, height: number }}
 */
export function ringOf(brand, count) {
  const { f } = brand.field;
  const [cx, cy] = [RING.w / 2, RING.h / 2];
  const at = (i) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / count;
    return [cx + RING.rx * Math.cos(angle), cy + RING.ry * Math.sin(angle)];
  };
  const spots = Array.from({ length: count }, (_, i) => at(i));
  const spokes = spots.map(([x, y]) => `<line x1="${cx}" y1="${cy}" x2="${f(x)}" y2="${f(y)}"/>`).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" class="spokes" viewBox="0 0 ${RING.w} ${RING.h}" aria-hidden="true" focusable="false"><ellipse cx="${cx}" cy="${cy}" rx="${RING.rx}" ry="${RING.ry}"/><g>${spokes}</g></svg>\n`;
  return {
    svg,
    places: spots.map(([x, y]) => ({ left: `${f((x / RING.w) * 100)}%`, top: `${f((y / RING.h) * 100)}%` })),
    width: RING.w,
    height: RING.h,
  };
}

/**
 * The hero's field at rest, as the page serves it before its script runs and as it stays under `prefers-reduced-motion`:
 * the frame of the hero's geometry at the size of a large window, drawn to fill the hero whatever its box. The script
 * of the page finds the elements by their classes and moves them.
 * @param {(field: object, o: object) => any} frameOf `frameOf` of `the-hero-field.mjs`
 */
export function heroSvg(brand, frameOf, { W = 1440, H = 900 } = {}) {
  const frame = frameOf(brand.field, { W, H, drift: false, steps: Math.round(W / 32) });
  const dots = frame.dots.map((dot) => `<circle class="field-dot" cx="${dot.cx}" cy="${dot.cy}" r="${dot.r}"/>`).join('');
  const { cx, cy, rx, ry } = frame.iris;
  return `<svg xmlns="http://www.w3.org/2000/svg" id="field" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false"><path class="field-lines" d="${frame.d}"/>${dots}<circle class="field-pointer" r="0" hidden/><ellipse class="field-iris" cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"/></svg>\n`;
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

/** The favicon, or the same drawing at another size, rasterized by `sharp`: the PNG of the tab (64), the touch icon (180) and the logo of the structured data (512). */
export async function faviconPng(svg, size = 64) {
  const { default: sharp } = await import('sharp');
  return sharp(Buffer.from(svg), { density: 384 }).resize(size, size).png().toBuffer();
}

/** The social card's frame, the eye's box and where the text starts. */
/** How the card is rasterized: a palette PNG. The card has a handful of colours, and the palette changes no channel by more than 6 of 255. */
export const CARD_PNG = Object.freeze({ palette: true, colours: 64, dither: 0, effort: 10 });

const CARD = { w: 1200, h: 630, eye: { x: 880, y: 315, scale: 3.4 }, left: 84, measure: 600 };

/**
 * The social card: a charcoal ground, the field of lines parting round the eye at rest, the word, and the pitch of the
 * README as outlines of the glyphs (a link preview is an image: it loads no font, and the card holds no `<text>`).
 * @param {{ outlineOf: Function, inkOf: Function }} outline `outline.mjs` of the brand
 * @param {{ title: string, body: string }} pitch
 */
export function cardSvg(brand, outline, pitch) {
  const { PALETTE } = brand;
  const { line, smooth, f } = brand.field;
  const { x: ex, y: ey, scale } = CARD.eye;
  const reach = 43 * scale + 14;
  const stones = [[ex, ey, reach, 47 / 43]];
  let d = '';
  for (let c = ey % 26; c < CARD.h + 26; c += 26) d += smooth(line(c + 13, stones, -20, CARD.w + 20, 100));
  const word = brand.wordmark(PALETTE.bone);
  const [vx, vy, vw, vh] = word.box;
  const wordHeight = 44;
  const wordScale = wordHeight / vh;
  /** Breaks `text` into lines no wider than `limit` (in output units) in a role drawn at `size` over its own size. */
  const wrap = (text, role, factor) => {
    const lines = [];
    let current = '';
    for (const w of text.split(' ')) {
      const next = current === '' ? w : `${current} ${w}`;
      if (outline.inkOf(next, role).right * factor > CARD.measure && current !== '') {
        lines.push(current);
        current = w;
      } else current = next;
    }
    return [...lines, current];
  };
  /** A block of wrapped text as one path per line, at `factor` times the role's own size, from the baseline `y`. */
  const block = (text, role, factor, y, step, fill) =>
    wrap(text, role, factor)
      .map((one, i) => `<path fill="${fill}" transform="scale(${factor})" d="${outline.outlineOf(one, role, CARD.left / factor, (y + i * step) / factor, 'start')}"/>`)
      .join('');
  const title = block(pitch.title, 'title', 2.6, 238, 64, PALETTE.bone);
  const titleLines = wrap(pitch.title, 'title', 2.6).length;
  const body = block(pitch.body, 'prose', 1.3, 238 + (titleLines - 1) * 64 + 78, 33, PALETTE.dimDark);
  const eye = brand.eye({ id: 'card-eye', look: 0, ...eyeInk(brand) });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD.w}" height="${CARD.h}" viewBox="0 0 ${CARD.w} ${CARD.h}"><rect width="${CARD.w}" height="${CARD.h}" fill="${PALETTE.charcoal}"/><path fill="none" stroke="${PALETTE.lineDark}" stroke-width="2" stroke-linecap="round" d="${d}"/><g transform="translate(${ex},${ey}) scale(${f(scale)})">${eye}</g><g transform="translate(${CARD.left},64) scale(${f(wordScale)}) translate(${f(-vx)},${f(-vy)})">${word.body}</g>${title}${body}</svg>\n`;
}
