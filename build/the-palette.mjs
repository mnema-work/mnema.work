// The colours and the two typefaces of the site, in the brand. The colours the brand owns are READ from its palette in the
// checkout of the release (`.github/the-brand/palette.mjs`) and never typed here; what is typed here is only what the
// site needs and the brand has no name for: the surfaces under the cards, the hairlines, the red of a failure. Each of those
// greys is warm like the brand's (the channels of every one within 17 units of each other), and the one hue besides the
// brand's own is the red of failure, which is the red of the page the binary writes for `/record/`.
//
// The home page reads this through `src/styles/home.css` (which a test holds to it) and the docs through `themeCss`, so a
// reader who goes from / to /docs/ stays in one palette. Nothing outside this file and `the-mark.mjs` writes a colour.

/** The names of the brand's palette the site takes, as they are in `.github/the-brand/palette.mjs`. */
const FROM_THE_BRAND = Object.freeze(['charcoal', 'bone', 'paper', 'stone', 'darkStone', 'sulphur', 'lineDark', 'lineLight', 'dimDark', 'dimLight']);

/** What the site adds: warm greys, and the red of what does not hold. */
const OWN = Object.freeze({
  /** The plate under a card, a code block and a chat. */
  surface: '#1c1c1a',
  /** The hairline between two sections and round a card. */
  rule: '#34342f',
  /** What the person said in the demo of a session. */
  bubble: '#2a2a27',
  /** The ground of a refusal: charcoal with a trace of the sulphur. */
  refusalGround: '#1f1f14',
  /** What does not hold, as the page of the record paints a failure. */
  red: '#ff7b72',
  redLine: '#5c3a3a',
});

/**
 * The colours of the site, from the brand's palette: the brand's names as they are, the site's own, and the roles the page
 * is painted by (`ground`, `ink`, `dim`, `accent`, `pending`, `onAccent`). Where only the colour says a state, what waits is
 * stone: a decision in force and a record verified are the accent, what waits is the stone, and only a failure is red.
 * @param {any} brand the `PALETTE` of `.github/the-brand/palette.mjs`
 */
export function sitePalette(brand) {
  const taken = Object.fromEntries(
    FROM_THE_BRAND.map((name) => {
      if (typeof brand[name] !== 'string') throw new Error(`the brand's palette has no "${name}"`);
      return [name, brand[name]];
    }),
  );
  return Object.freeze({
    ...taken,
    ...OWN,
    ground: taken.charcoal,
    ink: taken.bone,
    dim: taken.stone,
    accent: taken.sulphur,
    pending: taken.stone,
    onAccent: taken.charcoal,
  });
}

/** `--<kebab-name>: <colour>` for every colour of the palette: the one file the home page's colours are read from. */
export function paletteCss(palette) {
  const kebab = (name) => name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
  return [':root {', ...Object.entries(palette).map(([name, value]) => `  --${kebab(name)}: ${value};`), '}', ''].join('\n');
}

/** The typefaces, self-hosted from the build: the family names the @fontsource packages declare. */
export const FONTS = Object.freeze({ mono: 'IBM Plex Mono', sans: 'Archivo Variable' });

/**
 * What `themeOf` is given. Dark is the page of the brand: charcoal, with the bone for ink and the sulphur for accent.
 * Light is the dark inverted: paper for the ground, charcoal for the ink and for the accent (in a light ground the sulphur
 * is not an accent: charcoal and weight carry it).
 * @param {any} palette what `sitePalette` returns
 */
export function themeColours(palette) {
  return {
    ACCENT: Object.freeze({ dark: palette.sulphur, light: palette.charcoal }),
    PAGE: Object.freeze({ dark: palette.charcoal, light: palette.paper }),
    INK: Object.freeze({ dark: palette.bone, light: palette.charcoal }),
  };
}
