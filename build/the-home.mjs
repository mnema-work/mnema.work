// The facts the home page shows, read from the checkout of the release tag the site is built from and from nothing
// else: the counts of the measured block, the hosts and their rungs, the commands that install, the verdict of the
// record. The words around them are the page's own (`src/pages/index.astro`); a number, a host and a command are not,
// and `tests/the-home-page-is-held-to-its-sources.test.ts` holds each one of them to the file it is read from.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { sectionOf } from './the-pages.mjs';

/** The folder of the product's measurements the page cites, and the files it reads its counts from. */
export const MEASURED = 'measurements/paid-block-2026-11';
const STAGE_ONE = `${MEASURED}/results/stage1/table.json`;
const STAGE_TWO = `${MEASURED}/results/stage2/counts.json`;

/** The cell of stage 1 the page counts: the rule written only in AGENTS.md, in the neutral parity task. */
const AGENTS_CELL = 'A-agentsmd parity-neutral';

const json = (root, path) => JSON.parse(readFileSync(join(root, path), 'utf8'));
const sum = (numbers) => numbers.reduce((a, b) => a + b, 0);

/**
 * The counts of the measured block, from the machine-readable results at the tag. The sessions are the sessions of both
 * stages; "followed" is the sessions of the AGENTS.md arm that obeyed; the two other counts are the decisions the agent
 * recorded and the ones it linked to a path (`governs_links`), through the plugin (arm B) and through the command line
 * alone (arm C) in the decision tasks of stage 2.
 * @returns {{ sessions: number, followed: [number, number], plugin: [number, number], cli: [number, number] }}
 */
export function measuredOf(root) {
  const one = json(root, STAGE_ONE);
  const two = json(root, STAGE_TWO);
  const agents = one.cells[AGENTS_CELL];
  if (agents === undefined) throw new Error(`${STAGE_ONE} has no cell "${AGENTS_CELL}"`);
  const arm = (letter) => {
    const cells = Object.entries(two.cells).filter(([name]) => name.startsWith(`${letter} `) && two.cells[name].q2 !== undefined);
    if (cells.length === 0) throw new Error(`${STAGE_TWO} has no decision cell of arm ${letter}`);
    return [sum(cells.map(([, c]) => c.q2.governs_links)), sum(cells.map(([, c]) => c.q2.recorded))];
  };
  return {
    sessions: one.checks.sessions + sum(Object.values(two.cells).map((c) => c.n)),
    followed: [agents.code.obeyed ?? 0, agents.n],
    plugin: arm('B'),
    cli: arm('C'),
  };
}

/**
 * The hosts and their rungs, as the README's generated table gives them (it is written from the product's host table and
 * a test of the product holds it there), in the table's order; and the four rungs in the words of the sentence above it.
 * @returns {{ hosts: { name: string, rung: string }[], rungs: { letter: string, words: string }[] }}
 */
export function hostsOf(readme) {
  const hosts = [];
  for (const line of readme.split('\n')) {
    const row = /^\| .*? \| \*\*([^*]+)\*\*<br>.*? \| \*\*\(([a-d])\)\*\* \|/.exec(line);
    if (row) hosts.push({ name: row[1], rung: row[2] });
  }
  if (hosts.length === 0) throw new Error("the README's host table has no row the site can read");
  const sentence = /\((a)\) (.*?), \((b)\) (.*?), \((c)\) (.*?), \((d)\) ([^.]*)\./s.exec(sectionOf(readme, 'Hosts').replace(/\s+/g, ' '));
  if (sentence === null) throw new Error("the README's Hosts section does not say its four rungs the way the site reads them");
  const rungs = [0, 2, 4, 6].map((i) => ({ letter: sentence[i + 1], words: sentence[i + 2] }));
  return { hosts, rungs };
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
  // The verdict is the first line; the indented lines after it are census lines, not clauses of it.
  const clauses = (output.trim().split('\n')[0] ?? '').split('; ');
  const verified = clauses.find((c) => c.startsWith('public: local integrity verified'));
  const signed = clauses.find((c) => c === 'all events are signature-covered');
  if (!verified || !signed) throw new Error(`the verdict of the record no longer has the clauses the home page quotes:\n${output}`);
  return [verified, signed];
}
