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
import { emptyMarkSvg, faviconPng, faviconSvg, markSvg, theSources } from './the-favicon.mjs';
import { hostsOf, installOf, MEASURED, measuredOf, verdictLinesOf } from './the-home.mjs';
import { HOSTS_DIR, ownersOf, withLogos } from './the-hosts.mjs';
import { ACCENT, INK, PAGE, paletteCss } from './the-palette.mjs';
import { tagOf } from './the-product.mjs';
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
  writeFileSync(
    into('src/generated/home.json'),
    `${JSON.stringify(
      {
        measured: measuredOf(root),
        measuredUrl: `${facts.repoUrl}/tree/${facts.tag}/${MEASURED}`,
        hosts: shown,
        owners: ownersOf(shown),
        rungs: hosts.rungs,
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
        version: facts.version,
        tag: facts.tag,
        card: { alt: pitchOf(withoutWhatIsNotOnTheSite(readme, 'README.md')).title },
      },
      null,
      2,
    )}\n`,
  );

  // The vendors' logos, as they are tracked here, untouched: the page shows only those `hosts/SOURCES.md` lists.
  for (const file of existsSync(join(site, HOSTS_DIR)) ? readdirSync(join(site, HOSTS_DIR)).filter((f) => f !== 'SOURCES.md') : []) {
    cpSync(join(site, HOSTS_DIR, file), into(`public/${HOSTS_DIR}/${file}`));
  }

  for (const file of readdirSync(join(root, 'docs/assets'))) {
    cpSync(join(root, 'docs/assets', file), into(`public/assets/${file}`));
  }

  writeFileSync(into('src/generated/theme.css'), themeCss({ ACCENT, PAGE, INK }));
  writeFileSync(into('src/generated/palette.css'), paletteCss());
  // The favicon and the mark are drawn from the wordmark in the product's BUILT code. A check does not build the product,
  // so its mark is an empty drawing: the site it makes is never published.
  const sources = check ? null : await theSources(root);
  if (!check) {
    writeFileSync(into('public/favicon.svg'), faviconSvg(sources));
    writeFileSync(into('public/favicon.png'), await faviconPng(sources));
  }
  // The domain the pages are served from, read by GitHub Pages from the published output.
  writeFileSync(into('public/CNAME'), `${new URL(SITE_URL).host}\n`);
  // The mark beside the name, in the docs' header and on the home page: the same letter as the favicon, in the paints of a theme.
  for (const theme of ['dark', 'light']) {
    writeFileSync(into(`src/assets/mark-${theme}.svg`), check ? emptyMarkSvg(28) : markSvg(sources, theme, 28));
  }
  writeFileSync(into('src/generated/the-build.json'), `${JSON.stringify({ version: facts.version, tag: facts.tag, sha: facts.sha, repoUrl: facts.repoUrl })}\n`);
  return facts;
}

/**
 * The social card, `og.png` at the root of the built site: the front page's `socialCard` of the banner's rows and the
 * README's pitch, rasterized by `sharp` (which `astro` installs; `package.json` names it). Run after `astro build`.
 * @returns {Promise<Buffer>} the PNG written
 */
export async function writeTheCard({ root, out = join(SITE, 'dist') }) {
  const { socialCard } = await import(pathToFileURL(join(root, '.github/the-front-page/draw.mjs')).href);
  const { THE_BLOCKS } = await import(pathToFileURL(join(root, 'packages/code/dist/presentation/banner.js')).href);
  const { default: sharp } = await import('sharp');
  const pitch = pitchOf(withoutWhatIsNotOnTheSite(readFileSync(join(root, 'README.md'), 'utf8'), 'README.md'));
  const png = await sharp(Buffer.from(socialCard({ blocks: THE_BLOCKS, pitch }))).png().toBuffer();
  writeFileSync(join(out, 'og.png'), png);
  return png;
}

/**
 * What /record/ needs besides the page the binary wrote: its line in the sitemap, which Astro wrote before the page
 * existed. Its head is not completed here: `theHeadOfTheRecord` is what `mnema site --head` is handed.
 */
export async function completeTheSitemap({ root, out = join(SITE, 'dist') }) {
  const facts = await theFacts(root);
  const map = join(out, 'sitemap-0.xml');
  writeFileSync(map, sitemapWith(readFileSync(map, 'utf8'), `${facts.homeUrl}record/`));
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
export const FONT_PACKAGES = Object.freeze(['@fontsource/jetbrains-mono', '@fontsource/instrument-sans']);

/** `fonts-licence.txt` at the root of the built site: the licence of each typeface, as its package carries it. */
export function writeTheFontLicences({ out = join(SITE, 'dist') } = {}) {
  const text = FONT_PACKAGES.map((name) => {
    const licence = readFileSync(join(SITE, 'node_modules', name, 'LICENSE'), 'utf8').trim();
    return `${name}\n${'='.repeat(name.length)}\n\n${licence}\n`;
  }).join('\n');
  writeFileSync(join(out, 'fonts-licence.txt'), text);
}
