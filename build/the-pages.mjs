// What the site says is READ, never typed: from the README, the pages of `docs/`, the `package.json` of the binary,
// `.github/the-front-page/accent.mjs` and the SVGs `draw.mjs` made, all of them in the checkout of the product. This file holds the
// readings, as plain functions over text, so a test can run them over a fixture and over the real tree.
//
// There are three changes to a page of `docs/`, and no fourth:
//   1. its title moves from the first `# ` line to the frontmatter, because the site draws the title itself;
//   2. each relative link is rewritten to where it lands on the site: a page of `docs/` to the site's page
//      for it, anything else to the same file on GitHub, at the commit the site was built from;
//   3. the stretches between a `not-on-the-site` marker pair are taken out (what is true of the next version
//      on GitHub and npm and not of the published one the site describes).

import { posix } from 'node:path';
import { PRODUCT_URL, SITE_URL } from './the-site.mjs';
import { iconOf } from '../src/icons.mjs';

/** The Markdown outside fenced code: `fn` is called for each such run of lines, the fences pass through. */
function outsideFences(markdown, fn) {
  const lines = markdown.split('\n');
  const out = [];
  let fence = null;
  let run = [];
  const flush = () => {
    if (run.length > 0) out.push(fn(run.join('\n')));
    run = [];
  };
  for (const line of lines) {
    const open = /^ {0,3}(`{3,}|~{3,})/.exec(line);
    if (fence === null && open) {
      flush();
      fence = open[1];
      out.push(line);
    } else if (fence !== null) {
      out.push(line);
      const t = line.trim();
      if (/^(`{3,}|~{3,})$/.test(t) && t[0] === fence[0] && t.length >= fence.length) fence = null;
    } else {
      run.push(line);
    }
  }
  flush();
  return out.join('\n');
}

/** The name of the marker: a line `<!-- not-on-the-site -->` opens a stretch, `<!-- /not-on-the-site -->` closes it. */
export const NOT_ON_THE_SITE = 'not-on-the-site';

/**
 * The source without the stretches it marks as true on GitHub and npm and false on the site (the site describes the
 * published version, the repository's pages the next one). A marker is a whole line of its own, and each stretch
 * goes with its two marker lines and nothing else. A marker that is not alone on its line, a stretch that is
 * not closed, a close with no open and a stretch inside a stretch stop the build.
 */
export function withoutWhatIsNotOnTheSite(markdown, from) {
  const marker = new RegExp(`^\\s*<!--\\s*(/?)${NOT_ON_THE_SITE}\\s*-->\\s*$`);
  const mention = new RegExp(`<!--\\s*/?${NOT_ON_THE_SITE}`);
  const kept = [];
  let open = null;
  markdown.split('\n').forEach((line, i) => {
    const m = marker.exec(line);
    if (m === null) {
      if (mention.test(line)) throw new Error(`${from}:${i + 1}: a ${NOT_ON_THE_SITE} marker must be alone on its line`);
      if (open === null) kept.push(line);
    } else if (m[1] === '') {
      if (open !== null) throw new Error(`${from}:${i + 1}: ${NOT_ON_THE_SITE} opens inside the one opened at line ${open}`);
      open = i + 1;
    } else {
      if (open === null) throw new Error(`${from}:${i + 1}: ${NOT_ON_THE_SITE} closes what was not opened`);
      open = null;
    }
  });
  if (open !== null) throw new Error(`${from}:${open}: ${NOT_ON_THE_SITE} is never closed`);
  return kept.join('\n');
}

/**
 * What the product's packages say, and the two addresses this repository holds (`the-site.mjs`), which the site is built
 * around. `extensionName` is the name the extension's packer writes into the manifest it packs, read from the packer's
 * own constant in the checkout of the product.
 */
export function factsOf({ codePackage, extensionPackage, extensionName, sha, tag }) {
  const [, owner, name] = /^https:\/\/github\.com\/([^/]+)\/([^/]+)$/.exec(PRODUCT_URL) ?? [];
  if (owner === undefined || name === undefined) throw new Error('PRODUCT_URL is not the address of a GitHub repository');
  return {
    version: codePackage.version,
    tag,
    description: codePackage.description,
    owner,
    name,
    sha,
    license: codePackage.license,
    repoUrl: PRODUCT_URL,
    siteUrl: SITE_URL,
    // The site is served from the root of its own address: no path prefix.
    base: '',
    // The address the site is read at, the one every manifest points its `homepage` at.
    homeUrl: `${SITE_URL}/`,
    npmUrl: `https://www.npmjs.com/package/${codePackage.name}`,
    // The extension's id in the stores is `<publisher>.<name>`: the publisher is the workspace manifest's, and the name
    // is the one the packer writes into the manifest it packs (the workspace name is scoped and a store refuses that).
    extensionId: `${extensionPackage.publisher}.${extensionName}`,
  };
}

