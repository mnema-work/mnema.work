// @reads-the-tree
/**
 * THE SITE REPOSITORY SAYS WHERE THE PRODUCT LIVES, AND SAYS IT ONCE. The product is `mnema-work/mnema` and the site is
 * `https://mnema.work`, and both are written in `build/the-site.mjs`. The old owner's address (`felipesauer/mnema`) and
 * the old Pages address (`felipesauer.github.io`) are in no tracked file but the ones named below, each with its reason.
 * An address that redirects still works for a reader, but a link or a clone line that prints it sends a stranger through
 * a redirect for as long as the redirect stands.
 *
 *   - `@felipesauer/mnema`, a package scope, is not an address and is never a finding.
 *
 * To see it red, put the old address back as `PRODUCT_URL` in `build/the-site.mjs`: the case names the file and the line.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SITE } from '../build/the-site.mjs';

/** What the old owner's name makes of an address. A package scope (`@felipesauer/mnema`) is not one of them. */
const OLD = /(?<![@\w.-])felipesauer\/mnema|felipesauer\.github\.io/;

/** The tracked files that may hold an old address, and why. */
const HISTORY: Readonly<Record<string, string>> = {
  'tests/the-site-answers-at-its-own-address.test.ts':
    'the old Pages address is the subject of that test: it holds that the build writes no address of the old site',
  'tests/the-repository-says-where-it-lives.test.ts': 'this file names the patterns it forbids',
};

/** Every old address in `files`, as `path:line`, leaving out the files that are history. */
function findings(files: ReadonlyArray<{ path: string; text: string }>): string[] {
  const found: string[] = [];
  for (const { path, text } of files) {
    if (path in HISTORY) continue;
    text.split('\n').forEach((line, index) => {
      if (OLD.test(line)) found.push(`${path}:${index + 1}`);
    });
  }
  return found;
}

/** The tracked text files of this repository, as git lists them and the disk holds them. */
function tracked(): Array<{ path: string; text: string }> {
  const listed = execFileSync('git', ['ls-files', '-z'], { cwd: SITE, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
    .split('\0')
    .filter(Boolean);
  const files: Array<{ path: string; text: string }> = [];
  for (const path of listed) {
    let buffer: Buffer;
    try {
      buffer = readFileSync(join(SITE, path));
    } catch {
      continue;
    }
    if (buffer.includes(0)) continue;
    files.push({ path, text: buffer.toString('utf8') });
  }
  return files;
}

describe('where the site repository says the product lives', () => {
  it('has no tracked file with an old address but the ones that are history', () => {
    expect(findings(tracked())).toEqual([]);
  });

  it('reads the ruler: the pattern finds the old addresses and not a package scope', () => {
    const at = (text: string): string[] => findings([{ path: 'x', text }]);
    expect(at('a\nhttps://github.com/felipesauer/mnema\nb')).toEqual(['x:2']);
    expect(at('https://felipesauer.github.io/mnema/')).toEqual(['x:1']);
    expect(at('npm i @felipesauer/mnema')).toEqual([]);
    expect(at('https://github.com/mnema-work/mnema')).toEqual([]);
  });

  it('keeps every file it lets through: each one is tracked and says why', () => {
    const paths = new Set(tracked().map((f) => f.path));
    for (const [path, reason] of Object.entries(HISTORY)) {
      expect(paths.has(path), `${path} is listed as history and is not tracked`).toBe(true);
      expect(reason.length).toBeGreaterThan(10);
    }
  });
});
