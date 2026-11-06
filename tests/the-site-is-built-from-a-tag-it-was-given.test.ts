/**
 * THE SITE IS BUILT FROM A CHECKOUT OF ONE RELEASE TAG OF THE PRODUCT, GIVEN TO IT, AND FROM NOTHING ELSE.
 *
 * `productRoot` is what every step of the build asks for the product. It takes `--from <dir>` or `PRODUCT_DIR` and
 * looks nowhere else: no folder beside this one, no current directory. It refuses a directory that is not a checkout of
 * the product, one that is not exactly at a release tag, one whose tag is not the version it holds, one with a tracked
 * file changed, and one that was not built (the binary writes /record/). The cases run over small repositories made
 * here, so each refusal is shown by the defect that causes it.
 */

import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { productRoot, RELEASE_TAG, tagOf } from '../build/the-product.mjs';

const scratch = mkdtempSync(join(tmpdir(), 'the-product-given-'));
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

const git = (cwd: string, ...args: string[]): string =>
  execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', '-c', 'commit.gpgsign=false', ...args], {
    cwd,
    encoding: 'utf8',
    env: { PATH: process.env.PATH ?? '', HOME: scratch, GIT_CONFIG_NOSYSTEM: '1' },
  }).trim();

let made = 0;
/** A directory shaped like the product at `version`, committed, tagged `tag` when given, and built when `built`. */
function aProduct({ version = '1.2.3', tag = 'v1.2.3', built = true }: { version?: string; tag?: string | null; built?: boolean } = {}): string {
  const dir = join(scratch, `product-${made++}`);
  mkdirSync(join(dir, 'packages/code/dist'), { recursive: true });
  mkdirSync(join(dir, 'docs'));
  writeFileSync(join(dir, 'packages/code/package.json'), JSON.stringify({ version }));
  writeFileSync(join(dir, 'docs/a.md'), '# a\n');
  if (built) writeFileSync(join(dir, 'packages/code/dist/cli.js'), '');
  git(dir, 'init', '-q');
  git(dir, 'add', 'packages/code/package.json', 'docs/a.md');
  git(dir, 'commit', '-q', '-m', 'the product');
  if (tag !== null) git(dir, 'tag', tag);
  return dir;
}

describe('the checkout the site is built from', () => {
  it('is the one it is given, by --from or by PRODUCT_DIR, as an absolute path', () => {
    const dir = aProduct();
    expect(productRoot({ argv: ['--from', dir], env: {} })).toBe(dir);
    expect(productRoot({ argv: [], env: { PRODUCT_DIR: dir } })).toBe(dir);
    // --from wins over the variable.
    const other = aProduct();
    expect(productRoot({ argv: ['--from', other], env: { PRODUCT_DIR: dir } })).toBe(other);
  });

  it('is never looked for: with none given the build stops, and says how to give one', () => {
    expect(() => productRoot({ argv: [], env: {} })).toThrow(/--from <dir>.*PRODUCT_DIR/);
    expect(() => productRoot({ argv: ['--from'], env: {} })).toThrow(/no checkout of the product/);
    expect(() => productRoot({ argv: ['--from', ''], env: {} })).toThrow(/no checkout of the product/);
  });

  it('is refused when it is not a checkout of the product', () => {
    const dir = join(scratch, 'empty');
    mkdirSync(dir);
    expect(() => productRoot({ argv: ['--from', dir], env: {} })).toThrow(/is not a checkout of the product/);
  });

  it('is refused when it is not exactly at a release tag', () => {
    expect(() => productRoot({ argv: ['--from', aProduct({ tag: null })], env: {} })).toThrow(/not at a release tag/);
    expect(() => productRoot({ argv: ['--from', aProduct({ tag: 'v1.2.3-beta' })], env: {} })).toThrow(/not at a release tag/);
    expect(() => productRoot({ argv: ['--from', aProduct({ tag: 'latest' })], env: {} })).toThrow(/not at a release tag/);
  });

  it('is refused when its tag is not the version its binary says', () => {
    expect(() => productRoot({ argv: ['--from', aProduct({ version: '1.2.4' })], env: {} })).toThrow(/v1\.2\.3.*says 1\.2\.4/);
  });

  it('is refused when a tracked file is changed, because the site says it was built from the tag', () => {
    const dir = aProduct();
    writeFileSync(join(dir, 'docs/a.md'), '# a, changed\n');
    expect(() => productRoot({ argv: ['--from', dir], env: {} })).toThrow(/changed tracked files/);
  });

  it('is refused when it was not built, because the binary of that checkout writes /record/', () => {
    expect(() => productRoot({ argv: ['--from', aProduct({ built: false })], env: {} })).toThrow(/build the checkout first/);
  });

  it('says its tag, and a release tag is three numbers and nothing after them', () => {
    expect(tagOf(aProduct())).toBe('v1.2.3');
    for (const yes of ['v0.1.5', 'v10.20.30']) expect(RELEASE_TAG.test(yes), yes).toBe(true);
    for (const no of ['0.1.5', 'v0.1', 'v0.1.5-beta', 'v0.1.5.1', 'vx.y.z', 'v0.1.5\nv0.1.6']) expect(RELEASE_TAG.test(no), no).toBe(false);
  });
});