/** The first `# ` heading of a page, outside code. */
export function titleOf(markdown) {
  let title = null;
  outsideFences(markdown, (text) => {
    if (title === null) {
      const m = /^# (.+)$/m.exec(text);
      if (m) title = m[1].trim();
    }
    return text;
  });
  if (title === null) throw new Error('a page of docs/ has no title');
  return title;
}

/** Where a relative target lands: a site page, a site asset, or the file on GitHub. */
export function whereItLands(target, from, facts, docs) {
  if (/^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith('#') || target.startsWith('/')) return target;
  const hash = target.indexOf('#');
  const path = hash === -1 ? target : target.slice(0, hash);
  const fragment = hash === -1 ? '' : target.slice(hash);
  const resolved = posix.normalize(posix.join(posix.dirname(from), path));
  if (resolved.startsWith('..')) throw new Error(`${from}: ${target} leaves the repository`);
  const page = /^docs\/(.+)\.md$/.exec(resolved);
  if (page && docs.has(page[1])) return `${facts.base}/docs/${page[1]}/${fragment}`;
  const asset = /^docs\/assets\/([^/]+)$/.exec(resolved);
  if (asset) return `${facts.base}/assets/${asset[1]}${fragment}`;
  // A recording a page shows is an image: on GitHub its path is an HTML page, so the site carries the GIF itself.
  const recording = /^recordings\/([^/]+\.gif)$/.exec(resolved);
  if (recording) return `${facts.base}/recordings/${recording[1]}${fragment}`;
  const isDirectory = target.endsWith('/') || (facts.directories?.has(resolved.replace(/\/$/, '')) ?? false);
  const kept = isDirectory && !resolved.endsWith('/') ? `${resolved}/` : resolved;
  return `${facts.repoUrl}/blob/${facts.sha}/${kept}${fragment}`;
}

/** Every `](target)` outside code, rewritten. Inline code is left as it is. */
export function rewriteLinks(markdown, from, facts, docs) {
  return outsideFences(markdown, (text) =>
    text
      .split(/(`+[^`\n]*?`+)/)
      .map((piece, i) =>
        i % 2 === 1
          ? piece
          : piece.replace(/\]\(([^)\s]+)((?:\s+"[^"]*")?)\)/g, (_all, target, title) => `](${whereItLands(target, from, facts, docs)}${title})`),
      )
      .join(''),
  );
}

/** A page of `docs/` as the site holds it: the title in the frontmatter, the links rewritten. */
export function pageOf({ name, markdown: source, facts, docs }) {
  const markdown = withoutWhatIsNotOnTheSite(source, `docs/${name}.md`);
  const title = titleOf(markdown);
  let dropped = false;
  const body = outsideFences(markdown, (text) =>
    dropped
      ? text
      : text.replace(/^# .+\n?/m, () => {
          dropped = true;
          return '';
        }),
  ).replace(/^\n+/, '');
  const editUrl = `${facts.repoUrl}/edit/main/docs/${name}.md`;
  const description = descriptionOf(markdown, `docs/${name}.md`);
  const front = `---\ntitle: ${JSON.stringify(title)}\ndescription: ${JSON.stringify(description)}\neditUrl: ${JSON.stringify(editUrl)}\n---\n\n`;
  // The title is the page's heading and not a heading of its body, so a link to it on GitHub (`#<the title as an id>`) has
  // nothing to land on here: the body begins with an empty anchor of that id.
  const top = `<span id="${titleIdOf(title)}"></span>\n\n`;
  return front + top + rewriteLinks(body, `docs/${name}.md`, facts, docs);
}

/** The id GitHub gives a heading: its letters and numbers lowercased, its spaces as hyphens, the rest dropped. */
function titleIdOf(title) {
  return title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, '')
    .replace(/\s/g, '-');
}

/** The text of a `## ` section of the README, without its heading, up to the next `## `. */
export function sectionOf(readme, heading) {
  const lines = readme.split('\n');
  const start = lines.findIndex((l) => l === `## ${heading}`);
  if (start === -1) throw new Error(`README has no section "${heading}"`);
  let end = lines.findIndex((l, i) => i > start && l.startsWith('## '));
  if (end === -1) end = lines.length;
  return lines
    .slice(start + 1, end)
    .join('\n')
    .replace(/^\n+|\n+$/g, '');
}

