// Which hosts the home page shows by a logo, and where each logo comes from. A host is shown by its name unless it is
// named in LOGOS, and it is named there only for a file of `hosts/` that `hosts/SOURCES.md` lists with the host, the
// address it was fetched from and the sha256 of the file. The build stops at a logo that has no such row or whose file
// is not the one the row hashes, so a logo cannot reach the page without its source; a host that is new in the product's
// README is not in LOGOS and is shown by its name.

import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SITE } from './the-site.mjs';

/** The folder of the vendors' files, tracked in this repository, and the file that says where each one is from. */
export const HOSTS_DIR = 'hosts';
export const SOURCES = `${HOSTS_DIR}/SOURCES.md`;

/**
 * The hosts that carry a logo, by the name the README's table gives them. `href` is where the vendor's rule says the
 * logo links to; `alt` is the text of the picture, which is the host's own name or the words the vendor's file says.
 * @type {Readonly<Record<string, { file: string, href: string, alt: string, width: number, height: number, owner: string }>>}
 */
export const LOGOS = Object.freeze({
  'Claude Code': { file: 'claude-icon.svg', href: 'https://claude.com/product/claude-code', alt: '', width: 20, height: 20, owner: 'Anthropic' },
  'VS Code': { file: 'vscode.svg', href: 'https://code.visualstudio.com', alt: '', width: 20, height: 20, owner: 'Microsoft' },
  'Copilot CLI': { file: 'GitHub_Invertocat_White.svg', href: 'https://github.com', alt: 'GitHub', width: 20, height: 20, owner: 'GitHub, Inc.' },
  'Cursor CLI': { file: 'cursor-cube-2d-dark.svg', href: 'https://cursor.com', alt: '', width: 18, height: 20, owner: 'Anysphere' },
  OpenCode: { file: 'opencode-logo-transparent-dark.svg', href: 'https://opencode.ai', alt: '', width: 16, height: 20, owner: 'Anomaly' },
  'Gemini CLI': { file: 'gemini-cli-icon.png', href: 'https://github.com/google-gemini/gemini-cli', alt: '', width: 20, height: 20, owner: 'Google' },
  'Qwen Code': { file: 'qwen-code-logo.svg', href: 'https://github.com/QwenLM/qwen-code', alt: '', width: 20, height: 20, owner: 'the Qwen Code project' },
  Cursor: { file: 'cursor-cube-2d-dark.svg', href: 'https://cursor.com', alt: '', width: 18, height: 20, owner: 'Anysphere' },
  'Antigravity CLI': { file: 'antigravity-favicon.svg', href: 'https://antigravity.google', alt: '', width: 20, height: 20, owner: 'Google' },
  'Factory Droid': { file: 'factory-docs-favicon.svg', href: 'https://github.com/Factory-AI/factory', alt: '', width: 20, height: 20, owner: 'Factory' },
  Goose: { file: 'logo_dark.png', href: 'https://github.com/aaif-goose/goose', alt: '', width: 20, height: 20, owner: 'the Goose project' },
});

export const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

