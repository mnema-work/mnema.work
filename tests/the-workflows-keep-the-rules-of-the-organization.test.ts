/**
 * THE WORKFLOWS KEEP THE RULES THE ORGANIZATION SETS FOR ITS ACTIONS, AND THE DEPLOY JOB HOLDS NOTHING BUT THE DEPLOY.
 *
 * HELD, over every file of `.github/workflows/`:
 *  - every `uses:` names an action owned by GitHub (`actions/`) or `pnpm/action-setup`, at a full 40-character commit SHA;
 *  - the workflow declares its `permissions` at the top, and each job declares its own;
 *  - no step reads a `secrets.` context, and no job is handed a token of its own;
 *  - only the job that deploys may hold a `write` permission, and every checkout keeps no credentials;
 *  - the job that deploys has `pages: write` and `id-token: write` and no other permission, no `checkout` and no `run`;
 *  - no step passes `--check` to the build and no `env` sets `SITE_CHECK`: a check build exits 0 with no /record/ and an
 *    empty mark, so it must never be what is published;
 *  - the job that decides what is built asks the product with `git ls-remote` and a public address, with no token.
 *
 * NOT HELD: that the allowlist in the organization's settings says the same (that is a setting, not a file).
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SITE } from '../build/the-site.mjs';

const DIR = join(SITE, '.github/workflows');
const files = readdirSync(DIR).filter((f) => /\.ya?ml$/.test(f));
const read = (file: string): string => readFileSync(join(DIR, file), 'utf8');
/** The text without its comment lines, which say why and promise nothing. */
const code = (text: string): string => text.replace(/^\s*#.*$/gm, '');

/** The jobs of a workflow as [name, text]: each starts at a two-space-indented key under `jobs:`. */
function jobsOf(text: string): [string, string][] {
  const body = code(text).split(/^jobs:\n/m)[1] ?? '';
  return body
    .split(/\n(?=  [a-z][\w-]*:\n)/)
    .map((job) => [/^\s*([\w-]+):/.exec(job)?.[1] ?? '', job] as [string, string])
    .filter(([name]) => name !== '');
}

/** What an action may be: owned by GitHub or pnpm's, at a full commit SHA. */
const ALLOWED = /^(?:actions\/[\w.-]+|pnpm\/action-setup)@[0-9a-f]{40}$/;

const usesOf = (text: string): string[] => [...code(text).matchAll(/^\s*-?\s*uses:\s*(\S+)/gm)].map((m) => m[1] ?? '');

describe('the workflows', () => {
  it('are there: the site has one to build and publish it', () => {
    expect(files).toContain('site.yml');
  });

  it('use only actions of GitHub and pnpm/action-setup, each at a full commit SHA', () => {
    for (const file of files) {
      const used = usesOf(read(file));
      expect(used.length, `${file} uses an action`).toBeGreaterThan(0);
      for (const use of used) {
        expect(use, `${file}: ${use}`).toMatch(ALLOWED);
      }
    }
  });

  it('declare their permissions at the top, and every job its own', () => {
    for (const file of files) {
      expect(code(read(file)), `${file} has no top-level permissions`).toMatch(/^permissions:\n  [\w-]+: (?:read|write|none)/m);
      const jobs = jobsOf(read(file));
      expect(jobs.length, `${file} has jobs`).toBeGreaterThan(0);
      for (const [name, job] of jobs) expect(job, `${file}: job ${name} declares no permissions`).toMatch(/\n    permissions:\n/);
    }
  });

  it('read no secret and hand no job a token of its own', () => {
    for (const file of files) {
      expect(code(read(file)), `${file} reads a secret`).not.toMatch(/\bsecrets\./);
      expect(code(read(file)), `${file} hands a token`).not.toMatch(/(?<![-\w])token:/);
    }
  });

  it('deploy with pages and id-token and nothing else: no checkout, no command, no other permission', () => {
    const job = jobsOf(read('site.yml')).find(([name]) => name === 'deploy')?.[1] ?? '';
    expect(job, 'site.yml has a deploy job').not.toBe('');
    const permissions = /\n    permissions:\n((?:      [\w-]+: \w+\n?)+)/.exec(job)?.[1] ?? '';
    expect(permissions.trim().split('\n').map((l) => l.trim()).sort()).toEqual(['id-token: write', 'pages: write']);
    expect(job).not.toMatch(/actions\/checkout/);
    expect(job).not.toMatch(/^\s*(?:-\s*)?run:/m);
    expect(usesOf(job)).toHaveLength(1);
    expect(usesOf(job)[0]).toMatch(/^actions\/deploy-pages@/);
  });

  it('decide what is built from the product with git ls-remote on a public address, and publish a changed tag only', () => {
    const plan = jobsOf(read('site.yml')).find(([name]) => name === 'plan')?.[1] ?? '';
    expect(plan).toMatch(/git ls-remote --tags --refs "\$product\.git"/);
    // The address is read from the one place that holds it, never typed in a workflow.
    expect(plan).toMatch(/node build\/the-site\.mjs product-url/);
    expect(code(read('site.yml'))).not.toMatch(/github\.com\/[\w-]+\/[\w.-]+/);
    expect(plan).toMatch(/schedule\)/);
    expect(plan).toMatch(/data-version/);
  });

  it('reads the ruler: it finds an action that is not pinned, one that is not allowed, and a deploy that checks out', () => {
    expect(ALLOWED.test('actions/checkout@v4')).toBe(false);
    expect(ALLOWED.test(`someone/else@${'a'.repeat(40)}`)).toBe(false);
    expect(ALLOWED.test(`actions/checkout@${'a'.repeat(40)}`)).toBe(true);
    expect(usesOf(`jobs:\n  deploy:\n    steps:\n      - uses: actions/checkout@${'a'.repeat(40)}\n`)).toHaveLength(1);
  });

  it('write nothing outside the deploy job, and keep no credentials after a checkout', () => {
    const writes = (text: string): string[] =>
      code(text)
        .split('\n')
        .filter((line) => /^\s+[\w-]+: write\s*$/.test(line));
    for (const file of files) {
      const outsideDeploy = jobsOf(read(file))
        .filter(([name]) => !(file === 'site.yml' && name === 'deploy'))
        .flatMap(([, job]) => writes(job));
      expect(outsideDeploy, `${file} writes outside the deploy job`).toEqual([]);
      expect(writes(code(read(file)).split(/^jobs:\n/m)[0] ?? ''), `${file} writes at the top`).toEqual([]);
      const checkouts = [...code(read(file)).matchAll(/uses: actions\/checkout@[^\n]*\n((?:\s+with:\n(?:\s+[\w-]+: .*\n?)*)?)/g)];
      for (const m of checkouts) expect(m[1], `${file}: a checkout keeps credentials`).toMatch(/persist-credentials: false/);
    }
    // The ruler sees the slip: the scanners file with a write permission put into its job.
    const scan = read('scanners.yml');
    expect(writes(scan)).toEqual([]);
    expect(jobsOf(scan.replace('      contents: read\n    steps:', '      contents: write\n    steps:')).flatMap(([, j]) => writes(j))).toEqual([
      '      contents: write',
    ]);
  });

  it('never run the build in check mode: no step passes --check and no env sets SITE_CHECK', () => {
    const slips = (text: string): string[] =>
      code(text)
        .split('\n')
        .filter((line) => /--check\b|SITE_CHECK/.test(line));
    for (const file of files) expect(slips(read(file)), file).toEqual([]);
    // The guard sees the slip: the publishing step with the flag put into it.
    const site = read('site.yml');
    const built = 'node build/build.mjs --from product';
    expect(site).toContain(built);
    expect(slips(site.replace(built, `${built} --check`))).toEqual([`        run: ${built} --check`]);
    expect(slips(site.replace('permissions:', 'env:\n  SITE_CHECK: "1"\npermissions:'))).toEqual(['  SITE_CHECK: "1"']);
  });
});