/** Plain text of a fragment of HTML: no tags, entities undone, white space as one space. */
export function textOfHtml(html) {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/** What the README's top says: the line under the picture, the paragraph under it, and the picture's words. */
export function pitchOf(readme) {
  const title = /<h3>([\s\S]*?)<\/h3>/.exec(readme);
  const paragraph = /<\/h3>\s*<p>([\s\S]*?)<\/p>/.exec(readme);
  const banner = /<img src="docs\/assets\/banner-light\.svg" alt="([^"]*)"/.exec(readme);
  if (!title || !paragraph || !banner) throw new Error('the top of the README is not in the shape the site reads');
  return { title: textOfHtml(title[1]), body: textOfHtml(paragraph[1]), bannerAlt: textOfHtml(banner[1]) };
}

/**
 * The command the Quick start shows for the verdict: the ONE line of its code fence that starts with `mnema verify`,
 * up to the `#` that begins the note beside it. It is the command the Quick start gives for the proof, so what a reader sees
 * is what ran.
 */
export function verifyCommandOf(readme) {
  const fence = /```[a-z]*\n([\s\S]*?)\n```/.exec(sectionOf(readme, 'Quick start'));
  const lines = (fence?.[1] ?? '').split('\n').filter((l) => /^mnema verify(\s|$)/.test(l));
  if (lines.length !== 1) {
    throw new Error(`the README's Quick start has ${lines.length} lines that start with "mnema verify", and the site reads one`);
  }
  return (lines[0] ?? '').split('#')[0].trim();
}

/** The most words one entry of `copy.md` may hold: microcopy, a caption or a label, and not a page. */
export const COPY_WORDS = 20;

/**
 * The microcopy only the site needs, from `copy.md`: under a `## <key>` heading (kebab-case) the one line of its
 * text, no more than `COPY_WORDS` words. What comes before the first heading (the title and a sentence saying what
 * the file is) is not read. A repeated key, an empty entry, an entry of more than one line and one of more words
 * stop the build: a long text would be a page the site wrote of its own.
 * @returns {Map<string, string>}
 */
export function copyOf(text) {
  const entries = new Map();
  for (const part of text.split(/^## /m).slice(1)) {
    const [key = '', ...rest] = part.split('\n');
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(key)) throw new Error(`copy.md: "${key}" is not a kebab-case key`);
    if (entries.has(key)) throw new Error(`copy.md: "${key}" is written twice`);
    const lines = rest.map((l) => l.trim()).filter((l) => l !== '');
    if (lines.length === 0) throw new Error(`copy.md: "${key}" is empty`);
    if (lines.length > 1) throw new Error(`copy.md: "${key}" must be one line`);
    const words = (lines[0] ?? '').split(/\s+/).length;
    if (words > COPY_WORDS) throw new Error(`copy.md: "${key}" has ${words} words, and the most is ${COPY_WORDS} words`);
    entries.set(key, lines[0]);
  }
  return entries;
}

/** The groups under the README's "Docs": `- **Use.** [Label](target) · ...`, each link in order. */
export function groupsOf(readme) {
  const text = sectionOf(readme, 'Docs');
  const groups = [];
  for (const chunk of text.split(/\n(?=- \*\*)/)) {
    const head = /^- \*\*([^*]+?)\.\*\*/.exec(chunk);
    if (!head) continue;
    const items = [...chunk.matchAll(/\[([^\]]+)\]\(([^)\s]+)\)/g)].map((m) => ({ label: m[1], target: m[2] }));
    groups.push({ label: head[1], items });
  }
  return groups;
}

/** A line of the README's picture markup, as two images that answer the SITE's theme and not the system's. */
export function pictureAsTwoImages(html) {
  return html.replace(
    /<picture>\s*<source media="\(prefers-color-scheme: dark\)" srcset="([^"]+)">\s*<img src="([^"]+)" alt="([^"]*)"([^>]*)>\s*<\/picture>/g,
    (_all, dark, light, alt, rest) =>
      `<img class="only-dark" src="${dark}" alt="${alt}"${rest}><img class="only-light" src="${light}" alt=""${rest} aria-hidden="true">`,
  );
}

