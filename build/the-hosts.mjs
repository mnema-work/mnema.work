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
  'Cursor CLI': { file: 'cursor-brand-logo-12.svg', href: 'https://cursor.com', alt: '', width: 20, height: 20, owner: 'Anysphere' },
  OpenCode: { file: 'opencode-works-with-a-dark-20.svg', href: 'https://opencode.ai', alt: 'Works with OpenCode', width: 153, height: 20, owner: 'Anomaly' },
  'Gemini CLI': { file: 'gemini-cli-icon.png', href: 'https://github.com/google-gemini/gemini-cli', alt: '', width: 20, height: 20, owner: 'Google' },
  'Qwen Code': { file: 'qwen-code-logo.svg', href: 'https://github.com/QwenLM/qwen-code', alt: '', width: 20, height: 20, owner: 'the Qwen Code project' },
  Cursor: { file: 'cursor-brand-logo-12.svg', href: 'https://cursor.com', alt: '', width: 20, height: 20, owner: 'Anysphere' },
  'Antigravity CLI': { file: 'antigravity-favicon.svg', href: 'https://antigravity.google', alt: '', width: 20, height: 20, owner: 'Google' },
  'Factory Droid': { file: 'factory-favicon.svg', href: 'https://github.com/Factory-AI/factory', alt: '', width: 20, height: 20, owner: 'Factory' },
  Goose: { file: 'goose-logo.svg', href: 'https://github.com/aaif-goose/goose', alt: '', width: 20, height: 20, owner: 'the Goose project' },
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

/** The owners of the logos shown, once each and in the order of the hosts, for the footer's line of marks. */
export function ownersOf(hosts) {
  return [...new Set(hosts.filter((h) => h.logo !== undefined).map((h) => h.logo.owner))];
}

/** The hosts of the README with their logo where they have one; stops on a logo that is not sourced. */
export function withLogos(hosts, { logos = LOGOS, dir = join(SITE, HOSTS_DIR) } = {}) {
  // A checkout of this site with no `hosts/` folder has no logo to show, so every host is shown by its name.
  if (!existsSync(dir)) return hosts;
  const sources = readFileSync(join(dir, 'SOURCES.md'), 'utf8');
  const faults = faultsOf({ logos, dir, sources });
  for (const host of Object.keys(logos)) {
    if (!hosts.some((h) => h.name === host)) faults.push(`${host} has a logo and is not a host of the README's table`);
  }
  if (faults.length > 0) throw new Error(`a logo of the home page has no source:\n${faults.join('\n')}`);
  return hosts.map((host) => {
    const logo = logos[host.name];
    return logo === undefined ? host : { ...host, logo: { ...logo, src: `/${HOSTS_DIR}/${logo.file}` } };
  });
}
