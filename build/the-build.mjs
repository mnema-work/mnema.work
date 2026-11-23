// The steps of the build that touch the disk. The readings themselves are in `the-pages.mjs`. Every step that reads the
// product takes `root`, the checkout of one release tag (`the-product.mjs`); none has a default.

import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, posix } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  copyOf,
  docNames,
  docsIndexOf,
  headerLinksOf,
  factsOf,
  headOfTheRecord,
  llmsTxt,
  pageOf,
  pitchOf,
  templateOf,
  themeCss,
  sidebarOf,
  sitemapWith,
  stepsOf,
  verifyCommandOf,
  withoutWhatIsNotOnTheSite,
} from './the-pages.mjs';
import { blinkingMarkSvg, cardSvg, faviconPng, faviconSvg, fieldSource, FIELD_COPY, heroSvg, markSvg, ringOf, stepsSvg, theBrand, theOutline, wordmarkSvg } from './the-mark.mjs';
import { contributorsOf, hostsOf, installOf, verdictLinesOf } from './the-home.mjs';
import { frameOf } from './the-hero-field.mjs';
import { HOSTS_DIR, ownersOf, withLogos } from './the-hosts.mjs';
import { paletteCss, sitePalette, themeColours } from './the-palette.mjs';
import { releaseDateOf, tagOf } from './the-product.mjs';
import { theFailureOfTheCommit, theRefusalOfTheBinary, theVerdictOfTheCommit } from './the-record.mjs';
import { CONTACT, SITE, SITE_URL } from './the-site.mjs';

export { SITE };

/** Everything `prepare` writes, and nothing else: all of it is ignored by git. */
export const WRITTEN = Object.freeze([
  'src/content/docs/docs',
  // The home page is `src/pages/index.astro` now: a page of the content collection at the root would take its address.
  'src/content/docs/index.md',
  'src/content/docs/404.md',
  'src/assets',
  'src/generated',
  'public',
]);

/** Every Markdown file under `docs/` of the checkout, folders included, as paths from `docs/` (`reference/cli/init.md`), sorted. */
export function docFiles(root) {
  const under = (dir) =>
    readdirSync(join(root, 'docs', dir), { withFileTypes: true }).flatMap((entry) => {
      const path = posix.join(dir, entry.name);
      if (entry.isDirectory()) return under(path);
      return entry.name.endsWith('.md') ? [path] : [];
    });
  return under('').sort();
}

/**
 * The pages of `docs/` of the checkout: their names (a page in a folder is `<folder>/<page>`) and `read`, the text of one
 * by its name as the site holds it, which is what an index page of a folder is read as.
 */
export function docsOf(root) {
  const files = docFiles(root);
  return {
    files,
    names: docNames(files.map((f) => `docs/${f}`)),
    read: (name) => withoutWhatIsNotOnTheSite(readFileSync(join(root, 'docs', `${name}.md`), 'utf8'), `docs/${name}.md`),
  };
}

/** What the site is built from, read now: the checkout's tag, commit and packages say it, nothing is typed here. */
export async function theFacts(root, { check = false } = {}) {
  const sha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  const json = (path) => JSON.parse(readFileSync(join(root, path), 'utf8'));
  const { EXTENSION_NAME } = await import(pathToFileURL(join(root, 'packages/vscode/build/the-extension-name.mjs')).href);
  // The directories the commit holds: a link to one is written with its closing slash, as the page of a directory is.
  const directories = new Set(execFileSync('git', ['ls-tree', '-r', '-d', '--name-only', 'HEAD'], { cwd: root, encoding: 'utf8' }).split('\n').filter(Boolean));
  return Object.assign(factsOf({
    codePackage: json('packages/code/package.json'),
    extensionPackage: json('packages/vscode/package.json'),
    extensionName: EXTENSION_NAME,
    sha,
    // A check has no release tag: its pages link to the commit it was run on.
    tag: check ? sha : tagOf(root),
  }), { directories });
}

/**
 * Writes the pages, the pictures, the colour and the build's facts under this repository's `src/` and `public/`.
 * With `check` the checkout may be at any commit and unbuilt: everything the docs and the home page read from files is
 * read and fails as in a release build, and the verdict of the record, which needs the product built, is left out.
 */
