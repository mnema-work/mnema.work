// Where the product repository is read from. The site never looks for it: it is given a checkout of one release tag,
// as `--from <dir>` or as the environment variable `PRODUCT_DIR`, and a missing or wrong one stops the build. A folder
// found beside this one by accident would build the site from whatever happens to be there.

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

/** The tags the site is built from: a release, `v<major>.<minor>.<patch>`, and no pre-release. */
export const RELEASE_TAG = /^v\d+\.\d+\.\d+$/;

const git = (root, ...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

/**
 * Whether the build is the CHECK of the docs (`--check`, or SITE_CHECK=1 for the process Astro runs in): the checkout may
 * be at any commit, and the site that is built is thrown away. Nothing of a check is ever published.
 * @param {{ argv?: string[], env?: Record<string, string | undefined> }} [from]
 */
export function isCheck({ argv = process.argv.slice(2), env = process.env } = {}) {
  return argv.includes('--check') || env.SITE_CHECK === '1';
}

/**
 * The checkout the pages are read from, as an absolute path. It must be a git checkout of the product, at a release
 * tag exactly, with no tracked file changed: the site says it was built from that tag, so it is. In the check of the
 * docs (`isCheck`) it may be at any commit, built or not, and a tracked file changed is still refused.
 * @param {{ argv?: string[], env?: Record<string, string | undefined> }} [from]
 */
export function productRoot({ argv = process.argv.slice(2), env = process.env } = {}) {
  const check = isCheck({ argv, env });
  const at = argv.indexOf('--from');
  const given = at === -1 ? env.PRODUCT_DIR : argv[at + 1];
  if (given === undefined || given === '' || given.startsWith('--')) {
    throw new Error('no checkout of the product to build from: pass `--from <dir>` or set PRODUCT_DIR to a checkout of a release tag');
  }
  const root = resolve(given);
  if (!existsSync(join(root, 'packages/code/package.json')) || !existsSync(join(root, 'docs'))) {
    throw new Error(`${root} is not a checkout of the product: it has no packages/code/package.json and no docs/`);
  }
  const pointed = check ? git(root, 'rev-parse', 'HEAD') : tagOf(root);
  if (git(root, 'status', '--porcelain', '--untracked-files=no') !== '') {
    throw new Error(`${root} has changed tracked files, so it is not ${check ? 'the commit' : 'the tag'} ${pointed}`);
  }
  if (check) return root;
  const built = join(root, 'packages/code/dist/cli.js');
  if (!existsSync(built)) throw new Error(`${root} has no ${built}: build the checkout first (pnpm install --frozen-lockfile && pnpm build)`);
  return root;
}

/** The release tag a checkout is at. Throws when HEAD is not exactly at one. */
export function tagOf(root) {
  let tags;
  try {
    tags = git(root, 'tag', '--points-at', 'HEAD').split('\n').filter((tag) => RELEASE_TAG.test(tag));
  } catch (error) {
    throw new Error(`${root} is not a git checkout: ${error.message}`);
  }
  if (tags.length !== 1) throw new Error(`${root} is not at a release tag (v<major>.<minor>.<patch>) exactly; the tags at HEAD: ${tags.join(', ') || 'none'}`);
  const [tag] = tags;
  const version = JSON.parse(readFileSync(join(root, 'packages/code/package.json'), 'utf8')).version;
  if (tag !== `v${version}`) throw new Error(`${root} is at ${tag}, and @mnema/code there says ${version}`);
  return tag;
}
