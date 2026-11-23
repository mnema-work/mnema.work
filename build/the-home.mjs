// The facts the home page shows, read from the checkout of the release tag the site is built from and from nothing
// else: the hosts, the contributors, the commands that install, the verdict of the record. The words around them are the page's own (`src/pages/index.astro`); a number, a host and a command are not,
// and `tests/the-home-page-is-held-to-its-sources.test.ts` holds each one of them to the file it is read from.

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { sectionOf } from './the-pages.mjs';

/**
 * The hosts, as the README's generated table gives them (it is written from the product's host table and a test of the
 * product holds it there), in the table's order. The table also says a rung for each, which the site does not show.
 * @returns {{ hosts: { name: string }[] }}
 */
export function hostsOf(readme) {
  const hosts = [];
  for (const line of readme.split('\n')) {
    const row = /^\| .*? \| \*\*([^*]+)\*\*<br>.*? \| \*\*\([a-d]\)\*\* \|/.exec(line);
    if (row) hosts.push({ name: row[1] });
  }
  if (hosts.length === 0) throw new Error("the README's host table has no row the site can read");
  return { hosts };
}

/**
 * The contributors the README thanks, in its order: between `<!-- contributors:start -->` and `<!-- contributors:end -->`,
 * each cell holds the profile it links to, the figure of the product's `docs/assets/` it shows and the login. The words
 * above them (the heading and the line of thanks) are the README's, read here and not typed. A figure the checkout does
 * not hold stops the build.
 * @param {string} readme
 * @param {string} [root] the checkout, to hold each figure to a file that is there
 * @returns {{ title: string, thanks: string, people: { login: string, profile: string, image: string }[] }}
 */
export function contributorsOf(readme, root) {
  const block = /<!-- contributors:start -->([\s\S]*?)<!-- contributors:end -->/.exec(readme)?.[1];
  const title = /^## (Contributors)\s*$/m.exec(readme)?.[1];
  const thanks = /^## Contributors\s*\n+<p align="center">([^<]*)<\/p>/m.exec(readme)?.[1]?.trim();
  if (block === undefined || title === undefined || thanks === undefined) {
    throw new Error("the README's Contributors section is not in the shape the site reads: a heading, a line of thanks, and a block between the contributors markers");
  }
  const people = [...block.matchAll(/<a href="(https:\/\/github\.com\/([A-Za-z0-9-]+))"><img src="(docs\/assets\/contributor-[^"]+\.svg)"/g)].map((m) => ({
    login: m[2],
    profile: m[1],
    image: m[3],
  }));
  if (people.length === 0) throw new Error('the README names no contributor between its contributors markers');
  for (const person of people) {
    if (root !== undefined && !existsSync(join(root, person.image))) throw new Error(`the README shows ${person.image} for ${person.login} and the checkout does not hold it`);
  }
  return { title, thanks, people };
}

/** A fenced block of shell of a section, as the commands of its lines with the `#` comments cut off. */
function commandsOf(section) {
  return [...section.matchAll(/```sh\n([\s\S]*?)\n```/g)].map((m) =>
    m[1]
      .split('\n')
      .map((l) => l.split('#')[0].trim())
      .filter((l) => l !== ''),
  );
}

/**
 * The commands that install, as the README's Quick start and the page of the hosts give them: the binary, the line that
 * founds the record, the two of the Claude Code plugin and the one of the VS Code extension.
 */
export function installOf({ readme, hostsPage }) {
  const [first, claude] = commandsOf(sectionOf(readme, 'Quick start'));
  const binary = first?.find((l) => l.startsWith('npm i -g '));
  const change = first?.find((l) => l.startsWith('cd '));
  const init = first?.find((l) => l === 'mnema init');
  const plugin = (claude ?? []).filter((l) => l.startsWith('claude plugin '));
  const extension = /`(code --install-extension [^`\s]+)`/.exec(hostsPage)?.[1];
  if (!binary || !change || !init || plugin.length !== 2 || !extension) {
    throw new Error('the README or the page of the hosts no longer give the install commands the home page shows');
  }
  return { binary, found: `${change} && ${init}`, plugin, extension, extensionId: extension.split(' ').pop() };
}

/**
 * The lines of `mnema verify` the page shows, taken from the verdict the binary printed on the record of this commit:
 * its clauses, kept as they are, and only the two the page quotes. A verdict without them stops the build.
 */
export function verdictLinesOf(output) {
  // The verdict is the first line; the indented lines after it are census lines, not clauses of it.
  const clauses = (output.trim().split('\n')[0] ?? '').split('; ');
  const verified = clauses.find((c) => c.startsWith('public: local integrity verified'));
  const signed = clauses.find((c) => c === 'all events are signature-covered');
  if (!verified || !signed) throw new Error(`the verdict of the record no longer has the clauses the home page quotes:\n${output}`);
  return [verified, signed];
}