export async function prepare({ root, site = SITE, check = false }) {
  // Before anything is written: a checkout from before the brand is refused, and the files already here stay as they were.
  const brand = await theBrand(root);
  const palette = sitePalette(brand.PALETTE);
  const facts = await theFacts(root, { check });
  const readme = readFileSync(join(root, 'README.md'), 'utf8');
  const { files, names: docs, read } = docsOf(root);

  for (const path of WRITTEN) rmSync(join(site, path), { recursive: true, force: true });
  const into = (path) => {
    mkdirSync(dirname(join(site, path)), { recursive: true });
    return join(site, path);
  };

  for (const file of files) {
    const name = file.slice(0, -3);
    const markdown = readFileSync(join(root, 'docs', file), 'utf8');
    writeFileSync(into(`src/content/docs/docs/${file}`), pageOf({ name, markdown, facts, docs }));
  }

  // The microcopy: each key the build takes is written down, so a key nothing takes is found.
  const microcopy = copyOf(readFileSync(join(site, 'copy.md'), 'utf8'));
  const taken = new Set();
  const copy = (key) => {
    const text = microcopy.get(key);
    if (text === undefined) throw new Error(`copy.md has no entry "${key}"`);
    taken.add(key);
    return text;
  };

  // /docs/ itself: the table of contents, from the README's groups and the record page.
  const sidebar = sidebarOf({ readme, facts, docs, read, record: { label: copy('record'), link: '/record/' } });
  writeFileSync(
    into('src/content/docs/docs/index.md'),
    docsIndexOf({ sidebar, title: copy('docs-title'), description: copy('docs-description'), copy, steps: stepsOf(read('first-record')) }),
  );
  // The two links the header carries beside GitHub: read by `src/components/SocialIcons.astro`.
  // The descriptor beside the mark in the docs' header, read by `src/components/SiteTitle.astro`.
  writeFileSync(into('src/generated/descriptor.json'), `${JSON.stringify({ text: copy('header-descriptor') })}\n`);
  writeFileSync(into('src/generated/header.json'), `${JSON.stringify(headerLinksOf({ sidebar, docs: copy('header-docs') }))}\n`);

  // The page that is not a page of `docs/`: a tracked template, filled the same way. The home page is not written
  // here: it is `src/pages/index.astro`, which reads `src/generated/home.json`.
  const notFound = readFileSync(join(site, 'not-found.md'), 'utf8');
  writeFileSync(into('src/content/docs/404.md'), templateOf({ template: notFound, readme, facts, docs, copy }));

  // Every recording the repository holds is carried, because a page of docs/ may show any of them.
  for (const file of readdirSync(join(root, 'recordings')).filter((f) => f.endsWith('.gif'))) {
    cpSync(join(root, 'recordings', file), into(`public/recordings/${file}`));
  }
  // What /record/ says of itself in a search result: two entries of the microcopy, kept for the step after Astro.
  writeFileSync(into('src/generated/record.json'), `${JSON.stringify({ title: copy('record-title'), description: copy('record-description') })}\n`);
  writeFileSync(into('src/generated/copy.json'), `${JSON.stringify({ copyTaken: [...taken].sort() }, null, 2)}\n`);

  // What the home page shows and does not say in its own words: counts, hosts, commands and the verdict, all read here.
  const hostsPage = readFileSync(join(root, 'docs/hosts.md'), 'utf8');
  const verdict = check ? null : theVerdictOfTheCommit({ root, sha: facts.sha, command: verifyCommandOf(readme) });
  // The two outputs the "Change one word" illustration shows, and the sentence of the session demo's refusal: all three
  // are what the binary of the tag prints, captured here. A check has no binary, so it has none of them.
  const failure = check ? null : theFailureOfTheCommit({ root, sha: facts.sha, command: verifyCommandOf(readme) });
  const refusal = check ? null : await theRefusalOfTheBinary({ root });
  const hosts = hostsOf(readme);
  const shown = withLogos(hosts.hosts, { dir: join(site, HOSTS_DIR), root });
  const ring = ringOf(brand, shown.length);
  const contributors = contributorsOf(readme, root);
  writeFileSync(
    into('src/generated/home.json'),
    `${JSON.stringify(
      {
        hosts: shown.map((host, i) => ({ ...host, place: ring.places[i] })),
        owners: ownersOf(shown),
        ring: { width: ring.width, height: ring.height },
        contributors: {
          title: contributors.title,
          thanks: contributors.thanks,
          people: contributors.people.map(({ login, profile, image }) => ({ login, profile, image: `/assets/${image.split('/').pop()}` })),
        },
        install: installOf({ readme, hostsPage }),
        verdict: { command: verifyCommandOf(readme), lines: verdict === null ? [] : verdictLinesOf(verdict) },
        failure: failure ?? { lines: [], before: '', after: '' },
        refusal,
        links: {
          npm: facts.npmUrl,
          marketplace: `https://marketplace.visualstudio.com/items?itemName=${facts.extensionId}`,
          github: facts.repoUrl,
          sha: facts.sha,
        },
        contact: CONTACT,
        description: facts.description,
        owner: facts.owner,
        version: facts.version,
        tag: facts.tag,
        card: { alt: pitchOf(withoutWhatIsNotOnTheSite(readme, 'README.md')).title },
      },
      null,
      2,
    )}\n`,
  );
  // The pictures of the page, from the brand: the ring's lines and the four steps on a line of the field, the hero's field at
  // rest, and the brand's own `field.mjs`, which the page's script draws the hero's lines with while the pointer moves.
  writeFileSync(into('src/generated/ring.svg'), ring.svg);
  writeFileSync(into('src/generated/steps.svg'), stepsSvg(brand));
  writeFileSync(into('src/generated/hero.svg'), heroSvg(brand, frameOf));
  writeFileSync(into(FIELD_COPY), await fieldSource(root));

  // The vendors' logos, as they are tracked here, untouched: the page shows only those `hosts/SOURCES.md` lists.
  for (const file of existsSync(join(site, HOSTS_DIR)) ? readdirSync(join(site, HOSTS_DIR)).filter((f) => f !== 'SOURCES.md') : []) {
    cpSync(join(site, HOSTS_DIR, file), into(`public/${HOSTS_DIR}/${file}`));
  }

  for (const file of readdirSync(join(root, 'docs/assets'))) {
    cpSync(join(root, 'docs/assets', file), into(`public/assets/${file}`));
  }

  writeFileSync(into('src/generated/theme.css'), themeCss(themeColours(palette)));
  writeFileSync(into('src/generated/palette.css'), paletteCss(palette));
  // The favicon is the product's own, the one its record page wears, and it needs the product built: a check does not
  // build it, and the site it makes is never published.
  if (!check) {
    const favicon = await faviconSvg(root);
    writeFileSync(into('public/favicon.svg'), favicon);
    writeFileSync(into('public/favicon.png'), await faviconPng(favicon));
    // The touch icon of a phone's home screen, and the logo of the structured data (a raster, which every search engine takes).
    writeFileSync(into('public/apple-touch-icon.png'), await faviconPng(favicon, 180));
    writeFileSync(into('public/logo.png'), await faviconPng(favicon, 512));
  }
  // The domain the pages are served from, read by GitHub Pages from the published output.
  writeFileSync(into('public/CNAME'), `${new URL(SITE_URL).host}\n`);
  // The mark beside the name, in the docs' header: the brand's eye, still, in each theme (on the light page in its charcoal
  // seal: the eye is never inverted). A check draws it too: the eye needs no installed package.
  for (const theme of ['dark', 'light']) {
    writeFileSync(into(`src/assets/mark-${theme}.svg`), markSvg(brand, theme, 28, `mark-eye-${theme}`));
  }
  writeFileSync(into('src/generated/eye-foot.svg'), markSvg(brand, 'dark', 28, 'mark-eye-foot'));
  // The home page's: the eye that blinks (the bar's, the ring's and the quick start's, each at its own point of the cycle),
  // the word, and the sizes they are drawn at.
  writeFileSync(into('src/generated/eye-bar.svg'), blinkingMarkSvg(brand, { id: 'eye-bar', begin: -6.1 }, 30));
  writeFileSync(into('src/generated/eye-ring.svg'), blinkingMarkSvg(brand, { id: 'eye-ring', begin: -3.4 }, 128));
  writeFileSync(into('src/generated/eye-start.svg'), blinkingMarkSvg(brand, { id: 'eye-start', begin: -0.8 }, 72));
  writeFileSync(into('src/generated/word.svg'), wordmarkSvg(brand, 15));
  writeFileSync(into('src/generated/word-docs.svg'), wordmarkSvg(brand, 16));
  writeFileSync(into('src/generated/the-build.json'), `${JSON.stringify({ version: facts.version, tag: facts.tag, sha: facts.sha, repoUrl: facts.repoUrl })}\n`);
  return facts;
}

/**
 * The social card, `og.png` at the root of the built site: the brand's field, the eye at rest, the word and the README's
 * pitch as outlines, on charcoal, 1200 by 630 and still, rasterized by `sharp` (which `astro` installs; `package.json`
 * names it). Run after `astro build`. It needs the brand's `outline.mjs`, which reads fonts with `opentype.js` of the
 * product's install: only a release has it, so a check does not write the card.
 * @returns {Promise<Buffer>} the PNG written
 */
export async function writeTheCard({ root, out = join(SITE, 'dist') }) {
  const brand = await theBrand(root);
  const outline = await theOutline(root);
  const { default: sharp } = await import('sharp');
  const pitch = pitchOf(withoutWhatIsNotOnTheSite(readFileSync(join(root, 'README.md'), 'utf8'), 'README.md'));
  const png = await sharp(Buffer.from(cardSvg(brand, outline, pitch))).png().toBuffer();
  writeFileSync(join(out, 'og.png'), png);
  return png;
}

/**
 * What /record/ needs besides the page the binary wrote: its line in the sitemap, which Astro wrote before the page
 * existed, and the release date every line of the sitemap carries as `lastmod`. Its head is not completed here: `theHeadOfTheRecord` is what `mnema site --head` is handed.
 */
export async function completeTheSitemap({ root, out = join(SITE, 'dist') }) {
  const facts = await theFacts(root);
  const map = join(out, 'sitemap-0.xml');
  writeFileSync(map, sitemapWith(readFileSync(map, 'utf8'), `${facts.homeUrl}record/`, releaseDateOf(root)));
}

/** What /record/ says of itself: its two entries of the microcopy, read where `prepare` wrote them, and the facts. */
export async function theHeadOfTheRecord({ root, site = SITE }) {
  const { title, description } = JSON.parse(readFileSync(join(site, 'src/generated/record.json'), 'utf8'));
  return headOfTheRecord({ title, description, facts: await theFacts(root) });
}

/** What goes beside the built pages: `llms.txt` and `robots.txt`, from the same sources. */
export async function writeTheRest({ root, out = join(SITE, 'dist') }) {
  const facts = await theFacts(root);
  const readme = readFileSync(join(root, 'README.md'), 'utf8');
  writeFileSync(join(out, 'llms.txt'), llmsTxt({ readme, facts }));
  writeFileSync(join(out, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${facts.siteUrl}${facts.base}/sitemap-index.xml\n`);
}


/** The two typefaces the site serves, and the packages they come from: the Open Font Licence asks that its text travel with them. */
export const FONT_PACKAGES = Object.freeze(['@fontsource-variable/archivo', '@fontsource/ibm-plex-mono']);

/** `fonts-licence.txt` at the root of the built site: the licence of each typeface, as its package carries it. */
export function writeTheFontLicences({ out = join(SITE, 'dist') } = {}) {
  const text = FONT_PACKAGES.map((name) => {
    const licence = readFileSync(join(SITE, 'node_modules', name, 'LICENSE'), 'utf8').trim();
    return `${name}\n${'='.repeat(name.length)}\n\n${licence}\n`;
  }).join('\n');
  writeFileSync(join(out, 'fonts-licence.txt'), text);
}