/**
 * A page the site writes from a template (`not-found.md` for the 404): the template is
 * tracked, so the guards that read every Markdown page reach it, and each directive is replaced by what a source says:
 *   {{pitch.title}} {{pitch.body}} {{pitch.bannerAlt}} {{description}} {{version}} {{jsonld}}
 *   {{section Heading of the README}}  the section, under its own heading, links rewritten
 *   {{link Label of the README's Docs}} the site address of that link
 *   {{label Label of the README's Docs}} that label as the README writes it (the build stops when it is not there)
 *   {{copy key}}                         the entry of `copy.md` under that key (`copy` says it, or throws)
 * In the frontmatter a value goes in as a JSON string, so no value can break the YAML.
 */
export function templateOf({
  template,
  readme: source,
  facts,
  docs,
  copy,
}) {
  const readme = withoutWhatIsNotOnTheSite(source, 'README.md');
  const pitch = pitchOf(readme);
  const groups = groupsOf(readme);
  const [, front, body] = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(template) ?? [];
  if (front === undefined) throw new Error('a template of the site has no frontmatter');
  const simple = {
    'pitch.title': pitch.title,
    'pitch.body': pitch.body,
    'pitch.bannerAlt': pitch.bannerAlt,
    description: facts.description,
    version: facts.version,
    record: `${facts.base}/record/`,
    jsonld: jsonLdOf(structuredDataOf(facts)),
  };
  const label = (name) => {
    for (const g of groups) for (const item of g.items) if (item.label === name) return item;
    throw new Error(`the README's Docs has no link labelled "${name}"`);
  };
  const fill = (text, frontmatter) =>
    text.replace(/\{\{([^}]+)\}\}/g, (_all, raw) => {
      const key = raw.trim();
      let value;
      if (key in simple) value = simple[key];
      else if (key.startsWith('link ')) value = whereItLands(label(key.slice(5)).target, 'README.md', facts, docs);
      else if (key.startsWith('label ')) value = label(key.slice(6)).label;
      else if (key.startsWith('copy ')) {
        if (copy === undefined) throw new Error(`the template asks for {{${key}}}, and no microcopy was given`);
        value = copy(key.slice(5));
      }
      else if (key.startsWith('section ')) {
        const heading = key.slice(8);
        value = `## ${heading}\n\n${rewriteLinks(pictureAsTwoImages(sectionOf(readme, heading)), 'README.md', facts, docs)}`;
      } else throw new Error(`the template asks for {{${key}}}, which no source gives`);
      return frontmatter ? JSON.stringify(value) : value;
    });
  return `---\n${fill(front, true)}\n---\n${fill(body, false)}`;
}

/** Where /record/ links back to: the root of the site, as the site is served, with no path prefix. */
export function recordBackLink(facts) {
  return `${facts.base}/`;
}

/** The page the record page goes right after: the one that describes the verifier, found by its label in whichever group holds it. */
export const RECORD_AFTER = 'The page that verifies itself';