/** The rows of the table of `hosts/SOURCES.md`: the file, the host it is shown for and the sha256 it was fetched with. */
export function rowsOf(text) {
  return [...text.matchAll(/^\| `([^`]+)` \| ([^|]+?) \| [^|]*\| [^|]*\| `([0-9a-f]{64})` \|$/gm)].map((m) => ({
    file: m[1],
    host: m[2],
    sha256: m[3],
  }));
}

/**
 * The reasons the logos of `logos` are not all sourced, one per fault: a file that is not there, a file no row lists
 * for that host, a row whose hash is not the file's.
 */
export function faultsOf({ logos = LOGOS, dir = join(SITE, HOSTS_DIR), sources }) {
  const rows = rowsOf(sources);
  const faults = [];
  for (const [host, logo] of Object.entries(logos)) {
    const file = join(dir, logo.file);
    const row = rows.find((r) => r.file === logo.file && r.host === host);
    if (!existsSync(file)) faults.push(`${host}: ${logo.file} is not in ${HOSTS_DIR}/`);
    else if (row === undefined) faults.push(`${host}: ${SOURCES} has no row for ${logo.file} and this host`);
    else if (row.sha256 !== sha256(readFileSync(file))) faults.push(`${host}: ${logo.file} is not the file ${SOURCES} hashes`);
  }
  if (existsSync(dir)) {
    for (const file of readdirSync(dir).filter((f) => f !== 'SOURCES.md')) {
      if (!rows.some((r) => r.file === file)) faults.push(`${HOSTS_DIR}/${file} has no row in ${SOURCES}`);
    }
  }
  return faults;
}

/** The folder of the vendors' files in the product's checkout, which the product's README shows its hosts by. */
export const PRODUCT_HOSTS_DIR = 'assets/hosts';

/** Whether the checkout holds the product's folder of vendor files. */
export const productHasHosts = (root) => existsSync(join(root, PRODUCT_HOSTS_DIR, 'SOURCES.md'));

/** The first version of the product that holds the folder: a checkout below it has nothing to equal, and only below it. */
export const FIRST_WITH_HOSTS = [0, 1, 8];

/** Whether the checkout's @mnema/code version, read from its package.json, is below the first that holds the folder. */
export function predatesProductHosts(root) {
  const version = JSON.parse(readFileSync(join(root, 'packages/code/package.json'), 'utf8')).version;
  const [major, minor, patch] = String(version).split(/[.-]/).map(Number);
  const have = [major, minor, patch];
  for (let i = 0; i < 3; i += 1) if (have[i] !== FIRST_WITH_HOSTS[i]) return (have[i] ?? 0) < FIRST_WITH_HOSTS[i];
  return false;
}

/**
 * The reasons the files of this site's `hosts/` are not the product's: a file the checkout of the tag being built does not
 * hold, a file whose bytes differ, a row whose hash is not the one the product's `SOURCES.md` gives that file. The site is
 * dark only, so it holds the files of the product's folder that suit a dark page, and every one of them is the product's.
 * A checkout that has no such folder is a fault, except one of a version that predates the folder (below 0.1.8), which has
 * nothing to equal: no fault, and the site's own table check above still holds. The checkout is the one the build is given (`--from`), so the comparison is with the tag being built, not a pinned list.
 */
export function faultsAgainstProduct({ root, dir = join(SITE, HOSTS_DIR), sources }) {
  const theirs = join(root, PRODUCT_HOSTS_DIR);
  if (!productHasHosts(root)) {
    return predatesProductHosts(root) ? [] : [`${PRODUCT_HOSTS_DIR}/SOURCES.md is not in the checkout, which is of a version that has it: the logos of ${HOSTS_DIR}/ have nothing to equal`];
  }
  const theirRows = rowsOf(readFileSync(join(theirs, 'SOURCES.md'), 'utf8'));
  const faults = [];
  for (const file of readdirSync(dir).filter((f) => f !== 'SOURCES.md')) {
    if (!existsSync(join(theirs, file))) faults.push(`${HOSTS_DIR}/${file} is not in the product's ${PRODUCT_HOSTS_DIR}/`);
    else if (!readFileSync(join(theirs, file)).equals(readFileSync(join(dir, file)))) faults.push(`${HOSTS_DIR}/${file} is not the product's ${PRODUCT_HOSTS_DIR}/${file}, byte for byte`);
  }
  for (const row of rowsOf(sources)) {
    const theirRow = theirRows.find((r) => r.file === row.file);
    if (theirRow === undefined) faults.push(`${SOURCES} lists ${row.file}, which the product's ${PRODUCT_HOSTS_DIR}/SOURCES.md does not`);
    else if (theirRow.sha256 !== row.sha256) faults.push(`${SOURCES} hashes ${row.file} as ${row.sha256}, the product's as ${theirRow.sha256}`);
  }
  return faults;
}

/** The owners of the logos shown, once each and in the order of the hosts, for the footer's line of marks. */
export function ownersOf(hosts) {
  return [...new Set(hosts.filter((h) => h.logo !== undefined).map((h) => h.logo.owner))];
}

/**
 * The hosts of the README with their logo where they have one; stops on a logo that is not sourced. With `root`, the files are
 * also held equal to the product's where the checkout has them.
 * @param {{ name: string, rung: string }[]} hosts
 * @param {{ logos?: Record<string, any>, dir?: string, root?: string }} [options]
 * @returns {any[]}
 */
export function withLogos(hosts, { logos = LOGOS, dir = join(SITE, HOSTS_DIR), root } = {}) {
  // A checkout of this site with no `hosts/` folder has no logo to show, so every host is shown by its name.
  if (!existsSync(dir)) return hosts;
  const sources = readFileSync(join(dir, 'SOURCES.md'), 'utf8');
  const faults = faultsOf({ logos, dir, sources });
  if (root !== undefined) {
    if (productHasHosts(root) || !predatesProductHosts(root)) faults.push(...faultsAgainstProduct({ root, dir, sources }));
    else console.log(`the logos were not compared with the product's ${PRODUCT_HOSTS_DIR}/: this tag predates it (the check of ${SOURCES} still ran)`);
  }
  for (const host of Object.keys(logos)) {
    if (!hosts.some((h) => h.name === host)) faults.push(`${host} has a logo and is not a host of the README's table`);
  }
  if (faults.length > 0) throw new Error(`a logo of the home page has no source:\n${faults.join('\n')}`);
  return hosts.map((host) => {
    const logo = logos[host.name];
    return logo === undefined ? host : { ...host, logo: { ...logo, src: `/${HOSTS_DIR}/${logo.file}` } };
  });
}
