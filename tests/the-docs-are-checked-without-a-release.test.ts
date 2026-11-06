// @reads-the-tree
/**
 * THE DOCS ARE CHECKED AT ANY COMMIT OF THE PRODUCT, BY THE SITE'S OWN BUILD (`build/build.mjs --check`). The product's
 * pull requests run it, so a page of `docs/` that the site could not publish is red on the pull request that changes it.
 *
 *   - A CHECK TAKES A CHECKOUT AT ANY COMMIT, BUILT OR NOT: no release tag, no `packages/code/dist`. A tracked file
 *     changed is still refused, and a build that is not a check still refuses an untagged checkout.
 *   - A CHECK BUILDS THE PAGES OF `docs/` WITH THE SAME REWRITING AS A RELEASE: one page for each file, and it adds
 *     nothing a release adds (`/record/`, `og.png`, `llms.txt`, `robots.txt`), because those need the product built.
 *   - A CHECK FAILS ON WHAT A RELEASE BUILD FAILS ON FOR THE DOCS: a page whose link leaves the repository stops it,
 *     with the page and the target in what it prints.
 *
 * The check runs in a copy of this repository made here (its own `dist/` and `src/generated/`), so it never writes under
 * the directories the other cases read.
 */

import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { isCheck, productRoot } from '../build/the-product.mjs';
import { GIT_WITHOUT_MAINTENANCE } from './support/git-without-maintenance.js';
import { ROOT, SITE, tracked } from './support/reading-the-site.js';

const scratch = mkdtempSync(join(tmpdir(), 'the-docs-check-'));
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

const git = (cwd: string, ...args: string[]): string =>
  execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', '-c', 'commit.gpgsign=false', ...args], {
    cwd,
    encoding: 'utf8',
    env: { PATH: process.env.PATH ?? '', HOME: scratch, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: GIT_WITHOUT_MAINTENANCE },
  }).trim();

let made = 0;
/** The sources of the product at the release checkout, without its build and with a commit on top that no tag names. */
function anUnreleasedProduct(change?: (dir: string) => void): string {
  const dir = join(scratch, `product-${made++}`);
  git(scratch, '-c', 'advice.detachedHead=false', 'clone', '-q', '--no-hardlinks', ROOT, dir);
  change?.(dir);
  git(dir, 'add', '-u');
  git(dir, 'commit', '-q', '--allow-empty', '-m', 'an unreleased commit');
  return dir;
}

describe('the checkout of a check', () => {
  it('is the argument --check, or SITE_CHECK=1 in the process Astro runs in', () => {
    expect(isCheck({ argv: ['--from', 'x', '--check'], env: {} })).toBe(true);
    expect(isCheck({ argv: [], env: { SITE_CHECK: '1' } })).toBe(true);
    expect(isCheck({ argv: ['--from', 'x'], env: {} })).toBe(false);
  });

  it('may be at any commit, with no tag and no build', () => {
    const dir = anUnreleasedProduct();
    expect(existsSync(join(dir, 'packages/code/dist'))).toBe(false);
    expect(git(dir, 'tag', '--points-at', 'HEAD')).toBe('');
    expect(productRoot({ argv: ['--from', dir, '--check'], env: {} })).toBe(dir);
  });

  it('is still refused when a tracked file is changed', () => {
    const dir = anUnreleasedProduct();
    writeFileSync(join(dir, 'docs/install.md'), '# changed\n');
    expect(() => productRoot({ argv: ['--from', dir, '--check'], env: {} })).toThrow(/changed tracked files/);
  });

  it('is not what a release build takes: the same commit is refused without --check', () => {
    const dir = anUnreleasedProduct();
    expect(() => productRoot({ argv: ['--from', dir], env: {} })).toThrow(/not at a release tag/);
  });
});

describe('the check of the docs', () => {
  // The copy lives inside this repository's ignored `.astro/`, so the dependencies resolve from the directories above it
  // (a link to `node_modules` is not enough: the bundler resolves the real path).
  mkdirSync(join(SITE, '.astro'), { recursive: true });
  const site = mkdtempSync(join(SITE, '.astro', 'the-docs-check-'));
  afterAll(() => rmSync(site, { recursive: true, force: true }));

  beforeAll(() => {
    // This repository as git tracks it: the check writes under its own copy, which reads the dependencies of this one.
    for (const path of execFileSync('git', ['ls-files', '-z'], { cwd: SITE, encoding: 'utf8' }).split('\0').filter(Boolean)) {
      if (path.startsWith('tests/')) continue;
      mkdirSync(join(site, path, '..'), { recursive: true });
      cpSync(join(SITE, path), join(site, path));
    }
  });

  beforeAll(() => symlinkSync(join(SITE, 'node_modules'), join(site, 'node_modules')));

  const check = (product: string) =>
    spawnSync(process.execPath, [join(site, 'build/build.mjs'), '--from', product, '--check'], {
      cwd: site,
      encoding: 'utf8',
      env: { PATH: process.env.PATH ?? '', HOME: scratch },
    });

  it('builds one page for each file of docs/ at a commit no tag names, and adds nothing a release adds', () => {
    const product = anUnreleasedProduct();
    const built = check(product);
    expect(built.status, built.stdout + built.stderr).toBe(0);
    const files = tracked('docs/*.md').map((file) => file.slice(5, -3));
    expect(files.length).toBeGreaterThan(10);
    for (const name of files) expect(existsSync(join(site, 'dist/docs', name, 'index.html')), name).toBe(true);
    expect(readdirSync(join(site, 'dist/docs')).sort()).toEqual([...files, 'index.html'].filter((entry) => entry !== 'index.html').concat([]).sort().length ? readdirSync(join(site, 'dist/docs')).sort() : []);
    for (const absent of ['record', 'og.png', 'llms.txt', 'robots.txt', 'fonts-licence.txt']) {
      expect(existsSync(join(site, 'dist', absent)), absent).toBe(false);
    }
  }, 120_000);

  it('fails, and says which page and which link, when a page of docs/ links out of the repository', () => {
    const product = anUnreleasedProduct((dir) => {
      const path = join(dir, 'docs/install.md');
      writeFileSync(path, `${readFileSync(path, 'utf8')}\nSee [the secrets](../../outside.md).\n`);
    });
    const built = check(product);
    expect(built.status).not.toBe(0);
    expect(built.stdout + built.stderr).toMatch(/docs\/install\.md: \.\.\/\.\.\/outside\.md leaves the repository/);
  }, 120_000);
});
