// The colours and the two typefaces of the site: direction V2, the chain. They are written here and nowhere else; the
// home page and the docs both read them (the home through `src/styles/home.css`, which a test holds to this file, and
// the docs through `themeCss`), so a reader who goes from / to /docs/ stays in one palette.

/** The page, from the ground to the faintest line, and the three paints that carry meaning. */
export const PALETTE = Object.freeze({
  ground: '#0a0c10',
  raised: '#0d1015',
  surface: '#11151c',
  line: '#2b3340',
  ink: '#e6edf3',
  text: '#c9d1d9',
  muted: '#9aa4b2',
  accent: '#c4a0f5',
  shadow: '#5f517b',
  /** What verifies. */
  mint: '#7fe0c4',
  /** What does not hold. */
  red: '#ff8f8f',
  /** The rest of the page: hairlines, the raised cards, the button, the quieter greys, and the green and red grounds. */
  hair: '#1c222c',
  card: '#151a22',
  button: '#1a2029',
  faint: '#8590a0',
  soft: '#aeb7c2',
  edge: '#3a4352',
  edgeLow: '#262d38',
  onAccent: '#14101c',
  accentGround: '#151122',
  mintSoft: '#9fd9c8',
  mintDim: '#6e9a8e',
  mintLine: '#2f5d52',
  mintGround: '#0f1a18',
  redLine: '#5c3a3a',
  redGround: '#1a1012',
});

/** `--<kebab-name>: <colour>` for every colour of the palette: the one file the home page's colours are read from. */
export function paletteCss() {
  const kebab = (name) => name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
  return [':root {', ...Object.entries(PALETTE).map(([name, value]) => `  --${kebab(name)}: ${value};`), '}', ''].join('\n');
}

/** The typefaces, self-hosted from the build: the family names the @fontsource packages declare. */
export const FONTS = Object.freeze({ mono: 'JetBrains Mono', sans: 'Instrument Sans' });

/**
 * What `themeOf` is given. The dark theme is the V2 page. The light theme is a white page with the same accent, deepened
 * by `textAccent` to the shade that reads at 4.5:1 on every ground Starlight draws.
 */
export const ACCENT = Object.freeze({ dark: PALETTE.accent, light: '#997dbf' });
export const PAGE = Object.freeze({ dark: PALETTE.ground, light: '#ffffff' });
/** The ink of each theme: the V2 ink on the dark page, the page's ground on the light one. */
export const INK = Object.freeze({ dark: PALETTE.ink, light: PALETTE.ground });
