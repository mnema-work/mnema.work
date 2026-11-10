// @reads-the-tree
/**
 * THE SITE READS THE FOLDERS OF `docs/`, NOT ONLY THE PAGES AT ITS TOP. A page at `docs/<folder>/<page>.md` is a page of
 * the site at `/docs/<folder>/<page>/`, and a build that skipped one would be green on a docs tree that had it.
 *
 *   - A PAGE IN A FOLDER IS BUILT AT ITS FOLDER'S ADDRESS: written, its links and its edit address read from its path.
 *   - THE README'S ITEM THAT POINTS AT AN INDEX PAGE IN A FOLDER IS A GROUP OF THE SIDEBAR: the index page, then the pages
 *     of the folder in the order the index lists them. The build stops when the folder holds a page the index does not
 *     list, or the index lists a page the folder does not hold.
 *   - THE RECORD PAGE IS HUNG AFTER THE PAGE THAT VERIFIES ITSELF, in whichever group the README puts it.
 *   - A PAGE THE BUILD SKIPPED IS RED: every Markdown file under `docs/` of a checkout is written.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prepare } from '../build/the-build.mjs';
import { docNames, docsIndexOf, pageOf, sidebarOf, whereItLands } from '../build/the-pages.mjs';
import { GIT_WITHOUT_MAINTENANCE } from './support/git-without-maintenance.js';
import { ROOT, SITE } from './support/reading-the-site.js';

const FACTS = { base: '', repoUrl: 'https://github.com/o/r', sha: 'abc123' };

const readme = (docs: string): string => `# x\n\n## Docs\n\n${docs}\n\n## Next\n`;

const INDEX = [
  '# The commands',
  '',
  'Every command.',
  '',
  '- [mnema init](cli/init.md)',
  '- [mnema verify](cli/verify.md)',
  '- [Install](../install.md)',
  '',
].join('\n');

const names = new Set(['install', 'site', 'reference/commands', 'reference/cli/init', 'reference/cli/verify']);
const sources = (name: string): string => {
  if (name === 'reference/commands') return INDEX;
  throw new Error(`no page ${name}`);
};
const record = { label: 'Record', link: '/record/' };

describe('the pages in a folder of docs/', () => {
  it('are named by their path, at the folder the path says', () => {
    expect([...docNames(['docs/a.md', 'docs/reference/b.md', 'docs/reference/cli/c.md', 'docs/assets/x.svg'])].sort()).toEqual([
      'a',
      'reference/b',
      'reference/cli/c',
    ]);
    expect(whereItLands('cli/init.md#top', 'docs/reference/commands.md', FACTS, names)).toBe('/docs/reference/cli/init/#top');
    expect(whereItLands('../install.md', 'docs/reference/commands.md', FACTS, names)).toBe('/docs/install/');
  });

  it('say their edit address from their path', () => {
    const out = pageOf({ name: 'reference/cli/init', markdown: '# init\n\nIt starts.\n', facts: { ...FACTS }, docs: names }) as string;
    expect(out).toContain('editUrl: "https://github.com/o/r/edit/main/docs/reference/cli/init.md"');
  });
});

describe('the sidebar of a README that points at an index page in a folder', () => {
  const docs = '- **Reference.** [The commands](docs/reference/commands.md)\n- **Verify.** [The page that verifies itself](docs/site.md)';
  const sidebarWith = (text: string, read = sources, have = names) =>
    sidebarOf({ readme: readme(text), facts: FACTS, docs: have, record, read }) as {
      label: string;
      items: { label: string; link?: string; items?: unknown[] }[];
    }[];

  it('makes the item a group: the index page, then the pages of the folder in the order the index lists them', () => {
    const reference = sidebarWith(docs).find((g) => g.label === 'Reference');
    expect(reference?.items).toEqual([
      {
        label: 'The commands',
        items: [
          { label: 'The commands', link: '/docs/reference/commands/' },
          { label: 'mnema init', link: '/docs/reference/cli/init/' },
          { label: 'mnema verify', link: '/docs/reference/cli/verify/' },
        ],
      },
    ]);
  });

  it('stops when the folder holds a page the index does not list', () => {
    expect(() => sidebarWith(docs, sources, new Set([...names, 'reference/cli/prune']))).toThrow(
      /docs\/reference\/cli\/prune\.md is in the folder of docs\/reference\/commands\.md and the index does not list it/,
    );
  });

  it('stops when the index lists a page the folder does not hold', () => {
    const fewer = new Set([...names].filter((n) => n !== 'reference/cli/verify'));
    expect(() => sidebarWith(docs, sources, fewer)).toThrow(/docs\/reference\/commands\.md lists reference\/cli\/verify, which docs\/ does not hold/);
  });

  it('hangs the record page after the page that verifies itself, in the group that holds it, whichever its name', () => {
    const renamed = '- **Check.** [The page that verifies itself](docs/site.md)\n- **Reference.** [The commands](docs/reference/commands.md)';
    const check = sidebarWith(renamed).find((g) => g.label === 'Check');
    expect(check?.items.map((i) => i.link)).toEqual(['/docs/site/', '/record/']);
  });

  it('shows the group at /docs/ as the one link to its index page', () => {
    const withFirst = `${docs}\n- **Get started.** [Your first record](docs/first-record.md)`;
    const have = new Set([...names, 'first-record']);
    const page = docsIndexOf({
      sidebar: sidebarWith(withFirst, sources, have),
      title: 't',
      description: 'd',
      copy: (key: string) => key,
      steps: ['One'],
    }) as string;
    expect(page).toContain('<li><a href="/docs/reference/commands/">The commands</a></li>');
    expect(page).not.toContain('mnema init');
  });
});

describe('a checkout whose docs/ has a folder', () => {
  const scratch = mkdtempSync(join(tmpdir(), 'the-folders-'));
  afterAll(() => rmSync(scratch, { recursive: true, force: true }));
  const git = (cwd: string, ...args: string[]): string =>
    execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', '-c', 'commit.gpgsign=false', ...args], {
      cwd,
      encoding: 'utf8',
      env: { PATH: process.env.PATH ?? '', HOME: scratch, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: GIT_WITHOUT_MAINTENANCE },
    }).trim();

  const product = join(scratch, 'product');
  const site = join(scratch, 'site');
  beforeAll(async () => {
    git(scratch, 'clone', '-q', '--no-hardlinks', ROOT, product);
    mkdirSync(join(product, 'docs/reference/cli'), { recursive: true });
    writeFileSync(join(product, 'docs/reference/commands.md'), INDEX);
    writeFileSync(join(product, 'docs/reference/cli/init.md'), '# mnema init\n\nStarts a record. See [verify](verify.md).\n');
    writeFileSync(join(product, 'docs/reference/cli/verify.md'), '# mnema verify\n\nChecks a record. See [install](../../install.md).\n');
    const path = join(product, 'README.md');
    writeFileSync(path, readFileSync(path, 'utf8').replace('- **Verify.**', '- **Reference.** [The commands](docs/reference/commands.md)\n- **Verify.**'));
    git(product, 'add', 'README.md', 'docs');
    git(product, 'commit', '-q', '-m', 'a folder in docs');
    mkdirSync(site);
    for (const file of ['not-found.md', 'copy.md']) writeFileSync(join(site, file), readFileSync(join(SITE, file)));
    await prepare({ root: product, site, check: true });
  }, 60_000);

  const markdownUnder = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory() ? markdownUnder(join(dir, e.name)) : e.name.endsWith('.md') ? [relative(join(product, 'docs'), join(dir, e.name))] : [],
    );

  it('has every Markdown file under docs/ written, each at the path of the file', () => {
    const files = markdownUnder(join(product, 'docs')).sort();
    expect(files).toContain('reference/cli/verify.md');
    for (const file of files) expect(existsSync(join(site, 'src/content/docs/docs', file)), `${file} was skipped`).toBe(true);
  });

  it('rewrites the links of a page in the folder to the addresses of the site', () => {
    const page = readFileSync(join(site, 'src/content/docs/docs/reference/cli/verify.md'), 'utf8');
    expect(page).toContain('[install](/docs/install/)');
    expect(readFileSync(join(site, 'src/content/docs/docs/reference/cli/init.md'), 'utf8')).toContain('[verify](/docs/reference/cli/verify/)');
  });

  it('lists the group of the folder at /docs/ as the one link to its index page', () => {
    const index = readFileSync(join(site, 'src/content/docs/docs/index.md'), 'utf8');
    expect(index).toContain('<a href="/docs/reference/commands/">The commands</a>');
    expect(index).not.toContain('/docs/reference/cli/verify/');
  });

  it('stops the build when the folder holds a page its index does not list', async () => {
    writeFileSync(join(product, 'docs/reference/cli/stray.md'), '# stray\n\nNot in the index.\n');
    await expect(prepare({ root: product, site, check: true })).rejects.toThrow(/stray\.md is in the folder/);
    rmSync(join(product, 'docs/reference/cli/stray.md'));
  });
});