/** The `](target)` links of a page outside code, with their text, in order. */
function linksOf(markdown) {
  const links = [];
  outsideFences(markdown, (text) => {
    for (const piece of text.split(/(`+[^`\n]*?`+)/).filter((_p, i) => i % 2 === 0)) {
      for (const m of piece.matchAll(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) links.push({ label: m[1], target: m[2] });
    }
    return text;
  });
  return links;
}

/**
 * The group a folder of `docs/` makes in the sidebar, from its index page: a README item that points at
 * `docs/<folder>/<page>.md` is the index, and the group is the index page itself and then the pages of the folders its
 * links lead to, in the order it lists them, each under the words of the link. A page the index lists and `docs/` does not
 * hold, and a page in one of those folders that the index does not list, stop the build: a page is never in the folder and
 * out of the sidebar, nor in the sidebar and out of the site.
 */
function groupOfTheFolder({ item, name, facts, docs, read }) {
  if (read === undefined) throw new Error(`the README points at docs/${name}.md, an index page in a folder, and no way to read it was given`);
  const from = `docs/${name}.md`;
  const pages = [];
  for (const link of linksOf(read(name))) {
    if (/^[a-z][a-z0-9+.-]*:/i.test(link.target) || link.target.startsWith('#') || link.target.startsWith('/')) continue;
    const resolved = posix.normalize(posix.join(posix.dirname(from), link.target.split('#')[0]));
    const page = /^docs\/(.+)\.md$/.exec(resolved)?.[1];
    if (page === undefined || page === name || page.indexOf('/') === -1) continue;
    if (!docs.has(page)) throw new Error(`${from} lists ${page}, which docs/ does not hold`);
    if (!pages.some((p) => p.name === page)) pages.push({ name: page, label: link.label });
  }
  if (pages.length === 0) throw new Error(`${from} is an index page in a folder and lists no page of one`);
  const listed = new Set(pages.map((p) => p.name));
  for (const folder of new Set(pages.map((p) => posix.dirname(p.name)))) {
    for (const other of docs) {
      if (posix.dirname(other) === folder && !listed.has(other)) {
        throw new Error(`docs/${other}.md is in the folder of ${from} and the index does not list it`);
      }
    }
  }
  const at = (page) => `/docs/${page}/`;
  return {
    label: item.label,
    items: [{ label: item.label, link: at(name) }, ...pages.map((p) => ({ label: p.label, link: at(p.name) }))],
  };
}

/**
 * The sidebar: the README's groups, a page of `docs/` as the site's page and anything else on GitHub. An item that
 * points at an index page in a folder of `docs/` is a group of its own (`groupOfTheFolder`; `read` gives the text of a page
 * of `docs/` by its name). The record page (`record`: its label and its address) goes inside the group that holds the
 * page that describes the verifier, right after it. A README without that page stops the build, so the page is never hung at the end.
 * @param {{ readme: string, facts: any, docs: Set<string>, record?: { label: string, link: string }, read?: (name: string) => string }} options
 */
export function sidebarOf({ readme, facts, docs, record, read }) {
  const groups = groupsOf(readme).map((g) => ({
    label: g.label,
    items: g.items.map((item) => {
      const index = /^docs\/(.+\/.+)\.md$/.exec(posix.normalize(item.target.split('#')[0]))?.[1];
      if (index !== undefined && docs.has(index)) return groupOfTheFolder({ item, name: index, facts, docs, read });
      const there = whereItLands(item.target, 'README.md', facts, docs);
      const internal = there.startsWith(`${facts.base}/`) ? there.slice(facts.base.length) : null;
      return { label: item.label, link: internal ?? there };
    }),
  }));
  if (record === undefined) return groups;
  const group = groups.find((g) => g.items.some((item) => item.label === RECORD_AFTER && item.link !== undefined));
  if (group === undefined) throw new Error(`the README's Docs has no "${RECORD_AFTER}" in any group, and the record page goes after it`);
  group.items.splice(group.items.findIndex((item) => item.label === RECORD_AFTER) + 1, 0, record);
  return groups;
}

/** The card of each group of the README's Docs: its icon (`src/icons.mjs`) and the entry of `copy.md` that is its sentence. */
export const GROUP_CARDS = Object.freeze({
  'Get started': { icon: 'arrow', copy: 'docs-get-started' },
  Learn: { icon: 'file', copy: 'docs-learn' },
  Reference: { icon: 'folder', copy: 'docs-reference' },
  Project: { icon: 'seal', copy: 'docs-project' },
});

/** The first-record page, which the first card links, by the address the sidebar gives it. */
export const FIRST_RECORD_LINK = '/docs/first-record/';

/** The README group whose first page the header's second link goes to. */
export const REFERENCE_GROUP = 'Reference';

const escapeHtml = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** The steps of the first-record page: its `## 1. Label` to `## N. Label` headings outside code, without the numbers, in order. */
export function stepsOf(markdown) {
  const steps = [];
  outsideFences(markdown, (text) => {
    for (const m of text.matchAll(/^## \d+\. (.+)$/gm)) steps.push(m[1].trim());
    return text;
  });
  if (steps.length === 0) throw new Error('the first-record page has no numbered steps: its headings are `## 1. Label`, `## 2. Label`, ...');
  return steps;
}

/** The first link of an item of the sidebar: its own, or the first of the group it holds. */
const firstLinkOf = (item) => item.link ?? firstLinkOf(item.items[0]);

/** Every leaf of a sidebar (an item with a link), in order. */
const leavesOf = (items) => items.flatMap((i) => (i.items === undefined ? [i] : leavesOf(i.items)));

/**
 * The page at /docs/: a card for the first record (the label of its link, its steps, and two entries of `copy.md`) and a
 * card for each group of the README (its icon, its sentence from `copy.md`, and its links, a group of a folder as the one
 * link to its index page, the rest being in the sidebar). The title and the lede are `copy.md` too: the page has no
 * sentence of its own, and `copy` is the one function that takes an entry, so an entry nothing takes is found. A group
 * the cards do not know (`GROUP_CARDS`: a README of an older release names others) gets a card with the generic icon and
 * no sentence, and a known group the README lacks gets none; a sidebar with no first-record page stops the build.
 * @param {{ sidebar: any[], title: string, description: string, copy: (key: string) => string, steps: string[] }} options
 */
export function docsIndexOf({ sidebar, title, description, copy, steps }) {
  const first = leavesOf(sidebar.flatMap((g) => g.items)).find((i) => i.link === FIRST_RECORD_LINK);
  if (first === undefined) throw new Error(`the sidebar has no page at ${FIRST_RECORD_LINK}, which the first card links`);
  const link = (item) => `<a href="${escapeHtml(firstLinkOf(item))}">${escapeHtml(item.label)}</a>`;
  const front = `---\ntitle: ${JSON.stringify(title)}\ndescription: ${JSON.stringify(description)}\ntableOfContents: false\n---\n\n`;
  const lede = `<p class="docs-lede">${escapeHtml(copy('docs-lede'))}</p>`;
  const card = [
    `<a class="docs-first" href="${FIRST_RECORD_LINK}">`,
    '<div>',
    `<div class="docs-kicker">${escapeHtml(copy('docs-start-here'))}</div>`,
    `<h2>${escapeHtml(first.label)}</h2>`,
    `<p>${escapeHtml(copy('docs-first-record'))}</p>`,
    `<div class="docs-go">${escapeHtml(copy('docs-go'))} ${iconOf('arrow')}</div>`,
    '</div>',
    `<ol>${steps.map((s) => `<li>${escapeHtml(s)}</li>`).join('')}</ol>`,
    '</a>',
  ].join('\n');
  // Every sentence of a card is taken, the group in the README or not: the entry belongs to the card, not to the README.
  const sentences = new Map(Object.entries(GROUP_CARDS).map(([label, known]) => [label, copy(known.copy)]));
  const groups = sidebar.map((g) => {
    const icon = GROUP_CARDS[g.label]?.icon ?? 'file';
    const sentence = sentences.get(g.label);
    return [
      '<div class="docs-card">',
      `<div class="docs-icon">${iconOf(icon)}</div>`,
      `<h2>${escapeHtml(g.label)}</h2>`,
      ...(sentence === undefined ? [] : [`<p>${escapeHtml(sentence)}</p>`]),
      `<ul>${g.items.map((i) => `<li>${link(i)}</li>`).join('')}</ul>`,
      '</div>',
    ].join('\n');
  });
  // One block of HTML with no blank line in it, so the Markdown reader hands it over as it is.
  return `${front}<div class="docs-index not-content">\n${lede}\n${card}\n<div class="docs-cards">\n${groups.join('\n')}\n</div>\n</div>\n`;
}

/** The links of the header beside GitHub: /docs/, and the first page of the README's Reference group when it has one. */
export function headerLinksOf({ sidebar, docs }) {
  const reference = sidebar.find((g) => g.label === REFERENCE_GROUP);
  return [
    { label: docs, link: '/docs/' },
    ...(reference === undefined ? [] : [{ label: reference.label, link: firstLinkOf(reference.items[0]) }]),
  ];
}

/** The pages `docs/` holds, by path without `.md`: a page in a folder is named `<folder>/<page>`. */
export function docNames(files) {
  return new Set(files.filter((f) => /^docs\/.+\.md$/.test(f)).map((f) => f.slice(5, -3)));
}

const channelsOf = (hex) => [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));
const hexOf = (rgb) => `#${rgb.map((c) => c.toString(16).padStart(2, '0')).join('')}`;

/** `from` taken `share` (0 to 1) of the way toward `toward`, channel by channel in sRGB. */
export function mix(from, toward, share) {
  const [a, b] = [channelsOf(from), channelsOf(toward)];
  return hexOf(a.map((c, i) => Math.round(c + ((b[i] ?? 0) - c) * share)));
}

/** WCAG 2 contrast ratio of two `#rrggbb` colours. */
export function contrastOf(one, other) {
  const lum = (hex) => {
    const [r, g, b] = channelsOf(hex).map((c) => {
      const v = c / 255;
      return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
  };
  const [hi, lo] = [lum(one), lum(other)].sort((x, y) => y - x);
  return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
}

/**
 * The colour of accent text: the smallest share (in steps of 1%) of `toward` mixed into `ink` that reads at
 * `floor` or better on EVERY one of `grounds`. Throws when no share does, so a theme whose grounds cannot
 * carry the accent stops the build instead of shipping unreadable links.
 */
export function textAccent({ ink, toward, grounds, floor }) {
  for (let percent = 0; percent <= 100; percent++) {
    const colour = mix(ink, toward, percent / 100);
    if (grounds.every((ground) => contrastOf(colour, ground) >= floor)) return colour;
  }
  throw new Error(`no mix of ${ink} toward ${toward} reads at ${floor}:1 on ${grounds.join(', ')}`);
}

/** The floor for text: WCAG 2, level AA. */
export const TEXT_FLOOR = 4.5;

/**
 * How far each grey of Starlight's ramp (`gray-1` the strongest, `gray-7` the faintest) sits from the page's
 * ground toward its ink. Read off Starlight 0.42's own greys, so the chrome keeps its steps; the two ends are
 * the front page's `PAGE`, so no colour is new.
 */
const RAMP = Object.freeze({
  dark: [0.922, 0.733, 0.487, 0.267, 0.129, 0.052, 0.03],
  light: [0.948, 0.871, 0.733, 0.513, 0.267, 0.078, 0.039],
});

/**
 * The theme as data, per theme: every `--sl-color-<name>` the site sets. The ground is `PAGE[theme]`, the ink is
 * the other theme's `PAGE`, the greys are the ramp between them, and the accent as text is calculated against
 * the ground and against every ground Starlight maps to a grey (nav, sidebar, inline code), because the worst
 * of them decides. Starlight draws the text of its primary button and of the current sidebar item in
 * `--sl-color-black` (light) or `--sl-color-accent-low` (dark) over `--sl-color-text-accent`.
 */
export function themeOf({ ACCENT, PAGE, INK = PAGE }) {
  const of = (theme, other) => {
    const ground = PAGE[theme];
    // The ink is the theme's own when the caller names one, and the other theme's ground otherwise.
    const ink = INK === PAGE ? PAGE[other] : INK[theme];
    const [g1, g2, g3, g4, g5, g6, g7] = RAMP[theme].map((share) => mix(ground, ink, share));
    const mapped = theme === 'dark' ? { nav: g6, sidebar: g6, code: g5 } : { nav: g7, sidebar: ground, code: g6 };
    const text = textAccent({
      ink: ACCENT[theme],
      toward: ink,
      grounds: [ground, mapped.nav, mapped.sidebar, mapped.code],
      floor: TEXT_FLOOR,
    });
    return {
      accent: ACCENT[theme],
      'accent-high': text,
      'accent-low': theme === 'dark' ? mix(ground, ACCENT[theme], 0.22) : mix(ink, ACCENT[theme], 0.2),
      'text-accent': text,
      black: ground,
      white: ink,
      'gray-1': g1,
      'gray-2': g2,
      'gray-3': g3,
      'gray-4': g4,
      'gray-5': g5,
      'gray-6': g6,
      'gray-7': g7,
      'bg-nav': mapped.nav,
      'bg-sidebar': mapped.sidebar,
      'bg-inline-code': mapped.code,
    };
  };
  return { dark: of('dark', 'light'), light: of('light', 'dark') };
}

/** The colour file: the values of `themeOf`, written as the variables Starlight reads, in no layer. */
export function themeCss(colours) {
  const rule = (selector, theme) => [
    `${selector} {`,
    ...Object.entries(theme).map(([name, value]) => `  --sl-color-${name}: ${value};`),
    '}',
  ];
  const { dark, light } = themeOf(colours);
  return [...rule(':root', dark), ...rule(":root[data-theme='light']", light), ''].join('\n');
}

/** `llms.txt`: the convention's shape, from the pitch and the README's groups, each link to the raw page. */
export function llmsTxt({ readme, facts }) {
  const raw = (path) => `https://raw.githubusercontent.com/${facts.owner}/${facts.name}/${facts.sha}/${path}`;
  const lines = ['# mnema', '', `> ${facts.description}`, ''];
  for (const g of groupsOf(readme)) {
    lines.push(`## ${g.label}`, '');
    for (const item of g.items) {
      const resolved = posix.normalize(item.target.split('#')[0]);
      if (!resolved.endsWith('.md')) continue;
      lines.push(`- [${item.label}](${raw(resolved)})`);
    }
    lines.push('');
  }
  return `${lines.join('\n').replace(/\n+$/, '')}\n`;
}

/** The most characters of a page's own description: what a search result shows of it before it cuts it. */
export const DESCRIPTION_CHARS = 160;

/** A line of Markdown as the words a reader reads: links by their text, no emphasis, no code marks. */
function plainOf(markdown) {
  return markdown
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\*\*|`/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** The field a page of `docs/` may carry to say its own description: a line `<!-- description: <text> -->`. */
const DESCRIPTION_FIELD = /^<!-- description: (.+?) -->$/m;

/**
 * What a page of `docs/` says of itself. Its own `<!-- description: ... -->` line, when it has one (a page whose
 * first sentence says too little); otherwise the first sentence of its first paragraph of prose (a heading, a code
 * fence, a table, a list, a quotation, a line of HTML and a line that is only bold, a page's own subtitle, are not one), as plain words, or those words cut at the last
 * whole word with an ellipsis when the sentence is longer than `DESCRIPTION_CHARS`. Never typed in the build: a page
 * that changes changes what a search result says of it.
 */
export function descriptionOf(markdown, from) {
  let own = null;
  let paragraph = null;
  outsideFences(markdown, (text) => {
    own ??= DESCRIPTION_FIELD.exec(text)?.[1] ?? null;
    for (const block of text.split(/\n\s*\n/)) {
      const trimmed = block.trim();
      if (paragraph === null && trimmed !== '' && !/^(#|[-*+] |\d+\. |\||>|<)/.test(trimmed) && !/^\*\*[^*\n]+\*\*$/.test(trimmed)) paragraph = plainOf(trimmed);
    }
    return text;
  });
  if (own !== null) return own.trim();
  if (paragraph === null) throw new Error(`${from} has no paragraph of prose to describe it`);
  const sentence = /^(.+?[.!?])(?:\s|$)/s.exec(paragraph)?.[1] ?? paragraph;
  if (sentence.length <= DESCRIPTION_CHARS) return sentence;
  const head = sentence.slice(0, DESCRIPTION_CHARS);
  return `${head.slice(0, head.lastIndexOf(' ')).replace(/[,;:]$/, '')}…`;
}

/**
 * @typedef {{ name: string, description: string, version: string, license: string, repoUrl: string, homeUrl: string,
 *   npmUrl: string, extensionId: string }} FactsOfTheSite what the structured data and the head of /record/ read
 */

/**
 * The structured data of the site, built from facts the repository holds: the name, the description, the version and
 * the licence of `@mnema/code`, the site's own address, and where the same software is found (the repository, npm and
 * the two extension stores). It carries no rating and no review: nothing here is a number somebody gave.
 * @param {FactsOfTheSite} facts
 */
export function structuredDataOf(facts) {
  const [publisher, extension] = facts.extensionId.split('.');
  return {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebSite', '@id': `${facts.homeUrl}#website`, name: facts.name, url: facts.homeUrl, description: facts.description },
      {
        '@type': 'SoftwareApplication',
        '@id': `${facts.homeUrl}#software`,
        name: facts.name,
        url: facts.homeUrl,
        description: facts.description,
        softwareVersion: facts.version,
        applicationCategory: 'DeveloperApplication',
        license: `https://spdx.org/licenses/${facts.license}.html`,
        sameAs: [
          facts.repoUrl,
          facts.npmUrl,
          `https://marketplace.visualstudio.com/items?itemName=${facts.extensionId}`,
          `https://open-vsx.org/extension/${publisher}/${extension}`,
        ],
      },
    ],
  };
}

/** JSON for the body of a `<script type="application/ld+json">`: a `<` is escaped, so no text can close the element. */
export function jsonLdOf(data) {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

/**
 * What /record/ says of itself, handed to `mnema site --head`: a title and a description (the two entries of
 * `copy.md`), the canonical address under the site's home and the structured data of the site. The binary writes
 * the page with them, so the page the site serves is byte for byte the one the command writes.
 * @param {{ title: string, description: string, facts: FactsOfTheSite }} options
 */
export function headOfTheRecord({ title, description, facts }) {
  return { title, description, canonical: `${facts.homeUrl}record/`, structuredData: structuredDataOf(facts) };
}

/** The sitemap with one address more, the one a page the build writes after Astro is at; it stops if it is already there. */
export function sitemapWith(xml, address) {
  const entry = `<url><loc>${address}</loc></url>`;
  if (!xml.includes('</urlset>')) throw new Error('the sitemap is not the shape the site reads');
  if (xml.includes(entry)) throw new Error(`the sitemap already lists ${address}`);
  return xml.replace('</urlset>', () => `${entry}</urlset>`);
}
