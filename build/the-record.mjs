// /record/: the verifier page of THIS repository's record, written by `mnema site` of the binary built from
// the same commit. The site holds no copy of the record and no second reader: the page is what the command
// writes (with the head the build hands it through `--head`: the binary's own title is the same for every record, and
// a search engine reads this site's copy), and the build stops when the record does not verify, so a page that says "this does not verify"
// is never published as the site's own.

import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, existsSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

/** The binary runs with nothing of the machine's: a home of its own and the PATH that finds `node`. */
function run(root, cwd, args) {
  const home = mkdtempSync(join(tmpdir(), 'the-site-home-'));
  try {
    return spawnSync(process.execPath, [join(root, 'packages/code/dist/cli.js'), ...args], {
      cwd,
      env: { HOME: home, PATH: process.env.PATH ?? '' },
      encoding: 'utf8',
    });
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
}

/** The `.mnema/` committed at `sha`, extracted into a git directory of its own, and what `use` makes of the directory. */
function inTheRecordOf({ repo, sha }, use) {
  const dir = mkdtempSync(join(tmpdir(), 'the-verdict-of-the-commit-'));
  try {
    const tar = join(dir, 'record.tar');
    const archived = spawnSync('git', ['archive', '--format=tar', '-o', tar, sha, '.mnema'], { cwd: repo, encoding: 'utf8' });
    if (archived.status !== 0) throw new Error(`the record of ${sha} could not be extracted:\n${archived.stderr}`);
    const tree = join(dir, 'tree');
    mkdirSync(tree);
    const unpacked = spawnSync('tar', ['-xf', tar, '-C', tree], { encoding: 'utf8' });
    if (unpacked.status !== 0) throw new Error(`the record of ${sha} could not be unpacked:\n${unpacked.stderr}`);
    const init = spawnSync('git', ['init', '-q', tree], { encoding: 'utf8' });
    if (init.status !== 0) throw new Error(`a directory for the record of ${sha} could not be made:\n${init.stderr}`);
    return use(tree);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * What `command` (a line of the README that starts with `mnema`) prints on the record COMMITTED at `sha`, and only
 * on the public tree: `.mnema/` is extracted from the commit into a directory of its own outside the repository, and
 * the binary built under `root` runs there with a home of its own. The working tree of the checkout is never read, so
 * a file changed and not committed, and the private tree of whoever builds, are not in the verdict. Throws when the
 * command does not pass; returns what it printed, byte for byte.
 * @param {{ root: string, repo?: string, sha: string, command: string }} options
 */
export function theVerdictOfTheCommit({ root, repo = root, sha, command }) {
  const [program, ...args] = command.trim().split(/\s+/);
  if (program !== 'mnema') throw new Error(`the verdict is of a command of mnema, and "${command}" is not one`);
  return inTheRecordOf({ repo, sha }, (tree) => {
    const said = run(root, tree, args);
    if (said.status !== 0) {
      throw new Error(`the record at ${sha} does not verify, so its verdict is not shown:\n${said.stdout}${said.stderr}`);
    }
    return said.stdout;
  });
}

/**
 * What the same command prints when one character of a title in that record was changed: the two lines the home page
 * shows after the change, each a stretch of what the binary printed (the first clause of its verdict, and the message of
 * the first issue it named for the changed event). The change is made in the extracted copy, never in the checkout.
 * Throws when the changed record still verifies, or when the output has not the two lines.
 * @returns {{ lines: string[], before: string, after: string }} the verdict's first clause and the message of the first
 * issue, and the start of the title that was changed, before and after (its first character is the one that changed)
 */
export function theFailureOfTheCommit({ root, repo = root, sha, command }) {
  const [program, ...args] = command.trim().split(/\s+/);
  if (program !== 'mnema') throw new Error(`the verdict is of a command of mnema, and "${command}" is not one`);
  return inTheRecordOf({ repo, sha }, (tree) => {
    const tails = join(tree, '.mnema', 'tails');
    const tail = readdirSync(tails)
      .map((d) => join(tails, d, '000001.jsonl'))
      .find(existsSync);
    if (tail === undefined) throw new Error(`the record of ${sha} has no tail to change one character of`);
    const text = readFileSync(tail, 'utf8');
    const at = text.indexOf('"title":"') + '"title":"'.length;
    if (at < '"title":"'.length + 1) throw new Error(`the first tail of ${sha} has no title to change`);
    const changed = text[at] === 'Z' ? 'Y' : 'Z';
    writeFileSync(tail, text.slice(0, at) + changed + text.slice(at + 1));
    // The words the page shows beside the two outputs: the start of that title, before and after the change.
    const title = /^[^"\\]*(?:\\.[^"\\]*)*/.exec(text.slice(at))?.[0] ?? '';
    const said = run(root, tree, args);
    if (said.status === 0) throw new Error('the record verifies after a character of it was changed');
    const clause = said.stdout.trim().split('\n')[0]?.split('; ')[0] ?? '';
    const issue = /^ {2}issue \[T1\] public \S+: (entry hash mismatch: [^\n]*)$/m.exec(`${said.stdout}\n${said.stderr}`)?.[1];
    if (!clause.startsWith('public: local integrity FAILED') || issue === undefined) {
      throw new Error(`the output of a changed record no longer has the lines the home page shows:\n${`${said.stdout}${said.stderr}`.slice(0, 1500)}`);
    }
    return { lines: [clause, issue], before: title.slice(0, 48), after: changed + title.slice(1, 48) };
  });
}

/**
 * The sentence a refusal of a write opens with, as the binary built under `root` writes it for a rule at a path: the
 * words are the product's, so the home page's session demo takes them from here and does not type them.
 */
export async function theRefusalOfTheBinary({ root, path = 'src/billing/invoice.ts' }) {
  const { ourWordsInRefusing } = await import(pathToFileURL(join(root, 'packages/code/dist/edit-refuses-a-write.js')).href);
  const rule = { id: 'x', name: 'x', address: 'src/billing', travels: true };
  return ourWordsInRefusing({ path, relative: path, rules: [rule] })[0];
}

/**
 * Writes `<out>/index.html` from the record committed under `cwd`, with the binary built under `root`.
 * With `backLink` the page carries one link back to the site (`mnema site --back-link`); with `head` (an object:
 * title, description, canonical, structuredData) it says what it is to a search engine (`mnema site --head`, handed a file).
 * Throws when `mnema verify` does not pass, or when `mnema site` refuses or says the record does not verify.
 * @param {{ root: string, cwd?: string, out: string, backLink?: string, head?: object }} options
 */
export function writeTheRecord({ root, cwd = root, out, backLink, head }) {
  const verify = run(root, cwd, ['verify']);
  if (verify.status !== 0) {
    throw new Error(`the record under ${cwd} does not verify, so /record/ is not written:\n${verify.stdout}${verify.stderr}`);
  }
  mkdirSync(out, { recursive: true });
  const headDir = mkdtempSync(join(tmpdir(), 'the-site-head-'));
  let site;
  try {
    const headFile = join(headDir, 'head.json');
    if (head !== undefined) writeFileSync(headFile, JSON.stringify(head));
    site = run(root, cwd, [
      'site',
      '--out',
      out,
      ...(backLink === undefined ? [] : ['--back-link', backLink]),
      ...(head === undefined ? [] : ['--head', headFile]),
    ]);
  } finally {
    rmSync(headDir, { recursive: true, force: true });
  }
  if (site.status !== 0 || /does not verify/.test(site.stderr)) {
    throw new Error(`mnema site refused or said the record does not verify:\n${site.stdout}${site.stderr}`);
  }
  return site.stdout;
}
